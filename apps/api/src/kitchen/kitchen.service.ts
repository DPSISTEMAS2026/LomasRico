import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

// USAMOS CONSTANTES PARA ESTADOS PARA EVITAR ERRORES DE REGENERACION
const TicketStatus = {
    WAITING: 'WAITING',
    PREPARING: 'PREPARING',
    READY: 'READY',
    DELIVERED: 'DELIVERED'
};

const OrderStatus = {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    PREPARING: 'PREPARING',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED'
};

@Injectable()
export class KitchenService {
    constructor(private prisma: PrismaService) { }

    /**
     * Retorna tickets activos: WAITING + PREPARING + READY
     * Solo excluye DELIVERED (ya fue entregado al repartidor/cliente)
     */
    async findAllActive() {
        return (this.prisma as any).kitchenTicket.findMany({
            where: {
                status: {
                    notIn: [TicketStatus.DELIVERED],
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
            include: {
                sale: {
                    include: {
                        items: {
                            include: {
                                productVariant: true,
                                sellingProduct: true,
                                recipeSnapshot: true
                            },
                        },
                        externalOrder: true, // Para saber si es Uber/PedidosYa
                    },
                },
            },
        });
    }

    async updateStatus(id: string, status: string) {
        const ticket = await (this.prisma as any).kitchenTicket.findUnique({
            where: { id },
            include: { sale: true },
        });

        if (!ticket) {
            throw new NotFoundException(`KitchenTicket ${id} not found`);
        }

        const updateData: any = { status };
        const saleUpdateData: any = {};

        if (status === TicketStatus.PREPARING) {
            if (!ticket.startTime) updateData.startTime = new Date();
            saleUpdateData.status = OrderStatus.PREPARING;
        } else if (status === TicketStatus.READY) {
            if (!ticket.endTime) updateData.endTime = new Date();
            // No marcar COMPLETED aún — se marca cuando se entrega
        } else if (status === TicketStatus.DELIVERED) {
            if (!ticket.endTime) updateData.endTime = new Date();
            saleUpdateData.status = OrderStatus.COMPLETED;
        } else if (status === 'CANCELLED') {
            // Cancelación: quitar de la vista activa y marcar sale como cancelada
            updateData.status = TicketStatus.DELIVERED; // Removes from active view
            updateData.endTime = new Date();
            saleUpdateData.status = OrderStatus.CANCELLED;
        }

        return (this.prisma as any).$transaction(async (tx: any) => {
            const updatedTicket = await tx.kitchenTicket.update({
                where: { id },
                data: updateData
            });

            if (Object.keys(saleUpdateData).length > 0) {
                await tx.sale.update({
                    where: { id: ticket.saleId },
                    data: saleUpdateData
                });
            }

            // ✅ REVERSIÓN DE INVENTARIO AL CANCELAR
            if (status === 'CANCELLED') {
                const saleItems = await tx.saleItem.findMany({
                    where: { saleId: ticket.saleId },
                    include: { recipeSnapshot: true }
                });

                for (const item of saleItems) {
                    if (item.recipeSnapshot?.resolvedBoM) {
                        const bom = item.recipeSnapshot.resolvedBoM as any[];
                        for (const bomItem of bom) {
                            const totalQty = bomItem.quantity * item.quantity;
                            await tx.inventoryItem.update({
                                where: { id: bomItem.inventoryItemId },
                                data: {
                                    currentStock: { increment: totalQty },
                                    movements: {
                                        create: {
                                            quantity: totalQty,
                                            reason: 'CANCELLATION',
                                            referenceId: ticket.saleId
                                        }
                                    }
                                }
                            });
                        }
                    }
                }

                // Revertir la CashTransaction asociada
                await tx.cashTransaction.updateMany({
                    where: { relatedSaleId: ticket.saleId, type: 'SALE_INCOME' },
                    data: { type: 'CANCELLED_SALE', description: `[CANCELADA] Venta ${ticket.sale.code || ''}` }
                });

                console.log(`🔄 Inventario revertido + CashTransaction anulada para Sale ${ticket.saleId}`);
            }

            return updatedTicket;
        });
    }

    async createTicket(saleId: string) {
        const existing = await (this.prisma as any).kitchenTicket.findUnique({
            where: { saleId }
        });

        if (existing) return existing;

        return (this.prisma as any).kitchenTicket.create({
            data: {
                saleId,
                status: TicketStatus.WAITING
            }
        });
    }

    /**
     * Genera HTML optimizado para impresión en impresora térmica de 80mm.
     * Incluye: #pedido, canal, hora, items con modificadores, notas.
     */
    async generatePrintHtml(ticketId: string): Promise<string> {
        const ticket = await (this.prisma as any).kitchenTicket.findUnique({
            where: { id: ticketId },
            include: {
                sale: {
                    include: {
                        items: {
                            include: {
                                sellingProduct: true,
                                recipeSnapshot: true,
                            },
                        },
                        externalOrder: true,
                    },
                },
            },
        });

        if (!ticket) throw new NotFoundException(`Ticket ${ticketId} no encontrado`);

        const sale = ticket.sale;
        const channel = sale.externalOrder ? sale.channel : 'POS';
        const orderCode = sale.code || sale.id.substring(0, 6).toUpperCase();
        const time = new Date(ticket.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        const date = new Date(ticket.createdAt).toLocaleDateString('es-CL');

        const itemsHtml = sale.items.map((item: any) => {
            const name = item.sellingProduct?.name || item.productName || 'Producto';
            const qty = item.quantity || 1;
            const mods = item.modifiers ? JSON.parse(typeof item.modifiers === 'string' ? item.modifiers : JSON.stringify(item.modifiers)) : [];
            const modsHtml = Array.isArray(mods) && mods.length > 0
                ? mods.map((m: any) => `<div style="padding-left:12px;font-size:11px;color:#666;">+ ${m.name || m.optionName || m}</div>`).join('')
                : '';
            const notes = item.note ? `<div style="padding-left:12px;font-size:11px;color:#c00;font-weight:bold;">⚠ ${item.note}</div>` : '';
            return `
                <div style="border-bottom:1px dashed #ccc;padding:6px 0;">
                    <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:14px;">
                        <span>${name}</span>
                        <span>x${qty}</span>
                    </div>
                    ${modsHtml}
                    ${notes}
                </div>`;
        }).join('');

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { size: 80mm auto; margin: 0; }
        body {
            font-family: 'Courier New', monospace;
            width: 72mm;
            margin: 4mm;
            font-size: 12px;
            color: #000;
        }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
        .header h1 { font-size: 22px; margin: 0; letter-spacing: 2px; }
        .header .order { font-size: 28px; font-weight: bold; margin: 4px 0; }
        .meta { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #000; }
        .footer { text-align: center; margin-top: 12px; padding-top: 8px; border-top: 2px solid #000; font-size: 10px; }
        @media print { body { -webkit-print-color-adjust: exact; } }
    </style>
</head>
<body onload="window.print()">
    <div class="header">
        <h1>🔥 LO MÁS RICO</h1>
        <div>COMANDA DE COCINA</div>
        <div class="order">#${orderCode}</div>
    </div>
    <div class="meta">
        <span>📅 ${date}</span>
        <span>🕐 ${time}</span>
        <span>📡 ${channel}</span>
    </div>
    ${itemsHtml}
    ${sale.note ? `<div style="margin-top:8px;padding:6px;background:#fff3cd;border:1px solid #ffc107;font-size:12px;font-weight:bold;">📝 ${sale.note}</div>` : ''}
    <div class="footer">
        <div>Impreso: ${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
    </div>
</body>
</html>`;
    }
}
