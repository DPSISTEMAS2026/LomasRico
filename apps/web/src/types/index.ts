// Definición de tipos espejo para frontend
// Idealmente esto se importa de @lomasrico/shared-types, pero por ahora definimos local para rapidez visual.

export interface ModifierOption {
    id: string;
    name: string;
    priceAdjustment: number;
    isDefault?: boolean;
    sortOrder?: number;
}

export interface ModifierGroup {
    groupId: string;
    groupName: string;
    displayName: string;
    type: 'SINGLE_SELECT' | 'MULTI_SELECT';
    isRequired: boolean;
    sortOrder: number;
    minSelections: number;
    maxSelections: number;
    options: ModifierOption[];
}

export interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    category: string;
    variants?: ProductVariant[];
    allowsModifiers?: boolean; // Para activar modal
    maxProteins?: number; // Regla de negocio
    isConfigurable?: boolean;
    modifiers?: ModifierGroup[];
}

export interface ProductVariant {
    id: string;
    name: string; // "500g", "1kg"
    price: number;
}

export interface CartItem {
    tempId: string; // Frontend ID
    productId: string;
    variantId: string;
    name: string;
    price: number;
    quantity: number;
    modifiers: {
        selectedProteins: string[]; // IDs (backward compatibility)
        selectedProteinNames?: string[]; // Nombres para UI
        removedIngredients: string[]; // IDs
        extras?: { id: string; name: string; price: number }[]; // Extras adicionales
        // Nuevo sistema dinámico
        dynamicSelections?: {
            groupId: string;
            groupName: string;
            selectedOptions: { id: string; name: string; price: number }[];
        }[];
    };
    totalModifierPrice?: number;
    imageUrl?: string;
}

export interface User {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
    phone?: string;
    role?: string;
    addresses?: any[];
    loyaltyPoints?: number;
    historicalSpent?: number;
    historicalOrders?: number;
}

