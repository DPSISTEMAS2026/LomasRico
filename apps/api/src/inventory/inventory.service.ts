import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { seedMasterRecipes } from '../recipe-engineering/master-recipes.seed';
import { seedSellingRecipes } from '../recipe-engineering/selling-recipes.seed';
import { INVENTORY_SEED } from './inventory.seed';

@Injectable()
export class InventoryService {
    private readonly logger = new Logger(InventoryService.name);

    constructor(private prisma: PrismaService) { }

    private async tryPrisma<T>(fn: () => Promise<T>): Promise<T | null> {
        try {
            return await fn();
        } catch (e) {
            this.logger.error(`Prisma error: ${e.message}`);
            return null;
        }
    }

    private mapToUi(item: any) {
        if (!item) return null;
        return {
            id: item.id,
            name: item.name,
            category: item.category || 'GENERAL',
            currentStock: Number(item.currentStock) || 0,
            unit: item.unit,
            costPerUnit: Number(item.costPerUnit) || 0,
            type: item.type,
            role: item.role,
            minStockThreshold: Number(item.minStockThreshold) || 0,
            isActive: item.isActive !== false,
            productionRecipe: item.productionRecipe || undefined,
            recipe: item.productionRecipe || undefined // Alias for frontend
        };
    }

    async findAll() {
        const dbItems = await this.tryPrisma(() => (this.prisma as any).inventoryItem.findMany({
            include: {
                productionRecipe: {
                    include: {
                        items: {
                            include: { ingredient: true }
                        }
                    }
                }
            },
            orderBy: { name: 'asc' }
        }));

        if (!dbItems || !Array.isArray(dbItems)) {
            throw new InternalServerErrorException('Error al conectar con la base de datos');
        }

        return (dbItems as any[]).map((item: any) => this.mapToUi(item));
    }

    async findOne(id: string) {
        const dbItem = await this.tryPrisma(() => (this.prisma as any).inventoryItem.findUnique({
            where: { id },
            include: {
                productionRecipe: {
                    include: {
                        items: {
                            include: { ingredient: true }
                        }
                    }
                }
            }
        }));

        if (!dbItem) {
            throw new NotFoundException(`Item ${id} no encontrado en la base de datos`);
        }

        return this.mapToUi(dbItem);
    }

    async create(data: any) {
        const dbItem = await this.tryPrisma(() => (this.prisma as any).inventoryItem.create({
            data: {
                name: data.name,
                type: data.type || 'RAW',
                unit: data.unit || 'UN',
                category: data.category || 'GENERAL',
                currentStock: parseFloat(data.currentStock) || 0,
                costPerUnit: parseFloat(data.costPerUnit) || 0,
                role: data.role || 'BASE',
                minStockThreshold: parseInt(data.minStockThreshold) || 10
            }
        }));

        if (!dbItem) {
            throw new InternalServerErrorException('No se pudo crear el item en la base de datos');
        }

        return this.mapToUi(dbItem);
    }

    async update(id: string, data: any) {
        // Leer stock ANTES de la actualización para poder calcular el delta
        let oldStock: number | null = null;
        if (data.currentStock !== undefined) {
            const oldItem: any = await this.tryPrisma(() => (this.prisma as any).inventoryItem.findUnique({
                where: { id }, select: { currentStock: true }
            }));
            oldStock = oldItem?.currentStock ?? 0;
        }

        const dbResult = await this.tryPrisma(() => (this.prisma as any).inventoryItem.update({
            where: { id },
            data: {
                name: data.name,
                category: data.category,
                costPerUnit: data.costPerUnit !== undefined ? parseFloat(data.costPerUnit) : undefined,
                currentStock: data.currentStock !== undefined ? parseFloat(data.currentStock) : undefined,
                role: data.role,
                type: data.type,
                unit: data.unit,
                isActive: data.isActive,
                minStockThreshold: data.minStockThreshold !== undefined ? parseInt(data.minStockThreshold) : undefined
            }
        }));

        if (!dbResult) {
            throw new NotFoundException(`No se pudo actualizar el item ${id} (no existe o error DB)`);
        }

        // Log movement if currentStock changed (registrar DELTA, no absoluto)
        if (data.currentStock !== undefined && oldStock !== null) {
            const delta = parseFloat(data.currentStock) - oldStock;
            if (delta !== 0) {
                await this.tryPrisma(() => (this.prisma as any).stockMovement.create({
                    data: {
                        inventoryItemId: id,
                        quantity: delta,
                        reason: 'ADJUSTMENT'
                    }
                }));
            }
        }

        return this.mapToUi(dbResult);
    }

    async restock(id: string, quantity: number, unitCost: number) {
        const item = await this.findOne(id);
        if (!item) throw new NotFoundException('Item no encontrado');

        const oldStock = (item.currentStock as number) || 0;
        const newStock = oldStock + quantity;

        let newCost = (item.costPerUnit as number);
        if (unitCost > 0) {
            const totalValue = (oldStock * ((item.costPerUnit as number) || 0)) + (quantity * unitCost);
            newCost = totalValue / Math.max(1, newStock);
        }

        const updated = await this.update(id, {
            currentStock: newStock,
            costPerUnit: newCost
        });

        await this.tryPrisma(() => (this.prisma as any).stockMovement.create({
            data: {
                inventoryItemId: id,
                quantity: quantity,
                reason: 'RESTOCK'
            }
        }));

        return updated;
    }

    async getAlerts() {
        const criticalItems = await this.tryPrisma(() => (this.prisma as any).inventoryItem.findMany({
            where: { currentStock: { lte: 10 } },
            take: 5,
            orderBy: { currentStock: 'asc' }
        }));

        if (!criticalItems || !Array.isArray(criticalItems) || (criticalItems as any[]).length === 0) {
            return [];
        }

        return (criticalItems as any[]).map((i: any) => ({
            id: i.id,
            itemName: i.name,
            date: new Date().toISOString(),
            diffPercent: 0,
            oldAvg: i.costPerUnit,
            currentStock: i.currentStock
        }));
    }

    // ─── CATEGORY MANAGEMENT ────────────────────────────────

    async renameCategory(oldName: string, newName: string) {
        if (!oldName || !newName) throw new NotFoundException('Debe especificar nombre antiguo y nuevo');
        const normalized = newName.trim().toUpperCase();

        const result = await this.tryPrisma(() => (this.prisma as any).inventoryItem.updateMany({
            where: { category: oldName },
            data: { category: normalized },
        }));

        if (!result) throw new InternalServerErrorException('Error al renombrar categoría');

        this.logger.log(`📝 CATEGORÍA RENOMBRADA: "${oldName}" → "${normalized}" — ${(result as any).count} items actualizados`);

        return { success: true, oldName, newName: normalized, itemsUpdated: (result as any).count };
    }

    async deleteCategory(name: string, action: string = 'reassign') {
        if (!name) throw new NotFoundException('Debe especificar un nombre de categoría');

        const items = await this.tryPrisma(() => (this.prisma as any).inventoryItem.findMany({
            where: { category: name },
            select: { id: true, name: true },
        }));

        const count = Array.isArray(items) ? items.length : 0;

        if (action === 'delete') {
            // Delete all stock movements first, then items
            const itemIds = (items as any[]).map((i: any) => i.id);
            await this.tryPrisma(() => (this.prisma as any).stockMovement.deleteMany({
                where: { inventoryItemId: { in: itemIds } },
            }));
            await this.tryPrisma(() => (this.prisma as any).inventoryItem.deleteMany({
                where: { category: name },
            }));
            this.logger.warn(`🗑️ CATEGORÍA ELIMINADA: "${name}" — ${count} items BORRADOS`);
        } else {
            // Reassign to GENERAL
            await this.tryPrisma(() => (this.prisma as any).inventoryItem.updateMany({
                where: { category: name },
                data: { category: 'GENERAL' },
            }));
            this.logger.log(`📦 CATEGORÍA ELIMINADA: "${name}" — ${count} items reasignados a GENERAL`);
        }

        return { success: true, category: name, action, itemsAffected: count };
    }

    async delete(id: string) {
        // Verify the item exists first
        const item = await this.tryPrisma(() => (this.prisma as any).inventoryItem.findUnique({
            where: { id },
            select: { id: true, name: true },
        }));
        if (!item) throw new NotFoundException(`Item ${id} no encontrado`);

        try {
            await this.prisma.$transaction(async (tx: any) => {
                // 1. Delete StockMovements
                await tx.stockMovement.deleteMany({ where: { inventoryItemId: id } });

                // 2. Delete RecipeItems where this item is an ingredient
                await tx.recipeItem.deleteMany({ where: { ingredientId: id } });

                // 3. Unlink ModifierOptions (set inventoryItemId to null instead of deleting)
                await tx.modifierOption.updateMany({
                    where: { inventoryItemId: id },
                    data: { inventoryItemId: null },
                });

                // 4. Delete productionRecipe (Recipe + its RecipeItems) if this item is an output
                const productionRecipe = await tx.recipe.findFirst({
                    where: { outputItemId: id },
                    select: { id: true },
                });
                if (productionRecipe) {
                    await tx.recipeItem.deleteMany({ where: { recipeId: productionRecipe.id } });
                    await tx.modifierOption.updateMany({
                        where: { recipeId: productionRecipe.id },
                        data: { recipeId: null },
                    });
                    await tx.recipe.delete({ where: { id: productionRecipe.id } });
                }

                // 5. Finally delete the inventory item
                await tx.inventoryItem.delete({ where: { id } });
            });

            this.logger.warn(`🗑️ ITEM ELIMINADO: "${(item as any).name}" (${id})`);
            return { success: true };
        } catch (e) {
            this.logger.error(`Error al eliminar item ${id}: ${e.message}`);
            throw new InternalServerErrorException(`No se pudo eliminar el item ${id}: ${e.message}`);
        }
    }

    async forceSeed() {
        this.logger.warn('MANUAL SEED TRIGGERED - SYNCING FROM SEED FILE');
        let count = 0;

        for (const item of INVENTORY_SEED) {
            try {
                const existing = await (this.prisma as any).inventoryItem.findFirst({
                    where: { name: { equals: item.name, mode: 'insensitive' } }
                });

                if (existing) {
                    await (this.prisma as any).inventoryItem.update({
                        where: { id: existing.id },
                        data: {
                            costPerUnit: item.costPerUnit,
                            role: item.role,
                            type: item.type,
                            unit: item.unit
                        }
                    });
                } else {
                    await (this.prisma as any).inventoryItem.create({
                        data: {
                            name: item.name,
                            unit: item.unit,
                            costPerUnit: item.costPerUnit,
                            role: item.role || 'BASE',
                            type: item.type || 'RAW',
                            currentStock: item.currentStock || 0
                        }
                    });
                    count++;
                }
            } catch (e) {
                this.logger.error(`Error syncing item ${item.name}: ${e.message}`);
            }
        }

        // Logic to clear and rebuild recipes for consistency
        try {
            await (this.prisma as any).recipeItem.deleteMany({});
            await (this.prisma as any).recipe.deleteMany({});
            await seedMasterRecipes(this.prisma);
            await seedSellingRecipes(this.prisma);
        } catch (e) {
            this.logger.error(`Error syncing recipes: ${e.message}`);
        }

        return { success: true, seededCount: count };
    }

    async fixRecipes() {
        return this.forceSeed();
    }

    // ─── MERMA / WASTE ──────────────────────────────────────

    /**
     * Registra pérdida/merma de un ingrediente.
     * Razones válidas: EXPIRED, DAMAGED, OVERPRODUCTION, SPILL, OTHER
     */
    async registerWaste(id: string, quantity: number, reason: string, note?: string) {
        const item = await this.findOne(id);
        if (!item) throw new NotFoundException('Ingrediente no encontrado');

        if (quantity <= 0) throw new NotFoundException('La cantidad debe ser positiva');

        const validReasons = ['EXPIRED', 'DAMAGED', 'OVERPRODUCTION', 'SPILL', 'OTHER'];
        if (!validReasons.includes(reason)) {
            reason = 'OTHER';
        }

        const oldStock = Number(item.currentStock) || 0;
        const newStock = Math.max(0, oldStock - quantity);
        const wasteCost = quantity * (Number(item.costPerUnit) || 0);

        // Descontar stock
        await this.tryPrisma(() => (this.prisma as any).inventoryItem.update({
            where: { id },
            data: { currentStock: newStock },
        }));

        // Registrar movimiento
        await this.tryPrisma(() => (this.prisma as any).stockMovement.create({
            data: {
                inventoryItemId: id,
                quantity: -quantity,
                reason: `WASTE_${reason}`,
                referenceId: note || undefined,
            },
        }));

        this.logger.warn(`🗑️ MERMA: ${item.name} — ${quantity} ${item.unit} (${reason}) — Pérdida: $${Math.round(wasteCost)}`);

        return {
            success: true,
            item: item.name,
            quantityLost: quantity,
            reason,
            note,
            previousStock: oldStock,
            newStock,
            estimatedLoss: Math.round(wasteCost),
        };
    }

    // ─── PRODUCCIÓN DE SUB-RECETA ───────────────────────────

    /**
     * Produce un item PREPARED (ej: Leche de Tigre) descontando sus ingredientes base.
     * El item debe tener una productionRecipe asociada.
     */
    async produceSubRecipe(id: string, batches: number = 1) {
        const item: any = await this.tryPrisma(() => (this.prisma as any).inventoryItem.findUnique({
            where: { id },
            include: {
                productionRecipe: {
                    include: {
                        items: { include: { ingredient: true } },
                    },
                },
            },
        }));

        if (!item) throw new NotFoundException('Item no encontrado');
        if (!item.productionRecipe) {
            throw new NotFoundException(`"${item.name}" no tiene receta de producción asociada`);
        }

        const recipe = item.productionRecipe;
        const deductions: { name: string; qty: number; unit: string }[] = [];

        // Descontar ingredientes base
        for (const recipeItem of recipe.items) {
            const totalQty = Number(recipeItem.quantity) * batches;
            const ingredient = recipeItem.ingredient;

            await this.tryPrisma(() => (this.prisma as any).inventoryItem.update({
                where: { id: ingredient.id },
                data: { currentStock: { decrement: totalQty } },
            }));

            await this.tryPrisma(() => (this.prisma as any).stockMovement.create({
                data: {
                    inventoryItemId: ingredient.id,
                    quantity: -totalQty,
                    reason: 'PRODUCTION',
                    referenceId: `Producción de ${item.name} x${batches}`,
                },
            }));

            deductions.push({ name: ingredient.name, qty: totalQty, unit: recipeItem.unit || ingredient.unit });
        }

        // Incrementar stock del item producido
        const yieldPerBatch = Number(recipe.yield) || 1;
        const totalProduced = yieldPerBatch * batches;

        await this.tryPrisma(() => (this.prisma as any).inventoryItem.update({
            where: { id },
            data: { currentStock: { increment: totalProduced } },
        }));

        await this.tryPrisma(() => (this.prisma as any).stockMovement.create({
            data: {
                inventoryItemId: id,
                quantity: totalProduced,
                reason: 'PRODUCTION',
                referenceId: `Producido: ${batches} batch(es)`,
            },
        }));

        this.logger.log(`🏭 PRODUCCIÓN: ${item.name} x${batches} — +${totalProduced} ${item.unit}`);

        return {
            success: true,
            produced: item.name,
            batches,
            totalProduced,
            unit: item.unit,
            ingredientsUsed: deductions,
        };
    }

    // ─── HISTORIAL DE MOVIMIENTOS ────────────────────────────

    async getMovements(itemId: string, limit: number = 50) {
        const movements = await this.tryPrisma(() => (this.prisma as any).stockMovement.findMany({
            where: { inventoryItemId: itemId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        }));

        return movements || [];
    }

    async getAllMovements(limit: number = 100, reason?: string) {
        const where: any = {};
        if (reason) {
            where.reason = { startsWith: reason };
        }

        const movements = await this.tryPrisma(() => (this.prisma as any).stockMovement.findMany({
            where,
            include: {
                inventoryItem: { select: { name: true, unit: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        }));

        return movements || [];
    }
}
