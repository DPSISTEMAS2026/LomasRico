import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CashiersService {
    constructor(private prisma: PrismaService) { }

    // Crear personal operativo
    async createCashier(data: { name: string; email: string; pin: string; role?: string; modules?: string[]; canDiscount?: boolean }) {
        const modulesJson = JSON.stringify(data.modules || []);
        return (this.prisma as any).user.create({
            data: {
                name: data.name,
                email: data.email,
                pin: data.pin,
                role: data.role || 'CASHIER',
                modules: modulesJson,
                canDiscount: data.canDiscount || false,
                isVerified: true
            }
        });
    }

    // Listar todo el personal operativo (Cajeros y Cocina) — SIN ADMIN ni OWNER
    async findAll() {
        return (this.prisma as any).user.findMany({
            where: {
                role: { in: ['CASHIER', 'KITCHEN', 'ADMIN'] }
            },
            select: {
                id: true,
                name: true,
                email: true,
                pin: true,
                role: true,
                modules: true,
                canDiscount: true,
                createdAt: true,
                shifts: {
                    take: 5,
                    orderBy: { openingTime: 'desc' },
                    select: {
                        id: true,
                        openingTime: true,
                        closingTime: true,
                        status: true,
                        startAmount: true,
                        endAmount: true
                    }
                }
            }
        });
    }

    // Actualizar módulos permitidos de un usuario
    async updateModules(id: string, modules: string[]) {
        return (this.prisma as any).user.update({
            where: { id },
            data: { modules: JSON.stringify(modules) }
        });
    }

    // Actualizar permisos específicos
    async updatePermissions(id: string, permissions: { canDiscount?: boolean }) {
        return (this.prisma as any).user.update({
            where: { id },
            data: { ...permissions }
        });
    }

    // Actualizar rol de un usuario
    async updateRole(id: string, role: string) {
        return (this.prisma as any).user.update({
            where: { id },
            data: { role }
        });
    }

    // Verificar PIN
    async verifyPin(pin: string) {
        const cashier = await (this.prisma as any).user.findFirst({
            where: { pin, role: { in: ['CASHIER', 'KITCHEN', 'ADMIN'] } },
            select: { id: true, name: true, email: true, role: true, modules: true, canDiscount: true }
        });
        return cashier;
    }

    // Eliminar personal
    async delete(id: string) {
        return (this.prisma as any).user.delete({
            where: { id }
        });
    }
}
