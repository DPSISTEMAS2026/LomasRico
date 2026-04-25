import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ValidateSaleItemDto } from './dto/validate-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sales')
export class SalesController {
    constructor(private readonly salesService: SalesService) { }

    // POST /sales — Crear venta
    // Abierto parcialmente: WEB clients crean ventas sin login (guest checkout)
    // POS clients deben estar autenticados pero el guard se aplica desde el panel
    @Post()
    create(@Body() createSaleDto: CreateSaleDto) {
        return this.salesService.create(createSaleDto);
    }

    // GET /sales — Solo panel admin/owner
    @UseGuards(JwtAuthGuard)
    @Get()
    findAll() {
        return this.salesService.findAll();
    }

    // POST validate-item — Público para validación en tiempo real del carrito
    @Post('validate-item')
    validateItem(@Body() validateDto: ValidateSaleItemDto) {
        return this.salesService.validateItem(validateDto);
    }

    // POST :id/status — Solo panel admin/POS
    @UseGuards(JwtAuthGuard)
    @Post(':id/status')
    updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
        return this.salesService.updateStatus(id, body.status);
    }
}
