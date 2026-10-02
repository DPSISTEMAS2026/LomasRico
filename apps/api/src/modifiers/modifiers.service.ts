import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { cleanModifierLabel } from '../common/clean-label';
import { ProductsService } from '../products/products.service';

@Injectable()
export class ModifiersService {
    private readonly logger = new Logger(ModifiersService.name);

    constructor(
        private prisma: PrismaService,
        private productsService: ProductsService,
    ) {}

    // ===============================================
    // MODIFIER GROUPS CRUD
    // ===============================================

    async findAllGroups() {
        const groups = await this.prisma.modifierGroup.findMany({
            include: {
                options: {
                    where: { isActive: true },
                    orderBy: { sortOrder: 'asc' },
                    include: {
                        inventoryItem: { select: { id: true, name: true } },
                        recipe: {
                            select: {
                                id: true,
                                name: true,
                                baseWeight: true,
                                internalRules: true,
                                _count: { select: { items: true } },
                            },
                        },
                    },
                },
                _count: {
                    select: { productModifiers: true },
                },
                productModifiers: {
                    include: { sellingProduct: { select: { id: true, name: true, category: true, isActive: true } } },
                },
            },
            orderBy: { sortOrder: 'asc' },
        });

        return groups.map((g) => ({
            ...g,
            name: cleanModifierLabel(g.name) || g.name,
            displayName: cleanModifierLabel(g.displayName) || g.displayName,
            assignedProductsCount: g._count.productModifiers,
            options: g.options.map((o: any) => this.serializeOption(o)),
        }));
    }

    async findOneGroup(id: string) {
        const group = await this.prisma.modifierGroup.findUnique({
            where: { id },
            include: {
                options: {
                    orderBy: { sortOrder: 'asc' },
                    include: {
                        inventoryItem: { select: { id: true, name: true } },
                        recipe: {
                            select: {
                                id: true,
                                name: true,
                                baseWeight: true,
                                internalRules: true,
                                _count: { select: { items: true } },
                            },
                        },
                    },
                },
                productModifiers: {
                    include: { sellingProduct: { select: { id: true, name: true, category: true } } },
                },
            },
        });
        if (!group) throw new NotFoundException('Modifier Group not found');
        return {
            ...group,
            name: cleanModifierLabel(group.name) || group.name,
            displayName: cleanModifierLabel(group.displayName) || group.displayName,
            options: group.options.map((o: any) => this.serializeOption(o)),
        };
    }

    async createGroup(data: {
        name: string;
        displayName: string;
        type?: 'SINGLE_SELECT' | 'MULTI_SELECT';
        role?: 'SIZE' | 'PROTEIN' | 'SAUCE' | 'FLAVOR' | 'REMOVE' | 'PORTION' | 'UPSELL' | 'OTHER';
        minSelections?: number;
        maxSelections?: number;
        showOnWeb?: boolean;
        showOnPos?: boolean;
        showOnSalon?: boolean;
        sortOrder?: number;
        options?: { name: string; priceAdjustment?: number; isDefault?: boolean; sortOrder?: number }[];
    }) {
        const role = data.role || 'OTHER';
        return this.prisma.modifierGroup.create({
            data: {
                name: cleanModifierLabel(data.name) || data.name,
                displayName: cleanModifierLabel(data.displayName) || data.displayName,
                type: data.type || 'SINGLE_SELECT',
                role,
                minSelections: data.minSelections ?? 0,
                maxSelections: data.maxSelections ?? 1,
                showOnWeb: data.showOnWeb ?? true,
                showOnPos: data.showOnPos ?? true,
                showOnSalon: data.showOnSalon ?? role !== 'UPSELL',
                sortOrder: data.sortOrder ?? 0,
                options: data.options
                    ? {
                          create: data.options.map((o, i) => ({
                              name: o.name,
                              priceAdjustment: o.priceAdjustment ?? 0,
                              isDefault: o.isDefault ?? false,
                              sortOrder: o.sortOrder ?? i,
                              recipeId: (o as any).recipeId || null,
                          })),
                      }
                    : undefined,
            },
            include: { options: true },
        });
    }

    async updateGroup(
        id: string,
        data: {
            name?: string;
            displayName?: string;
            type?: 'SINGLE_SELECT' | 'MULTI_SELECT';
            role?: 'SIZE' | 'PROTEIN' | 'SAUCE' | 'FLAVOR' | 'REMOVE' | 'PORTION' | 'UPSELL' | 'OTHER';
            minSelections?: number;
            maxSelections?: number;
            showOnWeb?: boolean;
            showOnPos?: boolean;
            showOnSalon?: boolean;
            sortOrder?: number;
        },
    ) {
        const updated = await this.prisma.modifierGroup.update({
            where: { id },
            data: {
                ...data,
                ...(data.name !== undefined ? { name: cleanModifierLabel(data.name) || data.name } : {}),
                ...(data.displayName !== undefined ? { displayName: cleanModifierLabel(data.displayName) || data.displayName } : {}),
            },
            include: { options: true },
        });
        this.productsService.invalidateActiveCatalog();
        return updated;
    }

    async applyRoleSuggestions() {
        const groups = await this.prisma.modifierGroup.findMany({
            select: { id: true, name: true, displayName: true, role: true },
        });
        let updated = 0;
        const changes: { id: string; name: string; role: string }[] = [];
        for (const group of groups) {
            const role = this.suggestRole(group.name, group.displayName);
            if (role === 'OTHER') continue;
            const shouldFix = !group.role || group.role === 'OTHER' || (group.role === 'REMOVE' && role === 'SIZE');
            if (!shouldFix) continue;
            await this.prisma.modifierGroup.update({
                where: { id: group.id },
                data: {
                    role,
                    showOnSalon: role !== 'UPSELL',
                    showOnWeb: true,
                    showOnPos: true,
                },
            });
            updated += 1;
            changes.push({ id: group.id, name: group.displayName || group.name, role });
        }
        const agrandaIds = groups.filter((g) => /agranda tu ceviche/i.test(`${g.name} ${g.displayName}`)).map((g) => g.id);
        const sizeIds = groups.filter((g) => this.suggestRole(g.name, g.displayName) === 'SIZE').map((g) => g.id);
        let detachedAgrandar = 0;
        if (agrandaIds.length && sizeIds.length) {
            const withSize = await this.prisma.productModifier.findMany({
                where: { modifierGroupId: { in: sizeIds } },
                select: { sellingProductId: true },
            });
            const productIds = [...new Set(withSize.map((x) => x.sellingProductId))];
            if (productIds.length) {
                const removed = await this.prisma.productModifier.deleteMany({
                    where: {
                        modifierGroupId: { in: agrandaIds },
                        sellingProductId: { in: productIds },
                    },
                });
                detachedAgrandar = removed.count;
            }
        }
        const leftover = groups
            .filter((g) => {
                const next = changes.find((c) => c.id === g.id)?.role || g.role || 'OTHER';
                return next === 'OTHER';
            })
            .map((g) => `${g.name} | ${g.displayName}`);
        return { updated, changes };
    }

    private suggestRole(groupName?: string, displayName?: string) {
        const display = (displayName || '').toLowerCase();
        if (/formato|tama[ñn]o/.test(display) && !/quita/.test(display)) return 'SIZE' as const;
        const label = `${groupName || ''} ${displayName || ''}`.toLowerCase();
        if (/extras?\s*lomasrico|extras?\s+lo\s*m[aá]s\s*rico|limonada\s+lomasrico|upsell/.test(label)) {
            return 'UPSELL' as const;
        }
        if (/agranda tu ceviche/.test(label)) return 'UPSELL' as const;
        if (/quita|sin verdura/.test(label)) return 'REMOVE' as const;
        if (/salsa/.test(label)) return 'SAUCE' as const;
        if (/protein|proteín|gohan|elige tu roll|topping|relleno|premium|doble prote/.test(label)) return 'PROTEIN' as const;
        if (/sabor|variedades|bebida lata|limonad|monster/.test(label)) return 'FLAVOR' as const;
        if (/formato|tama[ñn]o|opciones cc|\bcc\b|1\s*kg|crudo|full bajon|pisco/.test(label)) return 'SIZE' as const;
        if (/unidad|docena|dos x|hand roll|empanad|aros|papas|camar[oó]n|porci[oó]n/.test(label)) return 'PORTION' as const;
        if (/opciones|elige/.test(label)) return 'PORTION' as const;
        return 'OTHER' as const;
    }

    async deleteGroup(id: string) {
        return this.prisma.modifierGroup.delete({ where: { id } });
    }

    /**
     * Reordena las opciones de un grupo de modificadores.
     */
    async reorderOptions(groupId: string, items: { id: string; sortOrder: number }[]) {
        this.logger.log(`Reordering ${items.length} options in group ${groupId}`);
        const updates = items.map(item =>
            this.prisma.modifierOption.update({
                where: { id: item.id },
                data: { sortOrder: item.sortOrder }
            })
        );
        await this.prisma.$transaction(updates);
        return { success: true, updated: items.length };
    }

    // ===============================================
    // MODIFIER OPTIONS CRUD
    // ===============================================

    async addOption(
        groupId: string,
        data: { name: string; priceAdjustment?: number; isDefault?: boolean; sortOrder?: number; recipeId?: string },
    ) {
        return this.prisma.modifierOption.create({
            data: {
                modifierGroupId: groupId,
                name: data.name,
                priceAdjustment: data.priceAdjustment ?? 0,
                isDefault: data.isDefault ?? false,
                sortOrder: data.sortOrder ?? 0,
                recipeId: data.recipeId || null,
            },
        });
    }

    async updateOption(optionId: string, data: { name?: string; priceAdjustment?: number; isDefault?: boolean; isActive?: boolean; sortOrder?: number; recipeId?: string | null; inventoryItemId?: string | null }) {
        return this.prisma.modifierOption.update({
            where: { id: optionId },
            data,
        });
    }

    async deleteOption(optionId: string) {
        return this.prisma.modifierOption.delete({ where: { id: optionId } });
    }

    // ===============================================
    // PRODUCT-MODIFIER ASSIGNMENT
    // ===============================================

    async assignToProduct(
        productId: string,
        modifierGroupId: string,
        config?: { isRequired?: boolean; sortOrder?: number; overrideMin?: number; overrideMax?: number },
    ) {
        const existing = await this.prisma.productModifier.findUnique({
            where: {
                sellingProductId_modifierGroupId: {
                    sellingProductId: productId,
                    modifierGroupId,
                },
            },
            select: { sortOrder: true },
        });
        const sortOrder = config?.sortOrder ?? existing?.sortOrder ?? await this.nextSortOrder(productId);
        const overrideMax = config?.overrideMax !== undefined ? Math.max(1, Math.floor(Number(config.overrideMax) || 1)) : undefined;
        let overrideMin = config?.overrideMin !== undefined ? Math.max(0, Math.floor(Number(config.overrideMin) || 0)) : undefined;
        if (overrideMin !== undefined && overrideMax !== undefined && overrideMin > overrideMax) overrideMin = overrideMax;
        const isRequired = config?.isRequired ?? (overrideMin !== undefined ? overrideMin > 0 : undefined);
        const update: { isRequired?: boolean; sortOrder?: number; overrideMin?: number; overrideMax?: number } = {};
        if (isRequired !== undefined) update.isRequired = isRequired;
        if (config?.sortOrder !== undefined) update.sortOrder = config.sortOrder;
        if (overrideMin !== undefined) update.overrideMin = overrideMin;
        if (overrideMax !== undefined) update.overrideMax = overrideMax;
        const saved = await this.prisma.productModifier.upsert({
            where: {
                sellingProductId_modifierGroupId: {
                    sellingProductId: productId,
                    modifierGroupId,
                },
            },
            update,
            create: {
                sellingProductId: productId,
                modifierGroupId,
                isRequired: isRequired ?? false,
                sortOrder,
                overrideMin,
                overrideMax,
            },
        });
        this.productsService.invalidateActiveCatalog();
        return saved;
    }

    private async nextSortOrder(productId: string) {
        const agg = await this.prisma.productModifier.aggregate({
            where: { sellingProductId: productId },
            _max: { sortOrder: true },
        });
        return (agg._max.sortOrder ?? -1) + 1;
    }

    async replaceProductAssignments(groupId: string, productIds: string[], config?: { isRequired?: boolean }) {
        const uniqueIds = [...new Set(productIds.filter(Boolean))];
        await this.prisma.productModifier.deleteMany({
            where: {
                modifierGroupId: groupId,
                sellingProductId: { notIn: uniqueIds.length ? uniqueIds : ['__none__'] },
            },
        });
        for (const productId of uniqueIds) {
            await this.assignToProduct(productId, groupId, {
                isRequired: config?.isRequired,
            });
        }
        return this.findOneGroup(groupId);
    }

    async createWithProducts(data: {
        displayName: string;
        role?: 'SIZE' | 'PROTEIN' | 'SAUCE' | 'FLAVOR' | 'REMOVE' | 'PORTION' | 'UPSELL' | 'OTHER';
        type?: 'SINGLE_SELECT' | 'MULTI_SELECT';
        minSelections?: number;
        maxSelections?: number;
        showOnWeb?: boolean;
        showOnPos?: boolean;
        showOnSalon?: boolean;
        options?: { name: string; priceAdjustment?: number }[];
        productIds: string[];
    }) {
        const single = (data.type || 'SINGLE_SELECT') === 'SINGLE_SELECT';
        const created = await this.createGroup({
            name: `mod-${Date.now()}`,
            displayName: data.displayName,
            role: data.role,
            type: data.type,
            minSelections: data.minSelections,
            maxSelections: data.maxSelections,
            showOnWeb: data.showOnWeb,
            showOnPos: data.showOnPos,
            showOnSalon: data.showOnSalon,
            options: (data.options || []).map((o, i) => ({
                name: o.name,
                priceAdjustment: o.priceAdjustment ?? 0,
                isDefault: single && i === 0,
                sortOrder: i,
            })),
        });
        const required = (data.minSelections ?? 0) > 0;
        const assigned: { productId: string; sortOrder: number }[] = [];
        for (const productId of data.productIds || []) {
            const sortOrder = await this.nextSortOrder(productId);
            await this.assignToProduct(productId, created.id, { isRequired: required, sortOrder });
            assigned.push({ productId, sortOrder });
        }
        this.productsService.invalidateActiveCatalog();
        return this.findOneGroup(created.id);
    }

    async removeFromProduct(productId: string, modifierGroupId: string) {
        return this.prisma.productModifier.delete({
            where: {
                sellingProductId_modifierGroupId: {
                    sellingProductId: productId,
                    modifierGroupId,
                },
            },
        });
    }

    async getProductModifiers(productId: string) {
        const modifiers = await this.prisma.productModifier.findMany({
            where: { sellingProductId: productId },
            include: {
                modifierGroup: {
                    include: {
                        options: {
                            where: { isActive: true },
                            orderBy: { sortOrder: 'asc' },
                        },
                    },
                },
            },
            orderBy: { sortOrder: 'asc' },
        });

        return modifiers.map((m) => ({
            id: m.id,
            groupId: m.modifierGroupId,
            groupName: cleanModifierLabel(m.modifierGroup.displayName || m.modifierGroup.name),
            displayName: cleanModifierLabel(m.modifierGroup.displayName || m.modifierGroup.name),
            type: (m.overrideMax ?? m.modifierGroup.maxSelections) > 1 ? 'MULTI_SELECT' : m.modifierGroup.type,
            isRequired: m.isRequired,
            sortOrder: m.sortOrder,
            role: m.modifierGroup.role || 'OTHER',
            showOnWeb: m.modifierGroup.showOnWeb !== false,
            showOnPos: m.modifierGroup.showOnPos !== false,
            showOnSalon: m.modifierGroup.showOnSalon !== false,
            minSelections: m.overrideMin ?? m.modifierGroup.minSelections,
            maxSelections: m.overrideMax ?? m.modifierGroup.maxSelections,
            options: m.modifierGroup.options.map((o) => ({
                id: o.id,
                name: o.name,
                priceAdjustment: Number(o.priceAdjustment),
                isDefault: o.isDefault,
            })),
        }));
    }

    /**
     * Reordena los modificadores asignados a un producto específico.
     */
    async reorderProductModifiers(productId: string, items: { groupId: string; sortOrder: number }[]) {
        this.logger.log(`Reordering ${items.length} modifiers for product ${productId}`);
        const updates = items.map(item =>
            this.prisma.productModifier.update({
                where: {
                    sellingProductId_modifierGroupId: {
                        sellingProductId: productId,
                        modifierGroupId: item.groupId,
                    },
                },
                data: { sortOrder: item.sortOrder },
            })
        );
        await this.prisma.$transaction(updates);
        return { success: true, updated: items.length };
    }

    // Bulk assign multiple modifiers to a product
    async bulkAssignToProduct(
        productId: string,
        assignments: { modifierGroupId: string; isRequired?: boolean; sortOrder?: number; overrideMin?: number; overrideMax?: number }[],
    ) {
        // Remove existing assignments not in the new list
        const existingGroupIds = assignments.map((a) => a.modifierGroupId);
        await this.prisma.productModifier.deleteMany({
            where: {
                sellingProductId: productId,
                modifierGroupId: { notIn: existingGroupIds },
            },
        });

        // Upsert new assignments
        for (const assignment of assignments) {
            await this.assignToProduct(productId, assignment.modifierGroupId, {
                isRequired: assignment.isRequired,
                sortOrder: assignment.sortOrder,
                overrideMin: assignment.overrideMin,
                overrideMax: assignment.overrideMax,
            });
        }

        return this.getProductModifiers(productId);
    }

    // ===============================================
    // RECETA POR OPCIÓN DE MODIFICADOR
    // ===============================================

    async getOptionRecipe(optionId: string) {
        const option = await this.prisma.modifierOption.findUnique({
            where: { id: optionId },
            include: {
                recipe: { include: { items: { include: { ingredient: true } } } },
                modifierGroup: { select: { id: true, displayName: true, name: true } },
            },
        });
        if (!option) throw new NotFoundException('Modifier option not found');
        return {
            ...this.serializeOption(option),
            recipe: option.recipe,
            group: option.modifierGroup,
        };
    }

    async upsertOptionRecipe(
        optionId: string,
        data: {
            name?: string;
            baseWeight?: number;
            applyMode?: 'OVERRIDE' | 'REPLACE';
            items: { ingredientId: string; quantity: number; unit?: string; role?: string }[];
        },
    ) {
        const option = await this.prisma.modifierOption.findUnique({
            where: { id: optionId },
            include: { recipe: true },
        });
        if (!option) throw new NotFoundException('Modifier option not found');

        const applyMode = data.applyMode === 'REPLACE' ? 'REPLACE' : 'OVERRIDE';
        const normalizedItems = await this.normalizeRecipeItems(data.items || []);
        const recipeName = data.name?.trim() || `Modificador: ${option.name}`;

        const saved = await this.prisma.$transaction(async (tx) => {
            let recipeId = option.recipeId;
            const recipeData = {
                name: recipeName,
                baseWeight: Number(data.baseWeight) || 0,
                internalRules: { apply: applyMode, source: 'modifier-option' },
            };

            if (recipeId) {
                const linkedProduct = await tx.sellingProduct.findUnique({ where: { recipeId } });
                if (linkedProduct) {
                    recipeId = null;
                }
            }

            if (recipeId) {
                await tx.recipe.update({ where: { id: recipeId }, data: recipeData });
                await tx.recipeItem.deleteMany({ where: { recipeId } });
            } else {
                const created = await tx.recipe.create({ data: recipeData });
                recipeId = created.id;
                await tx.modifierOption.update({
                    where: { id: optionId },
                    data: { recipeId },
                });
            }

            if (normalizedItems.length > 0) {
                await tx.recipeItem.createMany({
                    data: normalizedItems.map((i) => ({
                        recipeId: recipeId!,
                        ingredientId: i.ingredientId,
                        quantity: i.quantity,
                        role: i.role as any,
                    })),
                });
            }

            return tx.recipe.findUnique({
                where: { id: recipeId! },
                include: { items: { include: { ingredient: true } } },
            });
        });


        return saved;
    }

    async cloneOptionRecipeFromProduct(optionId: string, productId: string) {
        const product = await this.prisma.sellingProduct.findUnique({
            where: { id: productId },
            include: { recipe: { include: { items: { include: { ingredient: true } } } } },
        });
        if (!product) throw new NotFoundException('Product not found');
        if (!product.recipe) throw new NotFoundException(`El producto ${product.name} no tiene receta`);

        const option = await this.prisma.modifierOption.findUnique({ where: { id: optionId } });
        if (!option) throw new NotFoundException('Modifier option not found');

        return this.upsertOptionRecipe(optionId, {
            name: `${option.name} · ${product.name}`,
            baseWeight: product.recipe.baseWeight,
            applyMode: 'OVERRIDE',
            items: product.recipe.items.map((i) => ({
                ingredientId: i.ingredientId,
                quantity: i.quantity,
                unit: i.ingredient.unit,
                role: i.role,
            })),
        });
    }

    async clearOptionRecipe(optionId: string) {
        const option = await this.prisma.modifierOption.findUnique({
            where: { id: optionId },
        });
        if (!option) throw new NotFoundException('Modifier option not found');
        if (!option.recipeId) return { cleared: true, id: optionId };

        const recipeId = option.recipeId;
        await this.prisma.modifierOption.update({
            where: { id: optionId },
            data: { recipeId: null },
        });

        const stillUsed = await this.prisma.modifierOption.count({ where: { recipeId } });
        const productUses = await this.prisma.sellingProduct.count({ where: { recipeId } });
        if (stillUsed === 0 && productUses === 0) {
            await this.prisma.recipeItem.deleteMany({ where: { recipeId } });
            await this.prisma.recipe.delete({ where: { id: recipeId } });
        }

        return { cleared: true, id: optionId };
    }

    private serializeOption(o: any) {
        const rules = o.recipe?.internalRules || {};
        return {
            ...o,
            priceAdjustment: Number(o.priceAdjustment),
            inventoryItemId: o.inventoryItemId || null,
            inventoryItemName: o.inventoryItem?.name || null,
            recipeId: o.recipeId || null,
            recipeName: o.recipe?.name || null,
            recipeItemCount: o.recipe?._count?.items ?? o.recipe?.items?.length ?? 0,
            recipeApplyMode: rules.apply === 'REPLACE' ? 'REPLACE' : o.recipeId ? 'OVERRIDE' : null,
        };
    }

    private async normalizeRecipeItems(
        items: { ingredientId: string; quantity: number; unit?: string; role?: string }[],
    ) {
        return Promise.all(
            items.map(async (item) => {
                const ingredient = await this.prisma.inventoryItem.findUnique({
                    where: { id: item.ingredientId },
                });
                if (!ingredient) throw new NotFoundException(`Ingrediente ${item.ingredientId} no encontrado`);

                const targetUnit = (ingredient.unit || 'UN').toUpperCase();
                const inputUnit = (item.unit || targetUnit).toUpperCase();
                const inputQty = Number(item.quantity) || 0;
                let finalQty = inputQty;

                if (targetUnit === 'KG') {
                    if (['G', 'GR', 'GRAMOS'].includes(inputUnit)) finalQty = inputQty / 1000;
                } else if (targetUnit === 'LT') {
                    if (['ML', 'CC', 'MILILITROS'].includes(inputUnit)) finalQty = inputQty / 1000;
                }

                return {
                    ingredientId: item.ingredientId,
                    quantity: finalQty,
                    role: item.role || 'BASE',
                };
            }),
        );
    }
}
