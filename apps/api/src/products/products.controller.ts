import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    // Público — Usado por el panel admin para ver todos los productos
    @UseGuards(JwtAuthGuard)
    @Get()
    findAll() {
        return this.productsService.findAll();
    }

    // Público — Usado por la web de clientes para ver solo los activos
    @Get('active')
    findActive() {
        return this.productsService.findActive();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.productsService.findOne(id);
    }

    // Solo autenticados — Crear producto
    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Body() data: CreateProductDto) {
        return this.productsService.create(data);
    }

    // Solo autenticados — Editar producto
    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    update(@Param('id') id: string, @Body() data: UpdateProductDto) {
        return this.productsService.update(id, data);
    }
}
