
import { Injectable, Logger } from '@nestjs/common';
import { ShippingQuoteDto, ShippingQuoteResponse } from './dto/shipping-quote.dto';

const LOCATION = {
    address: 'Cruz 92, Concepción, Chile',
    city: 'Concepción',
    lat: -36.8211,
    lng: -73.0603,
    maxDeliveryRadiusKm: 45,
} as const;

const COST_CONCEPCION = 2500;
const COST_OUTSIDE = 4000;
const FREE_IN_CONCEPCION_FROM = 20000;
const FREE_ANYWHERE_FROM = 25000;

/** Comunas del Gran Concepción que NO son la comuna Concepción → tarifa "fuera". */
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

    setDeliveryMode(mode: 'EXTERNAL' | 'INTERNAL') {
        this.deliveryMode = mode;
        this.logger.log(`[SHIPPING] Modo de despacho cambiado a: ${mode}`);
        return { mode: this.deliveryMode };
    }

    getDeliveryMode() {
        return { mode: this.deliveryMode, maxDistanceKm: this.maxDistanceKm };
    }

    setMaxDistance(km: number) {
        this.maxDistanceKm = Math.max(1, Math.min(km, 80));
        this.logger.log(`[SHIPPING] Radio de delivery cambiado a: ${this.maxDistanceKm}km`);
        return { maxDistanceKm: this.maxDistanceKm };
    }

    /** Comuna Concepción (no Gran Concepción completo). */
    isInConcepcion(address: string, city?: string, distanceKm?: number): boolean {
        const text = normalizeText(`${address} ${city || ''}`);
        if (OUTSIDE_COMUNA_HINTS.some((hint) => text.includes(normalizeText(hint)))) {
            return false;
        }
        if (text.includes('concepcion')) return true;
        // Sin comuna clara: cerca del local (~6 km) se trata como Concepción
        if (typeof distanceKm === 'number' && distanceKm > 0 && distanceKm <= 6) return true;
        return false;
    }

    private priceFor(inConcepcion: boolean, cartSubtotal: number): { cost: number; label: string } {
        const sub = Math.max(0, Math.round(Number(cartSubtotal) || 0));
        if (sub >= FREE_ANYWHERE_FROM) {
            return { cost: 0, label: 'Despacho gratis (compra sobre $25.000)' };
        }
        if (inConcepcion && sub >= FREE_IN_CONCEPCION_FROM) {
            return { cost: 0, label: 'Despacho gratis en Concepción (compra sobre $20.000)' };
        }
        if (inConcepcion) {
            return { cost: COST_CONCEPCION, label: 'Despacho Concepción' };
        }
        return { cost: COST_OUTSIDE, label: 'Despacho fuera de Concepción' };
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

        if (distanceKm > this.maxDistanceKm && channel !== 'POS') {
            return {
                valid: false,
                distanceKm,
                cost: 0,
                deliveryTimeEstimate: 'N/A',
                reason: `Estás muy lejos de nuestro local (${distanceKm.toFixed(1)} km). Prueba con retiro en tienda o una dirección más cercana.`,
            };
        }

        const inConcepcion = this.isInConcepcion(address, (dto as any).city, distanceKm);
        const priced = this.priceFor(inConcepcion, cartSubtotal);

        this.logger.log(`[QUOTE] Distance: ${distanceKm}km | Zone: ${inConcepcion ? 'Concepción' : 'Fuera'} | Cost: ${priced.cost}`);

        return {
            valid: true,
            cost: priced.cost,
            deliveryTimeEstimate: inConcepcion ? '30-45 min' : '40-60 min',
            estimateId: `zone-${inConcepcion ? 'cco' : 'out'}-${Date.now()}`,
            distanceKm,
            reason: priced.label,
        };
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

    private async mockDistanceCalculation(address: string): Promise<number> {
        const text = normalizeText(address);
        if (OUTSIDE_COMUNA_HINTS.some((h) => text.includes(normalizeText(h)))) return 12;
        if (text.includes('concepcion')) return 3.5;
        return 8;
    }

    async confirmDelivery(estimateId: string) {
        if (estimateId.startsWith('internal-') || estimateId.startsWith('mock-') || estimateId.startsWith('zone-')) {
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
