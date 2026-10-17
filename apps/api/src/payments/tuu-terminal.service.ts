import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { appendFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';

const REMOTE_BASE = 'https://integrations.payment.haulmer.com';
const STATUS_BY_CODE = ['PENDING', 'SENT', 'CANCELED', 'PROCESSING', 'FAILED', 'COMPLETED'] as const;
export type TerminalStatus = (typeof STATUS_BY_CODE)[number];
/** Solo tarjeta: la API RemotePayment de Haulmer admite paymentMethod 1 (crédito) o 2 (débito). Efectivo va por la app Pago de la TUU, no por RemotePayment. */
export type TerminalMethod = 'CREDIT' | 'DEBIT';

const ERRORS: Record<string, string> = {
    'MR-100': 'La máquina no está asociada a la cuenta TUU',
    'MR-161': 'No se encontró la máquina TUU configurada',
    'MR-180': 'La máquina tiene demasiados cobros en cola. Cancélalos en la máquina',
    'MR-203': 'Ya hay un cobro en proceso en la máquina',
    'RP-028': 'El monto mínimo para cobrar en la máquina es $100',
    'RP-029': 'La máquina no está en modo integración',
    'RP-032': 'La máquina no permite ese método de pago',
    'RP-008': 'Falta el método de pago en la máquina',
    'RP-025': 'Método de pago no válido para la máquina',
    'KEY-003': 'La clave de TUU no es válida',
    'MR-000': 'La clave de TUU no es válida',
};

/** Cobro con tarjeta en la máquina TUU vía RemotePayment. `CARD_TERMINAL=tuu` lo activa. */
export function cardTerminalEnabled() {
    return String(process.env.CARD_TERMINAL || '').trim().toLowerCase() === 'tuu'
        && !!process.env.TUU_API_KEY
        && !!process.env.TUU_DEVICE_SERIAL;
}

/** Solo débito/crédito pasan por RemotePayment. Efectivo/transferencia no. */
export function isTerminalPaymentMethod(method: string | undefined | null): method is TerminalMethod {
    return method === 'CREDIT' || method === 'DEBIT';
}

function asciiField(value: string) {
    return value.normalize('NFD').replace(/[^\x20-\x7E]/g, '').replace(/[&/]/g, '').trim();
}

function normalizeStatus(raw: unknown): TerminalStatus | null {
    if (typeof raw === 'number') return STATUS_BY_CODE[raw] ?? null;
    const text = String(raw ?? '').trim().toUpperCase();
    if (/^\d+$/.test(text)) return STATUS_BY_CODE[Number(text)] ?? null;
    if (text === 'CANCELLED') return 'CANCELED';
    return (STATUS_BY_CODE as readonly string[]).includes(text) ? (text as TerminalStatus) : null;
}

function normalizeMethod(raw: string | undefined): TerminalMethod {
    const m = String(raw || '').toUpperCase();
    if (m === 'DEBIT') return 'DEBIT';
    return 'CREDIT';
}

/** Haulmer RemotePayment: 1 = crédito, 2 = débito. No hay código de efectivo. */
function haulmerPaymentMethodCode(method: TerminalMethod): number {
    return method === 'DEBIT' ? 2 : 1;
}

// #region agent log
function dbg(hypothesisId: string, message: string, data: Record<string, unknown>) {
    try {
        appendFileSync(
            join(process.cwd(), 'debug-88a466.log'),
            JSON.stringify({
                sessionId: '88a466',
                runId: 'tuu-cash',
                hypothesisId,
                location: 'tuu-terminal.service.ts',
                message,
                data,
                timestamp: Date.now(),
            }) + '\n',
        );
    } catch { /* ignore */ }
}
// #endregion

@Injectable()
export class TuuTerminalService {
    private readonly logger = new Logger(TuuTerminalService.name);
    private readonly requested = new Map<string, { amount: number; method: TerminalMethod; at: number }>();

    constructor(private readonly prisma: PrismaService) {}

    private async call(path: string, init: RequestInit = {}) {
        const res = await fetch(`${process.env.TUU_REMOTE_URL || REMOTE_BASE}${path}`, {
            ...init,
            headers: { 'Content-Type': 'application/json', 'X-API-Key': String(process.env.TUU_API_KEY || ''), ...(init.headers || {}) },
        });
        const text = await res.text();
        let data: any = null;
        try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
        if (res.status === 429 || String(data?.code || '').includes('429')) {
            throw new HttpException('La máquina acepta un cobro por minuto. Espera unos segundos y vuelve a intentar', HttpStatus.TOO_MANY_REQUESTS);
        }
        if (!res.ok || data?.error === true) {
            const code = String(data?.code || '');
            this.logger.error(`TUU ${path} ${res.status} ${code}: ${String(data?.message || text).slice(0, 200)}`);
            // #region agent log
            dbg('H1', 'tuu.call.error', { path, status: res.status, code, msg: String(data?.message || '').slice(0, 160) });
            // #endregion
            throw new BadRequestException(ERRORS[code] || `La máquina rechazó el cobro${code ? ` (${code})` : ''}`);
        }
        return data;
    }

    /** Envía el cobro a la máquina. Devuelve la clave para seguir su estado. */
    async charge(input: { amount: number; method: TerminalMethod; reference: string }) {
        if (!cardTerminalEnabled()) throw new ServiceUnavailableException('La máquina TUU no está configurada');
        const amount = Math.round(Number(input.amount));
        if (!(amount >= 100)) throw new BadRequestException('El monto mínimo para cobrar en la máquina es $100');
        const method = normalizeMethod(input.method);
        const key = randomUUID();
        const reference = asciiField(String(input.reference || '')).slice(0, 20);
        const paymentMethod = haulmerPaymentMethodCode(method);
        const body: Record<string, unknown> = {
            idempotencyKey: key,
            amount,
            device: String(process.env.TUU_DEVICE_SERIAL),
            description: asciiField(`Lo Mas Rico ${reference}`).slice(0, 60),
            dteType: Number(process.env.TUU_DTE_TYPE || 48),
            tipAmount: 0,
            cashbackAmount: 0,
            paymentMethod,
            extraData: {
                customFields: reference ? [{ name: 'Pedido', value: reference, print: true }] : [],
                sourceName: 'LomasRico',
                sourceVersion: '1.0',
            },
        };

        this.logger.log(`TUU charge method=${method} paymentMethod=${paymentMethod} amount=${amount}`);
        // #region agent log
        dbg('H3', 'tuu.charge.send', {
            method,
            amount,
            paymentMethod,
            dteType: body.dteType,
            note: 'RemotePayment solo tarjeta; efectivo no usa este endpoint',
        });
        // #endregion

        try {
            await this.call('/RemotePayment/v2/Create', {
                method: 'POST',
                body: JSON.stringify(body),
            });
        } catch (err) {
            // #region agent log
            dbg('H3', 'tuu.charge.rejected', {
                method,
                paymentMethod,
                error: err instanceof Error ? err.message.slice(0, 160) : String(err).slice(0, 160),
            });
            // #endregion
            throw err;
        }
        this.requested.set(key, { amount, method, at: Date.now() });
        for (const [k, v] of this.requested) if (Date.now() - v.at > 6 * 60 * 60_000) this.requested.delete(k);
        // #region agent log
        dbg('H3', 'tuu.charge.accepted', { method, paymentMethod, keyPrefix: key.slice(0, 8) });
        // #endregion
        return { key, amount, method };
    }

    async status(key: string) {
        if (!cardTerminalEnabled()) throw new ServiceUnavailableException('La máquina TUU no está configurada');
        if (!/^[a-zA-Z0-9-]{1,36}$/.test(String(key || ''))) throw new BadRequestException('Cobro no válido');
        const data = await this.call(`/RemotePayment/v2/GetPaymentRequest/${encodeURIComponent(key)}`);
        const row = data?.data ?? data;
        const status = normalizeStatus(row?.status);
        const amount = Number(row?.amount ?? this.requested.get(key)?.amount ?? NaN);
        return { key, status: status || 'PENDING', amount: Number.isFinite(amount) ? amount : null };
    }

    /** Exige que el cobro esté completado por al menos `total` y que no se haya usado en otra venta. */
    async assertPaid(key: string | undefined, total: number) {
        if (!key) throw new BadRequestException('Cobra primero en la máquina TUU');
        const used = await this.prisma.sale.findFirst({
            where: { shippingData: { path: ['terminalPayment', 'key'], equals: key } },
            select: { code: true },
        });
        if (used) throw new BadRequestException(`Ese cobro ya se registró en la venta ${used.code}`);
        const result = await this.status(key);
        if (result.status !== 'COMPLETED') throw new BadRequestException('El cobro en la máquina no está aprobado');
        if (result.amount == null || Math.round(result.amount) < Math.round(total)) {
            throw new BadRequestException('Lo cobrado en la máquina no cubre el total');
        }
        return { provider: 'TUU', key, amount: result.amount };
    }
}
