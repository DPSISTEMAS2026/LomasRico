import { Controller, Get, Post, Body, Param, Patch, Delete, Logger, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard) // Todo el inventario requiere autenticación
export class InventoryController {
    private readonly logger = new Logger(InventoryController.name);

    constructor(private readonly service: InventoryService) { }

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
    update(@Param('id') id: string, @Body() data: any) { return this.service.update(id, data); }

    @Post(':id/restock')
    restock(@Param('id') id: string, @Body() body: { quantity: number; unitCost: number }) {
        return this.service.restock(id, body.quantity, body.unitCost);
    }

    @Delete(':id')
    delete(@Param('id') id: string) { return this.service.delete(id); }

    @Post('seed/force')
    async forceSeed() {
        return this.service.forceSeed();
    }
}
