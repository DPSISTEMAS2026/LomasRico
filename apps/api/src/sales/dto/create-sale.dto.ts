import { OrderChannel } from '@lomasrico/database';

export class CreateSaleItemDto {
    productVariantId?: string;  // For variant-based sales (Web/WhatsApp)
    sellingProductId?: string;  // For direct product sales (POS)
    quantity: number;
    modifiers?: {
        selectedProteins?: string[];
        removedIngredients?: string[];
    };
}

export class CreateSaleDto {
    channel: OrderChannel; // WEB | POS | WHATSAPP
    items: CreateSaleItemDto[];
    paymentMethod?: string; // Placeholder para info de pago
    userId?: string;
    shippingData?: {
        address: string;
        cost: number;
        estimateId: string;
    };
    discount?: number;
    discountType?: 'PERCENT' | 'FIXED';
    note?: string;
}
