import { Controller, Get, Post, Body, Param, Put, Delete, Logger, BadRequestException } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { seedSellingRecipes } from '../recipe-engineering/selling-recipes.seed';
import { PrismaService } from '../database/prisma.service';

@Controller('recipes')
export class RecipesController {
    private readonly logger = new Logger(RecipesController.name);

    constructor(
        private readonly recipesService: RecipesService,
        private readonly prisma: PrismaService
    ) { }

    @Get()
    findAll() {
        return this.recipesService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.recipesService.findOne(id);
    }

    // ✅ BUG #17 FIX: Endpoint para obtener receta por producto
    @Get('by-product/:productId')
    async getByProduct(@Param('productId') productId: string) {
        return this.recipesService.findByProduct(productId);
    }

    // Create or Update a Recipe for a Product or Preparation
    @Post()
    upsert(@Body() data: CreateRecipeDto) {
        this.logger.log(`Upserting recipe for target: ${data.targetId}`);
        return this.recipesService.upsertRecipe(data);
    }

    // ✅ Seed recetas faltantes en Supabase (Ceviches Peruanos etc.)
    @Post('seed-selling-recipes')
    async seedSellingRecipes() {
        this.logger.log('Running seedSellingRecipes...');
        try {
            await seedSellingRecipes(this.prisma as any);
            return { success: true, message: 'Recetas de venta sembradas correctamente en Supabase.' };
        } catch (e: any) {
            this.logger.error('Seed failed:', e.message);
            throw new BadRequestException(`Seed failed: ${e.message}`);
        }
    }
}
