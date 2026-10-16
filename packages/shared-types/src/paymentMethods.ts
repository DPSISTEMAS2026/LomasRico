export type PaymentMethodCode =
    | 'CASH'
    | 'MP'
    | 'TRANSFER'
    | 'MERCADO_PAGO'
    | 'TUU'
    | 'EDENRED'
    | 'PLUXEE'
    | 'JUNAEB'
    | 'FOOD_CARD'
    | 'DEBIT'
    | 'CREDIT'
    | 'OTHER';

export const FOOD_PAYMENT_METHODS = ['EDENRED', 'PLUXEE', 'JUNAEB', 'FOOD_CARD'] as const;

export function isFoodPaymentMethod(method?: string | null): boolean {
    return !!method && (FOOD_PAYMENT_METHODS as readonly string[]).includes(method);
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
    CASH: 'Efectivo',
    MP: 'Mercado Pago',
    MERCADO_PAGO: 'Mercado Pago',
    TUU: 'Web TUU',
    TRANSFER: 'Transferencia',
    EDENRED: 'Edenred',
    PLUXEE: 'Pluxee',
    JUNAEB: 'JUNAEB',
    FOOD_CARD: 'Cobra alimentación',
    DEBIT: 'Débito',
    CREDIT: 'Crédito',
    OTHER: 'Otro',
};

export function paymentMethodLabel(method?: string | null): string {
    if (!method) return 'Sin medio';
    return PAYMENT_METHOD_LABELS[method] || method;
}
