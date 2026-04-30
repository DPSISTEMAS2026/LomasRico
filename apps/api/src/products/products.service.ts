import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AvailabilityService } from '../availability/availability.service';

import { MOCK_PRODUCTS } from './products.seed';
import { seedMasterRecipes } from '../recipe-engineering/master-recipes.seed';

@Injectable()
export class ProductsService implements OnModuleInit {
    private readonly logger = new Logger(ProductsService.name);

    constructor(
        private prisma: PrismaService,
        private availabilityService: AvailabilityService,
    ) { }

    async onModuleInit() {
        // En producción, NO ejecutar seed automático
        // Setear SKIP_SEED=false solo para primera carga de datos
        const skipSeed = process.env.SKIP_SEED !== 'false';
        if (skipSeed) {
            this.logger.log('Catalog auto-seed SKIPPED (SKIP_SEED != false). Set SKIP_SEED=false to force sync.');
            return;
        }
        this.ensureDatabaseInitialized();
    }

    private async ensureDatabaseInitialized() {
        try {
            this.logger.log('Syncing Catalog with Seed Data...');

            for (const p of MOCK_PRODUCTS) {
                const existing = await this.prisma.sellingProduct.findFirst({
                    where: { name: p.name },
                    include: { variants: true }
                });

                const seedImageUrl = (p as any).imageUrl
                    ? ((p as any).imageUrl.startsWith('http') || (p as any).imageUrl.startsWith('/') ? (p as any).imageUrl : `/assets/${(p as any).imageUrl}`)
                    : `/assets/${p.name}.png`;

                if (existing) {
                    await this.prisma.sellingProduct.update({
                        where: { id: existing.id },
                        data: {
                            description: p.description,
                            price: p.price,
                            category: p.category,
                            isConfigurable: p.isConfigurable,
                            maxProteins: (p as any).maxProteins ?? 0,
                            isActive: p.isActive,
                            imageUrl: seedImageUrl
                        }
                    });

                    // Sync variants for existing product
                    const mockVariants = (p as any).variants || [];
                    if (mockVariants.length > 0) {
                        for (const mv of mockVariants) {
                            const existingVariant = (existing as any).variants?.find((v: any) => v.name === mv.name);
                            if (existingVariant) {
                                await this.prisma.productVariant.update({
                                    where: { id: existingVariant.id },
                                    data: { price: mv.price, isActive: true }
                                });
                            } else {
                                await this.prisma.productVariant.create({
                                    data: {
                                        sellingProductId: existing.id,
                                        name: mv.name,
                                        price: mv.price,
                                        isActive: true
                                    }
                                });
                            }
                        }
                    }
                } else {
                    // Create new product
                    await this.prisma.sellingProduct.create({
                        data: {
                            name: p.name,
                            description: p.description,
                            price: p.price,
                            category: p.category,
                            imageUrl: seedImageUrl,
                            imageKey: (p as any).imageUrl || `${p.name}.png`,
                            isActive: p.isActive,
                            isConfigurable: p.isConfigurable,
                            maxProteins: (p as any).maxProteins || 0,
                            variants: (p as any).variants ? {
                                create: (p as any).variants.map((v: any) => ({
                                    name: v.name,
                                    price: v.price,
                                    isActive: true
                                }))
                            } : undefined
                        }
                    });
                }
            }

            // 3. Seed Master Recipes (solo si no existen)
            try {
                const existingRecipes = await this.prisma.recipe.count();
                if (existingRecipes === 0) {
                    this.logger.log('No recipes found, seeding master recipes...');
                    await seedMasterRecipes(this.prisma);
                } else {
                    this.logger.log(`${existingRecipes} recipes exist, skipping seed.`);
                }
            } catch (e) {
                this.logger.warn('Master Recipes seeding skipped: ' + e.message);
            }

            this.logger.log('Catalog Sync Complete.');
        } catch (error) {
            this.logger.error('Failed to seed database', error);
        }
    }

    private enrichProduct = (p: any) => {
        const enriched = {
            ...p,
            price: Number(p.price),
            sortOrder: p.sortOrder || 0,
        };

        if (enriched.variants) {
            enriched.variants = enriched.variants.map((v: any) => ({
                ...v,
                price: Number(v.price)
            }));
        }

        // Transform productModifiers into a clean frontend-friendly structure
        if (enriched.productModifiers && enriched.productModifiers.length > 0) {
            enriched.modifiers = enriched.productModifiers.map((pm: any) => ({
                groupId: pm.modifierGroupId,
                groupName: pm.modifierGroup.name,
                displayName: pm.modifierGroup.displayName,
                type: pm.modifierGroup.type,
                isRequired: pm.isRequired,
                sortOrder: pm.sortOrder,
                minSelections: pm.overrideMin ?? pm.modifierGroup.minSelections,
                maxSelections: pm.overrideMax ?? pm.modifierGroup.maxSelections,
                options: pm.modifierGroup.options.map((o: any) => ({
                    id: o.id,
                    name: o.name,
                    priceAdjustment: Number(o.priceAdjustment),
                    isDefault: o.isDefault,
                })),
            }));
            delete enriched.productModifiers;
        } else {
            enriched.modifiers = [];
            delete enriched.productModifiers;
        }

        if (!enriched.imageUrl) {
            let filename = enriched.name;
            let ext = '.png'; // Default to png for catalog images in this version

            if (enriched.name === 'Ceviche Peruano 500g') ext = '.jpeg';
            if (enriched.category === 'EMPANADAS') ext = '.jpg';

            enriched.imageUrl = `/assets/${filename}${ext}`;
        }
        return enriched;
    };

    private sortProducts(products: any[]) {
        return products.sort((a, b) => {
            const sa = a.sortOrder ?? 9999;
            const sb = b.sortOrder ?? 9999;
            if (sa !== sb) return sa - sb;
            return a.name.localeCompare(b.name);
        });
    }

    async findActive() {
        const products = await this.prisma.sellingProduct.findMany({
            where: { isActive: true },
            include: {
                variants: true,
                recipe: {
                    include: {
                        items: {
                            include: { ingredient: true }
                        }
                    }
                },
                productModifiers: {
                    include: {
                        modifierGroup: {
                            include: {
                                options: {
                                    where: { isActive: true },
                                    orderBy: { sortOrder: 'asc' }
                                }
                            }
                        }
                    },
                    orderBy: { sortOrder: 'asc' }
                }
            }
        });

        // Calcular disponibilidad de todos los productos
        let availabilityMap: Map<string, any>;
        try {
            availabilityMap = await this.availabilityService.calculateAll();
        } catch (error) {
            this.logger.error('Error calculating availability, returning all as available', error);
            availabilityMap = new Map();
        }

        const enriched = products.map(p => {
            const product = this.enrichProduct(p);
            const avail = availabilityMap.get(product.id);
            if (avail) {
                product.maxQuantity = avail.maxQuantity;
                product.available = avail.available;
                product.stockAlert = avail.stockAlert || undefined;
                product.bottleneck = avail.bottleneck || undefined;
            } else {
                // Sin datos de disponibilidad → asumir disponible
                product.maxQuantity = 999;
                product.available = true;
            }
            return product;
        });

        return this.sortProducts(enriched);
    }

    async findAll() {
        const products = await this.prisma.sellingProduct.findMany({
            include: {
                variants: true,
                recipe: {
                    include: {
                        items: {
                            include: { ingredient: true }
                        }
                    }
                },
                productModifiers: {
                    include: {
                        modifierGroup: {
                            include: {
                                options: {
                                    where: { isActive: true },
                                    orderBy: { sortOrder: 'asc' }
                                }
                            }
                        }
                    },
                    orderBy: { sortOrder: 'asc' }
                }
            }
        });

        const enriched = products.map(this.enrichProduct);
        return this.sortProducts(enriched);
    }

    async findOne(id: string) {
        const product = await this.prisma.sellingProduct.findUnique({
            where: { id },
            include: {
                variants: true,
                recipe: {
                    include: { items: { include: { ingredient: true } } }
                }
            }
        });
        if (!product) return null;
        return this.enrichProduct(product);
    }

    async create(data: any) {
        return this.prisma.sellingProduct.create({ data });
    }

    async update(id: string, data: any) {
        return this.prisma.sellingProduct.update({ where: { id }, data });
    }

    async remove(id: string) {
        return this.prisma.sellingProduct.update({ where: { id }, data: { isActive: false } });
    }

    async reorder(items: { id: string; sortOrder: number }[]) {
        this.logger.log(`Reordering ${items.length} products`);
        const updates = items.map(item =>
            this.prisma.sellingProduct.update({
                where: { id: item.id },
                data: { sortOrder: item.sortOrder }
            })
        );
        await this.prisma.$transaction(updates);
        return { success: true, updated: items.length };
    }

    /**
     * Elimina permanentemente un producto y todas sus dependencias.
     * Cascada: RecipeSnapshots → SaleItems → Recipes → RecipeItems → Variants → ProductModifiers → Product
     */
    async hardDelete(id: string) {
        this.logger.warn(`HARD DELETE product ${id} — this is irreversible!`);

        return this.prisma.$transaction(async (tx: any) => {
            // 1. Encontrar el producto con todas sus relaciones
            const product = await tx.sellingProduct.findUnique({
                where: { id },
                include: {
                    saleItems: { select: { id: true } },
                    variants: { select: { id: true, saleItems: { select: { id: true } } } },
                    recipe: { select: { id: true } },
                }
            });

            if (!product) {
                throw new Error(`Producto ${id} no encontrado`);
            }

            // 2. Eliminar RecipeSnapshots de SaleItems del producto
            const allSaleItemIds = [
                ...product.saleItems.map((si: any) => si.id),
                ...product.variants.flatMap((v: any) => v.saleItems.map((si: any) => si.id))
            ];

            if (allSaleItemIds.length > 0) {
                await tx.recipeSnapshot.deleteMany({
                    where: { saleItemId: { in: allSaleItemIds } }
                });
            }

            // 3. Eliminar SaleItems del producto (directos y de variantes)
            await tx.saleItem.deleteMany({
                where: { sellingProductId: id }
            });

            for (const variant of product.variants) {
                await tx.saleItem.deleteMany({
                    where: { productVariantId: variant.id }
                });
            }

            // 4. Eliminar Variants
            await tx.productVariant.deleteMany({
                where: { sellingProductId: id }
            });

            // 5. Eliminar ProductModifiers
            await tx.productModifier.deleteMany({
                where: { sellingProductId: id }
            });

            // 6. Eliminar Recipe y sus items
            if (product.recipe) {
                await tx.recipeItem.deleteMany({
                    where: { recipeId: product.recipe.id }
                });
                // Desenlazar antes de borrar
                await tx.sellingProduct.update({
                    where: { id },
                    data: { recipeId: null }
                });
                await tx.recipe.delete({
                    where: { id: product.recipe.id }
                });
            }

            // 7. Finalmente, eliminar el producto
            await tx.sellingProduct.delete({ where: { id } });

            return { success: true, deleted: product.name };
        }, { maxWait: 10000, timeout: 30000 });
    }

    /**
     * Elimina permanentemente todos los productos de una categoría.
     */
    async deleteCategory(category: string) {
        this.logger.warn(`HARD DELETE all products in category "${category}"`);

        const products = await this.prisma.sellingProduct.findMany({
            where: { category },
            select: { id: true, name: true }
        });

        if (products.length === 0) {
            return { success: true, deleted: 0, category };
        }

        const results = [];
        for (const p of products) {
            try {
                await this.hardDelete(p.id);
                results.push({ id: p.id, name: p.name, status: 'deleted' });
            } catch (e: any) {
                results.push({ id: p.id, name: p.name, status: 'error', error: e.message });
            }
        }

        return {
            success: true,
            category,
            totalProcessed: results.length,
            results
        };
    }
}
