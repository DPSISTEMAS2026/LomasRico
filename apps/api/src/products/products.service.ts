import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

import { MOCK_PRODUCTS } from './products.seed';
import { seedMasterRecipes } from '../recipe-engineering/master-recipes.seed';

@Injectable()
export class ProductsService implements OnModuleInit {
    private readonly logger = new Logger(ProductsService.name);

    constructor(private prisma: PrismaService) { }

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
            price: Number(p.price)
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
        const CATEGORY_PRIORITY: Record<string, number> = {
            'PROMOS': 1,
            'CEVICHE PERUANO': 2,
            'CEVICHE LOMASRICO': 3,
            'CEVICHE TROPICAL': 4,
            'CEVICHE VEG': 5,
            'CEVICHE SIN VERDE': 6,
            'BOWLS': 7,
            'GOHAN': 8,
            'ROLLS PREMIUM': 9,
            'HAND ROLLS': 10,
            'EMPANADAS': 11,
            'PAPAS / FRITOS': 12,
            'PANCITOS': 13,
            'BEBIDAS': 14,
            'EXTRAS': 15
        };

        return products.sort((a, b) => {
            const pa = CATEGORY_PRIORITY[a.category] || 999;
            const pb = CATEGORY_PRIORITY[b.category] || 999;
            if (pa !== pb) return pa - pb;
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

        const enriched = products.map(this.enrichProduct);
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
}
