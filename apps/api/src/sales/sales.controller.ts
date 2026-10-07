import { Controller, Post, Get, Body, Param, Req, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ValidateSaleItemDto } from './dto/validate-item.dto';
import { CASH_ROLES, KITCHEN_ROLES, MANAGER_ROLES, Public } from '../auth/access';
import { Roles } from '../auth/roles.decorator';
import { isWebOrdersEnabled, storeStatus } from '../config/flags';
import { AuditService } from '../audit/audit.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function webContact(raw: any) {
    const name = String(raw?.name || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    const phone = String(raw?.phone || '').replace(/[^\d+]/g, '');
    const email = String(raw?.email || '').trim().toLowerCase().slice(0, 120);
    if (name.length < 2) throw new BadRequestException('Ingresa tu nombre');
    if (phone.replace(/\D/g, '').length < 8) throw new BadRequestException('Ingresa un teléfono válido');
    if (!EMAIL_RE.test(email)) throw new BadRequestException('Ingresa un correo válido');
    return { name, phone, email, marketing: raw?.marketing === true };
}

@Controller('sales')
export class SalesController {
    constructor(private readonly salesService: SalesService, private readonly audit: AuditService) { }

    /**
     * Abierto para el checkout web. Solo caja (con sesión) puede crear ventas POS,
     * fijar estado, turno, descuentos o asignar el cliente.
     */
    @Public()
    @Post()
    async create(@Body() createSaleDto: CreateSaleDto, @Req() req: any) {
        const user = req.user;
        if (user && CASH_ROLES.includes(user.role)) {
            const shipping = (createSaleDto as any).shippingData;
            if (shipping?.contact) {
                const name = String(shipping.contact.name || '').trim().replace(/\s+/g, ' ').slice(0, 80);
                const phone = String(shipping.contact.phone || '').replace(/[^\d+]/g, '').slice(0, 16);
                if (name || phone) shipping.contact = { name, phone };
                else delete shipping.contact;
            }
            const sale: any = await this.salesService.create(createSaleDto);
            if (Number(sale?.discount) > 0) {
                await this.audit.log({
                    action: 'DISCOUNT',
                    actorId: user.userId,
                    saleId: sale.id,
                    saleCode: sale.code,
                    amount: Number(sale.discount),
                    reason: (createSaleDto as any).discountReason || null,
                    details: { discountType: sale.discountType, total: Number(sale.total) },
                });
            }
            return sale;
        }
        if (!isWebOrdersEnabled()) {
            throw new ForbiddenException('Los pedidos web aún no están disponibles');
        }
        const hours = storeStatus();
        if (!hours.open) {
            throw new ForbiddenException(`Estamos cerrados. Recibimos pedidos de ${hours.opensAt} a ${hours.closesAt}`);
        }
        const body = createSaleDto as any;
        const contact = webContact(body.contact);
        const address = String(body.shippingData?.address || '').trim().slice(0, 200);
        const note = String(body.note || '').trim().slice(0, 200);
        return this.salesService.create({
            channel: 'WEB',
            items: body.items,
            pointsToRedeem: user?.role === 'CUSTOMER' ? body.pointsToRedeem : undefined,
            userId: user?.role === 'CUSTOMER' ? user.userId : undefined,
            fulfillmentType: address ? 'DELIVERY' : 'TAKEAWAY',
            shippingData: address
                ? { address, coordinates: body.shippingData?.coordinates, contact }
                : { contact },
            note: [
                `Cliente: ${contact.name} · ${contact.phone}`,
                address ? `Despacho: ${address}` : 'Retiro en local',
                note,
            ].filter(Boolean).join('\n'),
        } as any);
    }

    @Roles(...MANAGER_ROLES)
    @Get()
    findAll() {
        return this.salesService.findAll();
    }

    @Public()
    @Post('validate-item')
    validateItem(@Body() validateDto: ValidateSaleItemDto) {
        return this.salesService.validateItem(validateDto);
    }

    @Roles(...CASH_ROLES)
    @Post(':id/status')
    updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
        return this.salesService.updateStatus(id, body.status);
    }

    /** Quitar productos cobrados de más: cualquier persona del local lo pide, autoriza caja/admin con PIN. */
    @Roles(...KITCHEN_ROLES)
    @Post(':id/void-items')
    async voidItems(
        @Param('id') id: string,
        @Body() body: { items: { saleItemId: string; quantity: number }[]; approvalPin?: string; reason?: string },
        @Req() req: any,
    ) {
        const { approver, reason } = await this.audit.authorize(req, body?.approvalPin, body?.reason);
        return this.salesService.voidItems(id, body?.items, { actorId: req.user?.userId, approver, reason });
    }
}
