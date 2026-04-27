import { Controller, Post, Get, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { LibreDteService } from './libre-dte.service';
import { EmitDteDto } from './dto/emit-dte.dto';

@Controller('billing')
export class BillingController {
    constructor(private readonly libreDte: LibreDteService) {}

    /**
     * POST /billing/emit
     * Generic DTE emission endpoint.
     * tipoDTE: 39 (Boleta), 33 (Factura), 61 (NC)
     */
    @Post('emit')
    @HttpCode(HttpStatus.OK)
    async emitDTE(@Body() dto: EmitDteDto) {
        const items = dto.items.map(i => ({
            nombre: i.nombre,
            cantidad: i.cantidad,
            precioUnitario: i.precioUnitario,
            descuento: i.descuento,
        }));

        if (dto.tipoDTE === 33 && dto.receptor) {
            return this.libreDte.emitFactura(items, dto.receptor, dto.saleId);
        }

        if (dto.tipoDTE === 61 && dto.referenciaFolio && dto.referenciaTipoDTE && dto.receptor) {
            return this.libreDte.emitNotaCredito(
                items,
                dto.receptor,
                dto.referenciaFolio,
                dto.referenciaTipoDTE,
                dto.referenciaRazon || 'Anulación',
                dto.saleId,
            );
        }

        return this.libreDte.emitBoleta(items, dto.saleId);
    }

    /**
     * POST /billing/sale/:saleId/boleta
     * Emit boleta from an existing Sale record.
     */
    @Post('sale/:saleId/boleta')
    @HttpCode(HttpStatus.OK)
    async emitBoletaFromSale(@Param('saleId') saleId: string) {
        return this.libreDte.emitFromSale(saleId, 39);
    }

    /**
     * POST /billing/sale/:saleId/factura
     * Emit factura from an existing Sale record.
     */
    @Post('sale/:saleId/factura')
    @HttpCode(HttpStatus.OK)
    async emitFacturaFromSale(
        @Param('saleId') saleId: string,
        @Body() body: { rut: string; razonSocial: string; giro?: string; direccion?: string; comuna?: string },
    ) {
        return this.libreDte.emitFromSale(saleId, 33, {
            rut: body.rut,
            razonSocial: body.razonSocial,
            giro: body.giro,
            direccion: body.direccion,
            comuna: body.comuna,
        });
    }

    /**
     * GET /billing/pdf/:tipoDTE/:folio
     * Get PDF URL for an emitted DTE.
     */
    @Get('pdf/:tipoDTE/:folio')
    async getDtePdf(
        @Param('tipoDTE') tipoDTE: string,
        @Param('folio') folio: string,
    ) {
        const result = await this.libreDte.getDtePdf(parseInt(tipoDTE), parseInt(folio));
        if (!result) return { error: 'PDF not found' };
        return result;
    }

    /**
     * GET /billing/status/:tipoDTE/:folio
     * Check SII status for an emitted DTE.
     */
    @Get('sii-status/:tipoDTE/:folio')
    async checkSiiStatus(
        @Param('tipoDTE') tipoDTE: string,
        @Param('folio') folio: string,
    ) {
        return this.libreDte.checkSiiStatus(parseInt(tipoDTE), parseInt(folio));
    }

    /**
     * GET /billing/health
     * Check if LibreDTE is properly configured.
     */
    @Get('health')
    getHealth() {
        return this.libreDte.getStatus();
    }
}
