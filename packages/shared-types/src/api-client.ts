// ─────────────────────────────────────────────────────────────
// API Client base — funciones compartidas entre Web y Panels
// ─────────────────────────────────────────────────────────────

/**
 * Resolves the API URL from environment variables.
 * Handles Render service names, bare URLs, and localhost fallbacks.
 */
export function resolveApiUrl(envUrl?: string): string {
    let url = envUrl || 'http://localhost:3333';

    // Si la URL es solo el nombre del servicio (ej: "pro-lomasrico-api")
    if (url && !url.includes('.') && !url.includes('localhost') && !url.startsWith('https://')) {
        url = `${url}.onrender.com`;
    }

    if (!url.startsWith('http')) {
        url = `https://${url}`;
    }

    // Limpiar slash final
    return url.replace(/\/$/, '');
}

// ─── Catálogo (público) ────────────────────────────────────

export async function fetchCatalog(apiUrl: string) {
    const res = await fetch(`${apiUrl}/products/active`);
    if (!res.ok) throw new Error('Failed to fetch catalog');
    return res.json();
}

export async function validateRecipe(
    apiUrl: string,
    variantId: string,
    modifiers: { selectedProteins?: string[], removedIngredients?: string[] }
) {
    const res = await fetch(`${apiUrl}/recipe-engineering/validate`, {
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

// ─── Envío ─────────────────────────────────────────────────

export async function getShippingQuote(apiUrl: string, address: string, coordinates?: { lat: number; lng: number }) {
    const res = await fetch(`${apiUrl}/shipping/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            address,
            city: 'Concepción',
            channel: 'WEB',
            coordinates
        })
    });
    return res.json();
}

// ─── Pagos ─────────────────────────────────────────────────

export async function createPaymentPreference(apiUrl: string, dto: {
    orderId: string,
    amount: number,
    items: any[],
    payer: any,
    shippingCost?: number
}) {
    const res = await fetch(`${apiUrl}/payments/create-preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dto, channel: 'WEB' })
    });
    if (!res.ok) throw new Error('Failed to create payment preference');
    return res.json();
}

export async function simulateMPCallback(apiUrl: string, orderId: string, status: 'APPROVED' | 'REJECTED') {
    const res = await fetch(`${apiUrl}/payments/simulate-callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status })
    });
    if (!res.ok) throw new Error('Failed to simulate callback');
    return res.json();
}

// ─── Auth ──────────────────────────────────────────────────

export async function loginWithGoogle(apiUrl: string, token: string) {
    const res = await fetch(`${apiUrl}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
}

export async function loginWithEmail(apiUrl: string, data: { email: string; password: string }) {
    const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Credenciales inválidas');
    return res.json();
}

export async function registerUser(apiUrl: string, data: { email: string; password: string; name: string }) {
    const res = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al registrar');
    return res.json();
}

export async function verifyEmail(apiUrl: string, email: string, code: string) {
    const res = await fetch(`${apiUrl}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
    });
    if (!res.ok) throw new Error('Código inválido');
    return res.json();
}

export async function updateUserProfile(apiUrl: string, token: string, data: any) {
    const res = await fetch(`${apiUrl}/auth/profile`, {
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

export async function changeUserPassword(apiUrl: string, token: string, data: { currentPassword: string; newPassword: string }) {
    const res = await fetch(`${apiUrl}/auth/change-password`, {
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

// ─── Usuarios (protegido con JWT) ──────────────────────────

export async function getUserAddresses(apiUrl: string, userId: string, token?: string | null) {
    const res = await fetch(`${apiUrl}/users/${userId}/addresses`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Failed to fetch addresses');
    return res.json();
}

export async function addUserAddress(apiUrl: string, userId: string, data: { addressText: string, isDefault?: boolean, latitude?: number, longitude?: number }, token?: string | null) {
    const res = await fetch(`${apiUrl}/users/${userId}/addresses`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to add address');
    return res.json();
}

export async function getUserOrders(apiUrl: string, userId: string, token?: string | null) {
    const res = await fetch(`${apiUrl}/users/${userId}/orders`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
}

// ─── Ventas ────────────────────────────────────────────────

export interface CreateSaleOptions {
    channel?: string;
    status?: string;
    userId?: string;
    shippingData?: any;
    paymentMethod?: string;
    shiftId?: string;
    discount?: number;
    discountType?: 'PERCENT' | 'FIXED';
    discountReason?: string;
    note?: string;
}

export async function createSale(
    apiUrl: string,
    items: { productId: string; quantity: number; modifiers?: any; variantId?: string }[],
    options: CreateSaleOptions = {}
) {
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

    const res = await fetch(`${apiUrl}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to create sale' }));
        throw new Error(error.message || 'Failed to create sale');
    }
    return res.json();
}

// ─── Stats / Dashboard ─────────────────────────────────────

const EMPTY_DASHBOARD = {
    sales: { today: 0, month: 0, trend: 0 },
    orders: { active: 0, byChannel: [] as any[] },
    inventory: { lowStock: 0 }
};

export async function fetchOwnerDashboard(apiUrl: string) {
    try {
        const res = await fetch(`${apiUrl}/stats/dashboard`, { cache: 'no-store' });
        if (!res.ok) return EMPTY_DASHBOARD;
        return res.json();
    } catch {
        return EMPTY_DASHBOARD;
    }
}

export async function fetchTopProducts(apiUrl: string) {
    try {
        const res = await fetch(`${apiUrl}/stats/top-products`, { cache: 'no-store' });
        if (!res.ok) return [];
        return res.json();
    } catch { return []; }
}

export async function fetchPeakHours(apiUrl: string) {
    try {
        const res = await fetch(`${apiUrl}/stats/peak-hours`, { cache: 'no-store' });
        if (!res.ok) return [];
        return res.json();
    } catch { return []; }
}

// ─── Inventario ────────────────────────────────────────────

export async function fetchStrategicInventory(apiUrl: string) {
    const res = await fetch(`${apiUrl}/inventory`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
}
