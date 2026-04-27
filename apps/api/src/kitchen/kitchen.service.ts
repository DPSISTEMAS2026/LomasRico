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
}
