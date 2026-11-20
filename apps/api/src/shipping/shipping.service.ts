
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ShippingQuoteDto, ShippingQuoteResponse } from './dto/shipping-quote.dto';

/** Punto central = local (General Cruz 92, Concepción). */
const LOCATION = {
    address: 'General Cruz 92, Concepción, Chile',
    city: 'Concepción',
    lat: -36.8211,
    lng: -73.0603,
    maxDeliveryRadiusKm: 12,
} as const;

/** Tramos: distancia <= maxKm. freeFrom es el subtotal desde el cual ese tramo sale gratis. */
const SHIPPING_BANDS = [
    { maxKm: 3.5, cost: 2000, freeFrom: 20000, label: 'Despacho 0–3,5 km' },
    { maxKm: 7.5, cost: 3500, freeFrom: 30000, label: 'Despacho 3,5–7,5 km' },
    { maxKm: 9.5, cost: 4000, freeFrom: 40000, label: 'Despacho 7,5–9,5 km' },
    { maxKm: 12, cost: 5500, freeFrom: 48000, label: 'Despacho 9,5–12 km' },
] as const;

/** Comunas del Gran Concepción que no son la comuna Concepción. */
const OUTSIDE_COMUNA_HINTS = [
    'talcahuano',
    'san pedro de la paz',
    'san pedro',
    'chiguayante',
    'hualpen',
    'hualpén',
    'penco',
    'tome',
    'tomé',
    'lota',
    'coronel',
    'hualqui',
    'florida',
    'santa juana',
    'arauco',
    'cabrero',
    'los angeles',
    'los ángeles',
];

function priceForDistance(distanceKm: number): (typeof SHIPPING_BANDS)[number] | null {
    const d = Math.max(0, Number(distanceKm) || 0);
    for (const band of SHIPPING_BANDS) {
        if (d <= band.maxKm) return band;
    }
    return null;
}

function clp(amount: number) {
    return `$${String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

/** El gratis depende del tramo: más lejos, más alto el monto. */
function applyFreeShipping(
    band: { cost: number; label: string; freeFrom: number },
    cartSubtotal: number,
): { cost: number; label: string; courierFee: number } {
    const sub = Math.max(0, Math.round(Number(cartSubtotal) || 0));
    if (sub >= band.freeFrom) {
        return { cost: 0, courierFee: band.cost, label: `Despacho gratis (compra sobre ${clp(band.freeFrom)})` };
    }
    return { cost: band.cost, courierFee: band.cost, label: band.label };
}

function etaForDistance(distanceKm: number): string {
    if (distanceKm <= 3.5) return '25-40 min';
    if (distanceKm <= 7.5) return '35-50 min';
    if (distanceKm <= 9.5) return '40-55 min';
    return '50-70 min';
}

function normalizeText(raw: string) {
    return String(raw || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '');
}

@Injectable()
export class ShippingService {
    private readonly logger = new Logger(ShippingService.name);
    private readonly ORIGIN_COORDS = { lat: LOCATION.lat, lng: LOCATION.lng };
    private readonly ORIGIN_ADDRESS = LOCATION.address;
    private maxDistanceKm: number = LOCATION.maxDeliveryRadiusKm;

    private readonly PEDIDOSYA_API_URL = process.env.PEDIDOSYA_API_URL || 'https://api.pedidosya.com/v1';
    private readonly PEDIDOSYA_TOKEN = process.env.PEDIDOSYA_TOKEN;
    private readonly PREPARATION_TIME_MINS = 20;

    private deliveryMode: 'EXTERNAL' | 'INTERNAL' = 'INTERNAL';
    private readonly riderLocks = new Set<string>();
    private readonly pickupPhone = '+56974342276';

    constructor(private readonly prisma: PrismaService) {}

    setDeliveryMode(mode: 'EXTERNAL' | 'INTERNAL') {
        this.deliveryMode = mode;
        this.logger.log(`[SHIPPING] Modo de despacho cambiado a: ${mode}`);
        return { mode: this.deliveryMode };
    }

    getDeliveryMode() {
        return {
            mode: this.deliveryMode,
            maxDistanceKm: this.maxDistanceKm,
            origin: { ...this.ORIGIN_COORDS, address: this.ORIGIN_ADDRESS },
            bands: SHIPPING_BANDS,
        };
    }

    setMaxDistance(km: number) {
        this.maxDistanceKm = Math.max(1, Math.min(km, 80));
        this.logger.log(`[SHIPPING] Radio de delivery cambiado a: ${this.maxDistanceKm}km`);
        return { maxDistanceKm: this.maxDistanceKm };
    }

    async calculateQuote(dto: ShippingQuoteDto): Promise<ShippingQuoteResponse> {
        const { address, channel, coordinates } = dto;
        const cartSubtotal = Number((dto as any).cartSubtotal ?? (dto as any).subtotal ?? 0);

        this.logger.log(`[QUOTE] Address: "${address}" | Channel: ${channel} | Coords: ${coordinates ? `${coordinates.lat},${coordinates.lng}` : 'NONE'} | Subtotal: ${cartSubtotal}`);

        const hasCoords = !!coordinates && Number.isFinite(Number(coordinates.lat)) && Number.isFinite(Number(coordinates.lng));
        if (!hasCoords && channel === 'WEB') {
            return {
                valid: false,
                distanceKm: 0,
                cost: 0,
                deliveryTimeEstimate: 'N/A',
                reason: 'Elige tu dirección desde la lista de sugerencias para calcular el despacho.',
            };
        }

        let distanceKm = 0;
        if (hasCoords && coordinates) {
            distanceKm = this.calculateDistance(this.ORIGIN_COORDS.lat, this.ORIGIN_COORDS.lng, coordinates.lat, coordinates.lng);
        } else {
            distanceKm = await this.mockDistanceCalculation(address);
        }

        const limit = Math.min(this.maxDistanceKm, LOCATION.maxDeliveryRadiusKm);
        if (distanceKm > limit && channel !== 'POS') {
            return {
                valid: false,
                distanceKm,
                cost: 0,
                deliveryTimeEstimate: 'N/A',
                reason: `Estás fuera de nuestra zona de despacho (${distanceKm.toFixed(1)} km; máximo ${limit} km). Prueba con retiro en tienda.`,
            };
        }

        const band = priceForDistance(distanceKm);
        if (!band && channel !== 'POS') {
            return {
                valid: false,
                distanceKm,
                cost: 0,
                deliveryTimeEstimate: 'N/A',
                reason: `Estás fuera de nuestra zona de despacho (${distanceKm.toFixed(1)} km; máximo ${LOCATION.maxDeliveryRadiusKm} km). Prueba con retiro en tienda.`,
            };
        }

        // POS fuera de radio: último tramo
        const baseBand = band || SHIPPING_BANDS[SHIPPING_BANDS.length - 1];
        const priced = applyFreeShipping(
            distanceKm > LOCATION.maxDeliveryRadiusKm
                ? { ...baseBand, label: `${baseBand.label} (fuera de radio, POS)` }
                : baseBand,
            cartSubtotal,
        );

        this.logger.log(`[QUOTE] Origin ${this.ORIGIN_COORDS.lat},${this.ORIGIN_COORDS.lng} → ${distanceKm}km | ${priced.label} | $${priced.cost}`);

        return {
            valid: true,
            cost: priced.cost,
            courierFee: priced.courierFee,
            deliveryTimeEstimate: etaForDistance(Math.min(distanceKm, LOCATION.maxDeliveryRadiusKm)),
            estimateId: `band-${Date.now()}`,
            distanceKm,
            reason: priced.cost === 0 ? priced.label : `${priced.label} · ${distanceKm.toFixed(1)} km`,
        };
    }

    /** Comuna Concepción (no todo el Gran Concepción). */
    isInConcepcion(address: string, city?: string, distanceKm?: number): boolean {
        const text = normalizeText(`${address} ${city || ''}`);
        if (OUTSIDE_COMUNA_HINTS.some((hint) => text.includes(normalizeText(hint)))) {
            return false;
        }
        if (text.includes('concepcion')) return true;
        // Sin comuna clara: tramo cercano (≤3,5 km) se trata como Concepción
        if (typeof distanceKm === 'number' && distanceKm > 0 && distanceKm <= 3.5) return true;
        return false;
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371;
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return parseFloat((R * c).toFixed(2));
    }

    private deg2rad(deg: number): number {
        return deg * (Math.PI / 180);
    }

    /** Fallback sin coords (POS): estima por texto; con Google activo debería usarse coords. */
    private async mockDistanceCalculation(address: string): Promise<number> {
        const text = normalizeText(address);
        if (text.includes('talcahuano') || text.includes('san pedro') || text.includes('chiguayante')) return 8;
        if (text.includes('hualpen') || text.includes('hualpén') || text.includes('penco')) return 10;
        if (text.includes('concepcion')) return 2.5;
        return 6;
    }

    /** Pide un rider real. No toca el total, el pago ni la caja. */
    async requestRider(saleId: string) {
        if (!this.PEDIDOSYA_TOKEN) throw new BadRequestException('Falta el token de PedidosYa Envíos en el servidor');
        if (this.riderLocks.has(saleId)) throw new BadRequestException('Ya se está pidiendo el repartidor de este pedido');
        this.riderLocks.add(saleId);
        try {
            const sale = await this.prisma.sale.findUnique({
                where: { id: saleId },
                include: { items: { include: { sellingProduct: { select: { name: true } } } } },
            });
            if (!sale) throw new NotFoundException('Pedido no encontrado');
            if (sale.status === 'CANCELLED') throw new BadRequestException('El pedido está anulado');
            const ship = (sale.shippingData && typeof sale.shippingData === 'object' ? sale.shippingData : {}) as Record<string, any>;
            if (ship.pedidosYa?.shippingId) {
                return { ok: true, already: true, ...ship.pedidosYa };
            }
            if (sale.fulfillmentType !== 'DELIVERY') {
                throw new BadRequestException('Este pedido es retiro o mesa. PedidosYa necesita una dirección de entrega.');
            }
            const address = String(ship.address || '').trim();
            const phone = toPyPhone(ship.contact?.phone);
            if (!address) throw new BadRequestException('El pedido no tiene dirección de entrega');
            if (!phone) throw new BadRequestException('El pedido no tiene teléfono del cliente');

            const dropLat = Number(ship.coordinates?.lat);
            const dropLng = Number(ship.coordinates?.lng);
            const items = (sale.items || []).slice(0, 8).map((item) => ({
                type: 'STANDARD',
                description: String(item.sellingProduct?.name || 'Pedido').slice(0, 80),
                quantity: Math.max(1, Number(item.quantity) || 1),
                value: Math.max(1, Math.round(Number(item.priceUnit) * Number(item.quantity || 1))),
                volume: 1,
                weight: 1,
            }));
            if (!items.length) items.push({ type: 'STANDARD', description: 'Pedido', quantity: 1, value: 1000, volume: 1, weight: 1 });

            const shippingBody = {
                referenceId: String(sale.code || sale.id),
                isTest: false,
                deliveryTime: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
                items,
                waypoints: [
                    // Primero el local. La moto retira ahí y después va al domicilio.
                    {
                        type: 'PICK_UP',
                        addressStreet: 'General Cruz 92',
                        city: 'Concepción',
                        latitude: LOCATION.lat,
                        longitude: LOCATION.lng,
                        phone: this.pickupPhone,
                        name: 'Lo Más Rico',
                        instructions: `Pedido ${sale.code || ''}`.trim(),
                    },
                    {
                        type: 'DROP_OFF',
                        addressStreet: address.slice(0, 140),
                        city: 'Concepción',
                        ...(Number.isFinite(dropLat) && Number.isFinite(dropLng) ? { latitude: dropLat, longitude: dropLng } : {}),
                        phone,
                        name: String(ship.contact?.name || 'Cliente').slice(0, 60),
                    },
                ],
            };
            const estimate = await this.pya('/v3/shippings/estimates', shippingBody);
            const offers = Array.isArray(estimate.deliveryOffers) ? estimate.deliveryOffers : [];
            const offer = offers.find((row: any) => /express/i.test(String(row.deliveryMode || ''))) || offers[0];
            const deliveryOfferId = offer?.deliveryOfferId;
            if (!deliveryOfferId) {
                throw new BadRequestException(estimate.message || 'PedidosYa no tiene un repartidor disponible para esa dirección');
            }

            const confirmed = await this.pya('/v3/shippings', { ...shippingBody, deliveryOfferId });
            const shippingId = confirmed.shippingId || confirmed.id;
            if (!shippingId) throw new BadRequestException(confirmed.message || 'PedidosYa no confirmó el envío');
            const record = {
                requestedAt: new Date().toISOString(),
                estimateId: estimate.estimateId || null,
                deliveryOfferId,
                shippingId: String(shippingId),
                status: confirmed.status || 'CONFIRMED',
                price: Number(confirmed.pricing?.total ?? offer?.pricing?.total ?? 0) || null,
                shareLink: confirmed.shareLocationUrl || confirmed.route?.shareUrl || confirmed.shareUrl || null,
                mode: offer?.deliveryMode || 'EXPRESS',
            };
            await this.prisma.sale.update({
                where: { id: sale.id },
                data: { shippingData: { ...ship, pedidosYa: record } as any },
            });
            this.logger.log(`[SHIPPING] Rider PedidosYa pedido para ${sale.code}: ${record.shippingId}`);
            return { ok: true, already: false, ...record };
        } finally {
            this.riderLocks.delete(saleId);
        }
    }

    private async pya(path: string, body: unknown) {
        const res = await fetch(`https://courier-api.pedidosya.com${path}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.PEDIDOSYA_TOKEN}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(body),
        });
        const text = await res.text();
        let json: any = {};
        try { json = text ? JSON.parse(text) : {}; } catch { json = { message: text.slice(0, 180) }; }
        if (!res.ok) {
            const message = json.message || json.code || `PedidosYa respondió ${res.status}`;
            this.logger.error(`[SHIPPING] ${path} ${res.status} ${message}`);
            throw new BadRequestException(String(message));
        }
        return json;
    }

    async confirmDelivery(estimateId: string) {
        if (estimateId.startsWith('internal-') || estimateId.startsWith('mock-') || estimateId.startsWith('zone-') || estimateId.startsWith('band-')) {
            this.logger.log(`[SHIPPING] Confirmando despacho Local/Zona: ${estimateId}`);
            return { success: true, trackingId: `TRACK-MOCK-${Date.now()}` };
        }

        if (this.PEDIDOSYA_TOKEN) {
            const response = await fetch(`${this.PEDIDOSYA_API_URL}/confirm`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.PEDIDOSYA_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    estimateId,
                    notificationUrl: null,
                    preparationTime: this.PREPARATION_TIME_MINS,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error('Failed to confirm delivery');
            return { success: true, trackingId: data.trackingId };
        }

        this.logger.warn(`[SHIPPING] No PEDIDOSYA_TOKEN configured. Cannot confirm delivery for ${estimateId}`);
        return { success: false, trackingId: null, reason: 'No delivery provider configured' };
    }
}

function toPyPhone(raw: unknown) {
    let digits = String(raw || '').replace(/\D/g, '');
    if (digits.startsWith('56')) digits = digits.slice(2);
    if (digits.length === 8) digits = `9${digits}`;
    if (digits.length !== 9) return '';
    return `+56${digits}`;
}
