import { Controller, Post, Get, Body, Param, Query, HttpCode, Headers, ForbiddenException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/payment.dto';
import { FLOOR_ROLES, MANAGER_ROLES, Public, STAFF_ROLES } from '../auth/access';
import { Roles } from '../auth/roles.decorator';
import { isWebOrdersEnabled } from '../config/flags';
import { TuuTerminalService, cardTerminalEnabled } from './tuu-terminal.service';
import { webPaymentProvider } from './tuu-online.service';

@Controller('payments')
export class PaymentsController {
    constructor(
        private readonly paymentsService: PaymentsService,
        private readonly terminal: TuuTerminalService,
    ) { }

    /**
     * Crea el pago del pedido web en la pasarela configurada (Mercado Pago o TUU)
     * y retorna el link al que el frontend redirige al cliente.
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

    /** Aviso del checkout TUU (x-www-form-urlencoded, firmado). */
    @Public()
    @Post('tuu/callback')
    @HttpCode(200)
    tuuCallback(@Body() body: any) {
        return this.paymentsService.processTuuCallback(body || {});
    }

    @Roles(...STAFF_ROLES)
    @Get('config')
    config() {
        return { web: webPaymentProvider(), cardTerminal: cardTerminalEnabled() ? 'tuu' : null };
    }

    /** Envía un cobro con tarjeta a la máquina TUU del local. */
    @Roles(...FLOOR_ROLES)
    @Post('terminal/charge')
    terminalCharge(@Body() body: { amount: number; method: 'CREDIT' | 'DEBIT'; reference?: string }) {
        return this.terminal.charge({ amount: body?.amount, method: body?.method, reference: body?.reference || '' });
    }

    @Roles(...FLOOR_ROLES)
    @Get('terminal/:key')
    terminalStatus(@Param('key') key: string) {
        return this.terminal.status(key);
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
