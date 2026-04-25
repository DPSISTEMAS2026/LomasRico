import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SaleModifiers, ResolvedBomItem } from './types';
import { Recipe, RecipeItem, InventoryItem } from '@lomasrico/database';

import { CEVICHE_RULES } from './ceviche-rules';

type RecipeItemWithIngredient = RecipeItem & { ingredient: InventoryItem };

// Helper to extract weight from string (e.g. "Ceviche 500g" -> 500)
function extractWeight(name: string): number | null {
    const match = name.match(/(\d+)\s*(g|kg|ml|cc|l)/i);
    if (!match) return null;

    let value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    // Normalize to Grams (assuming baseWeight is in Grams) or match Unit
    if (unit === 'kg') value *= 1000;
    // ml/cc usually 1:1 with grams for simple recipes

    return value;
}

// Helper to normalize strings (remove accents, lowercase)
function normalizeString(s: string): string {
    return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

@Injectable()
export class RecipeResolverService {
    constructor(private prisma: PrismaService) { }

    /**
     * Resuelve el Bill of Materials (BoM) de forma determinística.
     * 
     * @param identifier ID del producto o variante
     * @param modifiers Modificadores de venta (dinámicos o heredados)
     * @param unrollBases Si es true, las preparaciones se expanden.
     */
    async resolveBom(
        identifier: string,
        modifiers: SaleModifiers,
        unrollBases: boolean,
    ): Promise<ResolvedBomItem[]> {

        // --- PRE-PROCESAMIENTO DE MODIFICADORES DINÁMICOS ---
        // Si el frontend envía dynamicSelections, extraemos proteínas e ingredientes removidos
        // para mantener compatibilidad con las reglas de negocio de Ceviche.
        const effectiveModifiers: SaleModifiers = { ...modifiers };
        
        if (modifiers.dynamicSelections && modifiers.dynamicSelections.length > 0) {
            const dynamicProteins: string[] = [];
            const dynamicRemoved: string[] = [];

            for (const selection of modifiers.dynamicSelections) {
                const groupName = selection.groupName.toLowerCase();
                
                // 1. Extraer proteínas (para lógica de SOP)
                if (groupName.includes('proteina')) {
                    selection.selectedOptions.forEach(opt => dynamicProteins.push(opt.id));
                }

                // 2. Extraer ingredientes eliminables (ej: "Sin Cebolla")
                if (groupName.includes('quitar') || groupName.includes('remover') || groupName.includes('sin ')) {
                   selection.selectedOptions.forEach(opt => dynamicRemoved.push(opt.name));
                }
            }

            // Union de legacy + dynamic
            effectiveModifiers.selectedProteins = [
                ...new Set([...(modifiers.selectedProteins || []), ...dynamicProteins])
            ];
            effectiveModifiers.removedIngredients = [
                ...new Set([...(modifiers.removedIngredients || []), ...dynamicRemoved])
            ];
        }

        // --- DETERMINAR RECETA BASE ---
        let product = await this.prisma.sellingProduct.findUnique({
            where: { id: identifier },
            include: {
                recipe: {
                    include: {
                        items: { include: { ingredient: true } },
                    },
                },
            },
        });

        let scaleFactor = 1.0;
        let variantName = '';

        // Si no es un producto, probar como variante
        if (!product) {
            const variant = await this.prisma.productVariant.findUnique({
                where: { id: identifier },
                include: {
                    sellingProduct: {
                        include: {
                            recipe: {
                                include: {
                                    items: { include: { ingredient: true } },
                                },
                            },
                        }
                    }
                }
            });

            if (variant) {
                product = variant.sellingProduct;
                variantName = variant.name;

                // Calcular Factor de Escala
                if (product.recipe && product.recipe.baseWeight > 0) {
                    const vWeight = extractWeight(variant.name);
                    if (vWeight) {
                        scaleFactor = vWeight / product.recipe.baseWeight;
                    }
                }
            }
        }

        if (!product) {
            throw new NotFoundException(`Product/Variant ${identifier} not found`);
        }

        if (!product.recipe) {
            console.warn(`[RecipeResolver] Product "${product.name}" has no recipe. Sale continues without stock deduction.`);
            return [];
        }

        const bom: ResolvedBomItem[] = [];
        const recipeItems: (RecipeItem & { ingredient: InventoryItem })[] = product.recipe.items as any;
        const rawRemovedIds = effectiveModifiers.removedIngredients || [];

        // Mapear IDs semánticos a UUIDs reales
        const removedIds = new Set<string>();
        for (const semanticId of rawRemovedIds) {
            const match = recipeItems.find(item => {
                const itemName = normalizeString(item.ingredient.name);
                const sId = normalizeString(semanticId);
                return itemName.includes(sId) || sId.includes(itemName.split(' ')[0]);
            });
            if (match) removedIds.add(match.ingredientId);
        }

        // --- DISTRIBUCIÓN DE COMPONENTES ---
        const proteinItems = recipeItems.filter(i => i.role === 'PROTEIN_MAIN' || i.role === 'PROTEIN_SPECIAL');
        const veggieItems = recipeItems.filter(i => i.role === 'VEGGIE');
        const baseItems = recipeItems.filter(i => i.role !== 'PROTEIN_MAIN' && i.role !== 'PROTEIN_SPECIAL' && i.role !== 'VEGGIE');

        let bonusWeightForProtein = 0;
        let removedVeggieWeight = 0;

        // Identificar verduras eliminadas
        for (const item of veggieItems) {
            if (removedIds.has(item.ingredientId)) {
                removedVeggieWeight += item.quantity;
            }
        }

        // Regla de Negocio: 50% extra a proteína, 50% extra a las verduras restantes.
        bonusWeightForProtein = removedVeggieWeight * 0.5;
        const redistributedVeggieWeight = removedVeggieWeight * 0.5;

        // --- DETECCIÓN DE GRAMAJE FINAL (SOP RULES) ---
        // Buscamos el peso objetivo basándonos en:
        // 1. Nombre de la Variante (ej: "500g")
        // 2. Nombre del Producto (ej: "Ceviche 250g")
        // 3. Modificadores dinámicos seleccionados (ej: "Formato: 350g" o "Agrandar a 500g")
        // 4. Peso base de la receta del producto.

        let resolvedWeight = 1000; // Default
        const weightsFound: number[] = [];

        // 1. Pesos en el nombre de producto/variante
        const weightFromVariant = extractWeight(variantName);
        const weightFromProduct = extractWeight(product.name);
        if (weightFromVariant) weightsFound.push(weightFromVariant);
        if (weightFromProduct) weightsFound.push(weightFromProduct);

        // 2. Pesos en los modificadores dinámicos (Paso 1: Formato, Paso 3: Agrandar, etc.)
        if (modifiers.dynamicSelections) {
            for (const selection of modifiers.dynamicSelections) {
                for (const opt of selection.selectedOptions) {
                    const weightFromModifier = extractWeight(opt.name);
                    if (weightFromModifier) {
                        weightsFound.push(weightFromModifier);
                    }
                }
            }
        }

        // 3. Peso base de la receta (como fallback)
        if (product.recipe.baseWeight > 0) {
            weightsFound.push(product.recipe.baseWeight);
        }

        // El peso final será el máximo detectado en la configuración (Greedy weight detection)
        if (weightsFound.length > 0) {
            resolvedWeight = Math.max(...weightsFound);
        }

        console.log(`[RecipeResolver] Gramaje final detectado: ${resolvedWeight}g para el producto "${product.name}"`);

        let sizeKey = '1000';
        if (resolvedWeight >= 900) sizeKey = '1000';
        else if (resolvedWeight >= 700) sizeKey = '750';
        else if (resolvedWeight >= 450) sizeKey = '500';
        else if (resolvedWeight >= 300) sizeKey = '350';
        else sizeKey = '250';

        const RULE = CEVICHE_RULES[sizeKey];
        if (!RULE) throw new InternalServerErrorException(`No SOP rules found for size: ${sizeKey}`);

        const selectedProteinIds = effectiveModifiers.selectedProteins || [];
        const effectiveSelectedIds = selectedProteinIds.length > 0
            ? selectedProteinIds
            : proteinItems.map(i => i.ingredientId);

        const selectedDetails = await Promise.all(effectiveSelectedIds.map(async (id: string) => {
            // Reutilizamos la lógica de búsqueda de proteína (UUID -> Nombre -> Global)
            const existing = proteinItems.find(p => p.ingredientId === id);
            if (existing) return { id: existing.ingredientId, name: existing.ingredient.name, role: existing.role };

            // Búsqueda por nombre en receta
            const searchTerm = normalizeString(id);
            const byName = proteinItems.find(p => {
                const pName = normalizeString(p.ingredient.name);
                return pName.includes(searchTerm) || searchTerm.includes(pName.split(' ')[0]);
            });
            if (byName) return { id: byName.ingredientId, name: byName.ingredient.name, role: byName.role };

            // Búsqueda global
            const candidates = await this.prisma.inventoryItem.findMany({
                where: { role: { in: ['PROTEIN_MAIN', 'PROTEIN_SPECIAL'] } }
            });
            const dbItem = candidates.find(item => normalizeString(item.name).includes(searchTerm));
            
            if (!dbItem) throw new NotFoundException(`Protein '${id}' not found`);
            return { id: dbItem.id, name: dbItem.name, role: dbItem.role as any };
        }));

        const count = selectedDetails.length;
        const premiums = selectedDetails.filter(p => p.role === 'PROTEIN_SPECIAL');
        const standards = selectedDetails.filter(p => p.role === 'PROTEIN_MAIN');
        const hasPremium = premiums.length > 0;

        const distribution = new Map<string, number>();
        const targetProteinTotal = RULE.proteinTotal + (bonusWeightForProtein / scaleFactor);

        if (count === 1) {
            distribution.set(selectedDetails[0].id, targetProteinTotal);
        } else if (count === 2) {
            if (hasPremium && premiums.length === 1 && standards.length === 1) {
                const pRule = RULE.distribution[2].withPremium;
                const addPerSlot = (targetProteinTotal - RULE.proteinTotal) / 2;
                distribution.set(standards[0].id, pRule.std + addPerSlot);
                distribution.set(premiums[0].id, pRule.premium + addPerSlot);
            } else {
                const weight = targetProteinTotal / 2;
                selectedDetails.forEach(p => distribution.set(p.id, weight));
            }
        } else if (count === 3) {
            if (hasPremium && premiums.length === 1 && standards.length === 2) {
                const pRule = RULE.distribution[3].withPremium;
                const addPerSlot = (targetProteinTotal - RULE.proteinTotal) / 3;
                distribution.set(premiums[0].id, pRule.premium + addPerSlot);
                standards.forEach(p => distribution.set(p.id, pRule.std + addPerSlot));
            } else {
                const weight = targetProteinTotal / 3;
                selectedDetails.forEach(p => distribution.set(p.id, weight));
            }
        } else {
            const weight = targetProteinTotal / (count || 1);
            selectedDetails.forEach(p => distribution.set(p.id, weight));
        }

        for (const p of selectedDetails) {
            bom.push({
                inventoryItemId: p.id,
                name: p.name,
                quantity: distribution.get(p.id) || 0,
                unit: 'g'
            });
        }

        // --- ASAMBLEA DE BASE Y VERDURAS ---
        const validVeggieItems = veggieItems.filter(i => !removedIds.has(i.ingredientId));
        const validBaseItems = baseItems.filter(i => !removedIds.has(i.ingredientId));

        // 1. Redistribución en Verduras Restantes
        let currentVeggieTotal = 0;
        validVeggieItems.forEach(i => currentVeggieTotal += i.quantity);
        
        // El factor de escala para verduras incluye el 50% del peso removido
        // Nota: El scaleFactor global se aplica al final.
        const targetVeggieTotal = currentVeggieTotal + redistributedVeggieWeight;
        const veggieScale = currentVeggieTotal > 0 ? targetVeggieTotal / currentVeggieTotal : 1.0;

        for (const item of validVeggieItems) {
            bom.push({
                inventoryItemId: item.ingredientId,
                name: item.ingredient.name,
                quantity: item.quantity * veggieScale,
                unit: item.ingredient.unit,
            });
        }

        // 2. Base Estándar (Leche de tigre, etc.) - No cambia por remoción de verduras
        for (const item of validBaseItems) {
            if (unrollBases && item.ingredient.type === 'PREPARATION') {
                const subItems = await this.expandPreparation(item.ingredient.id, item.quantity);
                bom.push(...subItems);
            } else {
                bom.push({
                    inventoryItemId: item.ingredientId,
                    name: item.ingredient.name,
                    quantity: item.quantity,
                    unit: item.ingredient.unit,
                });
            }
        }

        // --- AGREGAR EXTRAS SELECCIONADOS DINÁMICAMENTE ---
        // Si hay una sección de "Extras" o "Adicionales", y las opciones tienen un inventoryItemId (TBD)
        // o podemos mapearlos por nombre si no hay ID.
        // NOTA: Por ahora el sistema de SOP de Ceviche no considera "Extras" en el BOM automágicamente
        // a menos que estén en la receta. Pero podemos extenderlo aquí.
        if (effectiveModifiers.dynamicSelections) {
            for (const selection of effectiveModifiers.dynamicSelections) {
                const groupName = selection.groupName.toLowerCase();
                // Si es un grupo de EXTRAS (no proteínas, no removed)
                if (groupName.includes('extra') || groupName.includes('adicional')) {
                    for (const opt of selection.selectedOptions) {
                        // Intentar buscar el item en inventario por nombre
                        const searchTerm = normalizeString(opt.name);
                        const invItem = await this.prisma.inventoryItem.findFirst({
                            where: { name: { contains: searchTerm, mode: 'insensitive' } }
                        });
                        
                        if (invItem) {
                            // Si lo encontramos, sumamos una unidad (o gramaje standard de extra)
                            // Por ahora agregamos 1 UN o 30g como placeholder
                            const qty = invItem.unit.toString() === 'KG' ? 30 : 1; 
                            bom.push({
                                inventoryItemId: invItem.id,
                                name: invItem.name,
                                quantity: qty,
                                unit: invItem.unit
                            });
                        }
                    }
                }
            }
        }

        return bom;
    }

    private async expandPreparation(prepId: string, requiredQty: number): Promise<ResolvedBomItem[]> {
        const prep = await this.prisma.inventoryItem.findUnique({
            where: { id: prepId },
            include: {
                productionRecipe: {
                    include: { items: { include: { ingredient: true } } }
                }
            }
        });

        if (!prep || !prep.productionRecipe) {
            return [{
                inventoryItemId: prepId,
                name: prep?.name || 'Unknown',
                quantity: requiredQty,
                unit: prep?.unit || 'UN'
            }];
        }

        const totalInputWeight = prep.productionRecipe.items.reduce((sum, i) => sum + i.quantity, 0);
        if (totalInputWeight <= 0) return [];

        const scaleFactor = requiredQty / totalInputWeight;

        return prep.productionRecipe.items.map(subItem => ({
            inventoryItemId: subItem.ingredientId,
            name: subItem.ingredient.name,
            quantity: subItem.quantity * scaleFactor,
            unit: subItem.ingredient.unit,
            isBaseExpansion: true
        }));
    }
}
