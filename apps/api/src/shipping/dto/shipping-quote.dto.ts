export class ShippingQuoteDto {
    address: string;
    city: string;
    items?: {
        weight?: number;
        volume?: number;
    };
    channel: 'WEB' | 'POS' | 'WHATSAPP';
    coordinates?: { lat: number; lng: number };
}

export class ShippingQuoteResponse {
    valid: boolean;
    cost?: number;
    deliveryTimeEstimate?: string;
    estimateId?: string;
    distanceKm?: number;
    reason?: string;
}
