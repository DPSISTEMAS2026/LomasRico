// ─────────────────────────────────────────────
// Kitchen / KDS Types
// ─────────────────────────────────────────────

/** Status of a kitchen ticket through its lifecycle */
export type KitchenStatus = 'WAITING' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';

/** Sales channel origin */
export type SaleChannel = 'POS' | 'WEB' | 'UBER_EATS' | 'PEDIDOS_YA' | 'WHATSAPP';

/** A single ingredient from the resolved Bill of Materials */
export interface BoMEntry {
    name: string;
    quantity: number;
    unit?: string;
}

/** Snapshot of a recipe attached to a sale item */
export interface RecipeSnapshot {
    resolvedBoM: BoMEntry[];
}

/** Modifiers applied to a sale item (proteins, extras, removals) */
export interface ItemModifiers {
    selectedProteins?: string[];
    selectedProteinNames?: string[];
    removedIngredients?: string[];
    extras?: { id: string; name: string; price: number }[];
    dynamicSelections?: {
        groupId: string;
        groupName: string;
        selectedOptions: { id: string; name: string; price: number }[];
    }[];
}

/** A single item within a sale/order */
export interface SaleItem {
    id?: string;
    quantity: number;
    unitPrice?: number;
    sellingProduct?: { name: string };
    productVariant?: { name: string };
    modifiers?: ItemModifiers;
    recipeSnapshot?: RecipeSnapshot;
}

/** The sale/order associated with a kitchen ticket */
export interface KitchenSale {
    id: string;
    code: string;
    channel: SaleChannel;
    note?: string;
    items: SaleItem[];
    userId?: string;
    total?: number;
    createdAt?: string;
}

/** A kitchen ticket representing an order in the KDS */
export interface KitchenTicket {
    id: string;
    status: KitchenStatus;
    createdAt: string;
    updatedAt?: string;
    sale: KitchenSale;
}

// ─────────────────────────────────────────────
// Shift / Cashier Types
// ─────────────────────────────────────────────

/** Transaction type within a shift */
export type ShiftTransactionType = 'OPENING' | 'SALE_INCOME' | 'EXPENSE' | 'WITHDRAWAL';

/** A single transaction during a shift */
export interface ShiftTransaction {
    id: string;
    type: ShiftTransactionType;
    amount: number;
    description?: string;
    createdAt: string;
}

/** An active or closed cashier shift */
export interface CashierShift {
    id: string;
    cashierId: string;
    startAmount: number;
    endAmount?: number;
    openingTime: string;
    closingTime?: string;
    note?: string;
    transactions: ShiftTransaction[];
}

// ─────────────────────────────────────────────
// User / Address Types
// ─────────────────────────────────────────────

export type UserRole = 'OWNER' | 'ADMIN' | 'CHEF' | 'CASHIER' | 'WAITER' | 'CUSTOMER';

export interface UserAddress {
    id: string;
    alias?: string;
    address: string;
    latitude?: number;
    longitude?: number;
}

export interface AppUser {
    id: string;
    email: string;
    name: string;
    phone?: string;
    avatarUrl?: string;
    role?: UserRole;
    loyaltyPoints?: number;
    canDiscount?: boolean;
    addresses?: UserAddress[];
}
