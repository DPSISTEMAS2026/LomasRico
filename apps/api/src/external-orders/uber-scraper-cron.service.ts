import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ExternalOrdersService } from './external-orders.service';
import { CreateExternalOrderDto } from './dto/create-external-order.dto';

/**
 * 🔔 Uber Eats Scraper — Runs inside the NestJS API
 * 
 * Anti-detection design:
 * ─────────────────────────────────────────────────────────
 * 1. JITTER:          Random interval 45-90s (not a fixed period)
 * 2. BUSINESS HOURS:  Only polls 10:00-23:00 Chile time
 * 3. BACKOFF:         Exponential backoff on errors (up to 10 min)
 * 4. IDENTICAL:       Same query/headers as the real merchant portal
 * ─────────────────────────────────────────────────────────
 * 
 * This results in ~800-1200 requests/day (only during business hours),
 * with irregular spacing — indistinguishable from a human refreshing
 * the orders dashboard periodically.
 * 
 * Requirements:
 * - UBER_EATS_COOKIE env var (renewed every 24-48h from merchants-beta.ubereats.com)
 * - UBER_EATS_ENABLED=true env var (to toggle on/off)
 */

const UBER_GRAPHQL_URL = 'https://merchants-beta.ubereats.com/graphql';
const UBER_STORE_ID = '9b61ddd3-f68c-53ad-a1a3-435f20fe87d2';

// Polling config
const MIN_INTERVAL_MS = 45_000;   // 45 seconds minimum
const MAX_INTERVAL_MS = 90_000;   // 90 seconds maximum
const BUSINESS_HOUR_START = 10;   // 10:00 AM Chile
const BUSINESS_HOUR_END = 23;     // 11:00 PM Chile
const MAX_BACKOFF_MS = 600_000;   // 10 minutes max backoff

@Injectable()
export class UberScraperCronService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger('UberScraperCron');
    private seenOrders = new Set<string>();
    private isEnabled = false;
    private cookie = '';
    private csrfToken = 'x';
    private pollCount = 0;
    private lastError: string | null = null;
    private consecutiveErrors = 0;
    private pollTimer: ReturnType<typeof setTimeout> | null = null;

    // The real GraphQL payload (exact copy from Uber Eats merchant portal)
    private readonly gqlPayload: any;

    constructor(
        private readonly externalOrdersService: ExternalOrdersService,
    ) {
        this.gqlPayload = this.buildGraphQLPayload();
    }

    onModuleInit() {
        this.cookie = process.env.UBER_EATS_COOKIE || '';
        this.csrfToken = process.env.UBER_EATS_CSRF_TOKEN || 'x';
        this.isEnabled = process.env.UBER_EATS_ENABLED === 'true' && !!this.cookie;

        if (this.isEnabled) {
            this.logger.log('🟢 Uber Eats Scraper ENABLED');
            this.logger.log(`   Store: ${UBER_STORE_ID}`);
            this.logger.log(`   Interval: ${MIN_INTERVAL_MS / 1000}-${MAX_INTERVAL_MS / 1000}s (with jitter)`);
            this.logger.log(`   Hours: ${BUSINESS_HOUR_START}:00 - ${BUSINESS_HOUR_END}:00 Chile time`);
            this.logger.log(`   Cookie: ${this.cookie.length} chars`);
            this.scheduleNext();
        } else {
            this.logger.warn('🔴 Uber Eats Scraper DISABLED');
            if (!this.cookie) this.logger.warn('   → Missing UBER_EATS_COOKIE');
            if (process.env.UBER_EATS_ENABLED !== 'true') this.logger.warn('   → Set UBER_EATS_ENABLED=true to activate');
        }
    }

    getStatus() {
        return {
            enabled: this.isEnabled,
            cookieLength: this.cookie.length,
            cookiePreview: this.cookie ? `${this.cookie.substring(0, 20)}...` : '(empty)',
            uberEatsEnabled: process.env.UBER_EATS_ENABLED,
            hasCookieEnv: !!process.env.UBER_EATS_COOKIE,
            pollCount: this.pollCount,
            consecutiveErrors: this.consecutiveErrors,
            lastError: this.lastError,
            seenOrdersCount: this.seenOrders.size,
            hasActiveTimer: !!this.pollTimer,
            chileHour: this.getChileHour(),
        };
    }

    /**
     * Debug: perform a single manual poll and return the raw response.
     */
    async debugPoll() {
        try {
            const res = await fetch(UBER_GRAPHQL_URL, {
                method: 'POST',
                headers: {
                    'Cookie': this.cookie,
                    'Content-Type': 'application/json',
                    'X-Csrf-Token': this.csrfToken,
                    'Origin': 'https://merchants-beta.ubereats.com',
                    'Referer': 'https://merchants-beta.ubereats.com/orders/overview',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
                },
                body: JSON.stringify(this.gqlPayload),
            });

            const status = res.status;
            const data = await res.json();
            const result = data.data?.getActiveOrders;
            const orders = result?.result?.orders || [];

            return {
                httpStatus: status,
                topKeys: Object.keys(data || {}),
                hasData: !!data.data,
                dataKeys: data.data ? Object.keys(data.data) : [],
                success: result?.success,
                code: result?.code,
                message: result?.message,
                orderCount: orders.length,
                orders: orders.map((o: any) => ({
                    key: o.key,
                    displayID: o.value?.displayID,
                    state: o.value?.state,
                    customer: o.value?.customers?.[0]?.name,
                    itemCount: o.value?.itemCount,
                })),
                cookieUsed: this.cookie.substring(0, 30) + '...',
            };
        } catch (err: any) {
            return { error: err.message };
        }
    }

    onModuleDestroy() {
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = null;
        }
    }

    /**
     * Get the current hour in Chile timezone (America/Santiago)
     */
    private getChileHour(): number {
        const now = new Date();
        const chileTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
        return chileTime.getHours();
    }

    /**
     * Generate a random interval between MIN and MAX, with additional
     * jitter to avoid perfectly periodic patterns.
     */
    private getNextInterval(): number {
        // Base random interval
        const base = MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
        // Add small random jitter (-5s to +5s)
        const jitter = (Math.random() - 0.5) * 10_000;
        return Math.max(MIN_INTERVAL_MS, Math.round(base + jitter));
    }

    /**
     * Schedule the next poll with random delay
     */
    private scheduleNext() {
        if (!this.isEnabled) return;

        const chileHour = this.getChileHour();
        const isBusinessHours = chileHour >= BUSINESS_HOUR_START && chileHour < BUSINESS_HOUR_END;

        let delay: number;

        if (!isBusinessHours) {
            // Outside business hours: check again in 5 minutes
            delay = 300_000;
        } else if (this.consecutiveErrors > 0) {
            // Exponential backoff: 2^errors * 30s, capped at MAX_BACKOFF_MS
            delay = Math.min(MAX_BACKOFF_MS, Math.pow(2, this.consecutiveErrors) * 30_000);
            this.logger.debug(`  ⏳ Backoff: next poll in ${Math.round(delay / 1000)}s (${this.consecutiveErrors} consecutive errors)`);
        } else {
            // Normal: random between 45-90s
            delay = this.getNextInterval();
        }

        this.pollTimer = setTimeout(() => this.pollUberEats(), delay);
    }

    /**
     * Core poll function — fetches active orders from Uber Eats
     */
    async pollUberEats() {
        if (!this.isEnabled) return;

        // Re-check business hours at poll time
        const chileHour = this.getChileHour();
        if (chileHour < BUSINESS_HOUR_START || chileHour >= BUSINESS_HOUR_END) {
            this.scheduleNext();
            return;
        }

        this.pollCount++;

        try {
            const res = await fetch(UBER_GRAPHQL_URL, {
                method: 'POST',
                headers: {
                    'Cookie': this.cookie,
                    'Content-Type': 'application/json',
                    'X-Csrf-Token': this.csrfToken,
                    'Origin': 'https://merchants-beta.ubereats.com',
                    'Referer': 'https://merchants-beta.ubereats.com/orders/overview',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
                },
                body: JSON.stringify(this.gqlPayload),
            });

            // Session expired — stop hammering, log once
            if (res.status === 401 || res.status === 403) {
                if (this.lastError !== 'session_expired') {
                    this.logger.error('⚠️ Cookie de Uber Eats expirada! Renovar en UBER_EATS_COOKIE');
                    this.lastError = 'session_expired';
                }
                this.consecutiveErrors++;
                this.scheduleNext();
                return;
            }

            // Rate limited — back off
            if (res.status === 429) {
                this.logger.warn('⚠️ Rate limited por Uber (429) — aplicando backoff');
                this.consecutiveErrors += 2; // aggressive backoff
                this.scheduleNext();
                return;
            }

            const data = await res.json();
            const result = data.data?.getActiveOrders;

            // --- DIAGNOSTIC LOGGING (remove after fix) ---
            if (this.pollCount <= 5 || this.pollCount % 10 === 0) {
                const topKeys = Object.keys(data || {});
                const dataKeys = data.data ? Object.keys(data.data) : [];
                const orderCount = result?.result?.orders?.length ?? 'N/A';
                this.logger.log(`🔍 Poll #${this.pollCount} diagnostic: topKeys=[${topKeys}] dataKeys=[${dataKeys}] success=${result?.success} orderCount=${orderCount}`);
            }
            // --- END DIAGNOSTIC ---

            if (!result?.success) {
                this.logger.warn(`Poll #${this.pollCount}: API responded but no success flag. Keys: ${JSON.stringify(Object.keys(data || {}))}`);
                this.scheduleNext();
                return;
            }

            // Success — reset error state
            this.lastError = null;
            this.consecutiveErrors = 0;
            const orders = result.result?.orders || [];

            // Process new orders
            for (const o of orders) {
                const order = o.value;
                const orderId = order.id || o.key;

                if (this.seenOrders.has(orderId)) continue;
                this.seenOrders.add(orderId);

                // Skip terminal states
                const state = order.state;
                if (state === 'COMPLETED' || state === 'CANCELLED') continue;

                const dto = this.transformOrder(order);
                const customer = order.customers?.[0];

                this.logger.log(`🔔 NUEVO PEDIDO: ${order.displayID} — ${customer?.name || 'N/A'} (${state})`);

                try {
                    const ingestResult = await this.externalOrdersService.ingestOrder(dto);

                    if (ingestResult.status === 'created' || ingestResult.status === 'partial') {
                        this.logger.log(`  ✅ Ingresado → Sale ${ingestResult.saleCode} (${ingestResult.mappingLog.length} items)`);
                    } else if (ingestResult.status === 'duplicate') {
                        this.logger.debug(`  ⏩ Duplicado: ya fue ingresado`);
                    } else {
                        this.logger.warn(`  ❌ Falló: ${ingestResult.error}`);
                    }
                } catch (err: any) {
                    this.logger.error(`  💥 Error ingesting ${order.displayID}: ${err.message}`);
                }
            }

            // Periodic status log (every ~20 polls ≈ ~20 min)
            if (this.pollCount % 20 === 0) {
                this.logger.log(`📊 Poll #${this.pollCount} — ${orders.length} activos | ${this.seenOrders.size} vistos total`);
            }

            // Prune seen orders cache (keep last 200)
            if (this.seenOrders.size > 500) {
                const arr = [...this.seenOrders];
                this.seenOrders = new Set(arr.slice(-200));
            }

        } catch (err: any) {
            if (this.lastError !== err.message) {
                this.logger.error(`❌ Poll error: ${err.message}`);
                this.lastError = err.message;
            }
            this.consecutiveErrors++;
        }

        // Schedule next poll with random jitter
        this.scheduleNext();
    }

    /**
     * Transform Uber Eats GraphQL order → CreateExternalOrderDto
     */
    private transformOrder(order: any): CreateExternalOrderDto {
        const customer = order.customers?.[0];
        const delivery = order.deliveries?.[0];
        const items = this.extractItems(order);

        const dtoItems = items.map((item: any) => {
            const qty = item.quantity?.amount || 1;
            const price = this.parsePrice(item.price?.currencyAmount?.formatted);

            // Build structured modifier groups: { category: [option, option, ...] }
            const modGroups: { category: string; options: string[] }[] = [];
            let currentGroup: { category: string; options: string[] } | null = null;

            if (item.modifiers?.length) {
                for (const mod of item.modifiers) {
                    if (mod.__typename === 'Modifier') {
                        // Category header (e.g., "Elige Hasta 3 Proteínas", "¿Deseas Pancitos?")
                        currentGroup = { category: mod.name, options: [] };
                        modGroups.push(currentGroup);
                    } else if (mod.__typename === 'ModifierOption') {
                        if (currentGroup) {
                            currentGroup.options.push(mod.name);
                        } else {
                            // Orphan option without header — create uncategorized group
                            modGroups.push({ category: '', options: [mod.name] });
                        }
                    }
                }
            }

            // Build a clean structured notes string for the note
            // Sub-classify options within "Extras" groups (salsas vs acompañamientos)
            const finalGroups: { label: string; options: string[] }[] = [];
            for (const group of modGroups) {
                if (group.options.length === 0) continue;
                const label = this.classifyModifierGroup(group.category);

                // If this is an "Extras" group, split salsas into their own sub-group
                if (label.includes('Extras')) {
                    const salsas: string[] = [];
                    const otherExtras: string[] = [];
                    for (const opt of group.options) {
                        const n = opt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                        if (n.includes('salsa')) {
                            salsas.push(opt);
                        } else {
                            otherExtras.push(opt);
                        }
                    }
                    if (otherExtras.length > 0) finalGroups.push({ label: '🍞 Extras', options: otherExtras });
                    if (salsas.length > 0) finalGroups.push({ label: '🌶️ Salsas (extras)', options: salsas });
                } else {
                    finalGroups.push({ label, options: group.options });
                }
            }

            const noteParts: string[] = [];
            for (const group of finalGroups) {
                noteParts.push(`${group.label}: ${group.options.join(', ')}`);
            }

            // Item special instructions from note elements
            const itemNotes: string[] = (item.notes || [])
                .map((n: any) => n.title?.content?.richTextElements?.map((e: any) => e.text?.text).filter(Boolean).join(' ') || '')
                .filter(Boolean);

            if (itemNotes.length > 0) noteParts.push(`📝 ${itemNotes.join('; ')}`);

            const allNotes = noteParts.join(' | ');

            return {
                externalName: item.name || 'Producto',
                quantity: qty,
                unitPrice: price,
                notes: allNotes || undefined,
            };
        });

        // Parse total from amountE5 (cents * 100000) or formatted string
        const totalRaw = order.payment?.orderTotal;
        const totalAmount = totalRaw?.amountE5
            ? Math.round(Buffer.isBuffer(totalRaw.amountE5) || Array.isArray(totalRaw.amountE5?.data)
                ? this.parseAmountE5(totalRaw.amountE5)
                : totalRaw.amountE5 / 100000)
            : this.parsePrice(totalRaw?.formatted);

        const address = delivery?.location
            ? [delivery.location.addressOne, delivery.location.street, delivery.location.city].filter(Boolean).join(', ')
            : undefined;

        return {
            platform: 'UBER_EATS',
            externalOrderId: `UE-${order.displayID}`,
            externalStatus: order.state || 'NEW',
            customerName: customer?.name || 'Cliente Uber Eats',
            customerPhone: customer?.phone?.phoneNumber,
            deliveryAddress: address,
            items: dtoItems,
            externalTotal: totalAmount,
            notes: order.fulfillmentType === 'DELIVERY'
                ? `🛵 Uber Eats Delivery | Prep: ${Math.round((order.prepTimeSecs || 0) / 60)}min`
                : `🏪 Uber Eats Pickup`,
            rawPayload: order,
        };
    }

    private extractItems(order: any): any[] {
        const ci = order.cartInfo;
        if (!ci) return [];
        if (ci.cartItems) return ci.cartItems;
        if (ci.cartItemGroups) return ci.cartItemGroups.flatMap((g: any) => g.items || []);
        return [];
    }

    private parsePrice(priceStr?: string): number {
        if (!priceStr) return 0;
        const num = String(priceStr).replace(/[^\d]/g, '');
        return parseInt(num, 10) || 0;
    }

    private parseAmountE5(amountE5: any): number {
        try {
            const data = amountE5.data || amountE5;
            if (Array.isArray(data)) {
                // Convert Buffer-like array to number
                let val = 0;
                for (let i = 0; i < data.length; i++) {
                    val = val * 256 + data[i];
                }
                return Math.round(val / 100000);
            }
            return 0;
        } catch {
            return 0;
        }
    }

    /**
     * Classify an Uber modifier category header into a readable emoji label.
     * e.g., "Elige Hasta 3 Proteínas" → "🥩 Proteínas"
     */
    private classifyModifierGroup(category: string): string {
        const c = (category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        if (c.includes('proteina')) return '🥩 Proteínas';
        if (c.includes('salsa')) return '🌶️ Salsas';
        if (c.includes('pancito') || c.includes('acompana') || c.includes('deseas')) return '🍞 Extras';
        if (c.includes('tamano') || c.includes('tamaño') || c.includes('porcion')) return '📏 Tamaño';
        if (!category) return '⚙️ Opciones';
        return `⚙️ ${category}`;
    }

    /**
     * Build the exact GraphQL payload from the Uber Eats merchant portal.
     * This is the real query captured from DevTools.
     */
    private buildGraphQLPayload() {
        return {
            operationName: 'GetActiveOrders',
            variables: {
                getActiveOrdersRequest: {
                    storeID: UBER_STORE_ID,
                    locale: 'es-ES',
                },
            },
            query: `fragment RichTextElement on TextElement {
  predefinedDecorations
  text {
    text
    font {
      style
      weight
      __typename
    }
    color
    __typename
  }
  __typename
}

fragment RichTextFields on RichText {
  richTextElements {
    ...RichTextElement
    __typename
  }
  accessibilityText
  __typename
}

fragment PriceFields on Price {
  amount
  currencyAmount {
    amountE5
    currencyCode
    formatted
    __typename
  }
  priceModification {
    type
    discount {
      formattedDiscountedPrice
      __typename
    }
    __typename
  }
  __typename
}

fragment IllustrationFields on RichIllustration {
  illustration {
    __typename
    ... on StyledIcon {
      icon
      size
      color
      backgroundColor
      __typename
    }
  }
  __typename
}

fragment IconFields on IllustrationViewModel {
  content {
    ...IllustrationFields
    __typename
  }
  accessibilityText
  __typename
}

fragment NoteFields on Note {
  icon {
    ...IconFields
    __typename
  }
  title {
    content {
      richTextElements {
        ... on TextElement {
          ...RichTextElement
          __typename
        }
        __typename
      }
      accessibilityText
      __typename
    }
    __typename
  }
  __typename
}

fragment CartItemFields on CartItem {
  id
  actions {
    icon {
      ...IconFields
      __typename
    }
    type
    __typename
  }
  cartID
  imageURL
  itemID
  modifiers {
    __typename
    ... on Modifier {
      id
      name
      nestingDepth
      icon {
        ...IconFields
        __typename
      }
      __typename
    }
    ... on ModifierOption {
      itemID
      id
      name
      nestingDepth
      quantity {
        amount
        __typename
      }
      price {
        ...PriceFields
        __typename
      }
      __typename
    }
  }
  name
  notes {
    ...NoteFields
    __typename
  }
  price {
    ...PriceFields
    __typename
  }
  quantity {
    amount
    __typename
  }
  __typename
}

fragment Phone on Phone {
  countryCode
  phoneNumber
  pinCode
  __typename
}

fragment DeliveriesFields on Delivery {
  id
  state
  deliveryPartner {
    id
    name
    phone {
      ...Phone
      __typename
    }
    __typename
  }
  estimatedPickUpTime {
    relativeFromNowSecs
    __typename
  }
  estimatedDropOffTime
  actualDropOffTime
  location {
    latitude
    longitude
    title
    addressOne
    subtitle
    aptOrSuite
    businessName
    street
    region
    city
    postalCode
    country
    __typename
  }
  interactionType
  deliveryInstructions
  __typename
}

fragment OptionUI on OptionUIState {
  isDisabled
  disabledReason
  __typename
}

fragment OrderDetails on MerchantOrder {
  fulfillmentType
  id
  customers {
    customerID
    name
    orderHistory {
      pastOrderCount
      __typename
    }
    phone {
      ...Phone
      __typename
    }
    __typename
  }
  deliveries {
    ...DeliveriesFields
    __typename
  }
  displayID
  state
  itemCount
  cartInfo {
    __typename
    ... on CartGroupsList {
      cartItemGroups {
        groupName
        items {
          ...CartItemFields
          __typename
        }
        __typename
      }
      __typename
    }
    ... on CartItemList {
      cartItems {
        ...CartItemFields
        __typename
      }
      __typename
    }
  }
  payment {
    orderTotal {
      amountE5
      currencyCode
      formatted
      __typename
    }
    orderSubTotal {
      amountE5
      currencyCode
      formatted
      __typename
    }
    __typename
  }
  estimatedReadyTime {
    relativeFromNowSecs
    timestamp
    __typename
  }
  prepTimeSecs
  __typename
}

query GetActiveOrders($getActiveOrdersRequest: GetActiveOrdersRequest__Input!) {
  getActiveOrders(request: $getActiveOrdersRequest) {
    code
    success
    message
    result {
      orders {
        key
        value {
          ...OrderDetails
          __typename
        }
        __typename
      }
      orderCards {
        cardID
        sortPriority
        orderType {
          __typename
          ... on SingleOrder {
            id
            __typename
          }
        }
        column
        __typename
      }
      __typename
    }
    __typename
  }
}
`,
        };
    }
}
