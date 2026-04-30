import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
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

    // Solo autenticados — Reordenar productos (debe ir ANTES de :id)
    @UseGuards(JwtAuthGuard)
    @Patch('reorder/bulk')
    reorder(@Body() data: { items: { id: string; sortOrder: number }[] }) {
        return this.productsService.reorder(data.items);
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

    // Solo autenticados — Eliminar todos los productos de una categoría (debe ir ANTES de :id)
    @UseGuards(JwtAuthGuard)
    @Delete('category/:category')
    deleteCategory(@Param('category') category: string) {
        return this.productsService.deleteCategory(category);
    }

    // Solo autenticados — Eliminar producto permanentemente
    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    hardDelete(@Param('id') id: string) {
        return this.productsService.hardDelete(id);
    }
}
