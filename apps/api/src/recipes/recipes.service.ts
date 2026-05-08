import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class RecipesService {
    private readonly logger = new Logger(RecipesService.name);

    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.recipe.findMany({
            include: {
                sellingProduct: true,
                outputItem: true,
                items: { include: { ingredient: true } }
            }
        });
    }

    async findOne(id: string) {
        return this.prisma.recipe.findUnique({
            where: { id },
            include: { items: { include: { ingredient: true } } }
        });
    }

    /**
     * Upsert Recipe
     * @param data { 
     *   targetId: string (ProductID or InventoryItemID),
     *   type: 'PRODUCT' | 'PREPARATION',
     *   baseWeight: number,
     *   items: { ingredientId: string, quantity: number, unit: string, role?: string }[] 
     * }
     */

    // ✅ BUG #17 FIX: Método para obtener receta por producto
    async findByProduct(productId: string) {
        const product = await this.prisma.sellingProduct.findUnique({
            where: { id: productId },
            include: {
                recipe: {
                    include: {
                        items: {
                            include: {
                                ingredient: true
                            }
                        }
                    }
                }
            }
        });

        if (!product) {
            throw new NotFoundException(`Product ${productId} not found`);
        }

        if (!product.recipe) {
            throw new NotFoundException(`Product ${product.name} has no recipe configured`);
        }

        return product.recipe;
    }

    async upsertRecipe(data: any) {
        const { targetId, type, items, baseWeight } = data;

        if (!targetId) throw new BadRequestException('Target ID required');

        // 1. Resolve Target
        let existingRecipeId = null;
        if (type === 'PRODUCT') {
            const product = await this.prisma.sellingProduct.findUnique({ where: { id: targetId } });
            if (!product) throw new NotFoundException('Product not found');
            existingRecipeId = product.recipeId;
        } else if (type === 'PREPARATION') {
            // Note: In schema, InventoryItem (Preparation) has relation "productionRecipe"
            // We need to find the Recipe that has outputItemId == targetId
            const recipe = await this.prisma.recipe.findUnique({ where: { outputItemId: targetId } });
            existingRecipeId = recipe?.id || null;
        }

        // 2. Normalize Items (Unit Conversion)
        const normalizedItems = await Promise.all(items.map(async (item: any) => {
            const ingredient = await this.prisma.inventoryItem.findUnique({ where: { id: item.ingredientId } });
            if (!ingredient) throw new BadRequestException(`Ingredient ${item.ingredientId} not found`);

            let quantityObj = item.quantity;

            // Logic: KG -> G, LT -> ML
            // We want to store in INGREDIENT'S BASE UNIT.
            // If Ingredient is KG:
            //   - User sends 500g -> Store 0.5
            //   - User sends 2kg -> Store 2
            // If Ingredient is UN:
            //   - User sends 2 -> Store 2

            const targetUnit = ingredient.unit; // KG, LT, UN
            const inputUnit = (item.unit || targetUnit).toUpperCase();
            const inputQty = Number(item.quantity) || 0;

            let finalQty = inputQty;

            if (targetUnit === 'KG') {
                if (inputUnit === 'G' || inputUnit === 'GR' || inputUnit === 'GRAMOS') {
                    finalQty = inputQty / 1000;
                } else if (inputUnit === 'KG' || inputUnit === 'KILO') {
                    finalQty = inputQty;
                }
            } else if (targetUnit === 'LT') {
                if (inputUnit === 'ML' || inputUnit === 'CC' || inputUnit === 'MILILITROS') {
                    finalQty = inputQty / 1000;
                } else if (inputUnit === 'LT' || inputUnit === 'LITRO') {
                    finalQty = inputQty;
                }
            } else {
                // UN, etc. Assume strict match or direct quantity
                finalQty = inputQty;
            }

            return {
                ingredientId: item.ingredientId,
                quantity: finalQty,
                role: item.role || 'BASE'
            };
        }));

        // 3. Create or Update Recipe
        // Since we are "Correcting", we likely want to Replace all items.
        // Prisma transaction to update Recipe and Replace items.

        return this.prisma.$transaction(async (tx) => {
            let recipeId = existingRecipeId;

            // Define Recipe Data
            const recipeData = {
                baseWeight: Number(baseWeight) || 0,
                name: `Recipe for ${targetId}`,
                // If it's a preparation, link outputItemId
                ...(type === 'PREPARATION' ? { outputItemId: targetId } : {})
            };

            if (recipeId) {
                // Update basic info
                await tx.recipe.update({
                    where: { id: recipeId },
                    data: recipeData
                });
                // Delete old items
                await tx.recipeItem.deleteMany({ where: { recipeId } });
            } else {
                // Create new
                const newRecipe = await tx.recipe.create({
                    data: recipeData
                });
                recipeId = newRecipe.id;

                // Link to Product if needed
                if (type === 'PRODUCT') {
                    await tx.sellingProduct.update({
                        where: { id: targetId },
                        data: { recipeId }
                    });
                }
            }

            // Insert new items
            if (normalizedItems.length > 0) {
                await tx.recipeItem.createMany({
                    data: normalizedItems.map((i: any) => ({
                        recipeId: recipeId!,
                        ingredientId: i.ingredientId,
                        quantity: i.quantity,
                        role: i.role as any
                    }))
                });
            }

            return tx.recipe.findUnique({
                where: { id: recipeId! },
                include: { items: { include: { ingredient: true } } }
            });
        });
    }

    /**
     * Delete a Recipe by ID.
     * - Unlinks from SellingProduct (PRODUCT) or InventoryItem (PREPARATION)
     * - Deletes all RecipeItems, then the Recipe itself
     */
    async deleteRecipe(recipeId: string) {
        const recipe = await this.prisma.recipe.findUnique({
            where: { id: recipeId },
            include: { sellingProduct: true, outputItem: true }
        });

        if (!recipe) throw new NotFoundException(`Recipe ${recipeId} not found`);

        return this.prisma.$transaction(async (tx) => {
            // 1. Unlink from SellingProduct if it's a product recipe
            if (recipe.sellingProduct) {
                await tx.sellingProduct.update({
                    where: { id: recipe.sellingProduct.id },
                    data: { recipeId: null }
                });
            }

            // 2. Clear ModifierOption links to this recipe
            await tx.modifierOption.updateMany({
                where: { recipeId },
                data: { recipeId: null }
            });

            // 3. Delete all recipe items
            await tx.recipeItem.deleteMany({ where: { recipeId } });

            // 4. Delete the recipe
            await tx.recipe.delete({ where: { id: recipeId } });

            return { deleted: true, id: recipeId, name: recipe.name };
        });
    }
}
