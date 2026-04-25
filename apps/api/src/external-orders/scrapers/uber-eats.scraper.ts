import { BaseScraper, AuthContext } from './base-scraper';
import { CreateExternalOrderDto } from '../dto/create-external-order.dto';

/**
 * Uber Eats Scraper
 * 
 * Estrategia: Interceptar la API interna de merchants.ubereats.com
 * 
 * El dashboard de Uber Eats para restaurantes usa estas APIs internas:
 * 
 *   GET /api/getActiveOrders      → Lista de pedidos activos
 *   GET /api/getOrderDetails/:id  → Detalle de un pedido
 * 
 * Los headers requeridos son:
 *   - x-csrf-token: (token CSRF de la sesión)
 *   - cookie: (cookies de sesión autenticada)
 * 
 * ═══════════════════════════════════════════════════════════════
 * SETUP INICIAL (Manual, 1 vez):
 * ═══════════════════════════════════════════════════════════════
 * 
 * 1. Abrir Chrome → merchants.ubereats.com → Loguearse
 * 2. Abrir DevTools → Network → Filtrar "getActiveOrders" o "getOrderList"
 * 3. Copiar los headers de la request:
 *    - Cookie (todo el string)
 *    - x-csrf-token
 *    - Opcional: user-agent
 * 4. Pegar en .env:
 *    UBER_EATS_COOKIE="sid=xxx; ..."
 *    UBER_EATS_CSRF_TOKEN="xxx"
 *    UBER_EATS_STORE_ID="xxx"
 * 
 * La sesión dura aprox 24-48h. Cuando expire, repetir el proceso.
 * 
 * ═══════════════════════════════════════════════════════════════
 * CÓMO ENCONTRAR LOS ENDPOINTS REALES:
 * ═══════════════════════════════════════════════════════════════
 * 
 * 1. En DevTools → Network, buscar requests XHR al navegar por "Pedidos"
 * 2. Los endpoints comunes son:
 *    - /rt/api/v1/orders (REST)
 *    - /graphql (algunos portales usan GraphQL)
 *    - WebSocket en /ws/... (para notificaciones en tiempo real)
 * 3. Copiar la URL completa y el body/params
 * 4. Actualizar las constantes ORDERS_ENDPOINT y parseOrders() abajo
 */

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN — Actualizar con datos reales del portal
// ═══════════════════════════════════════════════════════════════

const UBER_BASE_URL = 'https://merchants.ubereats.com';

// Endpoint para obtener pedidos — ACTUALIZAR con el real
// Opciones comunes:
//   /rt/api/v1/orders?status=active
//   /api/getActiveOrders?storeId=XXX
//   /graphql (con query de orders)
const ORDERS_ENDPOINT = '/api/getActiveOrders';

export class UberEatsScraper extends BaseScraper {
    constructor(apiUrl?: string) {
        super('UBER_EATS', apiUrl);
    }

    protected async getAuth(): Promise<AuthContext> {
        const cookie = process.env.UBER_EATS_COOKIE;
        const csrfToken = process.env.UBER_EATS_CSRF_TOKEN;

        if (!cookie) {
            this.logger.error('❌ UBER_EATS_COOKIE no configurado en .env');
            this.logger.error('   → Abre merchants.ubereats.com, loguéate, y copia las cookies desde DevTools');
            return { valid: false, error: 'Missing UBER_EATS_COOKIE' };
        }

        // Quick validation: try a lightweight request
        try {
            const testRes = await fetch(`${UBER_BASE_URL}/manager`, {
                method: 'HEAD',
                headers: {
                    'Cookie': cookie,
                    ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
                },
                redirect: 'manual',
            });

            // If redirected to login page, session expired
            if (testRes.status === 302 || testRes.status === 401) {
                this.logger.warn('⚠️ Sesión de Uber Eats expirada — necesita re-login manual');
                return { valid: false, error: 'Session expired' };
            }

            return {
                valid: true,
                cookies: cookie,
                headers: {
                    'Cookie': cookie,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
                },
            };
        } catch (e: any) {
            return { valid: false, error: `Auth check failed: ${e.message}` };
        }
    }

    protected async fetchOrders(auth: AuthContext): Promise<any[]> {
        const storeId = process.env.UBER_EATS_STORE_ID || '';
        const url = `${UBER_BASE_URL}${ORDERS_ENDPOINT}${storeId ? `?storeId=${storeId}` : ''}`;

        this.logger.debug(`  📡 Fetching: ${url}`);

        const res = await fetch(url, {
            method: 'GET',
            headers: auth.headers || {},
        });

        if (!res.ok) {
            const text = await res.text().catch(() => 'no body');
            throw new Error(`Uber API returned ${res.status}: ${text.substring(0, 200)}`);
        }

        const data = await res.json();

        // ═══════════════════════════════════════════════════════
        // ADAPTAR según la estructura real de la respuesta
        // Opciones comunes:
        //   data.orders
        //   data.data.orders
        //   data (si es array directo)
        // ═══════════════════════════════════════════════════════
        const orders = data.orders || data.data?.orders || (Array.isArray(data) ? data : []);

        return orders;
    }

    protected normalizeOrder(raw: any): CreateExternalOrderDto {
        // ═══════════════════════════════════════════════════════
        // ADAPTAR según la estructura real del JSON de Uber Eats
        // 
        // Estructura típica de un pedido Uber Eats:
        // {
        //   "uuid": "abc-123",
        //   "displayId": "UE-001",
        //   "currentState": "PLACED",
        //   "eater": { "name": "Juan", "phone": "+569..." },
        //   "deliveryAddress": { "formattedAddress": "Calle 123..." },
        //   "shoppingCart": {
        //     "items": [
        //       { "title": "Ceviche Clásico", "quantity": 1, "price": 8900 }
        //     ]
        //   },
        //   "totalPrice": 12500
        // }
        // ═══════════════════════════════════════════════════════

        return {
            platform: 'UBER_EATS',
            externalOrderId: raw.uuid || raw.displayId || raw.id || `UE-${Date.now()}`,
            externalStatus: raw.currentState || raw.status || 'NEW',
            customerName: raw.eater?.name || raw.customer?.name || 'Cliente Uber',
            customerPhone: raw.eater?.phone || raw.customer?.phone,
            deliveryAddress: raw.deliveryAddress?.formattedAddress 
                || raw.deliveryAddress?.address
                || raw.deliveryLocation?.address,
            items: (raw.shoppingCart?.items || raw.items || raw.cart?.items || []).map((item: any) => ({
                externalName: item.title || item.name || 'Producto',
                quantity: item.quantity || 1,
                unitPrice: item.price || item.unitPrice || 0,
                notes: item.specialInstructions || item.notes || undefined,
            })),
            externalTotal: raw.totalPrice || raw.total || raw.orderTotal,
            notes: raw.specialInstructions || raw.note,
            rawPayload: raw,
        };
    }
}
