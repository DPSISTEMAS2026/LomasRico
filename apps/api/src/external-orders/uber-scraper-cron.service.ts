import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExternalOrdersService } from './external-orders.service';
import { CreateExternalOrderDto } from './dto/create-external-order.dto';

/**
 * 🔔 Uber Eats Scraper Cron — Runs inside the NestJS API
 * 
 * Polls Uber Eats GraphQL every 30 seconds for active orders
 * and auto-ingests new ones to the kitchen system.
 * 
 * Requirements:
 * - UBER_EATS_COOKIE env var (renewed every 24-48h from merchants-beta.ubereats.com)
 * - UBER_EATS_ENABLED=true env var (to toggle on/off)
 */

const UBER_GRAPHQL_URL = 'https://merchants-beta.ubereats.com/graphql';
const UBER_STORE_ID = '9b61ddd3-f68c-53ad-a1a3-435f20fe87d2';

@Injectable()
export class UberScraperCronService implements OnModuleInit {
    private readonly logger = new Logger('UberScraperCron');
    private seenOrders = new Set<string>();
    private isEnabled = false;
    private cookie = '';
    private csrfToken = 'x';
    private pollCount = 0;
    private lastError: string | null = null;

    // The real GraphQL payload (exact copy from Uber Eats merchant portal)
    private readonly gqlPayload: any;

    constructor(
        private readonly externalOrdersService: ExternalOrdersService,
    ) {
        // Build the massive GraphQL payload once
        this.gqlPayload = this.buildGraphQLPayload();
    }

    onModuleInit() {
        this.cookie = process.env.UBER_EATS_COOKIE || '';
        this.csrfToken = process.env.UBER_EATS_CSRF_TOKEN || 'x';
        this.isEnabled = process.env.UBER_EATS_ENABLED === 'true' && !!this.cookie;

        if (this.isEnabled) {
            this.logger.log('🟢 Uber Eats Scraper ENABLED — polling every 30s');
            this.logger.log(`   Store: ${UBER_STORE_ID}`);
            this.logger.log(`   Cookie length: ${this.cookie.length} chars`);
        } else {
            this.logger.warn('🔴 Uber Eats Scraper DISABLED');
            if (!this.cookie) this.logger.warn('   → Missing UBER_EATS_COOKIE');
            if (process.env.UBER_EATS_ENABLED !== 'true') this.logger.warn('   → Set UBER_EATS_ENABLED=true to activate');
        }
    }

    /**
     * Runs every 30 seconds — polls Uber Eats for active orders
     */
    @Cron(CronExpression.EVERY_30_SECONDS)
    async pollUberEats() {
        if (!this.isEnabled) return;

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

            // Session expired
            if (res.status === 401 || res.status === 403) {
                if (this.lastError !== 'session_expired') {
                    this.logger.error('⚠️ Cookie de Uber Eats expirada! Renovar en UBER_EATS_COOKIE');
                    this.lastError = 'session_expired';
                }
                return;
            }

            const data = await res.json();
            const result = data.data?.getActiveOrders;
            if (!result?.success) {
                this.logger.debug(`Poll #${this.pollCount}: API responded but no success flag`);
                return;
            }

            this.lastError = null;
            const orders = result.result?.orders || [];

            // Process new orders
            for (const o of orders) {
                const order = o.value;
                const orderId = order.id || o.key;

                if (this.seenOrders.has(orderId)) continue;
                this.seenOrders.add(orderId);

                // Only ingest PREPARING or ACCEPTED orders
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

            // Periodic status log
            if (this.pollCount % 20 === 0) {
                this.logger.debug(`📊 Poll #${this.pollCount} — ${orders.length} activos | ${this.seenOrders.size} vistos total`);
            }

            // Clean up old seen orders (keep last 500)
            if (this.seenOrders.size > 500) {
                const arr = [...this.seenOrders];
                this.seenOrders = new Set(arr.slice(-200));
            }

        } catch (err: any) {
            if (this.lastError !== err.message) {
                this.logger.error(`❌ Poll error: ${err.message}`);
                this.lastError = err.message;
            }
        }
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

            // Build modifier notes from ModifierOption entries
            const modNotes: string[] = [];
            if (item.modifiers?.length) {
                item.modifiers.forEach((mod: any) => {
                    if (mod.__typename === 'ModifierOption') {
                        modNotes.push(mod.name);
                    }
                });
            }

            // Item special instructions from note elements
            const itemNotes: string[] = (item.notes || [])
                .map((n: any) => n.title?.content?.richTextElements?.map((e: any) => e.text?.text).filter(Boolean).join(' ') || '')
                .filter(Boolean);

            const allNotes = [...modNotes, ...itemNotes].filter(Boolean).join(', ');

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
