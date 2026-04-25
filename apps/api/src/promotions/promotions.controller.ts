import {
    Controller, Get, Post, Patch, Delete,
    Param, Body, UseGuards, Logger,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('promotions')
export class PromotionsController {
    private readonly logger = new Logger(PromotionsController.name);

    constructor(private readonly service: PromotionsService) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    findAll() {
        return this.service.findAll();
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    /** Public endpoint - validate a promo code (used by checkout) */
    @Get('validate/:code')
    validateCode(@Param('code') code: string) {
        return this.service.findByCode(code);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() body: any) {
        this.logger.log(`[Promotions] Creating: ${body.code}`);
        return this.service.create(body);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(@Param('id') id: string, @Body() body: any) {
        return this.service.update(id, body);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }

    /** Public endpoint - redeem a code at checkout */
    @Post('redeem/:code')
    redeem(@Param('code') code: string) {
        return this.service.redeemCode(code);
    }
}
