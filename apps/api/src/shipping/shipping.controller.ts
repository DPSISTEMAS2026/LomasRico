import { Controller, Post, Body, Get } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingQuoteDto } from './dto/shipping-quote.dto';
import { CASH_ROLES, MANAGER_ROLES, Public } from '../auth/access';
import { Roles } from '../auth/roles.decorator';

@Controller('shipping')
export class ShippingController {
    constructor(private readonly shippingService: ShippingService) { }

    @Public()
    @Post('quote')
    async getQuote(@Body() quoteDto: ShippingQuoteDto) {
        return this.shippingService.calculateQuote(quoteDto);
    }

    @Roles(...CASH_ROLES)
    @Post('config/mode')
    setMode(@Body() body: { mode: 'EXTERNAL' | 'INTERNAL' }) {
        return this.shippingService.setDeliveryMode(body.mode);
    }

    @Roles(...CASH_ROLES)
    @Get('config/mode')
    getMode() {
        return this.shippingService.getDeliveryMode();
    }

    @Roles(...MANAGER_ROLES)
    @Post('config/radius')
    setRadius(@Body() body: { km: number }) {
        return this.shippingService.setMaxDistance(body.km);
    }
}
