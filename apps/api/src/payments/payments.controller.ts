import { Controller, Post, Body, Query, HttpCode, Headers, ForbiddenException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/payment.dto';
import { MANAGER_ROLES, Public } from '../auth/access';
import { Roles } from '../auth/roles.decorator';
import { isWebOrdersEnabled } from '../config/flags';

@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    /**
     * Crea una preferencia de pago en MercadoPago y retorna el init_point.
     * El frontend redirige al usuario a esa URL.
     */
    @Public()
    @Post('create-preference')
    async createPreference(@Body() dto: CreatePaymentDto) {
        if (!isWebOrdersEnabled()) throw new ForbiddenException('Los pedidos web aún no están disponibles');
        return this.paymentsService.createPreference(dto);
    }

    /**
     * Webhook de MercadoPago. Recibe notificaciones IPN/Webhooks cuando un pago cambia de estado.
     * IMPORTANTE: Esta URL debe ser PÚBLICA (HTTPS). Para desarrollo local usa ngrok.
     * En producción (Render): https://api.lomasrico.com/payments/webhook
     */
    @Public()
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
    @Roles(...MANAGER_ROLES)
    @Post('simulate-callback')
    async simulateCallback(@Body() body: { orderId: string, status: 'APPROVED' | 'REJECTED' }) {
        if (process.env.NODE_ENV === 'production') {
            throw new ForbiddenException('Simulación deshabilitada en producción');
        }
        return this.paymentsService.processSimulation(body.orderId, body.status);
    }
}
