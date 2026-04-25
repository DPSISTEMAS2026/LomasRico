
export interface ProteinSlot {
    ingredientId: string;
    name: string;
    category?: string; // Should be 'PROTEINAS' or 'PROTEIN_SPECIAL'
}

export interface ResolvedIngredient {
    ingredientId: string;
    quantity: number; // in KG
}

/**
 * Core Logic for Protein Distribution in Configurable Products (Ceviches, Bowls).
 * This logic is hidden from the frontend and applied only at the backend level.
 */
export class RecipeLogic {
    /**
     * Resuelve la distribución de proteínas basada en el peso asignado por la receta.
     * @param selectedProteins Lista de proteínas seleccionadas.
     * @param targetWeight Peso TOTAL asignado a proteínas (ej: 0.180 kg para Ceviche 250g).
     */
    static resolveProteins(selectedProteins: ProteinSlot[], targetWeight: number): ResolvedIngredient[] {
        const count = selectedProteins.length;
        if (count === 0) return [];

        // Regla Simple (Ficha Única): Distribución equitativa.
        // Si hay 1 proteína: 100% del peso.
        // Si hay 2 proteínas: 50% / 50%.
        // Si hay 3 proteínas: 33% / 33% / 33%.

        const weightPerItem = targetWeight / count;

        return selectedProteins.map(p => ({
            ingredientId: p.ingredientId, // El ID interno del ingrediente (InventoryItem)
            quantity: Number(weightPerItem.toFixed(3)) // Redondeo a 3 decimales (gramos)
        }));
    }
}
