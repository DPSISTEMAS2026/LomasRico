import { Controller, Get, Post, Body, Param, Patch, Delete, Query, Logger, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AvailabilityService } from '../availability/availability.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard) // Todo el inventario requiere autenticación
export class InventoryController {
    private readonly logger = new Logger(InventoryController.name);

    constructor(
        private readonly service: InventoryService,
        private readonly availabilityService: AvailabilityService,
    ) { }

    @Get('fix-recipes')
    fixRecipes() {
        return this.service.fixRecipes();
    }

    @Get()
    findAll() {
        this.logger.log('GET /inventory hit');
        return this.service.findAll();
    }

    @Post()
    create(@Body() data: any) {
        this.logger.log('POST /inventory hit');
        return this.service.create(data);
    }

    @Get('alerts/all')
    getAlerts() {
        return this.service.getAlerts();
    }

    @Get(':id')
    findOne(@Param('id') id: string) { return this.service.findOne(id); }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() data: any) {
        const result = await this.service.update(id, data);
        this.availabilityService.invalidateCache();
        return result;
    }

    @Post(':id/restock')
    async restock(@Param('id') id: string, @Body() body: { quantity: number; unitCost: number }) {
        const result = await this.service.restock(id, body.quantity, body.unitCost);
        this.availabilityService.invalidateCache();
        return result;
    }

    // ─── MERMA / WASTE ──────────────────────────────────────
    @Post(':id/waste')
    async registerWaste(
        @Param('id') id: string,
        @Body() body: { quantity: number; reason: string; note?: string },
    ) {
        this.logger.log(`POST /inventory/${id}/waste — qty: ${body.quantity}, reason: ${body.reason}`);
        const result = await this.service.registerWaste(id, body.quantity, body.reason, body.note);
        this.availabilityService.invalidateCache();
        return result;
    }

    // ─── PRODUCCIÓN DE SUB-RECETA ───────────────────────────
    @Post(':id/produce')
    async produceSubRecipe(
        @Param('id') id: string,
        @Body() body: { batches?: number },
    ) {
        this.logger.log(`POST /inventory/${id}/produce — batches: ${body.batches || 1}`);
        const result = await this.service.produceSubRecipe(id, body.batches || 1);
        this.availabilityService.invalidateCache();
        return result;
    }

    // ─── HISTORIAL DE MOVIMIENTOS ────────────────────────────
    @Get(':id/movements')
    getMovements(
        @Param('id') id: string,
        @Query('limit') limit?: string,
    ) {
        return this.service.getMovements(id, parseInt(limit || '50'));
    }

    // ─── HISTORIAL GLOBAL ───────────────────────────────────
    @Get('movements/all')
    getAllMovements(
        @Query('limit') limit?: string,
        @Query('reason') reason?: string,
    ) {
        return this.service.getAllMovements(parseInt(limit || '100'), reason);
    }

    @Delete(':id')
    delete(@Param('id') id: string) { return this.service.delete(id); }

    @Post('seed/force')
    async forceSeed() {
        return this.service.forceSeed();
    }
}
