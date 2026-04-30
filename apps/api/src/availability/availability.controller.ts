import { Controller, Get, UseGuards } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('availability')
export class AvailabilityController {
    constructor(private readonly availabilityService: AvailabilityService) {}

    /**
     * GET /availability/alerts
     * Resumen de productos con bajo stock o agotados.
     * Usado por el POS y el Dashboard del dueño.
     */
    @UseGuards(JwtAuthGuard)
    @Get('alerts')
    async getAlerts() {
        return this.availabilityService.getAlertSummary();
    }

    /**
     * GET /availability/all
     * Devuelve la disponibilidad completa de todos los productos (admin/debug).
     */
    @UseGuards(JwtAuthGuard)
    @Get('all')
    async getAll() {
        const map = await this.availabilityService.calculateAll();
        return Object.fromEntries(map);
    }

    /**
     * POST /availability/invalidate
     * Fuerza invalidación del cache (admin only).
     */
    @UseGuards(JwtAuthGuard)
    @Get('invalidate')
    async invalidate() {
        this.availabilityService.invalidateCache();
        return { success: true, message: 'Cache de disponibilidad invalidado' };
    }
}
