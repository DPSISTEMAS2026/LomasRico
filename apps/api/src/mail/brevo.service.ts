import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

const BREVO_BASE = 'https://api.brevo.com/v3';
const LIST_NAME_DEFAULT = 'LomasRico Clientes';

type BrevoAccount = { email?: string; firstName?: string; companyName?: string; plan?: { type?: string } };
type BrevoSender = { email: string; name?: string; active?: boolean; id?: number };
type BrevoList = { id: number; name: string; uniqueSubscribers?: number; totalSubscribers?: number };
type LocalRecipient = {
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    sms: string;
    points: number;
    tag: string;
};

export const DEFAULT_ANNOUNCE_SUBJECT = 'Lo Más Rico: te esperamos en el nuevo sitio';
export const DEFAULT_LOGO_URL = process.env.BREVO_LOGO_URL
    || 'https://xnwbrdnorjafwwyfhysx.supabase.co/storage/v1/object/public/assets/logo-email.png';

export function logoSrc() {
    return DEFAULT_LOGO_URL;
}

export function defaultAnnounceHtml(logoUrl = logoSrc()) {
    const logo = logoUrl
        ? `<img src="${logoUrl}" width="80" alt="Lo Más Rico" style="display:block;margin:0 auto 18px auto;border:0;width:80px;height:auto;" />`
        : '';
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>Lo Más Rico</title>
</head>
<body style="margin:0;padding:0;background:#fff6ea;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff6ea;padding:32px 12px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:28px;overflow:hidden;border:1px solid #f3e7d7;">
        <tr><td style="padding:36px 36px 20px 36px;text-align:center;">
          ${logo}
          <p style="margin:0 0 10px 0;color:#f2642e;font-size:10px;font-weight:800;letter-spacing:0.35em;text-transform:uppercase;">Premium Cevichería</p>
          <h1 style="margin:0;color:#0f172a;font-size:28px;font-weight:900;font-style:italic;letter-spacing:-0.04em;text-transform:uppercase;line-height:0.95;">Lo Más Rico</h1>
        </td></tr>
        <tr><td style="padding:8px 36px 32px 36px;color:#334155;font-size:15px;line-height:1.65;">
          <p style="margin:0 0 16px 0;color:#0f172a;">Hola, {{ params.NOMBRE }}:</p>
          <p style="margin:0 0 14px 0;">
            Estamos dejando listo el nuevo sitio de Lo Más Rico.
          </p>
          <p style="margin:0 0 14px 0;">
            Cuando volvamos, te pedimos que hagas tu pedido <strong>con tu cuenta</strong>.
            Así cada visita te resultará más cómoda y cercana.
          </p>
          <p style="margin:0 0 14px 0;">
            Tus puntos se mantienen. Pronto podrás canjearlos.
          </p>
          <p style="margin:0 0 22px 0;">
            Entra con tu correo. La contraseña son los 4 últimos dígitos de tu celular.
          </p>
          <p style="margin:0 0 28px 0;text-align:center;">
            <a href="https://www.instagram.com/cevichelomasrico/" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:800;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;padding:14px 22px;border-radius:999px;">
              @cevichelomasrico
            </a>
          </p>
          <p style="margin:0;color:#94a3b8;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;text-align:center;">
            Cevichería · Concepción
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

@Injectable()
export class BrevoService {
    private readonly logger = new Logger('Brevo');
    private readonly apiKey: string;
    private readonly senderName: string;
    private readonly listName: string;
    private senderEmail: string;

    constructor(private readonly prisma: PrismaService) {
        this.apiKey = process.env.BREVO_API_KEY || '';
        this.senderEmail = process.env.BREVO_SENDER_EMAIL || '';
        this.senderName = process.env.BREVO_SENDER_NAME || 'Lo Más Rico';
        this.listName = process.env.BREVO_LIST_NAME || LIST_NAME_DEFAULT;
        if (this.apiKey) this.logger.log('Brevo API configurada');
        else this.logger.warn('Brevo sin BREVO_API_KEY — correo masivo en espera');
        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'render-start',hypothesisId:'H-MAIL',location:'brevo.service.ts:constructor',message:'BrevoService constructed',data:{hasApiKey:!!this.apiKey,hasSenderEmail:!!this.senderEmail},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
    }

    isConfigured() {
        return !!this.apiKey;
    }

    async getStatus() {
        const configured = this.isConfigured();
        if (!configured) {
            // #region agent log
            fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '88a466' }, body: JSON.stringify({ sessionId: '88a466', runId: 'brevo', hypothesisId: 'H-KEY', location: 'brevo.service.ts:status', message: 'Brevo sin API key', data: { configured: false }, timestamp: Date.now() }) }).catch(() => {});
            // #endregion
            return {
                configured: false,
                readyToSend: false,
                accountEmail: null,
                senderEmail: this.senderEmail || null,
                senderName: this.senderName,
                listId: null,
                listName: this.listName,
                listCount: 0,
                localCustomers: 0,
                localWithEmail: 0,
                missing: ['BREVO_API_KEY'],
            };
        }

        try {
        const [account, senders, list, local] = await Promise.all([
            this.brevo<BrevoAccount>('/account'),
            this.brevo<{ senders?: BrevoSender[] }>('/senders').catch(() => ({ senders: [] })),
            this.ensureList(),
            this.loadLocalRecipients(),
        ]);

        const activeSender = (senders.senders || []).find((s) => s.active && (!this.senderEmail || s.email === this.senderEmail))
            || (senders.senders || []).find((s) => s.active);
        const senderEmail = this.senderEmail || activeSender?.email || null;

        const status = {
            configured: true,
            readyToSend: !!senderEmail,
            accountEmail: account.email || null,
            plan: account.plan?.type || null,
            senderEmail,
            senderName: this.senderName,
            listId: list.id,
            listName: list.name,
            listCount: list.uniqueSubscribers ?? list.totalSubscribers ?? 0,
            localCustomers: local.total,
            localWithEmail: local.recipients.length,
            missing: senderEmail ? [] : ['BREVO_SENDER_EMAIL o remitente verificado en Brevo'],
        };

        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '88a466' }, body: JSON.stringify({ sessionId: '88a466', runId: 'brevo', hypothesisId: 'H-CONN', location: 'brevo.service.ts:status', message: 'Estado Brevo', data: { configured: true, readyToSend: status.readyToSend, hasSender: !!senderEmail, listId: list.id, listCount: status.listCount, localWithEmail: status.localWithEmail }, timestamp: Date.now() }) }).catch(() => {});
        // #endregion

        return status;
        } catch (err: any) {
            const message = String(err?.message || err);
            const ipBlocked = /unrecognised IP|authorized_ips|authorised_ips/i.test(message);
            // #region agent log
            fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '88a466' }, body: JSON.stringify({ sessionId: '88a466', runId: 'brevo', hypothesisId: 'H-IP', location: 'brevo.service.ts:status', message: 'Brevo rechazó la llamada', data: { configured: true, ipBlocked, statusCode: err?.status || null }, timestamp: Date.now() }) }).catch(() => {});
            // #endregion
            return {
                configured: true,
                readyToSend: false,
                accountEmail: null,
                senderEmail: this.senderEmail || null,
                senderName: this.senderName,
                listId: null,
                listName: this.listName,
                listCount: 0,
                localCustomers: 0,
                localWithEmail: 0,
                error: message,
                missing: ipBlocked
                    ? ['Autoriza esta IP en Brevo: https://app.brevo.com/security/authorised_ips']
                    : [message],
            };
        }
    }

    async syncContacts() {
        this.assertKey();
        await this.ensureAttributes();
        const list = await this.ensureList();
        const { recipients } = await this.loadLocalRecipients();

        const chunks = chunk<LocalRecipient>(recipients, 140);
        const processes: string[] = [];
        for (const group of chunks) {
            const res = await this.brevo<{ processId?: string }>('/contacts/import', {
                method: 'POST',
                body: JSON.stringify({
                    jsonBody: group.map((c: LocalRecipient) => ({
                        email: c.email,
                        attributes: {
                            FIRSTNAME: c.firstName,
                            LASTNAME: c.lastName,
                            SMS: c.sms || undefined,
                            PUNTOS: c.points,
                            TIPO: c.tag || '',
                        },
                    })),
                    listIds: [list.id],
                    updateExistingContacts: true,
                    emptyContactsAttributes: false,
                    disableNotification: true,
                }),
            });
            if (res.processId) processes.push(String(res.processId));
        }

        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '88a466' }, body: JSON.stringify({ sessionId: '88a466', runId: 'brevo', hypothesisId: 'H-SYNC', location: 'brevo.service.ts:sync', message: 'Contactos enviados a Brevo', data: { imported: recipients.length, batches: chunks.length, listId: list.id }, timestamp: Date.now() }) }).catch(() => {});
        // #endregion

        return {
            ok: true,
            imported: recipients.length,
            batches: chunks.length,
            listId: list.id,
            listName: list.name,
            processes,
        };
    }

    async sendTest(to: string, subject?: string, html?: string) {
        this.assertKey();
        const email = (to || '').trim().toLowerCase();
        if (!isEmail(email)) throw new BadRequestException('Correo de prueba inválido');
        const sender = await this.resolveSender();

        const res = await this.brevo<{ messageId?: string }>('/smtp/email', {
            method: 'POST',
            body: JSON.stringify({
                sender,
                to: [{ email, name: 'Prueba' }],
                subject: subject || DEFAULT_ANNOUNCE_SUBJECT,
                htmlContent: html || defaultAnnounceHtml(),
                params: { NOMBRE: 'Daniel', PUNTOS: 0 },
            }),
        });

        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '88a466' }, body: JSON.stringify({ sessionId: '88a466', runId: 'brevo-logo', hypothesisId: 'H-LOGO', location: 'brevo.service.ts:test', message: 'Correo de prueba enviado', data: { hasMessageId: !!res.messageId, httpsLogo: (html || defaultAnnounceHtml()).includes('https://'), noDataUri: !(html || defaultAnnounceHtml()).includes('data:image') }, timestamp: Date.now() }) }).catch(() => {});
        // #endregion

        return { ok: true, messageId: res.messageId || null };
    }

    async sendAnnounce(opts: { confirm: string; subject?: string; html?: string }) {
        this.assertKey();
        if ((opts.confirm || '').trim().toUpperCase() !== 'ENVIAR') {
            throw new BadRequestException('Para el masivo escribe ENVIAR en confirm');
        }

        const sender = await this.resolveSender();
        const { recipients } = await this.loadLocalRecipients();
        if (!recipients.length) throw new BadRequestException('No hay clientes con correo válido');

        const subject = opts.subject || DEFAULT_ANNOUNCE_SUBJECT;
        const htmlContent = opts.html || defaultAnnounceHtml();
        const batches = chunk<LocalRecipient>(recipients, 80);
        let sent = 0;
        const messageIds: string[] = [];

        for (const group of batches) {
            const res = await this.brevo<{ messageId?: string }>('/smtp/email', {
                method: 'POST',
                body: JSON.stringify({
                    sender,
                    subject,
                    htmlContent,
                    messageVersions: group.map((c: LocalRecipient) => ({
                        to: [{ email: c.email, name: c.name }],
                        params: { NOMBRE: c.firstName || c.name, PUNTOS: c.points },
                    })),
                }),
            });
            sent += group.length;
            if (res.messageId) messageIds.push(res.messageId);
        }

        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '88a466' }, body: JSON.stringify({ sessionId: '88a466', runId: 'brevo', hypothesisId: 'H-SEND', location: 'brevo.service.ts:announce', message: 'Aviso masivo enviado', data: { sent, batches: batches.length }, timestamp: Date.now() }) }).catch(() => {});
        // #endregion

        return { ok: true, sent, batches: batches.length, messageIds };
    }

    private async resolveSender() {
        if (this.senderEmail) return { email: this.senderEmail, name: this.senderName };
        const senders = await this.brevo<{ senders?: BrevoSender[] }>('/senders');
        const active = (senders.senders || []).find((s) => s.active);
        if (!active?.email) throw new BadRequestException('Falta un remitente verificado en Brevo (BREVO_SENDER_EMAIL)');
        this.senderEmail = active.email;
        return { email: active.email, name: this.senderName || active.name || 'Lo Más Rico' };
    }

    private async ensureList(): Promise<BrevoList> {
        const listed = await this.brevo<{ lists?: BrevoList[] }>('/contacts/lists?limit=50&offset=0');
        const found = (listed.lists || []).find((l) => l.name === this.listName);
        if (found) return found;

        const folders = await this.brevo<{ folders?: { id: number; name: string }[] }>('/contacts/folders?limit=50');
        let folderId = folders.folders?.[0]?.id;
        if (!folderId) {
            const created = await this.brevo<{ id: number }>('/contacts/folders', {
                method: 'POST',
                body: JSON.stringify({ name: 'LomasRico' }),
            });
            folderId = created.id;
        }

        const created = await this.brevo<{ id: number }>('/contacts/lists', {
            method: 'POST',
            body: JSON.stringify({ name: this.listName, folderId }),
        });
        return { id: created.id, name: this.listName, uniqueSubscribers: 0 };
    }

    private async ensureAttributes() {
        await this.brevo('/contacts/attributes/normal/PUNTOS', {
            method: 'POST',
            body: JSON.stringify({ type: 'float' }),
        }).catch(() => undefined);
        await this.brevo('/contacts/attributes/normal/TIPO', {
            method: 'POST',
            body: JSON.stringify({ type: 'text' }),
        }).catch(() => undefined);
    }

    private async loadLocalRecipients() {
        const users = await (this.prisma as any).user.findMany({
            where: { role: 'CUSTOMER' },
            select: { name: true, email: true, phone: true, loyaltyPoints: true, customerTag: true },
        });
        const recipients: LocalRecipient[] = users
            .map((u: any): LocalRecipient => {
                const email = String(u.email || '').trim().toLowerCase();
                const parts = String(u.name || '').trim().split(/\s+/);
                const sms = String(u.phone || '').replace(/[^\d]/g, '');
                return {
                    email,
                    name: u.name || email,
                    firstName: parts[0] || 'Hola',
                    lastName: parts.slice(1).join(' '),
                    sms: sms.length >= 8 ? sms : '',
                    points: Number(u.loyaltyPoints || 0),
                    tag: u.customerTag || '',
                };
            })
            .filter((c: LocalRecipient) => isEmail(c.email));
        return { total: users.length, recipients };
    }

    private assertKey() {
        if (!this.apiKey) throw new BadRequestException('Falta BREVO_API_KEY en apps/api/.env');
    }

    private async brevo<T>(path: string, init?: RequestInit): Promise<T> {
        const res = await fetch(`${BREVO_BASE}${path}`, {
            ...init,
            headers: {
                'api-key': this.apiKey,
                accept: 'application/json',
                'content-type': 'application/json',
                ...(init?.headers || {}),
            },
        });
        const text = await res.text();
        let json: any = {};
        try { json = text ? JSON.parse(text) : {}; } catch { json = { message: text }; }
        if (!res.ok) {
            this.logger.error(`Brevo ${init?.method || 'GET'} ${path} → ${res.status} ${json.message || text}`);
            throw new BadRequestException(json.message || `Brevo respondió ${res.status}`);
        }
        return json as T;
    }
}

function isEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function chunk<T>(items: T[], size: number) {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
}
