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
                transactions: true
            },
            orderBy: { openingTime: 'desc' }
        });
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
