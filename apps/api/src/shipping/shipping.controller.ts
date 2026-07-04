import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingQuoteDto } from './dto/shipping-quote.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('shipping')
export class ShippingController {
    constructor(private readonly shippingService: ShippingService) { }

    @Post('quote')
    async getQuote(@Body() quoteDto: ShippingQuoteDto) {
        return this.shippingService.calculateQuote(quoteDto);
    }

    @Post('config/mode')
    setMode(@Body() body: { mode: 'EXTERNAL' | 'INTERNAL' }) {
        return this.shippingService.setDeliveryMode(body.mode);
    }

    @Get('config/mode')
    getMode() {
        return this.shippingService.getDeliveryMode();
    }

    @Post('config/radius')
    setRadius(@Body() body: { km: number }) {
        return this.shippingService.setMaxDistance(body.km);
    }

    @UseGuards(JwtAuthGuard)
    @Post('dispatch-manual')
    async dispatchManual(@Body() body: { saleId: string }) {
        return this.shippingService.dispatchManual(body.saleId);
    }
}
