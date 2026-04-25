export * from './catalog';

export type UserRole = 'ADMIN' | 'CHEF' | 'CASHIER' | 'WAITER';

export interface ProductVariant {
    id: string;
    name: string;
    price: number;
}

export interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    category: string; // Ensuring loose string to accept 'CEVICHE LOMASRICO', etc.
    variants?: ProductVariant[];
    allowsModifiers?: boolean;
    maxProteins?: number;
    isActive?: boolean;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
