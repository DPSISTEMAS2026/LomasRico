import { Controller, Get, Post, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { BotService } from './bot.service';

@Controller('api/bot')
export class BotController {
    constructor(private readonly botService: BotService) { }

    @Get('identify-phone')
    async identifyPhone(@Query('phone') phone: string) {
        if (!phone) throw new HttpException('phone is required', HttpStatus.BAD_REQUEST);
        return this.botService.identifyByPhone(phone);
    }

    @Post('identify')
    async identify(@Body('userId') userId: string) {
        if (!userId) throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
        return this.botService.identifyUser(userId);
    }

    @Get('catalog')
    async getCatalog() {
        return this.botService.getCatalog();
    }

    @Post('quote')
    async quote(@Body('address') address: string) {
        if (!address) throw new HttpException('address is required', HttpStatus.BAD_REQUEST);
        return this.botService.quoteShipping(address);
    }

    @Post('order')
    async createOrder(@Body() body: any) {
        // body: { userId, items: [{ variantId, quantity, modifiers }], shippingAddress, shippingCost }
        return this.botService.createBotOrder(body);
    }

    @Post('log-response')
    async logResponse(@Body() body: { phone: string, text: string }) {
        if (!body.phone || !body.text) throw new HttpException('phone and text are required', HttpStatus.BAD_REQUEST);
        return this.botService.logBotResponse(body);
    }
}
