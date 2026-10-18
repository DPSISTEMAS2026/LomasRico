import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ShiftsService {
    constructor(private prisma: PrismaService, private audit: AuditService) { }

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
            throw new BadRequestException('Ya existe un turno abierto para este cajero');
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

    /**
     * Solo el efectivo debe estar en el cajón: tarjetas, transferencias y MercadoPago
     * se informan por medio de pago pero no suman al monto esperado.
     */
    async cashSummary(shift: any) {
        const txs: any[] = shift.transactions || [];
        const saleIds = [...new Set(txs.map((t) => t.relatedSaleId).filter(Boolean))];
        const sales = saleIds.length
            ? await (this.prisma as any).sale.findMany({
                where: { id: { in: saleIds } },
                select: { id: true, paymentMethod: true, shippingData: true },
            })
            : [];
        const methodOf = new Map<string, string>(sales.map((s: any) => [s.id, s.paymentMethod || 'OTHER']));
        const byMethod: Record<string, number> = {};
        let expectedCash = Number(shift.startAmount || 0);
        let expenses = 0;
        let withdrawals = 0;
        let refunds = 0;
        let tipsTotal = 0;
        let tipsCash = 0;
        let shippingTotal = 0;
        for (const sale of sales) {
            const ship = sale.shippingData && typeof sale.shippingData === 'object' ? sale.shippingData : {};
            const tip = Math.round(Number(ship?.tip?.amount || 0));
            const shipping = Math.round(Number(ship?.cost || 0));
            const method = sale.paymentMethod || 'OTHER';
            if (tip > 0) {
                tipsTotal += tip;
                if (method === 'CASH') tipsCash += tip;
            }
            if (shipping > 0) shippingTotal += shipping;
        }
        for (const tx of txs) {
            const amount = Number(tx.amount);
            const method = tx.relatedSaleId ? (methodOf.get(tx.relatedSaleId) || 'OTHER') : 'CASH';
            if (tx.type === 'SALE_INCOME') {
                byMethod[method] = (byMethod[method] || 0) + amount;
                if (method === 'CASH') expectedCash += amount;
            } else if (tx.type === 'REFUND') {
                byMethod[method] = (byMethod[method] || 0) - amount;
                refunds += amount;
                if (method === 'CASH') expectedCash -= amount;
            } else if (tx.type === 'EXPENSE') {
                expenses += amount;
                expectedCash -= amount;
            } else if (tx.type === 'WITHDRAWAL') {
                withdrawals += amount;
                expectedCash -= amount;
            }
        }
        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'post-fix',hypothesisId:'H1-H3',location:'shifts.service.ts:cashSummary',message:'cashSummary tip+shipping',data:{shiftId:shift?.id,sales:sales.length,expectedCash,tipsTotal,tipsCash,shippingTotal},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        return {
            startAmount: Number(shift.startAmount || 0),
            expectedCash,
            byMethod,
            expenses,
            withdrawals,
            refunds,
            tipsTotal,
            tipsCash,
            shippingTotal,
        };
    }

    /** El turno debe existir, estar abierto y ser de quien opera (salvo dueño/admin). */
    async assertOpenShiftOf(shiftId: string, user: any) {
        const shift = await (this.prisma as any).cashShift.findUnique({ where: { id: shiftId }, select: { id: true, cashierId: true, status: true } });
        if (!shift) throw new NotFoundException('Turno no encontrado');
        if (shift.status !== 'OPEN') throw new BadRequestException('El turno ya está cerrado');
        if (!['OWNER', 'ADMIN'].includes(user?.role) && shift.cashierId !== user?.userId) {
            throw new ForbiddenException('Este turno es de otro cajero');
        }
        return shift;
    }

    /** Mesas con comensales activos o cuenta DINE_IN sin cobrar. */
    async listOpenFloorTables(): Promise<{ number: number; name: string }[]> {
        const [occupied, unpaid] = await Promise.all([
            (this.prisma as any).diningTable.findMany({
                where: { isActive: true, guests: { some: { isActive: true } } },
                select: { number: true, name: true },
                orderBy: { number: 'asc' },
            }),
            (this.prisma as any).sale.findMany({
                where: {
                    fulfillmentType: 'DINE_IN',
                    paymentStatus: 'PENDING',
                    status: { notIn: ['CANCELLED', 'COMPLETED'] },
                    tableId: { not: null },
                },
                select: { table: { select: { number: true, name: true } } },
            }),
        ]);
        const byNumber = new Map<number, { number: number; name: string }>();
        for (const t of occupied) byNumber.set(t.number, { number: t.number, name: t.name || `Mesa ${t.number}` });
        for (const s of unpaid) {
            const t = s.table;
            if (t?.number != null) byNumber.set(t.number, { number: t.number, name: t.name || `Mesa ${t.number}` });
        }
        return [...byNumber.values()].sort((a, b) => a.number - b.number);
    }

    private async assertNoOpenTables() {
        const open = await this.listOpenFloorTables();
        if (!open.length) return;
        const labels = open.map((t) => t.name || `Mesa ${t.number}`).join(', ');
        throw new BadRequestException(
            `No puedes cerrar el turno: hay mesas abiertas (${labels}). Cóbralas o ciérralas en Salón antes.`,
        );
    }

    // Cerrar turno
    async closeShift(shiftId: string, data: { endAmount: number; note?: string }, actorId?: string) {
        const endAmount = Number(data?.endAmount);
        if (!Number.isFinite(endAmount) || endAmount < 0) throw new BadRequestException('Monto contado inválido');
        const shift = await (this.prisma as any).cashShift.findUnique({
            where: { id: shiftId },
            include: {
                transactions: true
            }
        });

        if (!shift) {
            throw new NotFoundException('Turno no encontrado');
        }

        if (shift.status === 'CLOSED') {
            throw new BadRequestException('El turno ya está cerrado');
        }

        await this.assertNoOpenTables();

        const summary = await this.cashSummary(shift);
        const systemAmount = summary.expectedCash;
        data = { ...data, endAmount };

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

        await this.audit.log({
            action: 'SHIFT_CLOSE',
            actorId,
            amount: data.endAmount - systemAmount,
            reason: data.note || null,
            details: { shiftId, cashierId: shift.cashierId, counted: data.endAmount, ...summary },
        });

        return { ...updatedShift, cashSummary: summary };
    }

    // Obtener turno activo de un cajero
    async getActiveShift(cashierId: string) {
        const shift = await (this.prisma as any).cashShift.findFirst({
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
        return shift ? { ...shift, cashSummary: await this.cashSummary(shift) } : null;
    }

    // Listar todos los turnos
    async findAll(filters?: { cashierId?: string; status?: string }) {
        const shifts = await (this.prisma as any).cashShift.findMany({
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
        return Promise.all(shifts.map(async (shift: any) =>
            shift.status === 'OPEN' ? { ...shift, cashSummary: await this.cashSummary(shift) } : shift,
        ));
    }

    /**
     * Resumen del turno: solo ventas vinculadas a este shiftId.
     * WEB/apps se asignan al turno de cajera; paneles OWNER/ADMIN quedan aparte.
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

        const allSalesInPeriod = await (this.prisma as any).sale.findMany({
            where: {
                shiftId,
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
    async registerExpense(shiftId: string, data: { amount: number; description: string; type: 'EXPENSE' | 'WITHDRAWAL' }, actorId?: string) {
        const amount = Number(data?.amount);
        const description = String(data?.description || '').trim().slice(0, 200);
        if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Monto inválido');
        if (data?.type !== 'EXPENSE' && data?.type !== 'WITHDRAWAL') throw new BadRequestException('Tipo inválido');
        if (description.length < 3) throw new BadRequestException('Indica el motivo');
        const tx = await (this.prisma as any).cashTransaction.create({
            data: { shiftId, type: data.type, amount, description }
        });
        await this.audit.log({
            action: data.type === 'EXPENSE' ? 'CASH_EXPENSE' : 'CASH_WITHDRAWAL',
            actorId,
            amount,
            reason: description,
            details: { shiftId },
        });
        return tx;
    }
}
