import { Logger } from '@nestjs/common';
import { CreateExternalOrderDto, ExternalPlatform } from '../dto/create-external-order.dto';

/**
 * BaseScraper
 * 
 * Clase abstracta que define el contrato para los scrapers de plataformas externas.
 * 
 * Estrategia de scraping:
 * Los portales de Uber Eats / PedidosYa son SPAs que consumen APIs internas.
 * En vez de parsear HTML (frágil), interceptamos las llamadas REST que hace el
 * dashboard del restaurante para obtener los pedidos.
 * 
 * Flujo:
 * 1. Obtener credenciales/cookies de sesión (configuradas en .env)
 * 2. Llamar al endpoint interno de "pedidos activos" de la plataforma
 * 3. Parsear la respuesta JSON (mucho más estable que HTML)
 * 4. Normalizar al formato CreateExternalOrderDto
 * 5. Enviar al endpoint de ingesta local
 */
export abstract class BaseScraper {
    protected readonly logger: Logger;
    protected readonly apiUrl: string;

    constructor(
        protected readonly platform: ExternalPlatform,
        apiUrl?: string,
    ) {
        this.logger = new Logger(`${platform}Scraper`);
        this.apiUrl = apiUrl || process.env.API_URL || 'http://localhost:3001';
    }

    /**
     * Execute the full scraping cycle.
     * Returns the count of new orders found and ingested.
     */
    async execute(): Promise<ScraperResult> {
        const startTime = Date.now();
        this.logger.log(`🔄 Starting ${this.platform} scraping cycle...`);

        try {
            // 1. Get auth headers/cookies
            const auth = await this.getAuth();
            if (!auth.valid) {
                return {
                    platform: this.platform,
                    success: false,
                    error: 'Authentication failed - need to refresh session',
                    ordersFound: 0,
                    ordersIngested: 0,
                    duration: Date.now() - startTime,
                };
            }

            // 2. Fetch active orders from platform's internal API
            const rawOrders = await this.fetchOrders(auth);
            this.logger.log(`  📋 Found ${rawOrders.length} orders on ${this.platform}`);

            // 3. Normalize to our DTO format
            const normalized = rawOrders.map(raw => this.normalizeOrder(raw));

            // 4. Send to local ingestion API
            let ingested = 0;
            const errors: string[] = [];

            for (const order of normalized) {
                try {
                    const res = await fetch(`${this.apiUrl}/external-orders/ingest`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(order),
                    });

                    const result = await res.json();

                    if (result.status === 'created' || result.status === 'partial') {
                        ingested++;
                        this.logger.log(`  ✅ ${order.externalOrderId} → Sale ${result.saleCode}`);
                    } else if (result.status === 'duplicate') {
                        // Expected for already-processed orders
                    } else {
                        errors.push(`${order.externalOrderId}: ${result.error || 'unknown'}`);
                    }
                } catch (e: any) {
                    errors.push(`${order.externalOrderId}: ${e.message}`);
                }
            }

            const duration = Date.now() - startTime;
            this.logger.log(
                `✅ ${this.platform} cycle complete: ${ingested} new / ${rawOrders.length} total (${duration}ms)`,
            );

            return {
                platform: this.platform,
                success: true,
                ordersFound: rawOrders.length,
                ordersIngested: ingested,
                errors: errors.length > 0 ? errors : undefined,
                duration,
            };
        } catch (error: any) {
            this.logger.error(`💥 ${this.platform} scraping failed: ${error.message}`);
            return {
                platform: this.platform,
                success: false,
                error: error.message,
                ordersFound: 0,
                ordersIngested: 0,
                duration: Date.now() - startTime,
            };
        }
    }

    /**
     * Get authentication credentials for the platform.
     * Override in each scraper to handle platform-specific auth.
     */
    protected abstract getAuth(): Promise<AuthContext>;

    /**
     * Fetch raw orders from the platform's internal API.
     * Override to call the specific endpoint of each platform.
     */
    protected abstract fetchOrders(auth: AuthContext): Promise<any[]>;

    /**
     * Normalize a raw platform order into our standard DTO.
     * Override to handle the specific JSON structure of each platform.
     */
    protected abstract normalizeOrder(raw: any): CreateExternalOrderDto;
}

export interface AuthContext {
    valid: boolean;
    cookies?: string;
    headers?: Record<string, string>;
    token?: string;
    error?: string;
}

export interface ScraperResult {
    platform: ExternalPlatform;
    success: boolean;
    error?: string;
    ordersFound: number;
    ordersIngested: number;
    errors?: string[];
    duration: number;
}
