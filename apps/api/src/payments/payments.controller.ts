import { Controller, Post, Body, Get, Query, Param, HttpCode, Headers } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/payment.dto';

@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    /**
     * Crea una preferencia de pago en MercadoPago y retorna el init_point.
     * El frontend redirige al usuario a esa URL.
     */
    @Post('create-preference')
    async createPreference(@Body() dto: CreatePaymentDto) {
        return this.paymentsService.createPreference(dto);
    }

    /**
     * Webhook de MercadoPago. Recibe notificaciones IPN/Webhooks cuando un pago cambia de estado.
     * IMPORTANTE: Esta URL debe ser PÚBLICA (HTTPS). Para desarrollo local usa ngrok.
     * En producción (Render): https://api.lomasrico.com/payments/webhook
     */
    @Post('webhook')
    @HttpCode(200) // MP espera 200 OK de vuelta
    async mercadoPagoWebhook(
        @Query() query: any,
        @Body() body: any,
        @Headers('x-signature') signature: string,
    ) {
        return this.paymentsService.processWebhook(query, body);
    }

    /**
     * Endpoint de simulación para pruebas locales (sin necesidad de redirigir a MP).
     * Body: { orderId: string, status: 'APPROVED' | 'REJECTED' }
     */
    @Post('simulate-callback')
    async simulateCallback(@Body() body: { orderId: string, status: 'APPROVED' | 'REJECTED' }) {
        return this.paymentsService.processSimulation(body.orderId, body.status);
    }
}
