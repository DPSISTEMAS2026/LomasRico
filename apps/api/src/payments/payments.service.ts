
import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { CreatePaymentDto } from './dto/payment.dto';
import { KitchenService } from '../kitchen/kitchen.service';
import { PrismaService } from '../database/prisma.service';
import { ShippingService } from '../shipping/shipping.service';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);
    private client: MercadoPagoConfig;
    private preference: Preference;

    constructor(
        private readonly kitchenService: KitchenService,
        private readonly prisma: PrismaService,
        private readonly shippingService: ShippingService
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

    async createPreference(dto: CreatePaymentDto) {
        const { orderId, amount, items, payer, shippingCost, metadata: extraMetadata } = dto as any;

        this.logger.log(`Creating preference for Order ${orderId} - Total: ${amount}`);

        const frontendUrl = this.normalizeUrl(process.env.FRONTEND_URL);
        const apiUrl = this.normalizeUrl(process.env.API_URL);

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

        if ((topic === 'payment' || topic === 'merchant_order') && paymentId && this.client) {
            try {
                const paymentClient = new Payment(this.client);
                const payment = await paymentClient.get({ id: paymentId });

                this.logger.log(`Payment ${paymentId} status: ${payment.status}`);

                if (payment.status === 'approved') {
                    const orderId = payment.external_reference;
                    this.logger.log(`Payment ${paymentId} APPROVED for Order ${orderId}`);
                    if (orderId) {
                        await this.handleApprovedOrder(orderId);
                    }
                } else {
                    this.logger.warn(`Payment ${paymentId} status is: ${payment.status}. No action taken.`);
                }
            } catch (error) {
                this.logger.error(`Error processing webhook for payment ${paymentId}`, error);
                // No lanzamos excepción - MP necesita el 200 OK de todas formas
            }
        }

        return { status: 'OK' }; // MP espera 200 OK siempre
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

    async handleApprovedOrder(orderId: string) {
        // 1. Verificar que la venta existe
        const sale = await (this.prisma as any).sale.findUnique({
            where: { id: orderId }
        });

        if (!sale || sale.status === 'CONFIRMED') {
            this.logger.warn(`Sale ${orderId} not found or already confirmed.`);
            return;
        }

        // 2. Transacción de base de datos para asegurar consistencia
        await this.prisma.$transaction(async (tx: any) => {
            // Actualizar estado de la venta
            await tx.sale.update({
                where: { id: orderId },
                data: {
                    status: 'CONFIRMED',
                    paymentStatus: 'APPROVED'
                }
            });

            // Registrar en el turno de caja si es POS
            if (sale.shiftId) {
                await tx.cashTransaction.create({
                    data: {
                        shiftId: sale.shiftId,
                        type: 'SALE_INCOME',
                        amount: sale.total,
                        description: `Pago Mercado Pago Venta ${sale.code}`,
                        relatedSaleId: sale.id
                    }
                });
            }

            // Descontar inventario (Solo si no se hizo al crear la venta)
            // Nota: El SalesService pone status PENDING para MP, así que no se descontó.
            // Necesitamos los items para resolver BoM o usar el snapshot guardado.
            const items = await tx.saleItem.findMany({
                where: { saleId: orderId },
                include: { recipeSnapshot: true }
            });

            for (const item of items) {
                if (item.recipeSnapshot && item.recipeSnapshot.resolvedBoM) {
                    const bom = item.recipeSnapshot.resolvedBoM as any[];
                    for (const bomItem of bom) {
                        const totalQty = bomItem.quantity * item.quantity;
                        await tx.inventoryItem.update({
                            where: { id: bomItem.inventoryItemId },
                            data: {
                                currentStock: { decrement: totalQty },
                                movements: {
                                    create: {
                                        quantity: -totalQty,
                                        reason: 'SALE',
                                        referenceId: sale.id
                                    }
                                }
                            }
                        });
                    }
                }
            }

            // 3. Confirmar despacho si hay envío
            if (sale.shippingData && (sale.shippingData as any).estimateId) {
                try {
                    const estimateId = (sale.shippingData as any).estimateId;
                    await this.shippingService.confirmDelivery(estimateId);
                } catch (e) {
                    this.logger.error(`Failed to confirm shipping for ${sale.id}`, e);
                }
            }

            // 4. Enviar a cocina
            await this.kitchenService.createTicket(orderId);
        });

        this.logger.log(`Order ${orderId} fully confirmed, inventory deducted and sent to kitchen.`);
    }
}
