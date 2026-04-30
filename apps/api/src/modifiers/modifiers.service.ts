import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ModifiersService {
    private readonly logger = new Logger(ModifiersService.name);

    constructor(private prisma: PrismaService) {}

    // ===============================================
    // MODIFIER GROUPS CRUD
    // ===============================================

    async findAllGroups() {
        const groups = await this.prisma.modifierGroup.findMany({
            include: {
                options: {
                    where: { isActive: true },
                    orderBy: { sortOrder: 'asc' },
                },
                _count: {
                    select: { productModifiers: true },
                },
            },
            orderBy: { sortOrder: 'asc' },
        });

        return groups.map((g) => ({
            ...g,
            assignedProductsCount: g._count.productModifiers,
            options: g.options.map((o) => ({
                ...o,
                priceAdjustment: Number(o.priceAdjustment),
            })),
        }));
    }

    async findOneGroup(id: string) {
        const group = await this.prisma.modifierGroup.findUnique({
            where: { id },
            include: {
                options: { orderBy: { sortOrder: 'asc' } },
                productModifiers: {
                    include: { sellingProduct: { select: { id: true, name: true, category: true } } },
                },
            },
        });
        if (!group) throw new NotFoundException('Modifier Group not found');
        return {
            ...group,
            options: group.options.map((o) => ({
                ...o,
                priceAdjustment: Number(o.priceAdjustment),
            })),
        };
    }

    async createGroup(data: {
        name: string;
        displayName: string;
        type?: 'SINGLE_SELECT' | 'MULTI_SELECT';
        minSelections?: number;
        maxSelections?: number;
        sortOrder?: number;
        options?: { name: string; priceAdjustment?: number; isDefault?: boolean; sortOrder?: number }[];
    }) {
        return this.prisma.modifierGroup.create({
            data: {
                name: data.name,
                displayName: data.displayName,
                type: data.type || 'SINGLE_SELECT',
                minSelections: data.minSelections ?? 0,
                maxSelections: data.maxSelections ?? 1,
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
            minSelections?: number;
            maxSelections?: number;
            sortOrder?: number;
        },
    ) {
        return this.prisma.modifierGroup.update({
            where: { id },
            data,
            include: { options: true },
        });
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

    async updateOption(optionId: string, data: { name?: string; priceAdjustment?: number; isDefault?: boolean; isActive?: boolean; sortOrder?: number; recipeId?: string | null }) {
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
        return this.prisma.productModifier.upsert({
            where: {
                sellingProductId_modifierGroupId: {
                    sellingProductId: productId,
                    modifierGroupId,
                },
            },
            update: {
                isRequired: config?.isRequired,
                sortOrder: config?.sortOrder,
                overrideMin: config?.overrideMin,
                overrideMax: config?.overrideMax,
            },
            create: {
                sellingProductId: productId,
                modifierGroupId,
                isRequired: config?.isRequired ?? false,
                sortOrder: config?.sortOrder ?? 0,
                overrideMin: config?.overrideMin,
                overrideMax: config?.overrideMax,
            },
        });
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
            groupName: m.modifierGroup.name,
            displayName: m.modifierGroup.displayName,
            type: m.modifierGroup.type,
            isRequired: m.isRequired,
            sortOrder: m.sortOrder,
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
}
