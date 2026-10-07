import {
    Controller, Get, Post, Patch, Delete,
    Param, Body, UseGuards, Logger,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MANAGER_ROLES, Public } from '../auth/access';
import { Roles } from '../auth/roles.decorator';

@Controller('promotions')
@Roles(...MANAGER_ROLES)
export class PromotionsController {
    private readonly logger = new Logger(PromotionsController.name);

    constructor(private readonly service: PromotionsService) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    findAll() {
        return this.service.findAll();
    }

    /** 
     * GET /promotions/active-banners
     * Public — Retorna solo banners activos para el carousel de la web.
     * Filtrado por fecha, día y horario chileno.
     */
    @Public()
    @Get('active-banners')
    getActiveBanners() {
        return this.service.findActiveBanners();
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Public()
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

    /** El canje lo registra caja/servidor; no se expone para que nadie agote los usos de un código. */
    @Post('redeem/:code')
    redeem(@Param('code') code: string) {
        return this.service.redeemCode(code);
    }
}
