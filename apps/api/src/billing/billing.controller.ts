import { Controller, Post, Body, Param } from '@nestjs/common';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
    constructor(private readonly billingService: BillingService) { }

    // Ejemplo de endpoint al que luego los Paneles/Caja pueden llamar para forzar emisión
    @Post(':saleId/generate')
    async forceDte(@Param('saleId') saleId: string, @Body() body: { documentType: number }) {
        // En un flujo real, aquí buscaríamos la 'Venta' (Sale) en la base de datos por el saleId
        // Por ahora simulamos que encontramos una venta
        const mockSaleData = {
            id: saleId,
            total: 15600,
            items: [
                { sellingProduct: { name: 'Ceviche Mixto' }, quantity: 1, unitPrice: 8500 },
                { sellingProduct: { name: 'Coca Cola 2L' }, quantity: 2, unitPrice: 3550 }
            ],
            customer: {
                rut: body.documentType === 33 ? '76.123.456-7' : null,
                businessName: 'Empresa Falsa SPA',
                businessGiro: 'Venta de Servicios',
                address: 'Arturo Prat 123'
            }
        };

        const result = await this.billingService.generateDTE(body.documentType, mockSaleData);
        return result;
    }
}
