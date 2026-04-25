/**
 * DTOs for External Order ingestion (Uber Eats / PedidosYa)
 * These DTOs represent the normalized format that scrapers must produce.
 */

export type ExternalPlatform = 'UBER_EATS' | 'PEDIDOS_YA';

export class ExternalOrderItemDto {
    /** Name as it appears on the external platform */
    externalName: string;

    /** Quantity ordered */
    quantity: number;

    /** Unit price on the external platform (CLP) */
    unitPrice: number;

    /** Modifiers/notes from the external platform (e.g., "Sin cebolla", "Salmón y Atún") */
    notes?: string;

    /** Optional: pre-resolved internal variant ID (if mapper found it) */
    resolvedVariantId?: string;

    /** Optional: pre-resolved internal product ID */
    resolvedProductId?: string;
}

export class CreateExternalOrderDto {
    /** Which platform: UBER_EATS or PEDIDOS_YA */
    platform: ExternalPlatform;

    /** Order ID from the external platform */
    externalOrderId: string;

    /** Current status on the external platform */
    externalStatus?: string;

    /** Customer name as shown on the platform */
    customerName?: string;

    /** Customer phone (if available) */
    customerPhone?: string;

    /** Delivery address */
    deliveryAddress?: string;

    /** Items in the order */
    items: ExternalOrderItemDto[];

    /** Total as shown on the external platform */
    externalTotal?: number;

    /** Raw JSON from the scraper (for debugging/audit) */
    rawPayload?: any;

    /** Notes from the platform (e.g., special instructions) */
    notes?: string;
}

export class BulkExternalOrderDto {
    orders: CreateExternalOrderDto[];
}
