export class CreatePaymentDto {
    orderId: string;
    amount: number;
    channel: 'WEB' | 'POS' | 'WHATSAPP';
    items: { id: string; title: string; quantity: number; unit_price: number; price?: number }[]; // 'price' might come from frontend but MP needs unit_price
    payer?: { email: string; name?: string };
    shippingCost?: number;
}

export class PaymentStatusDto {
    externalId: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}
