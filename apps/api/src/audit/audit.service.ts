import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CASH_ROLES } from '../auth/access';
import { LoginThrottle } from '../auth/login-throttle';

export type Approver = { id: string; name: string; role: string };

export type AuditEntry = {
    action: string;
    actorId?: string | null;
    approver?: Approver | null;
    saleId?: string | null;
    saleCode?: string | null;
    amount?: number | null;
    reason?: string | null;
    details?: any;
};

@Injectable()
export class AuditService {
    private readonly throttle = new LoginThrottle();

    constructor(private readonly prisma: PrismaService) { }

    /** Exige motivo y el PIN de un cajero, administrador o dueño antes de una acción sensible. */
    async authorize(req: any, approvalPin: unknown, reason: unknown): Promise<{ approver: Approver; reason: string }> {
        const why = typeof reason === 'string' ? reason.trim() : '';
        if (why.length < 3) throw new BadRequestException('Indica el motivo');
        const approver = await this.throttle.run(req, async () => {
            const pin = typeof approvalPin === 'string' ? approvalPin.trim() : '';
            if (!/^\d{4}$/.test(pin)) throw new UnauthorizedException('PIN de autorización incorrecto');
            const matches = await this.prisma.user.findMany({
                where: { pin, role: { in: CASH_ROLES as any } },
                select: { id: true, name: true, role: true },
            });
            if (matches.length !== 1) throw new UnauthorizedException('PIN de autorización incorrecto');
            return { id: matches[0].id, name: matches[0].name || 'Sin nombre', role: matches[0].role };
        });
        return { approver, reason: why.slice(0, 300) };
    }

    /** Nunca bloquea la operación: si el registro falla, se informa en consola. */
    async log(entry: AuditEntry, tx?: any) {
        const db = tx || this.prisma;
        try {
            const actor = entry.actorId
                ? await db.user.findUnique({ where: { id: entry.actorId }, select: { name: true } })
                : null;
            await db.auditLog.create({
                data: {
                    action: entry.action,
                    actorId: entry.actorId || null,
                    actorName: actor?.name || null,
                    approverId: entry.approver?.id || null,
                    approverName: entry.approver?.name || null,
                    saleId: entry.saleId || null,
                    saleCode: entry.saleCode || null,
                    amount: entry.amount ?? null,
                    reason: entry.reason || null,
                    details: entry.details ?? undefined,
                },
            });
        } catch (err: any) {
            if (tx) throw err;
            console.error('[AUDIT] No se pudo registrar', entry.action, err?.message);
        }
    }

    list(params: { from?: string; to?: string; action?: string; take?: number }) {
        const createdAt: any = {};
        if (params.from) createdAt.gte = new Date(params.from);
        if (params.to) createdAt.lte = new Date(params.to);
        return this.prisma.auditLog.findMany({
            where: {
                ...(Object.keys(createdAt).length ? { createdAt } : {}),
                ...(params.action ? { action: params.action } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: Math.min(Math.max(Number(params.take) || 200, 1), 500),
        });
    }
}
