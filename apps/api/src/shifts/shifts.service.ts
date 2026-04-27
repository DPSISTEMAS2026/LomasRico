import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ShiftsService {
    constructor(private prisma: PrismaService) { }

    // Abrir turno
    async openShift(data: { cashierId: string; startAmount: number }) {
        // Verificar si hay un turno abierto
        const openShift = await (this.prisma as any).cashShift.findFirst({
            where: {
                cashierId: data.cashierId,
                status: 'OPEN'
            }
        });

        if (openShift) {
            throw new Error('Ya existe un turno abierto para este cajero');
        }

        // Crear o obtener caja principal
        let cashRegister = await (this.prisma as any).cashRegister.findFirst({
            where: { name: 'Caja Principal' }
        });

        if (!cashRegister) {
            cashRegister = await (this.prisma as any).cashRegister.create({
                data: { name: 'Caja Principal', isOpen: true }
            });
        }

        // Crear turno
        const shift = await (this.prisma as any).cashShift.create({
            data: {
                cashRegisterId: cashRegister.id,
                cashierId: data.cashierId,
                startAmount: data.startAmount,
                status: 'OPEN'
            },
            include: {
                cashier: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        // Registrar transacción de apertura
        await (this.prisma as any).cashTransaction.create({
            data: {
                shiftId: shift.id,
                type: 'OPENING',
                amount: data.startAmount,
                description: 'Apertura de caja'
            }
        });

        return shift;
    }

    // Cerrar turno
    async closeShift(shiftId: string, data: { endAmount: number; note?: string }) {
        const shift = await (this.prisma as any).cashShift.findUnique({
            where: { id: shiftId },
            include: {
                transactions: true
            }
        });

        if (!shift) {
            throw new Error('Turno no encontrado');
        }

        if (shift.status === 'CLOSED') {
            throw new Error('El turno ya está cerrado');
        }

        // Calcular monto del sistema
        const systemAmount = shift.transactions.reduce((sum: number, tx: any) => {
            if (tx.type === 'SALE_INCOME') return sum + Number(tx.amount);
            if (tx.type === 'EXPENSE' || tx.type === 'WITHDRAWAL') return sum - Number(tx.amount);
            return sum;
        }, Number(shift.startAmount));

        // Actualizar turno
        const updatedShift = await (this.prisma as any).cashShift.update({
            where: { id: shiftId },
            data: {
                status: 'CLOSED',
                closingTime: new Date(),
                endAmount: data.endAmount,
                systemAmount,
                note: data.note
            },
            include: {
                cashier: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                transactions: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        // Registrar transacción de cierre
        await (this.prisma as any).cashTransaction.create({
            data: {
                shiftId,
                type: 'CLOSING',
                amount: data.endAmount,
                description: `Cierre de caja. Diferencia: $${data.endAmount - systemAmount}`
            }
        });

        return updatedShift;
    }

    // Obtener turno activo de un cajero
    async getActiveShift(cashierId: string) {
        return (this.prisma as any).cashShift.findFirst({
            where: {
                cashierId,
                status: 'OPEN'
            },
            include: {
                cashier: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                transactions: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
    }

    // Listar todos los turnos
    async findAll(filters?: { cashierId?: string; status?: string }) {
        return (this.prisma as any).cashShift.findMany({
            where: {
                cashierId: filters?.cashierId,
                status: filters?.status as any
            },
            include: {
                cashier: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                transactions: true,
                sales: {
                    select: {
                        id: true,
                        code: true,
                        channel: true,
                        total: true,
                        paymentMethod: true,
                        paymentStatus: true,
                        createdAt: true,
                    },
                    where: { status: { not: 'CANCELLED' } },
                    orderBy: { createdAt: 'desc' },
                }
            },
            orderBy: { openingTime: 'desc' }
        });
    }

    /**
     * Get a complete shift summary with revenue breakdown by channel.
     * Queries ALL sales during the shift period (not just shiftId-linked),
     * so Uber Eats and other external orders are included.
     */
    async getShiftSummary(shiftId: string) {
        const shift = await (this.prisma as any).cashShift.findUnique({
            where: { id: shiftId },
            include: {
                cashier: { select: { id: true, name: true } },
                transactions: { orderBy: { createdAt: 'asc' } },
            },
        });

        if (!shift) throw new Error('Turno no encontrado');

        // Query ALL sales during the shift period (captures Uber, Web, POS, etc.)
        const periodEnd = shift.closingTime || new Date();
        const allSalesInPeriod = await (this.prisma as any).sale.findMany({
            where: {
                createdAt: {
                    gte: shift.openingTime,
                    lte: periodEnd,
                },
                status: { not: 'CANCELLED' },
            },
            select: {
                id: true,
                code: true,
                channel: true,
                total: true,
                paymentMethod: true,
                paymentStatus: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        // Build revenue breakdown by channel
        const channelBreakdown: Record<string, { count: number; total: number }> = {};
        for (const sale of allSalesInPeriod) {
            const ch = sale.channel || 'OTHER';
            if (!channelBreakdown[ch]) channelBreakdown[ch] = { count: 0, total: 0 };
            channelBreakdown[ch].count++;
            channelBreakdown[ch].total += Number(sale.total);
        }

        // Build revenue breakdown by payment method
        const paymentBreakdown: Record<string, { count: number; total: number }> = {};
        for (const sale of allSalesInPeriod) {
            const pm = sale.paymentMethod || 'SIN_MÉTODO';
            if (!paymentBreakdown[pm]) paymentBreakdown[pm] = { count: 0, total: 0 };
            paymentBreakdown[pm].count++;
            paymentBreakdown[pm].total += Number(sale.total);
        }

        // ✅ Comisiones por plataforma externa
        // Uber Eats cobra ~15%, PedidosYa ~20% del total bruto
        const PLATFORM_COMMISSIONS: Record<string, { rate: number; label: string }> = {
            UBER_EATS: { rate: 0.15, label: 'Uber Eats' },
            PEDIDOS_YA: { rate: 0.20, label: 'PedidosYa' },
        };

        const platformCommissions: Record<string, {
            label: string;
            count: number;
            gross: number;
            commissionRate: number;
            commission: number;
            net: number;
        }> = {};

        let totalCommissions = 0;

        for (const [channel, config] of Object.entries(PLATFORM_COMMISSIONS)) {
            const channelData = channelBreakdown[channel];
            if (channelData && channelData.count > 0) {
                const commission = Math.round(channelData.total * config.rate);
                totalCommissions += commission;
                platformCommissions[channel] = {
                    label: config.label,
                    count: channelData.count,
                    gross: channelData.total,
                    commissionRate: config.rate,
                    commission,
                    net: channelData.total - commission,
                };
            }
        }

        const totalRevenue = allSalesInPeriod.reduce((sum: number, s: any) => sum + Number(s.total), 0);

        return {
            ...shift,
            sales: allSalesInPeriod,
            channelBreakdown,
            paymentBreakdown,
            platformCommissions,
            totalCommissions,
            totalRevenue,
            totalNetRevenue: totalRevenue - totalCommissions,
            totalOrders: allSalesInPeriod.length,
        };
    }

    // Registrar venta en turno
    async registerSale(shiftId: string, amount: number, saleId: string) {
        return (this.prisma as any).cashTransaction.create({
            data: {
                shiftId,
                type: 'SALE_INCOME',
                amount,
                description: `Venta #${saleId}`,
                relatedSaleId: saleId
            }
        });
    }

    // Registrar gasto/retiro
    async registerExpense(shiftId: string, data: { amount: number; description: string; type: 'EXPENSE' | 'WITHDRAWAL' }) {
        return (this.prisma as any).cashTransaction.create({
            data: {
                shiftId,
                type: data.type,
                amount: data.amount,
                description: data.description
            }
        });
    }
}
