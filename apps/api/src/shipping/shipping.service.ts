
import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ShippingQuoteDto, ShippingQuoteResponse } from './dto/shipping-quote.dto';
// Location constants (inlined to avoid cross-package build issues on Render)
const LOCATION = {
    address: 'Obispo Hipólito Salas 1205, Concepción',
    city: 'Concepción',
    lat: -36.8270,
    lng: -73.0503,
    maxDeliveryRadiusKm: 8,
} as const;

@Injectable()
export class ShippingService {
    private readonly logger = new Logger(ShippingService.name);
    private readonly ORIGIN_COORDS = { lat: LOCATION.lat, lng: LOCATION.lng };
    private readonly ORIGIN_ADDRESS = LOCATION.address;
    private readonly MAX_DISTANCE_KM = LOCATION.maxDeliveryRadiusKm;

    private readonly PEDIDOSYA_API_URL = process.env.PEDIDOSYA_API_URL || 'https://api.pedidosya.com/v1';
    private readonly PEDIDOSYA_TOKEN = process.env.PEDIDOSYA_TOKEN;

    // Tiempo de preparación por defecto: 20 minutos (Pedido por el usuario)
    private readonly PREPARATION_TIME_MINS = 20;

    private deliveryMode: 'EXTERNAL' | 'INTERNAL' = 'EXTERNAL';

    setDeliveryMode(mode: 'EXTERNAL' | 'INTERNAL') {
        this.deliveryMode = mode;
        this.logger.log(`[SHIPPING] Modo de despacho cambiado a: ${mode}`);
        return { mode: this.deliveryMode };
    }

    getDeliveryMode() {
        return { mode: this.deliveryMode };
    }

    async calculateQuote(dto: ShippingQuoteDto): Promise<ShippingQuoteResponse> {
        const { address, channel, coordinates } = dto;

        this.logger.log(`[QUOTE] Address: "${address}" | Channel: ${channel} | Coords: ${coordinates ? `${coordinates.lat},${coordinates.lng}` : 'NONE'}`);

        // 1. Calculate Distance
        let distanceKm = 0;
        if (coordinates) {
            distanceKm = this.calculateDistance(this.ORIGIN_COORDS.lat, this.ORIGIN_COORDS.lng, coordinates.lat, coordinates.lng);
        } else {
            distanceKm = await this.mockDistanceCalculation(address);
        }

        this.logger.log(`[QUOTE] Distance: ${distanceKm}km | Max: ${this.MAX_DISTANCE_KM}km | Mode: ${this.deliveryMode}`);

        // 2. Validate Radius
        if (distanceKm > this.MAX_DISTANCE_KM && channel !== 'POS') {
            return {
                valid: false,
                distanceKm,
                cost: 0,
                deliveryTimeEstimate: 'N/A',
                reason: `¡Uf! Lo sentimos, estás fuera de nuestro radio de entrega actual (${this.MAX_DISTANCE_KM}km). Tu distancia aproximada es de ${distanceKm.toFixed(1)}km.`,
            };
        }

        // 3. INTERNAL DELIVERY Logic
        if (this.deliveryMode === 'INTERNAL') {
            return {
                valid: true,
                cost: 2000, // Precio fijo local o basado en zona
                deliveryTimeEstimate: '30-45 min (Repartidor del Local)',
                estimateId: `internal-${Date.now()}`,
                distanceKm
            };
        }

        // 4. EXTERNAL API (PedidosYa)
        try {
            const quote = await this.getPedidosYaQuote(address, coordinates);
            return {
                valid: true,
                cost: quote.price,
                deliveryTimeEstimate: quote.eta || '35-45 min',
                estimateId: quote.id,
                distanceKm
            };
        } catch (error) {
            this.logger.error('PedidosYa Quote Failed', error);
            // Fallback for POS, WHATSAPP or manual override
            if (channel === 'POS' || channel === 'WHATSAPP') {
                const fallbackCost = distanceKm > 5 ? 3500 : 2500;
                return {
                    valid: true,
                    cost: fallbackCost,
                    deliveryTimeEstimate: '35-50 min (Estimado)',
                    reason: 'API Failure: Fallback applied.',
                    distanceKm,
                };
            }
            throw new InternalServerErrorException('No se pudo calcular el envío con el proveedor logístico.');
        }
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return parseFloat(d.toFixed(2));
    }

    private deg2rad(deg: number): number {
        return deg * (Math.PI / 180);
    }

    private async mockDistanceCalculation(address: string): Promise<number> {
        if (address.toLowerCase().includes('talcahuano')) return 12;
        return 3.5;
    }

    private async getPedidosYaQuote(address: string, coordinates?: { lat: number, lng: number }) {
        if (!this.PEDIDOSYA_TOKEN) {
            // Mock Response if no token
            return {
                price: Math.round(1500 + (Math.random() * 1000)),
                eta: '30-45 min',
                id: `mock-py-${Date.now()}`
            };
        }

        const destination = coordinates
            ? { latitude: coordinates.lat, longitude: coordinates.lng, addressStreet: address }
            : { addressStreet: address, city: 'Concepción' };

        // PedidosYa Payload with Origin and Destination Waypoints
        const realPayload = {
            referenceId: `quote-${Date.now()}`,
            isTest: true,
            preparationTime: this.PREPARATION_TIME_MINS, // Avisar los 20 min de preparación
            notificationUrl: null,
            waypoints: [
                {
                    type: 'PICK_UP',
                    addressStreet: this.ORIGIN_ADDRESS,
                    city: 'Concepción',
                    latitude: this.ORIGIN_COORDS.lat,
                    longitude: this.ORIGIN_COORDS.lng,
                    phone: '+56900000000',
                    name: 'Lo Mas Rico'
                },
                {
                    type: 'DROP_OFF',
                    ...destination,
                    phone: '+56900000000',
                    name: 'Cliente'
                }
            ],
            items: [{ type: 'Standard', value: 10000, description: 'Comida', quantity: 1, volume: 0.1, weight: 1 }]
        };

        const response = await fetch(`${this.PEDIDOSYA_API_URL}/shippings/estimates`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.PEDIDOSYA_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(realPayload)
        });

        if (!response.ok) {
            const err = await response.text();
            this.logger.error(`PedidosYa API Error: ${err}`);
            throw new Error(`PedidosYa API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const offer = data.estimate?.deliveryOffers?.find((o: any) => o.type === 'INSTANT') || data.estimate?.deliveryOffers?.[0];

        if (!offer) throw new Error('No delivery offers available');

        return {
            price: offer.pricing.total,
            eta: `${offer.confirmationTime || 45} min`,
            id: data.estimate.estimateId
        };
    }

    async confirmDelivery(estimateId: string) {
        if (estimateId.startsWith('internal-') || estimateId.startsWith('mock-')) {
            this.logger.log(`[SHIPPING] Confirmando despacho Local/Simulado: ${estimateId}`);
            return { success: true, trackingId: `TRACK-MOCK-${Date.now()}` };
        }

        if (this.PEDIDOSYA_TOKEN) {
            const response = await fetch(`${this.PEDIDOSYA_API_URL}/confirm`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.PEDIDOSYA_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    estimateId,
                    notificationUrl: null,
                    preparationTime: this.PREPARATION_TIME_MINS
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error('Failed to confirm delivery');
            return { success: true, trackingId: data.trackingId };
        }

        // Sin token de PedidosYa configurado
        this.logger.warn(`[SHIPPING] No PEDIDOSYA_TOKEN configured. Cannot confirm delivery for ${estimateId}`);
        return { success: false, trackingId: null, reason: 'No delivery provider configured' };
    }
}
