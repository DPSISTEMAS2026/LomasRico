import { BaseScraper, AuthContext } from './base-scraper';
import { CreateExternalOrderDto } from '../dto/create-external-order.dto';

/**
 * PedidosYa Scraper
 * 
 * Estrategia: Interceptar la API interna del portal de restaurante PedidosYa
 * 
 * NOTA: El token PEDIDOSYA_TOKEN en .env es para PedidosYa ENVÍOS (delivery dispatch),
 *       NO para recibir pedidos. Para pedidos necesitamos scrapear el portal.
 * 
 * El portal de PedidosYa para restaurantes suele estar en:
 *   - https://portal.pedidosya.com (o similar)
 *   - https://partners.pedidosya.com
 * 
 * ═══════════════════════════════════════════════════════════════
 * SETUP INICIAL (Manual, 1 vez):
 * ═══════════════════════════════════════════════════════════════
 * 
 * 1. Abrir Chrome → Portal PedidosYa Restaurantes → Loguearse
 * 2. DevTools → Network → Filtrar XHR → Navegar a "Pedidos"
 * 3. Buscar la llamada que carga los pedidos (probablemente algo como):
 *    - GET /api/v3/orders?status=active
 *    - GET /api/partners/orders
 *    - POST /graphql con query OrdersList
 * 4. Copiar:
 *    - Cookie completa
 *    - Authorization header (si usa Bearer token)
 *    - Cualquier header custom (x-api-key, x-partner-id, etc.)
 * 5. Pegar en .env:
 *    PEDIDOSYA_PORTAL_COOKIE="session=xxx; ..."
 *    PEDIDOSYA_PORTAL_TOKEN="Bearer xxx" (si aplica)
 *    PEDIDOSYA_RESTAURANT_ID="12345"
 * 
 * ═══════════════════════════════════════════════════════════════
 */

const PEDIDOSYA_BASE_URL = 'https://portal.pedidosya.com';

// Endpoint para obtener pedidos — ACTUALIZAR con el real
const ORDERS_ENDPOINT = '/api/v3/orders';

export class PedidosYaScraper extends BaseScraper {
    constructor(apiUrl?: string) {
        super('PEDIDOS_YA', apiUrl);
    }

    protected async getAuth(): Promise<AuthContext> {
        const cookie = process.env.PEDIDOSYA_PORTAL_COOKIE;
        const token = process.env.PEDIDOSYA_PORTAL_TOKEN;

        if (!cookie && !token) {
            this.logger.error('❌ Ni PEDIDOSYA_PORTAL_COOKIE ni PEDIDOSYA_PORTAL_TOKEN configurados en .env');
            this.logger.error('   → Abre el portal de PedidosYa, loguéate, y copia credenciales desde DevTools');
            return { valid: false, error: 'Missing PedidosYa portal credentials' };
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        };

        if (cookie) headers['Cookie'] = cookie;
        if (token) headers['Authorization'] = token.startsWith('Bearer') ? token : `Bearer ${token}`;

        // Validate session
        try {
            const testRes = await fetch(`${PEDIDOSYA_BASE_URL}/api/health`, {
                method: 'GET',
                headers,
                redirect: 'manual',
            });

            if (testRes.status === 302 || testRes.status === 401 || testRes.status === 403) {
                this.logger.warn('⚠️ Sesión de PedidosYa expirada — necesita re-login manual');
                return { valid: false, error: 'Session expired' };
            }

            return { valid: true, headers, cookies: cookie, token };
        } catch (e: any) {
            // If health endpoint doesn't exist, assume auth is valid and try orders directly
            this.logger.debug(`  Health check not available, proceeding with stored credentials`);
            return { valid: true, headers, cookies: cookie, token };
        }
    }

    protected async fetchOrders(auth: AuthContext): Promise<any[]> {
        const restaurantId = process.env.PEDIDOSYA_RESTAURANT_ID || '';
        const url = `${PEDIDOSYA_BASE_URL}${ORDERS_ENDPOINT}`;

        const params = new URLSearchParams({
            ...(restaurantId ? { restaurantId } : {}),
            status: 'ACTIVE,CONFIRMED,NEW',
        });

        this.logger.debug(`  📡 Fetching: ${url}?${params}`);

        const res = await fetch(`${url}?${params}`, {
            method: 'GET',
            headers: auth.headers || {},
        });

        if (!res.ok) {
            const text = await res.text().catch(() => 'no body');
            throw new Error(`PedidosYa API returned ${res.status}: ${text.substring(0, 200)}`);
        }

        const data = await res.json();

        // ═══════════════════════════════════════════════════════
        // ADAPTAR según la estructura real de PedidosYa
        // Opciones comunes:
        //   data.orders
        //   data.data
        //   data.result.orders
        // ═══════════════════════════════════════════════════════
        const orders = data.orders || data.data || (Array.isArray(data) ? data : []);

        return orders;
    }

    protected normalizeOrder(raw: any): CreateExternalOrderDto {
        // ═══════════════════════════════════════════════════════
        // ADAPTAR según la estructura real de PedidosYa
        //
        // Estructura típica PedidosYa:
        // {
        //   "id": 123456,
        //   "code": "PY-001",
        //   "state": "CONFIRMED",
        //   "user": { "name": "María", "phone": "+569..." },
        //   "address": { "description": "Calle O'Higgins 456" },
        //   "details": [
        //     { "product": { "name": "Ceviche" }, "quantity": 1, "unitPrice": 8900 }
        //   ],
        //   "totalAmount": 12500,
        //   "comments": "Sin cebolla"
        // }
        // ═══════════════════════════════════════════════════════

        return {
            platform: 'PEDIDOS_YA',
            externalOrderId: String(raw.id || raw.code || `PY-${Date.now()}`),
            externalStatus: raw.state || raw.status || 'NEW',
            customerName: raw.user?.name || raw.customer?.name || 'Cliente PedidosYa',
            customerPhone: raw.user?.phone || raw.customer?.phone,
            deliveryAddress: raw.address?.description
                || raw.address?.street
                || raw.deliveryAddress,
            items: (raw.details || raw.products || raw.items || []).map((item: any) => ({
                externalName: item.product?.name || item.name || item.title || 'Producto',
                quantity: item.quantity || item.count || 1,
                unitPrice: item.unitPrice || item.price || item.product?.price || 0,
                notes: item.comment || item.notes || item.optionGroups?.map((g: any) => 
                    g.options?.map((o: any) => o.name).join(', ')
                ).join(' | ') || undefined,
            })),
            externalTotal: raw.totalAmount || raw.total || raw.payment?.total,
            notes: raw.comments || raw.specialInstructions || raw.note,
            rawPayload: raw,
        };
    }
}
