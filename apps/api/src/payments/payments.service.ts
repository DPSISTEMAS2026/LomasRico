
import { Injectable, Logger, InternalServerErrorException, NotFoundException, BadRequestException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { CreatePaymentDto } from './dto/payment.dto';
import { KitchenService } from '../kitchen/kitchen.service';
import { PrismaService } from '../database/prisma.service';
import { ShippingService } from '../shipping/shipping.service';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { BrevoService } from '../mail/brevo.service';
import { orderConfirmationHtml } from '../mail/order-email';
import { isInventoryEnforced } from '../config/flags';
import { AuditService } from '../audit/audit.service';
import { TuuOnlineService, webPaymentProvider } from './tuu-online.service';
import { findOpenCashierShift } from '../shifts/shift-routing';

const PAYMENT_LABEL: Record<string, string> = { MERCADO_PAGO: 'Mercado Pago', TUU: 'TUU' };

const PENDING_TTL_MS = 24 * 60 * 60_000;

@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
    private expiryTimer?: NodeJS.Timeout;

    onModuleInit() {
        this.expiryTimer = setInterval(() => void this.expireUnpaidWebOrders(), 30 * 60_000);
    }

    onModuleDestroy() {
        if (this.expiryTimer) clearInterval(this.expiryTimer);
    }

    /** Pedidos web que nunca se pagaron: se anulan para no ensuciar reportes ni la lista de pedidos. */
    async expireUnpaidWebOrders() {
        try {
            const res = await this.prisma.sale.updateMany({
                where: {
                    channel: 'WEB',
                    status: 'PENDING',
                    paymentStatus: 'PENDING',
                    createdAt: { lt: new Date(Date.now() - PENDING_TTL_MS) },
                },
                data: { status: 'CANCELLED', paymentStatus: 'EXPIRED' },
            });
            if (res.count) this.logger.log(`${res.count} pedidos web sin pagar anulados`);
            return res.count;
        } catch (err: any) {
            this.logger.error(`No se pudieron anular pedidos web vencidos: ${err?.message}`);
            return 0;
        }
    }

    private readonly logger = new Logger(PaymentsService.name);
    private client: MercadoPagoConfig;
    private preference: Preference;

    constructor(
        private readonly kitchenService: KitchenService,
        private readonly prisma: PrismaService,
        private readonly shippingService: ShippingService,
        private readonly brevo: BrevoService,
        private readonly audit: AuditService,
        private readonly tuuOnline: TuuOnlineService,
    ) {
        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (accessToken) {
            this.client = new MercadoPagoConfig({ accessToken });
            this.preference = new Preference(this.client);
            this.logger.log('MercadoPago Client Initialized');
        } else {
            this.logger.warn('MERCADOPAGO_ACCESS_TOKEN not found. Payments will fail or run in mock mode.');
        }
    }

    /**
     * Normaliza una URL para asegurar que tenga protocolo https://
     * Necesario porque Render puede devolver el host sin protocolo.
     */
    private normalizeUrl(url: string | undefined): string {
        if (!url) {
            this.logger.warn('URL not configured in env vars - using empty default');
            return '';
        }
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return `https://${url}`;
    }

    /** La preferencia se arma con la venta guardada: el navegador no decide montos. */
    async createPreference(dto: CreatePaymentDto) {
        const orderId = String((dto as any)?.orderId || '');
        const sale = orderId
            ? await this.prisma.sale.findUnique({
                  where: { id: orderId },
                  select: { id: true, code: true, channel: true, status: true, paymentStatus: true, total: true, shippingData: true },
              })
            : null;
        if (!sale || sale.channel !== 'WEB') throw new NotFoundException('Pedido no encontrado');
        if (sale.status !== 'PENDING' || sale.paymentStatus === 'APPROVED') {
            throw new BadRequestException('Este pedido ya no está pendiente de pago');
        }
        const amount = Math.round(Number(sale.total));
        if (!(amount > 0)) throw new BadRequestException('El pedido no tiene monto a pagar');
        const contact = (sale.shippingData as any)?.contact;
        const items = [{ id: sale.id, title: `Pedido Lo Más Rico ${sale.code}`, quantity: 1, unit_price: amount }];
        const payer = contact?.email ? { email: contact.email } : undefined;
        const shippingCost = 0;
        const extraMetadata = { sale_code: sale.code };

        this.logger.log(`Creating preference for Order ${orderId} - Total: ${amount}`);

        const frontendUrl = this.normalizeUrl(process.env.FRONTEND_URL);
        const apiUrl = this.normalizeUrl(process.env.API_URL);

        if (webPaymentProvider() === 'tuu') {
            const { url } = await this.tuuOnline.createPayment(
                { id: sale.id, code: sale.code, total: amount, contact },
                { frontend: frontendUrl, api: apiUrl },
            );
            return { preferenceId: null, initPoint: url, sandboxInitPoint: url };
        }

        this.logger.log(`Using frontend: ${frontendUrl} | api: ${apiUrl}`);

        // Mock Mode if no token
        if (!this.client) {
            return {
                preferenceId: `mock_pref_${Date.now()}`,
                initPoint: `${frontendUrl}/checkout/success?orderId=${orderId}&status=approved`,
                sandboxInitPoint: `${frontendUrl}/checkout/success?orderId=${orderId}&status=approved`
            };
        }

        try {
            // Preparar items para MP
            const mpItems = items.map((i: any) => ({
                id: i.id || 'item',
                title: i.title || i.name,
                quantity: Number(i.quantity),
                unit_price: Number(i.unit_price || i.price),
                currency_id: 'CLP',
            }));

            // Agregar costo de envío como ítem separado
            if (shippingCost && shippingCost > 0) {
                mpItems.push({
                    id: 'shipping',
                    title: 'Costo de Envío',
                    quantity: 1,
                    unit_price: Number(shippingCost),
                    currency_id: 'CLP'
                });
            }

            const result = await this.preference.create({
                body: {
                    items: mpItems,
                    payer: payer ? { email: payer.email } : undefined,
                    metadata: {
                        order_id: orderId,
                        ...(extraMetadata || {}),  // guarda cartItems, userId, deliveryType para el webhook
                    },
                    back_urls: {
                        success: `${frontendUrl}/checkout/success?orderId=${orderId}`,
                        failure: `${frontendUrl}/checkout/failure?orderId=${orderId}`,
                        pending: `${frontendUrl}/checkout/pending?orderId=${orderId}`
                    },
                    auto_return: 'approved',
                    notification_url: `${apiUrl}/payments/webhook`,
                    external_reference: orderId,
                    statement_descriptor: 'LO MAS RICO'
                }
            });

            this.logger.log(`Preference created: ${result.id}`);

            return {
                preferenceId: result.id,
                initPoint: result.init_point,
                sandboxInitPoint: result.sandbox_init_point
            };

        } catch (error) {
            this.logger.error('MercadoPago Create Preference Failed', error);
            throw new InternalServerErrorException('Error al iniciar el pago con MercadoPago');
        }
    }

    async processWebhook(query: any, body: any) {
        /**
         * MercadoPago envía notificaciones de dos formas:
         * 1. IPN clásico: query tiene `topic=payment` y `id=<payment_id>`
         * 2. Webhooks modernos: body tiene `{ type: 'payment', data: { id: '<payment_id>' } }`
         */
        const topic = query.topic || query.type || body?.type;
        const paymentId = query['data.id'] || query.id || body?.data?.id;

        this.logger.log(`Webhook received: Topic=${topic} | PaymentID=${paymentId}`);
        this.logger.debug(`Query params: ${JSON.stringify(query)}`);
        this.logger.debug(`Body: ${JSON.stringify(body)}`);

        if (topic === 'payment' && paymentId && this.client) {
            try {
                const paymentClient = new Payment(this.client);
                const payment = await paymentClient.get({ id: paymentId });

                this.logger.log(`Payment ${paymentId} status: ${payment.status}`);

                if (payment.status === 'approved' && payment.external_reference) {
                    await this.handleApprovedPayment(payment.external_reference, Number(payment.transaction_amount), String(paymentId));
                } else {
                    this.logger.warn(`Payment ${paymentId} status is: ${payment.status}. No action taken.`);
                }
            } catch (error) {
                // Un 5xx hace que MercadoPago reintente; con 200 el pedido pagado se perdería.
                this.logger.error(`Error processing webhook for payment ${paymentId}`, error);
                throw new InternalServerErrorException('No se pudo procesar el pago');
            }
        }

        return { status: 'OK' };
    }

    /** Aviso del checkout TUU: solo se procesa si la firma es válida. */
    async processTuuCallback(body: Record<string, any>) {
        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'web-orders',hypothesisId:'D',location:'payments.service.ts:processTuuCallback',message:'tuu callback received',data:{hasSig:!!body?.x_signature,result:String(body?.x_result||''),ref:String(body?.x_reference||'').slice(0,40),amount:body?.x_amount,keys:Object.keys(body||{}).filter(k=>k.startsWith('x_'))},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        const callback = this.tuuOnline.parseCallback(body);
        if (!callback) {
            this.logger.warn(`TUU callback con firma inválida (ref ${String(body?.x_reference || '').slice(0, 60)})`);
            throw new BadRequestException('Firma inválida');
        }
        this.logger.log(`TUU callback ${callback.reference}: ${callback.result} $${callback.amount}`);
        if (callback.result !== 'completed') return { status: 'IGNORED', result: callback.result };
        const sale = callback.saleCode
            ? await this.prisma.sale.findUnique({ where: { code: callback.saleCode }, select: { id: true, channel: true, status: true, paymentStatus: true, code: true } })
            : null;
        if (!sale || sale.channel !== 'WEB') {
            this.logger.error(`TUU pagó ${callback.reference} pero no hay pedido web con ese código (${callback.saleCode})`);
            return { status: 'OK', confirmed: false, reason: 'sale_not_found' };
        }
        await this.handleApprovedPayment(sale.id, callback.amount, `tuu:${callback.reference}`, 'TUU');
        return { status: 'OK', confirmed: true, code: sale.code };
    }

    /** Confirma a mano un WEB PENDING (cuando TUU cobró pero el callback no llegó). */
    async manualConfirmPending(code?: string, orderId?: string) {
        const normalized = code ? (String(code).startsWith('#') ? String(code) : `#${String(code).replace(/\D/g, '')}`) : null;
        const sale = orderId
            ? await this.prisma.sale.findUnique({ where: { id: orderId }, select: { id: true, code: true, channel: true, status: true, paymentStatus: true } })
            : normalized
                ? await this.prisma.sale.findUnique({ where: { code: normalized }, select: { id: true, code: true, channel: true, status: true, paymentStatus: true } })
                : null;
        if (!sale || sale.channel !== 'WEB') throw new NotFoundException('Pedido web no encontrado');
        if (sale.status === 'CONFIRMED' && sale.paymentStatus === 'APPROVED') {
            await this.kitchenService.createTicket(sale.id);
            return { ok: true, code: sale.code, alreadyConfirmed: true };
        }
        if (sale.status !== 'PENDING') {
            throw new BadRequestException(`El pedido ${sale.code} está en estado ${sale.status}`);
        }
        await this.handleApprovedOrder(sale.id, 'TUU');
        await this.audit.log({
            action: 'MANUAL_PAYMENT_CONFIRM',
            saleId: sale.id,
            saleCode: sale.code,
            reason: 'Confirmación manual de pago web (callback TUU ausente)',
        });
        await this.sendConfirmation(sale.id);
        return { ok: true, code: sale.code, alreadyConfirmed: false };
    }

    /** Solo confirma si lo pagado cubre el total guardado; si no, deja el pedido marcado para revisión. */
    private async handleApprovedPayment(orderId: string, paid: number, paymentId: string, method: 'MERCADO_PAGO' | 'TUU' = 'MERCADO_PAGO') {
        const sale = await this.prisma.sale.findUnique({ where: { id: orderId }, select: { total: true, status: true } });
        if (!sale) {
            this.logger.warn(`Approved payment ${paymentId} for unknown order ${orderId}`);
            return;
        }
        const expected = Math.round(Number(sale.total));
        if (!(Math.round(paid) >= expected)) {
            this.logger.error(`Payment ${paymentId} amount ${paid} < order total ${expected} (${orderId})`);
            await this.prisma.sale.updateMany({
                where: { id: orderId, status: 'PENDING' },
                data: { paymentStatus: 'AMOUNT_MISMATCH' },
            });
            return;
        }
        await this.handleApprovedOrder(orderId, method);
    }

    // Simulación para pruebas locales
    async processSimulation(orderId: string, status: 'APPROVED' | 'REJECTED') {
        this.logger.log(`[PAYMENT SIMULATION] Order ${orderId} resulted in ${status}`);

        if (status === 'APPROVED') {
            await this.handleApprovedOrder(orderId);
            return { success: true, message: 'Pago simulado aprobado.' };
        }
        return { success: false, message: 'Pago rechazado.' };
    }

    async handleApprovedOrder(orderId: string, method: 'MERCADO_PAGO' | 'TUU' = 'MERCADO_PAGO') {
        // 1. Verificar que la venta existe
        const sale = await (this.prisma as any).sale.findUnique({
            where: { id: orderId }
        });

        if (sale?.status === 'CONFIRMED' && sale.paymentStatus === 'APPROVED') {
            await this.kitchenService.createTicket(orderId);
            // Reintento seguro: si el correo no salió en el primer approve, se intenta de nuevo.
            await this.sendConfirmation(orderId);
            return;
        }
        if (sale?.status === 'CANCELLED' && sale.paymentStatus !== 'PAID_AFTER_CANCEL') {
            await this.prisma.sale.update({ where: { id: orderId }, data: { paymentStatus: 'PAID_AFTER_CANCEL' } });
            await this.audit.log({
                action: 'PAID_AFTER_CANCEL',
                saleId: sale.id,
                saleCode: sale.code,
                amount: Number(sale.total),
                reason: `${PAYMENT_LABEL[method]} aprobó un pedido ya anulado: hay que devolver el pago`,
            });
            this.logger.error(`Sale ${orderId} was cancelled but MercadoPago approved the payment.`);
            return;
        }
        if (!sale || sale.status !== 'PENDING') {
            this.logger.warn(`Sale ${orderId} not found or not pending.`);
            return;
        }

        // 2. Transacción de base de datos para asegurar consistencia
        const confirmed = await this.prisma.$transaction(async (tx: any) => {
            // Reclamo atómico: si llegan dos webhooks a la vez, solo uno confirma.
            // En algunos entornos el enum aún no tiene TUU → guardar como CREDIT (tarjeta).
            const paymentMethodDb = method === 'TUU' ? 'CREDIT' : method;
            const claim = await tx.sale.updateMany({
                where: { id: orderId, status: 'PENDING' },
                data: {
                    status: 'CONFIRMED',
                    paymentStatus: 'APPROVED',
                    paymentMethod: paymentMethodDb,
                }
            });
            if (claim.count === 0) return false;

            const loyalty = (sale.shippingData as any)?.loyalty;
            if (sale.userId && loyalty) {
                const customer = await tx.user.findUnique({ where: { id: sale.userId }, select: { role: true, loyaltyPoints: true } });
                if (customer?.role === 'CUSTOMER') {
                    const redeem = Math.min(Math.max(0, Number(loyalty.redeem) || 0), Number(customer.loyaltyPoints) || 0);
                    const earn = Math.max(0, Math.floor(Number(loyalty.earn) || 0));
                    await tx.user.update({
                        where: { id: sale.userId },
                        data: {
                            loyaltyPoints: { increment: earn - redeem },
                            pointsUsed: { increment: redeem },
                            pointsEarned: { increment: earn },
                            historicalOrders: { increment: 1 },
                            historicalSpent: { increment: Math.max(0, Number(loyalty.spent) || 0) },
                        },
                    });
                }
            }

            // Registrar en el turno de caja (WEB/apps → cajera; no turnos permanentes admin)
            let shiftId = sale.shiftId;
            if (!shiftId || sale.channel === 'WEB' || sale.channel === 'UBER_EATS' || sale.channel === 'PEDIDOS_YA' || sale.channel === 'WHATSAPP') {
                const cashierShift = await findOpenCashierShift(tx);
                if (cashierShift) {
                    shiftId = cashierShift.id;
                    await tx.sale.update({
                        where: { id: orderId },
                        data: { shiftId },
                    });
                } else if (!shiftId) {
                    const fallback = await tx.cashShift.findFirst({
                        where: { status: 'OPEN' },
                        orderBy: { openingTime: 'desc' },
                    });
                    if (fallback) {
                        shiftId = fallback.id;
                        await tx.sale.update({
                            where: { id: orderId },
                            data: { shiftId },
                        });
                    }
                }
                // #region agent log
                fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'shift-routing',hypothesisId:'S1',location:'payments.service.ts:approve',message:'payment shift routing',data:{channel:sale.channel,shiftId:shiftId||null},timestamp:Date.now()})}).catch(()=>{});
                // #endregion
            }
            if (shiftId) {
                await tx.cashTransaction.create({
                    data: {
                        shiftId,
                        type: 'SALE_INCOME',
                        amount: sale.total,
                        description: `Pago ${sale.channel === 'WEB' ? 'Web' : sale.channel} ${sale.code} (${PAYMENT_LABEL[method]})`,
                        relatedSaleId: sale.id
                    }
                });
            }

            // Descontar inventario con LOCK para evitar race conditions
            // Nota: El SalesService pone status PENDING para MP, así que no se descontó.
            const items = await tx.saleItem.findMany({
                where: { saleId: orderId },
                include: { recipeSnapshot: true }
            });

            // Reunir todos los requerimientos (con conversión de unidades)
            const requirements = new Map<string, number>();
            for (const item of items) {
                if (item.recipeSnapshot && item.recipeSnapshot.resolvedBoM) {
                    const bom = item.recipeSnapshot.resolvedBoM as any[];
                    for (const bomItem of bom) {
                        let qty = bomItem.quantity * item.quantity;

                        // ✅ CONVERSIÓN DE UNIDADES: BOM en 'g', inventario en 'KG'
                        if (bomItem.unit === 'g') {
                            const invItem = await tx.inventoryItem.findUnique({
                                where: { id: bomItem.inventoryItemId },
                                select: { unit: true }
                            });
                            if (invItem && invItem.unit === 'KG') {
                                qty = qty / 1000;
                            }
                        }

                        const current = requirements.get(bomItem.inventoryItemId) || 0;
                        requirements.set(bomItem.inventoryItemId, current + qty);
                    }
                }
            }

            if (requirements.size > 0 && isInventoryEnforced()) {
                const itemIds = [...requirements.keys()];
                // Lock rows para prevenir race conditions con POS
                const lockedItems: any[] = await tx.$queryRawUnsafe(
                    `SELECT id, name, "currentStock" FROM "InventoryItem" WHERE id IN (${itemIds.map((_: any, i: number) => `$${i + 1}`).join(',')}) FOR UPDATE`,
                    ...itemIds
                );

                // Verificar stock (si no hay suficiente, loguear warning pero continuar — pago ya fue aprobado)
                for (const lockedItem of lockedItems) {
                    const requiredQty = requirements.get(lockedItem.id) || 0;
                    if (Number(lockedItem.currentStock) < requiredQty) {
                        this.logger.warn(`⚠️ Stock insuficiente para "${lockedItem.name}" en pago aprobado. Stock: ${lockedItem.currentStock}, Requerido: ${requiredQty}. Se descontará de igual forma.`);
                    }
                }

                // Descontar inventario
                for (const [itemId, qty] of requirements.entries()) {
                    await tx.inventoryItem.update({
                        where: { id: itemId },
                        data: {
                            currentStock: { decrement: qty },
                            movements: {
                                create: {
                                    quantity: -qty,
                                    reason: 'SALE',
                                    referenceId: sale.id
                                }
                            }
                        }
                    });
                }
            }

            return true;
        });

        if (!confirmed) {
            await this.kitchenService.createTicket(orderId);
            await this.sendConfirmation(orderId);
            return;
        }

        // 3. Enviar a cocina
        await this.kitchenService.createTicket(orderId);

        // 4. Confirmar despacho fuera de la transacción (llamada HTTP externa)
        if (sale.shippingData && (sale.shippingData as any).estimateId) {
            try {
                await this.shippingService.confirmDelivery((sale.shippingData as any).estimateId);
            } catch (e) {
                this.logger.error(`Failed to confirm shipping for ${sale.id}`, e);
            }
        }

        await this.sendConfirmation(orderId);
        this.logger.log(`Order ${orderId} fully confirmed and sent to kitchen.`);
    }

    /** Reenvío manual (dueño) o tras confirmación forzada. */
    async resendConfirmation(orderIdOrCode: string) {
        const code = orderIdOrCode.startsWith('#') || orderIdOrCode.length < 20
            ? (orderIdOrCode.startsWith('#') ? orderIdOrCode : `#${orderIdOrCode.replace(/\D/g, '')}`)
            : null;
        const sale = code
            ? await this.prisma.sale.findUnique({ where: { code }, select: { id: true, code: true } })
            : await this.prisma.sale.findUnique({ where: { id: orderIdOrCode }, select: { id: true, code: true } });
        if (!sale) throw new NotFoundException('Pedido no encontrado');
        await this.sendConfirmation(sale.id);
        return { ok: true, code: sale.code };
    }

    /** El correo nunca bloquea el pedido: si Brevo falla, solo queda en el log. */
    async sendConfirmation(orderId: string) {
        try {
            if (!this.brevo.isConfigured()) return;
            const sale = await this.prisma.sale.findUnique({
                where: { id: orderId },
                include: { items: { include: { sellingProduct: { select: { name: true } } } } },
            });
            const contact = (sale?.shippingData as any)?.contact;
            if (!sale || !contact?.email) return;
            await this.brevo.sendTransactional(
                contact.email,
                contact.name || contact.email,
                `Recibimos tu pedido ${sale.code}`,
                orderConfirmationHtml(sale, contact.name),
            );
        } catch (err: any) {
            this.logger.error(`No se pudo enviar la confirmación de ${orderId}: ${err?.message}`);
        }
    }
}
