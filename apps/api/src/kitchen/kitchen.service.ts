import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Approver, AuditService } from '../audit/audit.service';

export type VoidApproval = { actorId?: string; approver: Approver; reason: string };

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
    constructor(private prisma: PrismaService, private audit: AuditService) { }

    /**
     * Retorna tickets activos: WAITING + PREPARING + READY
     * Solo excluye DELIVERED (ya fue entregado al repartidor/cliente)
     */
    async findAllActive() {
        const t0 = Date.now();
        return (this.prisma as any).kitchenTicket.findMany({
            where: {
                status: {
                    notIn: [TicketStatus.DELIVERED],
                },
                sale: { status: { not: OrderStatus.CANCELLED } },
            },
            orderBy: {
                createdAt: 'asc',
            },
            include: {
                sale: {
                    select: {
                        id: true,
                        code: true,
                        channel: true,
                        fulfillmentType: true,
                        status: true,
                        note: true,
                        shippingData: true,
                        table: { select: { id: true, number: true } },
                        guest: { select: { id: true, name: true } },
                        externalOrder: { select: { id: true, platform: true } },
                        items: {
                            select: {
                                id: true,
                                quantity: true,
                                modifiers: true,
                                sellingProduct: { select: { id: true, name: true } },
                                productVariant: { select: { id: true, name: true } },
                            },
                        },
                    },
                },
            },
        }).then((tickets: any[]) => {
            const mapped = tickets.map((ticket) => this.withTicketItems(ticket));
            return mapped;
        });
    }

    async findHistory(q?: string) {
        const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const query = (q || '').trim();
        const tableNumber = /^\d+$/.test(query) ? Number(query) : null;

        const tickets = await (this.prisma as any).kitchenTicket.findMany({
            where: {
                status: TicketStatus.DELIVERED,
                createdAt: { gte: since },
                ...(query ? {
                    OR: [
                        { sale: { code: { contains: query, mode: 'insensitive' } } },
                        { sale: { guest: { name: { contains: query, mode: 'insensitive' } } } },
                        { sale: { note: { contains: query, mode: 'insensitive' } } },
                        ...(tableNumber != null ? [{ sale: { table: { number: tableNumber } } }] : []),
                    ],
                } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: 80,
            include: {
                sale: {
                    select: {
                        id: true,
                        code: true,
                        channel: true,
                        fulfillmentType: true,
                        status: true,
                        total: true,
                        note: true,
                        shippingData: true,
                        table: { select: { id: true, number: true } },
                        guest: { select: { id: true, name: true } },
                        externalOrder: { select: { id: true, platform: true } },
                        items: {
                            select: {
                                id: true,
                                quantity: true,
                                priceUnit: true,
                                modifiers: true,
                                sellingProduct: { select: { id: true, name: true } },
                                productVariant: { select: { id: true, name: true } },
                            },
                        },
                    },
                },
            },
        });

        return tickets.map((ticket: any) => this.withTicketItems(ticket));
    }

    private kitchenLabel(ticket: any) {
        if (ticket.label) return ticket.label;
        const sale = ticket.sale;
        if (sale?.table?.number) {
            return sale.guest?.name
                ? `MESA ${sale.table.number} · ${sale.guest.name}`
                : `MESA ${sale.table.number}`;
        }
        if (sale?.fulfillmentType === 'TAKEAWAY') return 'RETIRO';
        if (sale?.channel === 'WEB') return 'WEB';
        if (sale?.channel === 'UBER_EATS') return 'UBER';
        if (sale?.channel === 'PEDIDOS_YA') return 'PEDIDOS YA';
        return sale?.channel || 'POS';
    }

    private withTicketItems(ticket: any) {
        if (!ticket?.sale) return ticket;
        const ids: string[] = ticket.itemIds || [];
        const items = ids.length
            ? ticket.sale.items.filter((item: any) => ids.includes(item.id))
            : ticket.sale.items;
        const { shippingData, ...sale } = ticket.sale;
        const contact = shippingData?.contact;
        const customer = contact?.name || contact?.phone
            ? { name: String(contact.name || ''), phone: String(contact.phone || '') }
            : null;
        return {
            ...ticket,
            label: this.kitchenLabel(ticket),
            sale: { ...sale, items, customer },
        };
    }

    async updateStatus(id: string, status: string, approval?: VoidApproval) {
        const allowed = [TicketStatus.WAITING, TicketStatus.PREPARING, TicketStatus.READY, TicketStatus.DELIVERED, 'CANCELLED'];
        if (!allowed.includes(status)) throw new BadRequestException(`Estado inválido: ${status}`);

        const ticket = await (this.prisma as any).kitchenTicket.findUnique({
            where: { id },
            include: { sale: true },
        });

        if (!ticket) {
            throw new NotFoundException(`KitchenTicket ${id} not found`);
        }

        if (status === 'CANCELLED') {
            if (!approval) throw new BadRequestException('Anular requiere autorización');
            return this.cancelTicket(ticket, approval);
        }

        if (ticket.sale?.status === OrderStatus.CANCELLED) throw new BadRequestException('Este pedido fue anulado');
        const rank: Record<string, number> = { WAITING: 0, PREPARING: 1, READY: 2, DELIVERED: 3 };
        if (rank[status] <= rank[ticket.status]) return ticket;

        const updateData: any = { status };
        const saleUpdateData: any = {};

        if (status === TicketStatus.PREPARING) {
            if (!ticket.startTime) updateData.startTime = new Date();
            saleUpdateData.status = OrderStatus.PREPARING;
        } else if (status === TicketStatus.READY) {
            if (!ticket.endTime) updateData.endTime = new Date();
        } else if (status === TicketStatus.DELIVERED) {
            if (!ticket.endTime) updateData.endTime = new Date();
            if (ticket.sale?.paymentStatus === 'APPROVED') {
                saleUpdateData.status = OrderStatus.COMPLETED;
            }
        }

        const ops: any[] = [(this.prisma as any).kitchenTicket.update({ where: { id }, data: updateData })];
        if (Object.keys(saleUpdateData).length > 0) {
            ops.push((this.prisma as any).sale.updateMany({
                where: { id: ticket.saleId, status: { notIn: [OrderStatus.CANCELLED, OrderStatus.COMPLETED] } },
                data: saleUpdateData,
            }));
        }
        const [updatedTicket] = await this.prisma.$transaction(ops);
        return updatedTicket;
    }

    /**
     * Una tanda de mesa sin pagar solo saca sus platos de la cuenta del comensal;
     * cualquier otro ticket anula la venta completa.
     */
    private async cancelTicket(ticket: any, approval: VoidApproval) {
        const sale = ticket.sale;
        if (sale?.status === OrderStatus.CANCELLED) throw new BadRequestException('El pedido ya está anulado');
        const batchIds: string[] = ticket.itemIds || [];
        const isOpenTableBatch = sale?.fulfillmentType === 'DINE_IN' && sale?.paymentStatus === 'PENDING' && batchIds.length > 0;

        return (this.prisma as any).$transaction(async (tx: any) => {
            const updatedTicket = await tx.kitchenTicket.update({
                where: { id: ticket.id },
                data: { status: TicketStatus.DELIVERED, endTime: new Date() },
            });

            const lines = await tx.saleItem.findMany({
                where: { saleId: sale.id, ...(isOpenTableBatch ? { id: { in: batchIds } } : {}) },
                select: { id: true, quantity: true, priceUnit: true, sellingProduct: { select: { name: true } } },
            });
            const detailItems = lines.map((i: any) => ({ name: i.sellingProduct?.name || 'Producto', quantity: i.quantity, priceUnit: Number(i.priceUnit) }));

            if (isOpenTableBatch) {
                const remaining = await tx.saleItem.count({ where: { saleId: sale.id, id: { notIn: batchIds } } });
                if (remaining > 0) {
                    const removed = lines.reduce((sum: number, i: any) => sum + Number(i.priceUnit) * i.quantity, 0);
                    await tx.recipeSnapshot.deleteMany({ where: { saleItemId: { in: batchIds } } });
                    await tx.saleItem.deleteMany({ where: { id: { in: batchIds }, saleId: sale.id } });
                    await tx.sale.update({
                        where: { id: sale.id },
                        data: { total: { decrement: removed } },
                    });
                    await this.audit.log({
                        action: 'BATCH_CANCEL',
                        actorId: approval.actorId,
                        approver: approval.approver,
                        saleId: sale.id,
                        saleCode: sale.code,
                        amount: removed,
                        reason: approval.reason,
                        details: { label: this.kitchenLabel(ticket), batchNumber: ticket.batchNumber ?? null, items: detailItems },
                    }, tx);
                    return updatedTicket;
                }
            }

            await tx.sale.update({ where: { id: sale.id }, data: { status: OrderStatus.CANCELLED } });
            await this.audit.log({
                action: 'ORDER_CANCEL',
                actorId: approval.actorId,
                approver: approval.approver,
                saleId: sale.id,
                saleCode: sale.code,
                amount: Number(sale.total || 0),
                reason: approval.reason,
                details: {
                    label: this.kitchenLabel(ticket),
                    paid: sale.paymentStatus === 'APPROVED',
                    paymentMethod: sale.paymentMethod || null,
                    items: detailItems,
                },
            }, tx);

            const alreadyReverted = await tx.stockMovement.count({
                where: { referenceId: sale.id, reason: 'CANCELLATION' },
            });
            if (!alreadyReverted) {
                const consumed = await tx.stockMovement.findMany({
                    where: { referenceId: sale.id, reason: 'SALE' },
                    select: { inventoryItemId: true, quantity: true },
                });
                const byItem = new Map<string, number>();
                for (const m of consumed) byItem.set(m.inventoryItemId, (byItem.get(m.inventoryItemId) || 0) - Number(m.quantity));
                for (const [inventoryItemId, qty] of byItem) {
                    if (qty <= 0) continue;
                    await tx.inventoryItem.update({
                        where: { id: inventoryItemId },
                        data: {
                            currentStock: { increment: qty },
                            movements: { create: { quantity: qty, reason: 'CANCELLATION', referenceId: sale.id } },
                        },
                    });
                }
            }

            await tx.cashTransaction.updateMany({
                where: { relatedSaleId: sale.id, type: 'SALE_INCOME' },
                data: { type: 'CANCELLED_SALE', description: `[CANCELADA] Venta ${sale.code || ''}` },
            });

            return updatedTicket;
        });
    }

    async createTicket(saleId: string) {
        const existing = await (this.prisma as any).kitchenTicket.findFirst({
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
    async generatePrintHtml(ticketId: string, kind: 'kitchen' | 'account' = 'kitchen'): Promise<string> {
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
                        table: true,
                        guest: true,
                        externalOrder: true,
                    },
                },
            },
        });

        if (!ticket) throw new NotFoundException(`Ticket ${ticketId} no encontrado`);
        const labeled = this.withTicketItems(ticket);

        const sale = labeled.sale;
        const escapeHtml = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
        const channel = escapeHtml(labeled.label || (sale.externalOrder ? sale.channel : 'POS'));
        const guestName = escapeHtml(sale.guest?.name || [sale.customer?.name, sale.customer?.phone].filter(Boolean).join(' · '));
        const orderCode = escapeHtml(sale.code || sale.id.substring(0, 6).toUpperCase());
        const timeZone = 'America/Santiago';
        const time = new Date(ticket.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone });
        const date = new Date(ticket.createdAt).toLocaleDateString('es-CL', { timeZone });

        const formatMods = (raw: any) => {
            const mods = raw
                ? (typeof raw === 'string' ? JSON.parse(raw) : raw)
                : {};
            const lines: string[] = [];
            if (Array.isArray(mods)) {
                return mods.map((m: any) => `<div style="padding-left:12px;font-size:11px;color:#666;">+ ${escapeHtml(m.name || m.optionName || m)}</div>`).join('');
            }
            (mods.selectedProteinNames || []).forEach((n: string) => lines.push(`+ ${n}`));
            (mods.selectedProteins || []).forEach((n: string) => lines.push(`+ ${n}`));
            (mods.removedIngredients || []).forEach((n: string) => lines.push(`- Sin ${n}`));
            (mods.extras || []).forEach((e: any) => lines.push(`+ ${e.name || e}`));
            (mods.dynamicSelections || []).forEach((g: any) => {
                (g.selectedOptions || []).forEach((o: any) => lines.push(`+ ${o.name || o}`));
            });
            return lines.map((line) => `<div style="padding-left:12px;font-size:11px;color:#666;">${escapeHtml(line)}</div>`).join('');
        };

        const isAccount = kind === 'account';
        const itemsHtml = sale.items.map((item: any) => {
            const name = escapeHtml(item.sellingProduct?.name || item.productName || 'Producto');
            const qty = item.quantity || 1;
            const unit = Number(item.priceUnit || 0);
            const lineTotal = unit * qty;
            const modsHtml = formatMods(item.modifiers);
            const notes = item.note ? `<div style="padding-left:12px;font-size:11px;font-weight:bold;">NOTA: ${escapeHtml(item.note)}</div>` : '';
            return `
                <div style="border-bottom:1px dashed #000;padding:6px 0;">
                    <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:14px;">
                        <span>${qty}x ${name}</span>
                        <span>${isAccount ? `$${lineTotal.toLocaleString('es-CL')}` : `x${qty}`}</span>
                    </div>
                    ${modsHtml}
                    ${notes}
                </div>`;
        }).join('');
        const saleTotal = Number(sale.total || 0);

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
        .header h1 { font-size: 18px; margin: 0; letter-spacing: 1px; font-weight: bold; }
        .header .doc { font-size: 11px; margin-top: 4px; text-transform: uppercase; }
        .header .order { font-size: 22px; font-weight: bold; margin: 6px 0 2px; }
        .header .code { font-size: 13px; font-weight: bold; }
        .meta { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #000; }
        .note { margin-top: 8px; padding: 6px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; font-size: 12px; font-weight: bold; }
        .footer { text-align: center; margin-top: 12px; padding-top: 8px; border-top: 2px solid #000; font-size: 10px; }
        @media print { body { -webkit-print-color-adjust: exact; } }
    </style>
</head>
<body onload="window.print()">
    <div class="header">
        <h1>LO MAS RICO</h1>
        <div class="doc">${isAccount ? 'Cuenta interna' : 'Comanda cocina'}</div>
        <div class="order">${channel}</div>
        ${guestName ? `<div style="font-size:16px;font-weight:bold;margin-top:4px;">${guestName}</div>` : ''}
        ${ticket.batchNumber ? `<div style="font-size:12px;margin-top:2px;">Tanda ${ticket.batchNumber}</div>` : ''}
        <div class="code">#${orderCode}</div>
    </div>
    <div class="meta">
        <span>${date}</span>
        <span>${time}</span>
    </div>
    ${itemsHtml}
    ${isAccount ? `<div style="margin-top:10px;border-top:2px solid #000;padding-top:8px;display:flex;justify-content:space-between;font-size:16px;font-weight:bold;"><span>TOTAL</span><span>$${saleTotal.toLocaleString('es-CL')}</span></div><div style="text-align:center;margin-top:8px;font-size:10px;">Documento interno</div>` : ''}
    ${sale.note && !isAccount ? `<div class="note">NOTA<br>${escapeHtml(sale.note).replace(/\n/g, '<br>')}</div>` : ''}
    <div class="footer">
        <div>${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone })}</div>
    </div>
</body>
</html>`;
    }
}
