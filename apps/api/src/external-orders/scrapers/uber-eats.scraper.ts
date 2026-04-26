import { BaseScraper, AuthContext } from './base-scraper';
import { CreateExternalOrderDto } from '../dto/create-external-order.dto';

/**
 * Uber Eats Scraper — CONFIGURADO CON DATOS REALES
 * 
 * Portal: merchants-beta.ubereats.com
 * API: GraphQL (POST /graphql)
 * Query: GetActiveOrders
 * Store ID: 9b61ddd3-f68c-53ad-a1a3-435f20fe87d2
 * 
 * ═══════════════════════════════════════════════════════════════
 * RENOVAR SESIÓN (cada 24-48h cuando expire):
 * ═══════════════════════════════════════════════════════════════
 * 
 * 1. Abrir Chrome → merchants-beta.ubereats.com → Loguearse
 * 2. DevTools (F12) → Red → Filtrar "graphql"
 * 3. Click en request "graphql" → Encabezados → copiar Cookie completa
 * 4. Actualizar UBER_EATS_COOKIE en .env (o en Render Dashboard)
 */

const UBER_GRAPHQL_URL = 'https://merchants-beta.ubereats.com/graphql';
const UBER_STORE_ID = '9b61ddd3-f68c-53ad-a1a3-435f20fe87d2';

// GraphQL query para obtener pedidos activos
const GET_ACTIVE_ORDERS_QUERY = `
query GetActiveOrders($getActiveOrdersRequest: GetActiveOrdersRequest!) {
  getActiveOrders(getActiveOrdersRequest: $getActiveOrdersRequest) {
    orders {
      id
      uuid
      displayId
      currentState
      createdAt
      estimatedReadyForPickupAt
      eater {
        name
        phone
      }
      deliveryInfo {
        address {
          formattedAddress
          address1
          city
        }
      }
      shoppingCart {
        items {
          title
          quantity
          price
          selectedModifierGroups {
            title
            selectedItems {
              title
              price
              quantity
            }
          }
          specialInstructions
        }
      }
      totalPrice
      subtotalPrice
      taxAmount
      deliveryFee
      orderType
      specialInstructions
    }
  }
}
`;

export class UberEatsScraper extends BaseScraper {
    constructor(apiUrl?: string) {
        super('UBER_EATS', apiUrl);
    }

    protected async getAuth(): Promise<AuthContext> {
        const cookie = process.env.UBER_EATS_COOKIE;

        if (!cookie) {
            this.logger.error('❌ UBER_EATS_COOKIE no configurado en .env');
            this.logger.error('   → Abre merchants-beta.ubereats.com, loguéate');
            this.logger.error('   → DevTools → Red → graphql → Copiar cookie');
            return { valid: false, error: 'Missing UBER_EATS_COOKIE' };
        }

        // Quick validation: test GraphQL endpoint
        try {
            const testRes = await fetch(UBER_GRAPHQL_URL, {
                method: 'POST',
                headers: {
                    'Cookie': cookie,
                    'Content-Type': 'application/json',
                    'Origin': 'https://merchants-beta.ubereats.com',
                    'Referer': 'https://merchants-beta.ubereats.com/orders/overview',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                },
                body: JSON.stringify({
                    operationName: 'GetActiveOrders',
                    query: GET_ACTIVE_ORDERS_QUERY,
                    variables: {
                        getActiveOrdersRequest: {
                            storeID: UBER_STORE_ID,
                            locale: 'es-ES'
                        }
                    }
                }),
            });

            if (testRes.status === 401 || testRes.status === 403) {
                this.logger.warn('⚠️ Sesión de Uber Eats expirada — necesita re-login manual');
                return { valid: false, error: 'Session expired' };
            }

            return {
                valid: true,
                cookies: cookie,
                headers: {
                    'Cookie': cookie,
                    'Content-Type': 'application/json',
                    'Origin': 'https://merchants-beta.ubereats.com',
                    'Referer': 'https://merchants-beta.ubereats.com/orders/overview',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                },
            };
        } catch (e: any) {
            return { valid: false, error: `Auth check failed: ${e.message}` };
        }
    }

    protected async fetchOrders(auth: AuthContext): Promise<any[]> {
        this.logger.debug(`  📡 Fetching orders via GraphQL (Store: ${UBER_STORE_ID})`);

        const res = await fetch(UBER_GRAPHQL_URL, {
            method: 'POST',
            headers: auth.headers || {},
            body: JSON.stringify({
                operationName: 'GetActiveOrders',
                query: GET_ACTIVE_ORDERS_QUERY,
                variables: {
                    getActiveOrdersRequest: {
                        storeID: UBER_STORE_ID,
                        locale: 'es-ES'
                    }
                }
            }),
        });

        if (!res.ok) {
            const text = await res.text().catch(() => 'no body');
            throw new Error(`Uber GraphQL returned ${res.status}: ${text.substring(0, 300)}`);
        }

        const data = await res.json();

        // Handle GraphQL errors
        if (data.errors && data.errors.length > 0) {
            throw new Error(`GraphQL errors: ${data.errors.map((e: any) => e.message).join(', ')}`);
        }

        const orders = data.data?.getActiveOrders?.orders || [];
        this.logger.log(`  📦 ${orders.length} pedidos activos encontrados`);

        return orders;
    }

    protected normalizeOrder(raw: any): CreateExternalOrderDto {
        // Build items array from shoppingCart
        const items = (raw.shoppingCart?.items || []).map((item: any) => {
            // Include modifier details in notes
            let modifierNotes = '';
            if (item.selectedModifierGroups?.length) {
                const mods = item.selectedModifierGroups
                    .flatMap((g: any) => (g.selectedItems || []).map((si: any) => si.title))
                    .filter(Boolean);
                if (mods.length) modifierNotes = `[${mods.join(', ')}]`;
            }

            const notes = [item.specialInstructions, modifierNotes].filter(Boolean).join(' ');

            return {
                externalName: item.title || 'Producto',
                quantity: item.quantity || 1,
                unitPrice: item.price || 0,
                notes: notes || undefined,
            };
        });

        return {
            platform: 'UBER_EATS',
            externalOrderId: raw.uuid || raw.displayId || raw.id || `UE-${Date.now()}`,
            externalStatus: raw.currentState || 'NEW',
            customerName: raw.eater?.name || 'Cliente Uber',
            customerPhone: raw.eater?.phone,
            deliveryAddress: raw.deliveryInfo?.address?.formattedAddress
                || raw.deliveryInfo?.address?.address1,
            items,
            externalTotal: raw.totalPrice || raw.subtotalPrice,
            notes: raw.specialInstructions,
            rawPayload: raw,
        };
    }
}
