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

    async findAllActive() {
        return (this.prisma as any).kitchenTicket.findMany({
            where: {
                status: {
                    notIn: [TicketStatus.READY, TicketStatus.DELIVERED],
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
                                sellingProduct: true,  // ✅ BUG #7 FIX: Incluir producto
                                recipeSnapshot: true   // ✅ BUG #7 FIX: Incluir snapshot con detalles
                            },
                        },
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
            saleUpdateData.status = OrderStatus.COMPLETED;
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
