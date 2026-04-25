
export interface InventoryItem {
    id: string;
    name: string;
    type?: string;
    unit: string;
    costPerUnit: number;
    role?: string;
    category: string;
    currentStock?: number;
    minStockThreshold?: number;
    isActive: boolean;
}

// Global Mutable Store - Starts Empty as requested for manual verification
export const GLOBAL_INVENTORY_STORE: InventoryItem[] = [];
