export interface SaleModifiers {
    selectedProteins?: string[]; // IDs of selected proteins (Legacy)
    removedIngredients?: string[]; // IDs of ingredients to remove (Legacy)
    
    // NEW: Dynamic Product Modifiers (from Builder Modal)
    dynamicSelections?: {
        groupId: string;
        groupName: string;
        selectedOptions: {
            id: string; // ModifierOption ID
            name: string;
            price: number;
        }[];
    }[];
}

export interface ResolvedBomItem {
    inventoryItemId: string;
    name: string;
    quantity: number;
    unit: string;
    isBaseExpansion?: boolean;
}
