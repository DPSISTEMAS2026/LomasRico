import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { TerminalMethod, TerminalStatus } from './tuu-terminal.service';

const MP = 'https://api.mercadopago.com';
const DEFAULT_POINT_TERMINAL = 'NEWLAND_N950__N950NCD300010100';

function asciiField(value: string) {
    return value.normalize('NFD').replace(/[^\x20-\x7E]/g, '').replace(/[&/]/g, '').trim();
}

function mapStatus(orderStatus: string, paymentStatus: string, detail: string): TerminalStatus {
    const order = orderStatus.toLowerCase();
    const pay = paymentStatus.toLowerCase();
    const why = detail.toLowerCase();
    const rejected = pay === 'rejected' || pay === 'failed' || order === 'failed' || order === 'rejected'
        || why.startsWith('cc_rejected') || why.startsWith('rejected') || why === 'failed';
    if (rejected) return 'FAILED';
    if (pay === 'processed' || pay === 'accredited' || pay === 'approved' || why === 'accredited' || order === 'processed') return 'COMPLETED';
    if (order === 'canceled' || order === 'cancelled' || order === 'expired' || order === 'refunded' || pay === 'canceled' || pay === 'cancelled') return 'CANCELED';
    if (order === 'at_terminal' || order === 'action_required' || pay === 'at_terminal' || pay === 'action_required') return 'PROCESSING';
    if (order === 'created' || pay === 'created') return 'SENT';
    return 'PENDING';
}

function failMessage(detail: string): string {
    const d = detail.toLowerCase();
    if (d.includes('insufficient')) return 'Saldo insuficiente';
    if (d.includes('call_for_authorize')) return 'El banco pide autorización';
    if (d.includes('bad_filled') || d.includes('invalid')) return 'La tarjeta no se pudo leer';
    if (d.includes('expired') || d.includes('disabled')) return 'Tarjeta vencida o bloqueada';
    return 'La tarjeta fue rechazada';
}

/** Cobro en la Point Smart 2 (modo PDV) con la Orders API de Mercado Pago. */
@Injectable()
export class PointTerminalService {
    private readonly logger = new Logger(PointTerminalService.name);

    constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

    private async mp(path: string, init: RequestInit = {}) {
        const headers = new Headers(init.headers);
        headers.set('Authorization', `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`);
        headers.set('Content-Type', 'application/json');
        const res = await fetch(`${MP}${path}`, { ...init, headers });
        const text = await res.text();
        let data: any = null;
        try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
        if (!res.ok) {
            const msg = String(data?.message || data?.error || '').slice(0, 180);
            this.logger.error(`Point ${path} ${res.status} ${msg}`);
            if (res.status === 409) throw new BadRequestException('La Point ya tiene un cobro en curso. Cancélalo en la máquina');
            throw new BadRequestException('La Point rechazó el cobro');
        }
        return data;
    }

    async charge(input: { amount: number; method: TerminalMethod; reference: string; actorId?: string }) {
        const amount = Math.round(Number(input.amount));
        if (!(amount >= 100)) throw new BadRequestException('El monto mínimo para cobrar en la máquina es $100');
        const terminalId = String(process.env.MERCADOPAGO_POINT_TERMINAL_ID || DEFAULT_POINT_TERMINAL).trim();
        if (!process.env.MERCADOPAGO_ACCESS_TOKEN || !terminalId) {
            throw new BadRequestException('La Point no está configurada');
        }
        const method: TerminalMethod = input.method === 'DEBIT' ? 'DEBIT' : 'CREDIT';
        const reference = asciiField(String(input.reference || 'pos')).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24);
        const external = `${reference || 'pos'}-${Date.now().toString(36)}`;
        const data = await this.mp('/v1/orders', {
            method: 'POST',
            headers: { 'X-Idempotency-Key': randomUUID() },
            body: JSON.stringify({
                type: 'point',
                external_reference: external,
                expiration_time: 'PT10M',
                description: asciiField(`Lo Mas Rico ${reference}`).slice(0, 60),
                transactions: { payments: [{ amount: String(amount) }] },
                config: {
                    point: { terminal_id: terminalId, print_on_terminal: 'seller_ticket' },
                    payment_method: { default_type: method === 'DEBIT' ? 'debit_card' : 'credit_card' },
                },
            }),
        });
        const key = String(data?.id || '');
        if (!key) throw new BadRequestException('La Point no entregó el cobro');
        await this.audit.log({
            action: 'TERMINAL_CHARGE',
            actorId: input.actorId,
            amount,
            reason: reference || null,
            details: { key, method, provider: 'POINT' },
        });
        this.logger.log(`Point charge method=${method} amount=${amount} order=${key.slice(0, 8)}`);
        return { key, amount, method };
    }

    async status(key: string) {
        if (!/^[A-Za-z0-9_-]{8,80}$/.test(String(key || ''))) throw new BadRequestException('Cobro no válido');
        const data = await this.mp(`/v1/orders/${encodeURIComponent(key)}`);
        const payment = data?.transactions?.payments?.[0];
        const amount = Number(payment?.amount);
        const detail = String(payment?.status_detail || data?.status_detail || '');
        const status = mapStatus(String(data?.status || ''), String(payment?.status || ''), detail);
        return {
            key,
            status,
            amount: Number.isFinite(amount) ? amount : null,
            message: status === 'FAILED' ? failMessage(detail) : status === 'CANCELED' ? 'Se canceló el cobro en la máquina' : null,
        };
    }

    async cancel(key: string) {
        if (!/^[A-Za-z0-9_-]{8,80}$/.test(String(key || ''))) return { ok: false };
        try {
            await this.mp(`/v1/orders/${encodeURIComponent(key)}/cancel`, {
                method: 'POST',
                headers: {
                    'X-Idempotency-Key': randomUUID(),
                    'x-allow-cancelable-status': 'at_terminal',
                },
            });
        } catch (err) {
            this.logger.warn(`Point cancel ${key.slice(0, 8)}: ${err instanceof Error ? err.message : 'error'}`);
        }
        return { ok: true };
    }

    async assertPaid(key: string | undefined, total: number) {
        if (!key) throw new BadRequestException('Cobra primero en la Point');
        const used = await this.prisma.sale.findFirst({
            where: { shippingData: { path: ['terminalPayment', 'key'], equals: key } },
            select: { code: true },
        });
        if (used) throw new BadRequestException(`Ese cobro ya se registró en la venta ${used.code}`);
        const result = await this.status(key);
        if (result.status !== 'COMPLETED') throw new BadRequestException('El cobro en la Point no está aprobado');
        if (result.amount == null || Math.round(result.amount) < Math.round(total)) {
            throw new BadRequestException('Lo cobrado en la Point no cubre el total');
        }
        return { provider: 'POINT', key, amount: result.amount };
    }
}
