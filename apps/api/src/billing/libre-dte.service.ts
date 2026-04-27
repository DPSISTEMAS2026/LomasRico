import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

/**
 * 🧾 LibreDTE Integration Service
 * 
 * Connects to LibreDTE's API to emit electronic tax documents (DTE).
 * Handles: Boletas (39), Facturas (33), Notas de Crédito (61)
 * 
 * Required env vars:
 * - LIBREDTE_API_URL:  Base URL (default: https://libredte.cl)
 * - LIBREDTE_API_KEY:  API key from LibreDTE dashboard
 * - RUT_EMISOR:        Company RUT (e.g., '76.123.456-7')
 * - RAZON_SOCIAL:      Company name
 * - GIRO_EMISOR:       Business activity
 * - DIRECCION_EMISOR:  Business address
 * - COMUNA_EMISOR:     Business comuna
 */

export interface DteResult {
    success: boolean;
    simulated: boolean;
    folio?: number;
    tipoDTE?: number;
    pdfUrl?: string;
    xmlUrl?: string;
    trackId?: string;
    siiStatus?: string;
    error?: string;
}

interface DteItem {
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    descuento?: number;
}

interface DteReceptor {
    rut: string;
    razonSocial?: string;
    giro?: string;
    direccion?: string;
    comuna?: string;
}

@Injectable()
export class LibreDteService {
    private readonly logger = new Logger('LibreDTE');

    // Config from env
    private readonly apiUrl: string;
    private readonly apiKey: string;
    private readonly rutEmisor: string;
    private readonly razonSocial: string;
    private readonly giro: string;
    private readonly direccion: string;
    private readonly comuna: string;
    private readonly isConfigured: boolean;

    constructor(private readonly prisma: PrismaService) {
        this.apiUrl = process.env.LIBREDTE_API_URL || 'https://libredte.cl';
        this.apiKey = process.env.LIBREDTE_API_KEY || '';
        this.rutEmisor = process.env.RUT_EMISOR || '';
        this.razonSocial = process.env.RAZON_SOCIAL || 'Lo Más Rico SpA';
        this.giro = process.env.GIRO_EMISOR || 'Venta de comida preparada';
        this.direccion = process.env.DIRECCION_EMISOR || 'Obispo Hipólito Salas 1205';
        this.comuna = process.env.COMUNA_EMISOR || 'Concepción';

        this.isConfigured = !!(this.apiKey && this.rutEmisor);

        if (this.isConfigured) {
            this.logger.log('🟢 LibreDTE configurado y activo');
            this.logger.log(`   Emisor: ${this.rutEmisor} — ${this.razonSocial}`);
        } else {
            this.logger.warn('🟡 LibreDTE en modo simulación (faltan credenciales)');
            if (!this.apiKey) this.logger.warn('   → Falta LIBREDTE_API_KEY');
            if (!this.rutEmisor) this.logger.warn('   → Falta RUT_EMISOR');
        }
    }

    // ─── Emit Boleta Electrónica (tipo 39) ──────────────────

    async emitBoleta(items: DteItem[], saleId?: string): Promise<DteResult> {
        return this.emitDTE(39, items, undefined, saleId);
    }

    // ─── Emit Factura Electrónica (tipo 33) ─────────────────

    async emitFactura(items: DteItem[], receptor: DteReceptor, saleId?: string): Promise<DteResult> {
        if (!receptor.rut || receptor.rut === '66666666-6') {
            throw new BadRequestException('Factura requiere RUT real del receptor');
        }
        return this.emitDTE(33, items, receptor, saleId);
    }

    // ─── Emit Nota de Crédito (tipo 61) ─────────────────────

    async emitNotaCredito(
        items: DteItem[],
        receptor: DteReceptor,
        referenciaFolio: number,
        referenciaTipoDTE: number,
        razon: string = 'Anulación',
        saleId?: string,
    ): Promise<DteResult> {
        return this.emitDTE(61, items, receptor, saleId, {
            folio: referenciaFolio,
            tipoDTE: referenciaTipoDTE,
            razon,
        });
    }

    // ─── Core DTE Emission ──────────────────────────────────

    private async emitDTE(
        tipoDTE: number,
        items: DteItem[],
        receptor?: DteReceptor,
        saleId?: string,
        referencia?: { folio: number; tipoDTE: number; razon: string },
    ): Promise<DteResult> {
        const isBoleta = tipoDTE === 39;
        const tipoLabel = tipoDTE === 39 ? 'Boleta' : tipoDTE === 33 ? 'Factura' : tipoDTE === 61 ? 'NC' : `DTE-${tipoDTE}`;

        this.logger.log(`📄 Emitiendo ${tipoLabel} — ${items.length} items${saleId ? ` (Sale: ${saleId})` : ''}`);

        // Build the LibreDTE JSON payload
        const payload = this.buildPayload(tipoDTE, items, receptor, referencia);

        // If not configured, simulate
        if (!this.isConfigured) {
            this.logger.warn(`   → Simulando ${tipoLabel} (modo local)`);
            const mockResult: DteResult = {
                success: true,
                simulated: true,
                folio: Math.floor(Math.random() * 100000),
                tipoDTE,
                pdfUrl: `https://mock.libredte.cl/pdf/${tipoDTE}/${Date.now()}`,
            };

            // Save to DB even in simulation
            if (saleId) {
                await this.saveDteRecord(saleId, mockResult, payload);
            }

            return mockResult;
        }

        // ─── Real API Call ──────────────────────────────────
        try {
            const url = isBoleta
                ? `${this.apiUrl}/api/dte/documentos/emitir`
                : `${this.apiUrl}/api/dte/documentos/emitir`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                this.logger.error(`❌ LibreDTE error (${response.status}):`, JSON.stringify(data));
                const result: DteResult = {
                    success: false,
                    simulated: false,
                    error: data.message || data.error || `HTTP ${response.status}`,
                };
                if (saleId) await this.saveDteRecord(saleId, result, payload);
                return result;
            }

            const result: DteResult = {
                success: true,
                simulated: false,
                folio: data.folio,
                tipoDTE: data.dte?.TipoDTE || tipoDTE,
                pdfUrl: data.links?.pdf || null,
                xmlUrl: data.links?.xml || null,
                trackId: data.track_id || null,
                siiStatus: data.estado_sii || 'ENVIADO',
            };

            this.logger.log(`   ✅ ${tipoLabel} #${result.folio} emitida — SII: ${result.siiStatus}`);

            if (saleId) {
                await this.saveDteRecord(saleId, result, payload);
            }

            return result;

        } catch (error: any) {
            this.logger.error(`💥 Error de red con LibreDTE: ${error.message}`);
            throw new InternalServerErrorException(`Error conectando con LibreDTE: ${error.message}`);
        }
    }

    // ─── Build LibreDTE JSON Payload ────────────────────────

    private buildPayload(
        tipoDTE: number,
        items: DteItem[],
        receptor?: DteReceptor,
        referencia?: { folio: number; tipoDTE: number; razon: string },
    ) {
        const isBoleta = tipoDTE === 39;
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        const mntTotal = items.reduce((sum, item) => {
            const subtotal = item.cantidad * item.precioUnitario;
            return sum + subtotal - (item.descuento || 0);
        }, 0);

        const payload: any = {
            Encabezado: {
                IdDoc: {
                    TipoDTE: tipoDTE,
                    Folio: 0, // 0 = LibreDTE autoasigna folio
                    FchEmis: today,
                },
                Emisor: {
                    RUTEmisor: this.rutEmisor,
                    RznSoc: this.razonSocial,
                    GiroEmis: this.giro,
                    DirOrigen: this.direccion,
                    CmnaOrigen: this.comuna,
                },
                Receptor: {
                    RUTRecep: receptor?.rut || '66666666-6',
                    RznSocRecep: receptor?.razonSocial || (isBoleta ? 'Consumidor Final' : 'Sin Razón Social'),
                    GiroRecep: receptor?.giro || (isBoleta ? 'Sin Giro' : ''),
                    DirRecep: receptor?.direccion || 'Concepción',
                    CmnaRecep: receptor?.comuna || 'Concepción',
                },
                Totales: {
                    MntTotal: Math.round(mntTotal),
                },
            },
            Detalle: items.map((item, idx) => ({
                NroLinDet: idx + 1,
                NmbItem: item.nombre,
                QtyItem: item.cantidad,
                PrcItem: Math.round(item.precioUnitario),
                MontoItem: Math.round(item.cantidad * item.precioUnitario - (item.descuento || 0)),
            })),
        };

        // Add reference for Nota de Crédito / Débito
        if (referencia) {
            payload.Referencia = [{
                NroLinRef: 1,
                TpoDocRef: referencia.tipoDTE,
                FolioRef: referencia.folio,
                FchRef: today,
                RazonRef: referencia.razon,
                CodRef: 1, // 1 = Anula documento
            }];
        }

        return payload;
    }

    // ─── Persist DTE record in DB ───────────────────────────

    private async saveDteRecord(saleId: string, result: DteResult, _payload: any) {
        try {
            // Append DTE reference to the sale note
            const dteRef = `[DTE ${result.tipoDTE} #${result.folio}${result.simulated ? ' (SIM)' : ''}]`;
            const sale = await this.prisma.sale.findUnique({ where: { id: saleId }, select: { note: true } });
            const newNote = sale?.note ? `${sale.note}\n${dteRef}` : dteRef;

            await this.prisma.sale.update({
                where: { id: saleId },
                data: { note: newNote },
            });

            this.logger.debug(`   💾 DTE record saved for Sale ${saleId}`);
        } catch (error: any) {
            this.logger.warn(`   ⚠️ Could not save DTE record: ${error.message}`);
        }
    }

    // ─── Emit from Sale (convenience method) ────────────────

    async emitFromSale(saleId: string, tipoDTE: number = 39, receptor?: DteReceptor): Promise<DteResult> {
        const sale = await this.prisma.sale.findUnique({
            where: { id: saleId },
            include: {
                items: {
                    include: {
                        sellingProduct: true,
                        productVariant: { include: { sellingProduct: true } },
                    },
                },
            },
        });

        if (!sale) throw new BadRequestException(`Sale ${saleId} not found`);

        const items: DteItem[] = sale.items.map((item: any) => ({
            nombre: item.sellingProduct?.name || item.productVariant?.sellingProduct?.name || item.productVariant?.name || 'Producto',
            cantidad: item.quantity,
            precioUnitario: Number(item.priceUnit),
        }));

        if (tipoDTE === 33 && receptor) {
            return this.emitFactura(items, receptor, saleId);
        }

        return this.emitBoleta(items, saleId);
    }

    // ─── Get PDF of emitted DTE ─────────────────────────────

    async getDtePdf(tipoDTE: number, folio: number): Promise<{ url: string } | null> {
        if (!this.isConfigured) {
            return { url: `https://mock.libredte.cl/pdf/${tipoDTE}/${folio}` };
        }

        try {
            const url = `${this.apiUrl}/api/dte/dte_emitidos/pdf/${tipoDTE}/${folio}/${this.rutEmisor}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` },
            });

            if (!response.ok) return null;

            // LibreDTE returns the PDF directly — we return the URL
            return { url };
        } catch {
            return null;
        }
    }

    // ─── Check DTE status in SII ────────────────────────────

    async checkSiiStatus(tipoDTE: number, folio: number): Promise<{ status: string; detail?: string }> {
        if (!this.isConfigured) {
            return { status: 'SIMULATED', detail: 'No credentials configured' };
        }

        try {
            const url = `${this.apiUrl}/api/dte/dte_emitidos/estado_sii/${tipoDTE}/${folio}/${this.rutEmisor}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) return { status: 'ERROR', detail: `HTTP ${response.status}` };

            const data = await response.json();
            return { status: data.estado || 'UNKNOWN', detail: data.glosa };
        } catch (error: any) {
            return { status: 'ERROR', detail: error.message };
        }
    }

    // ─── Service status ─────────────────────────────────────

    getStatus() {
        return {
            configured: this.isConfigured,
            apiUrl: this.apiUrl,
            rutEmisor: this.rutEmisor || '(not set)',
            razonSocial: this.razonSocial,
            hasApiKey: !!this.apiKey,
        };
    }
}
