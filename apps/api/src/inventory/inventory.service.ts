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
        let cat = 'VARIOS';

        // Map DB Role to UI Category
        if (item.role === 'VEGGIE') cat = 'VERDURAS';
        if (item.role === 'PROTEIN_MAIN' || item.role === 'PROTEIN_SPECIAL') cat = 'PROTEINAS';
        if (item.role === 'BASE') cat = 'ABARROTES';

        const nameLower = item.name.toLowerCase();
        if (nameLower.includes('congelado') || nameLower.includes('mango') || nameLower.includes('pulpa')) cat = 'CONGELADOS';
        if (nameLower.includes('pote') || nameLower.includes('bolsa') || nameLower.includes('envase')) cat = 'PACKAGING';

        return {
            id: item.id,
            name: item.name,
            category: cat,
            currentStock: Number(item.currentStock) || 0,
            unit: item.unit,
            costPerUnit: Number(item.costPerUnit) || 0,
            type: item.type,
            role: item.role,
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
                currentStock: parseFloat(data.currentStock) || 0,
                costPerUnit: parseFloat(data.costPerUnit) || 0,
                role: data.role || 'BASE',
                minStockThreshold: 10
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
                costPerUnit: data.costPerUnit !== undefined ? parseFloat(data.costPerUnit) : undefined,
                currentStock: data.currentStock !== undefined ? parseFloat(data.currentStock) : undefined,
                role: data.role,
                type: data.type,
                unit: data.unit,
                isActive: data.isActive
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

    async delete(id: string) {
        const result = await this.tryPrisma(() => (this.prisma as any).inventoryItem.delete({ where: { id } }));
        if (!result) throw new NotFoundException(`No se pudo eliminar el item ${id}`);
        return { success: true };
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
}
