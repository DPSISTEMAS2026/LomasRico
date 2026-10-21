function isLocalDevHost(host?: string) {
    if (!host) return false;
    if (host === 'localhost' || host === '127.0.0.1') return true;
    return /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host);
}

export function getApiUrl() {
    let resolved = '';
    let via = 'env';
    try {
        const host = globalThis.location?.hostname;
        if (isLocalDevHost(host)) {
            resolved = `${String(globalThis.location.origin).replace(/\/$/, '')}/backend`;
            via = 'lan-backend';
        }
    } catch { /* SSR */ }
    if (!resolved) {
        let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        if (url && !url.includes('.') && !url.includes('localhost') && !url.startsWith('https://')) {
            url = `${url}.onrender.com`;
        }
        if (!url.startsWith('http')) {
            url = `https://${url}`;
        }
        resolved = url.replace(/\/$/, '');
    }
    return resolved;
}

class ApiUrlBox {
    toString() { return getApiUrl(); }
    valueOf() { return getApiUrl(); }
    [Symbol.toPrimitive]() { return getApiUrl(); }
}
export const API_URL = new ApiUrlBox() as unknown as string;

export async function fetchCatalog() {
    const res = await fetch(`${API_URL}/products/active?channel=web`);
    if (!res.ok) throw new Error('Failed to fetch catalog');
    return res.json();
}

export async function validateRecipe(
    variantId: string,
    modifiers: { selectedProteins?: string[], removedIngredients?: string[] }
) {
    const res = await fetch(`${API_URL}/recipe-engineering/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId, modifiers })
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Recipe validation failed');
    }

    return res.json();
}

export async function getShippingQuote(
    address: string,
    coordinates?: { lat: number; lng: number },
    cartSubtotal?: number,
) {
    const res = await fetch(`${API_URL}/shipping/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            address,
            city: 'Concepción',
            channel: 'WEB',
            coordinates,
            cartSubtotal: Math.round(Number(cartSubtotal) || 0),
        })
    });

    return res.json();
}

export async function createPaymentPreference(dto: {
    orderId: string,
    amount: number,
    items: any[],
    payer: any,
    shippingCost?: number
}) {
    const res = await fetch(`${API_URL}/payments/create-preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dto, channel: 'WEB' })
    });
    if (!res.ok) throw new Error('Failed to create payment preference');
    return res.json();
}

export async function loginWithGoogle(token: string) {
    const res = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
}

export async function loginWithEmail(data: any) {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Credenciales inválidas');
    return res.json();
}

export async function registerUser(data: any) {
    const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al registrar');
    }
    return res.json();
}

export type StoreStatus = {
    open: boolean;
    opensAt: string;
    closesAt: string;
    ordersEnabled: boolean;
    schedule?: { label: string; opensAt: string; closesAt: string }[];
};

export async function getStoreStatus(): Promise<StoreStatus | null> {
    try {
        const res = await fetch(`${API_URL}/store/status`, { cache: 'no-store' });
        return res.ok ? res.json() : null;
    } catch {
        return null;
    }
}

export async function verifyEmail(email: string, code: string) {
    const res = await fetch(`${API_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
    });
    if (!res.ok) throw new Error('Código inválido');
    return res.json();
}

export async function forgotPassword(emailOrPhone: string) {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrPhone }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'No se pudo recuperar la contraseña');
    return data;
}

export async function updateUserProfile(token: string, data: any) {
    const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al actualizar perfil');
    return res.json();
}

export async function changeUserPassword(token: string, data: any) {
    const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al cambiar contraseña');
    }
    return res.json();
}

function customerHeaders(json = false): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('web_customer_token') : null;
    return {
        ...(json ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

export async function getUserAddresses(userId: string) {
    const res = await fetch(`${API_URL}/users/${userId}/addresses`, { headers: customerHeaders() });
    if (!res.ok) throw new Error('Failed to fetch addresses');
    return res.json();
}

export async function addUserAddress(userId: string, data: { addressText: string, isDefault?: boolean, latitude?: number, longitude?: number }) {
    const res = await fetch(`${API_URL}/users/${userId}/addresses`, {
        method: 'POST',
        headers: customerHeaders(true),
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to add address');
    return res.json();
}

export async function getUserOrders(userId: string) {
    const res = await fetch(`${API_URL}/users/${userId}/orders`, { headers: customerHeaders() });
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
}

export async function createSale(items: any[], options: { channel?: string, status?: string, userId?: string, shippingData?: any, contact?: { name: string, phone: string, email: string, marketing?: boolean } } = {}) {
    const payload = {
        channel: options.channel || 'WEB',
        items: items.map(i => ({
            sellingProductId: i.productId,
            productVariantId: (i.variantId && i.variantId !== 'default') ? i.variantId : null,
            quantity: i.quantity,
            modifiers: i.modifiers
        })),
        ...options
    };

    const res = await fetch(`${API_URL}/sales`, {
        method: 'POST',
        headers: customerHeaders(true),
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to create sale' }));
        throw new Error(error.message || 'Failed to create sale');
    }
    return res.json();
}

export async function simulateMPCallback(orderId: string, status: 'APPROVED' | 'REJECTED') {
    const res = await fetch(`${API_URL}/payments/simulate-callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status })
    });
    if (!res.ok) throw new Error('Failed to simulate callback');
    return res.json();
}

export async function fetchOwnerDashboard() {
    try {
        const res = await fetch(`${API_URL}/stats/dashboard`, { cache: 'no-store' });
        if (!res.ok) return {
            sales: { today: 0, month: 0, trend: 0 },
            orders: { active: 0, byChannel: [] },
            inventory: { lowStock: 0 }
        };
        return res.json();
    } catch (e) {
        return {
            sales: { today: 0, month: 0, trend: 0 },
            orders: { active: 0, byChannel: [] },
            inventory: { lowStock: 0 }
        };
    }
}

export async function fetchTopProducts() {
    try {
        const res = await fetch(`${API_URL}/stats/top-products`, { cache: 'no-store' });
        if (!res.ok) return [];
        return res.json();
    } catch { return []; }
}

export async function fetchPeakHours() {
    try {
        const res = await fetch(`${API_URL}/stats/peak-hours`, { cache: 'no-store' });
        if (!res.ok) return [];
        return res.json();
    } catch { return []; }
}

export async function fetchStrategicInventory() {
    const res = await fetch(`${API_URL}/inventory`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
}
