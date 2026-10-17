import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { STAFF_ROLES } from '../auth/access';
import { AuditService } from '../audit/audit.service';

/** Roles que se pueden asignar desde el panel. OWNER nunca se crea ni se asigna por aquí. */
const ASSIGNABLE_ROLES = ['ADMIN', 'CASHIER', 'KITCHEN', 'WAITER', 'DRIVER'];
const DEFAULT_PIN = '2026';

const SAFE_SELECT = {
    id: true,
    name: true,
    email: true,
    role: true,
    modules: true,
    canDiscount: true,
    createdAt: true,
};

type Actor = { userId: string; role: string };

@Injectable()
export class CashiersService {
    constructor(private prisma: PrismaService, private audit: AuditService) { }

    private track(action: string, actor: Actor, target: { id: string; name?: string | null; role?: string }, change: any) {
        return this.audit.log({
            action,
            actorId: actor.userId,
            details: { targetId: target.id, targetName: target.name || null, targetRole: target.role || null, ...change },
        });
    }

    private checkRole(role: string, actor: Actor) {
        if (!ASSIGNABLE_ROLES.includes(role)) throw new BadRequestException('Rol no válido');
        if (role === 'ADMIN' && actor.role !== 'OWNER') {
            throw new ForbiddenException('Solo el dueño puede crear administradores');
        }
    }

    private async checkPin(pin: string, exceptId?: string) {
        if (!/^\d{4}$/.test(String(pin || ''))) throw new BadRequestException('El PIN debe ser numérico de 4 dígitos');
        if (pin === DEFAULT_PIN) throw new BadRequestException('Ese PIN no está permitido');
        const taken = await this.prisma.user.findFirst({
            where: { pin, role: { in: [...STAFF_ROLES, 'DRIVER'] as any }, ...(exceptId ? { id: { not: exceptId } } : {}) },
            select: { id: true },
        });
        if (taken) throw new ConflictException('Ese PIN ya lo usa otra persona');
    }

    /** Solo personal editable: nunca OWNER ni clientes; un ADMIN no puede tocar a otro ADMIN. */
    private async editable(id: string, actor: Actor) {
        const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
        if (!user || !ASSIGNABLE_ROLES.includes(user.role)) throw new NotFoundException('Persona no encontrada');
        if (user.role === 'ADMIN' && actor.role !== 'OWNER' && user.id !== actor.userId) {
            throw new ForbiddenException('Solo el dueño puede modificar administradores');
        }
        return user;
    }

    async createCashier(
        data: { name: string; email: string; pin: string; role?: string; modules?: string[]; canDiscount?: boolean },
        actor: Actor,
    ) {
        const role = data.role || 'CASHIER';
        this.checkRole(role, actor);
        if (!String(data.name || '').trim() || !String(data.email || '').trim()) {
            throw new BadRequestException('Completa nombre y email');
        }
        await this.checkPin(data.pin);
        const email = String(data.email).trim().toLowerCase();
        if (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) {
            throw new ConflictException('Ese email ya está registrado');
        }
        const created = await this.prisma.user.create({
            data: {
                name: String(data.name).trim().slice(0, 80),
                email,
                pin: data.pin,
                role: role as any,
                modules: JSON.stringify(data.modules || []),
                canDiscount: !!data.canDiscount,
                isVerified: true,
            } as any,
            select: SAFE_SELECT,
        });
        await this.track('STAFF_CREATE', actor, created, { email });
        return created;
    }

    async findAll() {
        return this.prisma.user.findMany({
            where: { role: { in: ASSIGNABLE_ROLES as any } },
            select: {
                ...SAFE_SELECT,
                shifts: {
                    take: 5,
                    orderBy: { openingTime: 'desc' },
                    select: {
                        id: true,
                        openingTime: true,
                        closingTime: true,
                        status: true,
                        startAmount: true,
                        endAmount: true,
                    },
                },
            } as any,
        });
    }

    async updateModules(id: string, modules: string[], actor: Actor) {
        await this.editable(id, actor);
        const updated = await this.prisma.user.update({
            where: { id },
            data: { modules: JSON.stringify(Array.isArray(modules) ? modules : []) } as any,
            select: SAFE_SELECT,
        });
        await this.track('STAFF_UPDATE', actor, updated, { modules });
        return updated;
    }

    async updatePermissions(id: string, permissions: { canDiscount?: boolean }, actor: Actor) {
        await this.editable(id, actor);
        const updated = await this.prisma.user.update({
            where: { id },
            data: { canDiscount: !!permissions?.canDiscount } as any,
            select: SAFE_SELECT,
        });
        await this.track('STAFF_UPDATE', actor, updated, { canDiscount: !!permissions?.canDiscount });
        return updated;
    }

    async updateRole(id: string, role: string, actor: Actor) {
        const before = await this.editable(id, actor);
        this.checkRole(role, actor);
        const updated = await this.prisma.user.update({ where: { id }, data: { role: role as any }, select: SAFE_SELECT });
        await this.track('STAFF_UPDATE', actor, updated, { roleFrom: before.role, roleTo: role });
        return updated;
    }

    async updatePin(id: string, pin: string, actor: Actor) {
        if (id !== actor.userId) await this.editable(id, actor);
        await this.checkPin(pin, id);
        const updated = await this.prisma.user.update({ where: { id }, data: { pin }, select: { id: true, name: true, role: true } });
        await this.track('STAFF_UPDATE', actor, updated, { pinChanged: true });
        return { success: true };
    }

    async delete(id: string, actor: Actor) {
        if (id === actor.userId) throw new BadRequestException('No puedes eliminar tu propia cuenta');
        await this.editable(id, actor);
        const deleted = await this.prisma.user.delete({ where: { id }, select: SAFE_SELECT }).catch((err: any) => {
            if (err?.code === 'P2003') {
                throw new ConflictException('Tiene turnos o ventas registradas. Cámbiale el PIN para quitarle el acceso.');
            }
            throw err;
        });
        await this.track('STAFF_DELETE', actor, deleted, { email: deleted.email });
        return deleted;
    }
}
