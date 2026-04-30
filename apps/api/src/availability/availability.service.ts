import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

/**
 * AvailabilityService — Calcula la disponibilidad dinámica de productos
 * basándose en el stock actual de inventario y las recetas de cada producto.
 * 
 * Flujo: Inventario (stock) → Recetas (ingredientes) → maxQuantity por producto
 * 
 * Cache en memoria con TTL de 15 segundos, invalidado por ventas y restocks.
 */

export interface ProductAvailability {
    productId: string;
    maxQuantity: number;       // Cuántas unidades máx se pueden producir
    available: boolean;         // ¿Se puede vender al menos 1?
    stockAlert?: string;        // Alerta legible para el POS (ej: "Quedan 3")
    bottleneck?: string;        // Nombre del ingrediente limitante
    ingredients?: {             // Detalle de ingredientes (para debug/admin)
        name: string;
        required: number;
        available: number;
        maxUnits: number;
    }[];
}

export interface ModifierOptionAvailability {
    optionId: string;
    available: boolean;
    maxQuantity: number;
    bottleneck?: string;
}

interface CacheEntry {
    data: Map<string, ProductAvailability>;
    timestamp: number;
}

@Injectable()
export class AvailabilityService {
    private readonly logger = new Logger(AvailabilityService.name);
    private cache: CacheEntry | null = null;
    private readonly CACHE_TTL_MS = 15_000; // 15 segundos

    constructor(private prisma: PrismaService) {}

    /**
     * Invalida el cache. Llamar después de ventas, restocks o ajustes de inventario.
     */
    invalidateCache() {
        this.cache = null;
        this.logger.debug('🔄 Availability cache invalidated');
    }

    /**
     * Calcula la disponibilidad de TODOS los productos activos.
     * Devuelve un Map<productId, ProductAvailability>.
     */
    async calculateAll(): Promise<Map<string, ProductAvailability>> {
        // Verificar cache
        if (this.cache && (Date.now() - this.cache.timestamp) < this.CACHE_TTL_MS) {
            return this.cache.data;
        }

        const startTime = Date.now();

        // 1. Obtener todo el inventario de una vez (1 query)
        const allInventory = await this.prisma.inventoryItem.findMany({
            select: { id: true, name: true, currentStock: true, unit: true }
        });
        const stockMap = new Map(allInventory.map(i => [i.id, {
            name: i.name,
            stock: Number(i.currentStock),
            unit: i.unit
        }]));

        // 2. Obtener todos los productos activos con sus recetas (1 query)
        const products = await this.prisma.sellingProduct.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                recipe: {
                    select: {
                        baseWeight: true,
                        items: {
                            select: {
                                ingredientId: true,
                                quantity: true,
                                role: true,
                                ingredient: {
                                    select: { name: true, unit: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        const result = new Map<string, ProductAvailability>();

        for (const product of products) {
            const availability = await this.calculateForProduct(product, stockMap);
            result.set(product.id, availability);
        }

        // Guardar en cache
        this.cache = { data: result, timestamp: Date.now() };

        const elapsed = Date.now() - startTime;
        this.logger.log(`📊 Availability calculated for ${products.length} products in ${elapsed}ms`);

        return result;
    }

    /**
     * Calcula la disponibilidad de UN producto específico.
     */
    async calculateForProduct(
        product: {
            id: string;
            name: string;
            recipe?: {
                baseWeight: number;
                items: {
                    ingredientId: string;
                    quantity: number;
                    role: string;
                    ingredient: { name: string; unit: string };
                }[];
            } | null;
        },
        stockMap?: Map<string, { name: string; stock: number; unit: string }>
    ): Promise<ProductAvailability> {
        // Productos sin receta (ej: Coca-Cola, RETAIL) → siempre disponibles
        if (!product.recipe || product.recipe.items.length === 0) {
            return {
                productId: product.id,
                maxQuantity: 999,
                available: true,
                stockAlert: undefined,
                bottleneck: undefined
            };
        }

        // Si no tenemos el mapa de stock, cargamos lo necesario
        if (!stockMap) {
            const ingredientIds = product.recipe.items.map(i => i.ingredientId);
            const items = await this.prisma.inventoryItem.findMany({
                where: { id: { in: ingredientIds } },
                select: { id: true, name: true, currentStock: true, unit: true }
            });
            stockMap = new Map(items.map(i => [i.id, {
                name: i.name,
                stock: Number(i.currentStock),
                unit: i.unit
            }]));
        }

        let minUnits = Infinity;
        let bottleneckName = '';
        const ingredientDetails: ProductAvailability['ingredients'] = [];

        for (const recipeItem of product.recipe.items) {
            const invItem = stockMap.get(recipeItem.ingredientId);
            if (!invItem) {
                // Ingrediente no encontrado en inventario → 0 disponible
                minUnits = 0;
                bottleneckName = recipeItem.ingredient?.name || 'Desconocido';
                ingredientDetails.push({
                    name: bottleneckName,
                    required: recipeItem.quantity,
                    available: 0,
                    maxUnits: 0
                });
                continue;
            }

            const requiredPerUnit = recipeItem.quantity;
            if (requiredPerUnit <= 0) continue; // Ingrediente con cantidad 0 no limita

            // Normalizar unidades: si la receta usa G y el inventario usa KG
            let availableStock = invItem.stock;
            const recipeUnit = (recipeItem.ingredient?.unit || '').toUpperCase();
            const invUnit = invItem.unit.toUpperCase();

            // Convertir: si receta pide en G pero inventario está en KG
            if ((recipeUnit === 'G' || recipeUnit === 'ML') && (invUnit === 'KG' || invUnit === 'LT')) {
                availableStock = availableStock * 1000; // KG → G
            } else if ((recipeUnit === 'KG' || recipeUnit === 'LT') && (invUnit === 'G' || invUnit === 'ML')) {
                availableStock = availableStock / 1000; // G → KG
            }

            const maxUnitsFromThis = Math.max(0, Math.floor(availableStock / requiredPerUnit));

            ingredientDetails.push({
                name: invItem.name,
                required: requiredPerUnit,
                available: availableStock,
                maxUnits: maxUnitsFromThis
            });

            if (maxUnitsFromThis < minUnits) {
                minUnits = maxUnitsFromThis;
                bottleneckName = invItem.name;
            }
        }

        // Si no se encontró ningún ingrediente limitante, es Infinity
        if (minUnits === Infinity) minUnits = 999;

        // Generar alerta para el POS
        let stockAlert: string | undefined;
        if (minUnits === 0) {
            stockAlert = '🔴 AGOTADO';
        } else if (minUnits <= 3) {
            stockAlert = `🟠 ¡Últim${minUnits === 1 ? 'o' : 'os'} ${minUnits}!`;
        } else if (minUnits <= 10) {
            stockAlert = `🟡 Quedan ${minUnits}`;
        }

        return {
            productId: product.id,
            maxQuantity: minUnits,
            available: minUnits > 0,
            stockAlert,
            bottleneck: minUnits <= 10 ? bottleneckName : undefined,
            ingredients: ingredientDetails
        };
    }

    /**
     * Obtiene un resumen rápido de disponibilidad para el dashboard/alertas
     */
    async getAlertSummary(): Promise<{
        totalProducts: number;
        available: number;
        outOfStock: number;
        lowStock: { name: string; maxQuantity: number; bottleneck: string }[];
    }> {
        const availabilityMap = await this.calculateAll();
        
        const products = await this.prisma.sellingProduct.findMany({
            where: { isActive: true },
            select: { id: true, name: true }
        });

        const productNameMap = new Map(products.map(p => [p.id, p.name]));

        let available = 0;
        let outOfStock = 0;
        const lowStock: { name: string; maxQuantity: number; bottleneck: string }[] = [];

        for (const [productId, avail] of availabilityMap) {
            if (avail.available) {
                available++;
                if (avail.maxQuantity <= 5) {
                    lowStock.push({
                        name: productNameMap.get(productId) || 'Unknown',
                        maxQuantity: avail.maxQuantity,
                        bottleneck: avail.bottleneck || ''
                    });
                }
            } else {
                outOfStock++;
                lowStock.push({
                    name: productNameMap.get(productId) || 'Unknown',
                    maxQuantity: 0,
                    bottleneck: avail.bottleneck || ''
                });
            }
        }

        // Ordenar: primero agotados, luego por menor stock
        lowStock.sort((a, b) => a.maxQuantity - b.maxQuantity);

        return {
            totalProducts: availabilityMap.size,
            available,
            outOfStock,
            lowStock: lowStock.slice(0, 15) // Top 15 alertas
        };
    }

    /**
     * Calcula la disponibilidad de TODAS las opciones de modificadores que tengan receta vinculada.
     * Esto permite deshabilitar opciones como "Coca Cola" si no hay stock de Coca Cola.
     */
    async calculateModifierOptionsAvailability(
        stockMap?: Map<string, { name: string; stock: number; unit: string }>
    ): Promise<Map<string, ModifierOptionAvailability>> {
        // Cargar stock si no se proporcionó
        if (!stockMap) {
            const allInventory = await this.prisma.inventoryItem.findMany({
                select: { id: true, name: true, currentStock: true, unit: true }
            });
            stockMap = new Map(allInventory.map(i => [i.id, {
                name: i.name,
                stock: Number(i.currentStock),
                unit: i.unit
            }]));
        }

        // Obtener opciones de modificadores que tienen receta vinculada
        const modifierOptions = await this.prisma.modifierOption.findMany({
            where: {
                isActive: true,
                recipeId: { not: null }
            },
            include: {
                recipe: {
                    include: {
                        items: {
                            include: { ingredient: { select: { name: true, unit: true } } }
                        }
                    }
                }
            }
        });

        const result = new Map<string, ModifierOptionAvailability>();

        for (const option of modifierOptions) {
            if (!option.recipe || option.recipe.items.length === 0) {
                result.set(option.id, {
                    optionId: option.id,
                    available: true,
                    maxQuantity: 999
                });
                continue;
            }

            let minUnits = Infinity;
            let bottleneckName = '';

            for (const recipeItem of option.recipe.items) {
                const invItem = stockMap.get(recipeItem.ingredientId);
                if (!invItem) {
                    minUnits = 0;
                    bottleneckName = recipeItem.ingredient?.name || 'Desconocido';
                    continue;
                }

                const requiredPerUnit = recipeItem.quantity;
                if (requiredPerUnit <= 0) continue;

                let availableStock = invItem.stock;
                const invUnit = invItem.unit.toUpperCase();
                const recipeUnit = (recipeItem.ingredient?.unit || '').toUpperCase();

                if ((recipeUnit === 'G' || recipeUnit === 'ML') && (invUnit === 'KG' || invUnit === 'LT')) {
                    availableStock = availableStock * 1000;
                } else if ((recipeUnit === 'KG' || recipeUnit === 'LT') && (invUnit === 'G' || invUnit === 'ML')) {
                    availableStock = availableStock / 1000;
                }

                const maxFromThis = Math.max(0, Math.floor(availableStock / requiredPerUnit));
                if (maxFromThis < minUnits) {
                    minUnits = maxFromThis;
                    bottleneckName = invItem.name;
                }
            }

            if (minUnits === Infinity) minUnits = 999;

            result.set(option.id, {
                optionId: option.id,
                available: minUnits > 0,
                maxQuantity: minUnits,
                bottleneck: minUnits <= 5 ? bottleneckName : undefined
            });
        }

        this.logger.debug(`📊 Modifier availability: ${result.size} options checked`);
        return result;
    }
}
