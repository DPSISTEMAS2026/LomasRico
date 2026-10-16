import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

const ONLINE_URL_PROD = 'https://core.payment.haulmer.com/api/v1/payment';

/** Pasarela del checkout web. `PAYMENT_PROVIDER=tuu` activa TUU; si no, sigue Mercado Pago. */
export function webPaymentProvider(): 'tuu' | 'mercadopago' {
    return String(process.env.PAYMENT_PROVIDER || '').trim().toLowerCase() === 'tuu' ? 'tuu' : 'mercadopago';
}

/** HMAC-SHA256 sobre los campos `x_*` (sin `x_signature`), ordenados y concatenados clave+valor. */
export function tuuSignature(fields: Record<string, unknown>, secret: string): string {
    const base = Object.keys(fields)
        .filter((key) => key.startsWith('x_') && key !== 'x_signature')
        .sort()
        .map((key) => `${key}${fields[key] ?? ''}`)
        .join('');
    return createHmac('sha256', secret).update(base, 'utf8').digest('hex');
}

function sameHex(a: string, b: string) {
    const x = Buffer.from(String(a || '').toLowerCase());
    const y = Buffer.from(String(b || '').toLowerCase());
    return x.length === y.length && timingSafeEqual(x, y);
}

function chilePhone(raw?: string) {
    const digits = String(raw || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('56')) return `+${digits}`;
    return `+56${digits.slice(-9)}`;
}

function findUrl(payload: any): string | null {
    if (!payload) return null;
    if (typeof payload === 'string') return /^https?:\/\//.test(payload.trim()) ? payload.trim() : null;
    for (const key of ['url', 'redirect_url', 'redirectUrl', 'payment_url', 'paymentUrl', 'checkout_url', 'link']) {
        const value = payload[key];
        if (typeof value === 'string' && /^https?:\/\//.test(value)) return value;
    }
    return findUrl(payload.data);
}

/**
 * TUU rechaza referencias de más de ~26 caracteres, así que no cabe el id del pedido.
 * Se usa el código visible (#0012 → LMR0012) más un sufijo para permitir reintentos.
 */
export function tuuReference(saleCode: string) {
    const digits = String(saleCode || '').replace(/\D/g, '');
    return `LMR${digits}-${Date.now().toString(36)}`;
}

export function saleCodeFromReference(reference: string): string | null {
    const match = /^LMR(\d+)-/.exec(String(reference || ''));
    return match ? `#${match[1]}` : null;
}

export interface TuuCallback {
    reference: string;
    saleCode: string | null;
    amount: number;
    result: string;
    message: string;
}

@Injectable()
export class TuuOnlineService {
    private readonly logger = new Logger(TuuOnlineService.name);

    private get accountId() { return String(process.env.TUU_ACCOUNT_ID || '').trim(); }
    private get secret() { return String(process.env.TUU_SECRET_KEY || '').trim(); }

    isConfigured() {
        return !!this.accountId && !!this.secret;
    }

    /** Crea el intento de pago y devuelve el link de TUU al que se redirige al cliente. */
    async createPayment(sale: { id: string; code: string; total: number; contact?: any }, urls: { frontend: string; api: string }) {
        if (!this.isConfigured()) throw new InternalServerErrorException('El pago web no está configurado');
        const contact = sale.contact || {};
        const [firstName, ...rest] = String(contact.name || 'Cliente').trim().split(/\s+/);
        const fields: Record<string, string | number> = {
            x_account_id: this.accountId,
            x_amount: Math.round(sale.total),
            x_currency: 'CLP',
            x_customer_email: String(contact.email || ''),
            x_customer_first_name: firstName || 'Cliente',
            x_customer_last_name: rest.join(' ') || '-',
            x_customer_phone: chilePhone(contact.phone),
            x_description: `Pedido Lo Más Rico ${sale.code}`,
            x_reference: tuuReference(sale.code),
            x_shop_name: 'Lo Más Rico',
            x_url_callback: `${urls.api}/payments/tuu/callback`,
            x_url_cancel: `${urls.frontend}/checkout/failure`,
            x_url_complete: `${urls.frontend}/checkout/success`,
        };
        const body = { ...fields, x_signature: tuuSignature(fields, this.secret) };
        const endpoint = process.env.TUU_ONLINE_URL || ONLINE_URL_PROD;

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-REDIRECT': 'false' },
            body: JSON.stringify(body),
            redirect: 'manual',
        });
        const text = await res.text();
        let payload: any = text;
        try { payload = JSON.parse(text); } catch { /* respuesta en texto plano */ }
        const url = findUrl(payload) || (res.status >= 300 && res.status < 400 ? res.headers.get('location') : null);
        if (!res.ok && !url) {
            this.logger.error(`TUU create payment ${res.status}: ${text.slice(0, 300)}`);
            throw new InternalServerErrorException('No se pudo iniciar el pago');
        }
        if (!url) {
            this.logger.error(`TUU create payment sin link: ${text.slice(0, 300)}`);
            throw new InternalServerErrorException('No se pudo iniciar el pago');
        }
        return { url, reference: String(fields.x_reference) };
    }

    /** Valida firma y cuenta del aviso de TUU. Devuelve null si no es auténtico. */
    parseCallback(body: Record<string, any>): TuuCallback | null {
        if (!this.isConfigured() || !body?.x_signature) return null;
        const expected = tuuSignature(body, this.secret);
        if (!sameHex(String(body.x_signature), expected)) return null;
        if (String(body.x_account_id || '') !== this.accountId) return null;
        const reference = String(body.x_reference || '');
        return {
            reference,
            saleCode: saleCodeFromReference(reference),
            amount: Number(body.x_amount),
            result: String(body.x_result || '').toLowerCase(),
            message: String(body.x_message || ''),
        };
    }
}
