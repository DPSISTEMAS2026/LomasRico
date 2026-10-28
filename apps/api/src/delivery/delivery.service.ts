import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BrevoService } from '../mail/brevo.service';
import { orderOnTheWayHtml } from '../mail/order-email';

export type DriverDeliveryStatus = 'QUEUED' | 'PICKED' | 'OUT' | 'DONE';

/**
 * El módulo de reparto se alimenta cuando cocina deja el ticket en READY
 * (listo para entregar / repartir). Pedidos ya tomados (PICKED/OUT) siguen
 * visibles aunque cocina pase a DELIVERED.
 */
const ACTIVE_ORDER = ['CONFIRMED', 'PREPARING', 'COMPLETED'] as const;
const KITCHEN_READY = ['READY', 'DELIVERED'] as const;
const HOURS = 18;
const MAX_ROWS = 40;
const CACHE_MS = 10_000;

function asShip(raw: unknown): Record<string, any> {
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...(raw as any) } : {};
}

function driverStatus(ship: Record<string, any>): DriverDeliveryStatus {
    const s = String(ship?.delivery?.status || 'QUEUED').toUpperCase();
    if (s === 'PICKED' || s === 'OUT' || s === 'DONE') return s;
    return 'QUEUED';
}

function mapSaleLite(sale: any) {
    const ship = asShip(sale.shippingData);
    const contact = ship.contact || {};
    const address = String(ship.address || '').trim();
    const st = driverStatus(ship);
    const kitchenStatus = (sale.kitchenTickets || [])[0]?.status || null;
    const kitchenReady = KITCHEN_READY.includes(kitchenStatus as any);
    return {
        id: sale.id,
        code: sale.code,
        total: Number(sale.total),
        shippingCost: Number(ship.cost || 0) || 0,
        courierPay: Number(ship.courierFee || ship.cost || 0) || 0,
        createdAt: sale.createdAt,
        address,
        customerName: String(contact.name || '').trim() || 'Cliente',
        customerPhone: String(contact.phone || '').replace(/[^\d+]/g, '').slice(0, 16),
        deliveryStatus: st,
        kitchenStatus,
        outAt: ship.delivery?.outAt || null,
        doneAt: ship.delivery?.doneAt || null,
        /** Listo para que el repartidor lo tome = cocina READY/DELIVERED. */
        readyForPickup: kitchenReady,
    };
}

const STATUS_ORDER: Record<DriverDeliveryStatus, number> = {
    OUT: 0,
    PICKED: 1,
    QUEUED: 2,
    DONE: 3,
};

@Injectable()
export class DeliveryService {
    private readonly logger = new Logger(DeliveryService.name);
    private cache: { at: number; key: string; data: any[] } | null = null;

    constructor(
        private readonly prisma: PrismaService,
        private readonly brevo: BrevoService,
    ) {}

    private bust() {
        this.cache = null;
    }

    async listForDriver(opts?: { includeDone?: boolean }) {
        const key = opts?.includeDone ? 'all' : 'active';
        if (this.cache && this.cache.key === key && Date.now() - this.cache.at < CACHE_MS) {
            return this.cache.data;
        }

        const since = new Date(Date.now() - HOURS * 60 * 60 * 1000);
        // Join mínimo: solo status del ticket de cocina (1 fila).
        const sales = await (this.prisma as any).sale.findMany({
            where: {
                fulfillmentType: 'DELIVERY',
                status: { in: [...ACTIVE_ORDER] },
                createdAt: { gte: since },
            },
            orderBy: { createdAt: 'asc' },
            take: MAX_ROWS,
            select: {
                id: true,
                code: true,
                total: true,
                status: true,
                createdAt: true,
                shippingData: true,
                kitchenTickets: {
                    select: { status: true },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });

        const mapped = sales
            .map(mapSaleLite)
            .filter((o: any) => {
                if (!o.address) return false;
                if (o.deliveryStatus === 'DONE') return !!opts?.includeDone;
                // En cola solo si cocina ya lo dejó listo; si el repartidor ya lo tomó, siempre visible.
                if (o.deliveryStatus === 'PICKED' || o.deliveryStatus === 'OUT') return true;
                return o.readyForPickup;
            })
            .sort((a: any, b: any) => {
                const so = STATUS_ORDER[a.deliveryStatus as DriverDeliveryStatus] - STATUS_ORDER[b.deliveryStatus as DriverDeliveryStatus];
                if (so !== 0) return so;
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            });

        this.cache = { at: Date.now(), key, data: mapped };
        return mapped;
    }

    async setStatus(saleId: string, next: DriverDeliveryStatus, actor: { userId: string; name?: string }) {
        if (!['PICKED', 'OUT', 'DONE', 'QUEUED'].includes(next)) {
            throw new BadRequestException('Estado de entrega no válido');
        }
        const sale = await (this.prisma as any).sale.findUnique({
            where: { id: saleId },
            select: {
                id: true,
                code: true,
                total: true,
                fulfillmentType: true,
                status: true,
                createdAt: true,
                shippingData: true,
                kitchenTickets: {
                    select: { id: true, status: true },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });
        if (!sale || sale.fulfillmentType !== 'DELIVERY') {
            throw new NotFoundException('Pedido de despacho no encontrado');
        }
        if (sale.status === 'CANCELLED' || sale.status === 'PENDING') {
            throw new BadRequestException('Este pedido aún no se puede despachar');
        }

        const ship = asShip(sale.shippingData);
        const prev = driverStatus(ship);
        const kitchenStatus = sale.kitchenTickets?.[0]?.status;
        const kitchenReady = KITCHEN_READY.includes(kitchenStatus as any);

        if (next === 'PICKED' && prev === 'QUEUED' && !kitchenReady) {
            throw new BadRequestException('La cocina aún no marcó este pedido como listo');
        }

        const allowed: Record<DriverDeliveryStatus, DriverDeliveryStatus[]> = {
            QUEUED: ['PICKED'],
            PICKED: ['OUT', 'QUEUED'],
            OUT: ['DONE', 'PICKED'],
            DONE: [],
        };
        if (next !== prev && !(allowed[prev] || []).includes(next)) {
            throw new BadRequestException(`No se puede pasar de ${prev} a ${next}`);
        }

        const now = new Date().toISOString();
        const delivery = {
            status: next,
            driverId: actor.userId,
            driverName: actor.name || null,
            pickedAt: ship.delivery?.pickedAt || (next === 'PICKED' ? now : undefined),
            outAt: ship.delivery?.outAt || (next === 'OUT' ? now : undefined),
            doneAt: next === 'DONE' ? now : ship.delivery?.doneAt,
        };

        const updated = await (this.prisma as any).sale.update({
            where: { id: saleId },
            data: {
                shippingData: { ...ship, delivery },
                ...(next === 'DONE' && sale.status !== 'COMPLETED' ? { status: 'COMPLETED' } : {}),
            },
            select: {
                id: true,
                code: true,
                total: true,
                status: true,
                createdAt: true,
                shippingData: true,
                kitchenTickets: {
                    select: { status: true },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });

        // Si el repartidor toma el pedido, marcar ticket cocina como DELIVERED (salido a calle).
        if (next === 'PICKED' && sale.kitchenTickets?.[0]?.id && sale.kitchenTickets[0].status === 'READY') {
            await (this.prisma as any).kitchenTicket.update({
                where: { id: sale.kitchenTickets[0].id },
                data: { status: 'DELIVERED' },
            }).catch(() => null);
        }

        this.bust();
        if (next === 'OUT' && prev !== 'OUT') {
            await this.notifyOnTheWay(sale.id);
        }
        return mapSaleLite(updated);
    }

    /** Aviso al cliente. Si Brevo falla, el pedido igual queda en camino. */
    private async notifyOnTheWay(saleId: string) {
        try {
            if (!this.brevo.isConfigured()) return;
            const sale = await (this.prisma as any).sale.findUnique({
                where: { id: saleId },
                include: { items: { include: { sellingProduct: { select: { name: true } } } } },
            });
            const contact = asShip(sale?.shippingData).contact || {};
            const email = String(contact.email || '').trim();
            if (!sale || !email) return;
            await this.brevo.sendTransactional(
                email,
                contact.name || email,
                `Vamos en camino con tu pedido ${sale.code}`,
                orderOnTheWayHtml(sale, contact.name),
            );
        } catch (err: any) {
            this.logger.error(`No se pudo avisar en camino ${saleId}: ${err?.message}`);
        }
    }
}
