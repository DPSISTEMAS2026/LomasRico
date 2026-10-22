import { Injectable, BadRequestException, ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import type { VoidApproval } from '../kitchen/kitchen.service';
import { isInventoryEnforced } from '../config/flags';
import { PrismaService } from '../database/prisma.service';
import { RecipeResolverService } from '../recipe-engineering/recipe-resolver.service';
import { InventoryService } from '../inventory/inventory.service';
import { ShippingService } from '../shipping/shipping.service';
import { AvailabilityService } from '../availability/availability.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ValidateSaleItemDto } from './dto/validate-item.dto';
import { modifierExtrasByItem, validQuantity } from '../common/modifier-pricing';
import { TuuTerminalService, cardTerminalEnabled } from '../payments/tuu-terminal.service';
import { findOpenCashierShift } from '../shifts/shift-routing';

// USAMOS ENUMS COMO STRINGS PARA EVITAR ERRORES DE REGENERACION
const OrderStatus = {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    PREPARING: 'PREPARING',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED'
};

const OrderChannel = {
    WEB: 'WEB',
    POS: 'POS',
    WHATSAPP: 'WHATSAPP',
    UBER_EATS: 'UBER_EATS',
    PEDIDOS_YA: 'PEDIDOS_YA'
};

@Injectable()
export class SalesService {
    private readonly logger = new Logger(SalesService.name);

    constructor(
        private prisma: PrismaService,
        private recipeResolver: RecipeResolverService,
        private inventoryService: InventoryService,
        private shippingService: ShippingService, // Injected for server-side validation
        private availabilityService: AvailabilityService,
        private audit: AuditService,
        private terminal: TuuTerminalService,
    ) { }

    async validateItem(dto: ValidateSaleItemDto) {
        const variant = await this.prisma.productVariant.findUnique({
            where: { id: dto.productVariantId }
        });

        if (!variant) {
            throw new BadRequestException('Invalid ProductVariant ID');
        }

        try {
            const bom = await this.recipeResolver.resolveBom(
                dto.productVariantId,
                dto.modifiers || {},
                false // empanadas necesitan descontar como unidad, no expandir
            );

            return {
                valid: true,
                productName: variant.name,
                estimatedBom: bom.map(b => ({ name: b.name, qty: b.quantity, unit: b.unit }))
            };

        } catch (error: any) {
            if (error instanceof BadRequestException || error instanceof ConflictException) {
                throw error;
            }
            throw new BadRequestException(error.message || 'Validation failed');
        }
    }

    // ✅ Protección anti doble-click: fingerprints recientes (10s window)
    private recentSaleFingerprints = new Map<string, number>();

    private getSaleFingerprint(dto: any): string {
        const key = `${dto.channel}|${dto.userId || 'anon'}|${JSON.stringify((dto.items || []).map((i: any) => `${i.sellingProductId || i.productVariantId}x${i.quantity}`).sort())}`;
        // Simple hash
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            hash = ((hash << 5) - hash) + key.charCodeAt(i);
            hash |= 0;
        }
        return String(hash);
    }

    async create(createSaleDto: CreateSaleDto) {
        // Anti doble-click: rechazar si el mismo pedido se envió hace menos de 10 segundos
        const fingerprint = this.getSaleFingerprint(createSaleDto);
        const now = Date.now();
        const lastSeen = this.recentSaleFingerprints.get(fingerprint);
        if (lastSeen && (now - lastSeen) < 10_000) {
            throw new ConflictException('Pedido duplicado detectado. Espera unos segundos antes de intentar de nuevo.');
        }
        this.recentSaleFingerprints.set(fingerprint, now);
        // Limpiar fingerprints viejos cada 100 ventas
        if (this.recentSaleFingerprints.size > 100) {
            for (const [fp, ts] of this.recentSaleFingerprints.entries()) {
                if (now - ts > 30_000) this.recentSaleFingerprints.delete(fp);
            }
        }

        const {
            channel,
            items,
            userId,
            shippingData,
            status: manualStatus,
            paymentMethod,
            shiftId,
            fulfillmentType,
            tableId,
            sendToKitchen,
        } = createSaleDto as any;

        // Determine initial status based on payment method
        let initialStatus = manualStatus;
        if (channel === 'POS') {
            // La caja registra la venta después de cobrar (Point, efectivo, transferencia o alimentación).
            initialStatus = OrderStatus.CONFIRMED;
        } else if (channel === 'WEB' && !initialStatus) {
            initialStatus = OrderStatus.PENDING;
        }

        // Separate items by type
        const itemsWithProductId: any[] = [];
        const itemsWithVariantId: any[] = [];

        if (!Array.isArray(items) || items.length === 0) {
            throw new BadRequestException('El pedido no tiene productos');
        }
        for (const item of items) {
            item.quantity = validQuantity(item.quantity);
            if (item.sellingProductId) {
                itemsWithProductId.push(item);
            } else if (item.productVariantId) {
                itemsWithVariantId.push(item);
            } else {
                throw new BadRequestException('Each item must have either sellingProductId or productVariantId');
            }
        }

        // Fetch products if needed
        let products: any[] = [];
        if (itemsWithProductId.length > 0) {
            const productIds = itemsWithProductId.map(i => i.sellingProductId);
            const uniqueProductIds = [...new Set(productIds)];
            products = await this.prisma.sellingProduct.findMany({
                where: { id: { in: uniqueProductIds } },
                include: { recipe: true }
            });

            if (products.length !== uniqueProductIds.length) {
                const foundIds = products.map((p: any) => p.id);
                const missingIds = uniqueProductIds.filter((id: string) => !foundIds.includes(id));
                throw new BadRequestException(
                    `One or more SellingProduct IDs are invalid. Missing: ${missingIds.join(', ')}`
                );
            }
        }

        // Fetch variants if needed
        let variants: any[] = [];
        if (itemsWithVariantId.length > 0) {
            const variantIds = itemsWithVariantId.map(i => i.productVariantId);
            const uniqueVariantIds = [...new Set(variantIds)];
            variants = await this.prisma.productVariant.findMany({
                where: { id: { in: uniqueVariantIds } },
            });

            if (variants.length !== uniqueVariantIds.length) {
                throw new BadRequestException('One or more ProductVariant IDs are invalid');
            }
        }

        if (channel === 'WEB') {
            const unavailable = products.find((p: any) => !p.isActive) || variants.find((v: any) => !v.isActive);
            if (unavailable) throw new BadRequestException(`${unavailable.name} ya no está disponible. Quítalo del carrito.`);
            const staffOnly = products.find((p: any) => p.showOnWeb === false);
            if (staffOnly) throw new BadRequestException(`${staffOnly.name} solo se cobra en caja.`);
        }

        const productMap = new Map(products.map((p: any) => [p.id, p]));
        const variantMap = new Map(variants.map((v: any) => [v.id, v]));
        const extrasByItem = await modifierExtrasByItem(this.prisma, items);

        const totalRequirements = new Map<string, number>();
        const processedItems: any[] = [];
        let totalAmount = 0;

        // Process all items
        for (const itemDto of items) {
            let price: number;
            let productId: string | null = null;
            let variantId: string | null = null;
            let bomIdentifier: string;
            let product: any = null; // ✅ Definir fuera del if

            if (itemDto.sellingProductId) {
                product = productMap.get(itemDto.sellingProductId);
                if (!product) {
                    throw new BadRequestException(`Product not found: ${itemDto.sellingProductId}`);
                }
                price = Number(product.price);
                productId = product.id;
                bomIdentifier = product.id;
            } else {
                const variant = variantMap.get(itemDto.productVariantId);
                if (!variant) {
                    throw new BadRequestException(`Variant not found: ${itemDto.productVariantId}`);
                }
                price = Number(variant.price);
                variantId = variant.id;
                bomIdentifier = variant.id;
            }

            // ✅ Los modifiers (selectedProteins, removedIngredients) usan IDs semánticos
            // definidos en shared-types (ej: 'salmon', 'atun'), no UUIDs de InventoryItem.
            // La validación real ocurre en RecipeResolver.resolveBom().
            if (itemDto.modifiers) {
                const { selectedProteins } = itemDto.modifiers;

                // Solo validar el límite de proteínas si el producto es configurable
                if (selectedProteins && selectedProteins.length > 0) {
                    if (product && product.isConfigurable && product.maxProteins) {
                        if (selectedProteins.length > product.maxProteins) {
                            throw new BadRequestException(
                                `Máximo ${product.maxProteins} proteínas permitidas. ` +
                                `Seleccionadas: ${selectedProteins.length}`
                            );
                        }
                    }
                }
            }

            // Resolve BOM
            const bom = await this.recipeResolver.resolveBom(
                bomIdentifier,
                itemDto.modifiers || {},
                false // empanadas necesitan descontar como unidad, no expandir
            );

            // ---- CÁLCULO DE COSTO REAL (CONGELADO EN VENTA) ----
            // Fetching costPerUnit for each BOM item from InventoryItem table
            const costBreakdown = { proteinas: 0, base: 0, verduras: 0, otros: 0 };
            let costSnapshot = 0;

            const enrichedBom = await Promise.all(
                bom.map(async (bomItem) => {
                    const invItem = await this.prisma.inventoryItem.findUnique({
                        where: { id: bomItem.inventoryItemId },
                        select: { costPerUnit: true, role: true }
                    });

                    const costPerUnit = Number(invItem?.costPerUnit || 0);
                    // Normalize quantity to base unit (KG or LT)
                    let qty = bomItem.quantity;
                    if (bomItem.unit === 'G' || bomItem.unit === 'ML') qty /= 1000;

                    const subtotal = qty * costPerUnit;
                    costSnapshot += subtotal;

                    // Breakdown by role
                    const role = invItem?.role || 'BASE';
                    if (role === 'PROTEIN_MAIN' || role === 'PROTEIN_SPECIAL') {
                        costBreakdown.proteinas += subtotal;
                    } else if (role === 'BASE') {
                        costBreakdown.base += subtotal;
                    } else if (role === 'VEGGIE') {
                        costBreakdown.verduras += subtotal;
                    } else {
                        costBreakdown.otros += subtotal;
                    }

                    return {
                        ...bomItem,
                        costPerUnit,
                        subtotal: Math.round(subtotal * 100) / 100,
                    };
                })
            );

            costSnapshot = Math.round(costSnapshot * 100) / 100;
            // -------------------------------------------------------

            // Accumulate inventory requirements (with unit conversion)
            for (const bomItem of bom) {
                let qty = bomItem.quantity * itemDto.quantity;

                // ✅ CONVERSIÓN DE UNIDADES: BOM puede devolver en 'g' pero inventario está en 'KG'
                // Si el BOM dice gramos y el inventario está en KG, convertir
                if (bomItem.unit === 'g') {
                    // Buscar la unidad real del inventario
                    const invItem = await this.prisma.inventoryItem.findUnique({
                        where: { id: bomItem.inventoryItemId },
                        select: { unit: true }
                    });
                    if (invItem && invItem.unit === 'KG') {
                        qty = qty / 1000; // g → KG
                    }
                }

                const currentReq = totalRequirements.get(bomItem.inventoryItemId) || 0;
                totalRequirements.set(bomItem.inventoryItemId, currentReq + qty);
            }

            price += extrasByItem[items.indexOf(itemDto)];

            processedItems.push({
                productId,
                variantId,
                quantity: itemDto.quantity,
                priceUnit: price,
                modifiers: itemDto.modifiers,
                bomSnapshot: enrichedBom,
                costSnapshot,
                costBreakdown,
            });

            totalAmount += price * itemDto.quantity;
        }

        // ✅ ENFORCE SERVER-SIDE SHIPPING CALCULATION
        let computedShippingCost = 0;
        let confirmedEstimationId = shippingData?.estimateId;

        if (shippingData && shippingData.address && channel === 'WEB') {
            try {
                // Recalculate quote to prevent frontend cost manipulation
                const quote = await (this as any).shippingService.calculateQuote({
                    address: shippingData.address,
                    channel: channel,
                    coordinates: shippingData.coordinates
                }); // Need to inject ShippingService if not present

                if (!quote.valid) {
                    throw new BadRequestException(quote.reason || 'Dirección fuera de rango');
                }

                // Use the cost from Server, ignore client 'cost'
                computedShippingCost = Number(quote.cost);
                confirmedEstimationId = quote.estimateId; // Update estimate ID if fresh quote

                // Update shippingData with trusted values
                shippingData.cost = computedShippingCost;
                shippingData.estimateId = confirmedEstimationId;

            } catch (error) {
                if (error instanceof BadRequestException) throw error;
                // Allow POS to override freely, but WEB must be strict
                if (channel === 'WEB') {
                    throw new BadRequestException('Error calculando despacho. Verifique su dirección.');
                }
            }
        } else if (shippingData?.cost && channel !== 'WEB') {
            // For POS or simple manual entry, we trust the input for now
            computedShippingCost = Number(shippingData.cost);
        }

        // --- APPLY DISCOUNT (solo sobre subtotal de productos, NO sobre envío) ---
        const { discount, discountType } = createSaleDto as any;
        let discountValue = 0;
        if (discount && discount > 0) {
            if (discountType === 'PERCENT') {
                discountValue = Math.round(totalAmount * (Math.min(discount, 100) / 100));
            } else {
                discountValue = Math.round(discount);
            }
            totalAmount = Math.max(0, totalAmount - discountValue);
        }

        // --- LOYALTY POINTS REDEMPTION (1 punto = $1 CLP) ---
        const subtotalBeforePoints = totalAmount; // Guardamos para calcular puntos ganados
        const { pointsToRedeem } = createSaleDto as any;
        let pointsRedeemed = 0;
        // En POS el userId puede ser el cajero: los puntos son solo de clientes.
        const customer = userId
            ? await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, loyaltyPoints: true } })
            : null;
        const loyaltyUserId = customer?.role === 'CUSTOMER' ? userId : undefined;
        if (pointsToRedeem && pointsToRedeem > 0 && loyaltyUserId) {
            if (customer && (customer as any).loyaltyPoints >= pointsToRedeem) {
                pointsRedeemed = Math.min(pointsToRedeem, totalAmount); // No puede exceder el total
                totalAmount = Math.max(0, totalAmount - pointsRedeemed);
            }
        }

        // Propina de caja: sobre el consumo (sin despacho). Como en salón, no es venta: va fuera del total y de la caja.
        const posOperator = channel === 'POS' ? (createSaleDto as any).operator as { id: string } | undefined : undefined;
        const tipPercent = posOperator ? Math.max(0, Math.min(30, Math.round(Number((createSaleDto as any).tipPercent) || 0))) : 0;
        const tipAmount = tipPercent > 0
            ? Math.round(totalAmount * tipPercent / 100)
            : (posOperator ? Math.max(0, Math.round(Number((createSaleDto as any).tipAmount) || 0)) : 0);
        let tipMeta: Record<string, unknown> | undefined;
        if (tipAmount > 0 && posOperator) {
            const waiter = await this.prisma.user.findUnique({ where: { id: posOperator.id }, select: { name: true } });
            tipMeta = {
                amount: tipAmount,
                percent: tipPercent || null,
                waiterId: posOperator.id,
                waiterName: waiter?.name || null,
            };
        }

        // Sumar envío DESPUÉS del descuento y puntos para no descontar sobre el despacho
        totalAmount += computedShippingCost;

        // RemotePayment Haulmer solo tarjeta (1/2). Efectivo/transferencia: boleta en app Pago de la TUU, sin este cobro remoto.
        const needsTerminal = channel === 'POS'
            && cardTerminalEnabled()
            && (paymentMethod === 'DEBIT' || paymentMethod === 'CREDIT');
        const terminalPayment = needsTerminal
            ? await this.terminal.assertPaid((createSaleDto as any).terminalPaymentKey, totalAmount + tipAmount)
            : null;
        const savedMethod = terminalPayment?.method || paymentMethod;
        const saleShipping = terminalPayment || tipMeta
            ? { ...(shippingData || {}), ...(terminalPayment ? { terminalPayment } : {}), ...(tipMeta ? { tip: tipMeta } : {}) }
            : shippingData;

        // Transaction (timeout extendido para pedidos con modificadores dinámicos)
        return this.prisma.$transaction(async (tx: any) => {
            let finalShiftId = shiftId;
            const operator = (createSaleDto as any).operator as { id: string; role: string } | undefined;
            const operatorIsManager = operator && (operator.role === 'OWNER' || operator.role === 'ADMIN');
            if (channel === 'POS' && operator) {
                if (finalShiftId) {
                    const shift = await tx.cashShift.findUnique({ where: { id: finalShiftId }, select: { status: true, cashierId: true } });
                    if (!shift || shift.status !== 'OPEN') throw new BadRequestException('El turno de caja está cerrado. Recarga la página.');
                    if (!operatorIsManager && shift.cashierId !== operator.id) throw new BadRequestException('Este turno es de otro cajero');
                } else if (!operatorIsManager) {
                    throw new BadRequestException('Abre la caja antes de cobrar');
                }
            }
            const shiftOwnerId = operator?.id || userId;

            // Si es POS y no hay shiftId, verificar si es DUEÑO para auto-gestionar el turno
            if (channel === 'POS' && !finalShiftId && shiftOwnerId) {
                const user = await tx.user.findUnique({ where: { id: shiftOwnerId } });
                if (user && (user.role === 'OWNER' || user.role === 'ADMIN')) {
                    // Buscar turno abierto del dueño o crear uno permanente
                    let ownerShift = await tx.cashShift.findFirst({
                        where: { cashierId: shiftOwnerId, status: 'OPEN' }
                    });

                    if (!ownerShift) {
                        // Crear turno automático si no hay uno
                        const cashRegister = await tx.cashRegister.findFirst({ where: { name: 'Caja Principal' } });
                        ownerShift = await tx.cashShift.create({
                            data: {
                                cashierId: shiftOwnerId,
                                cashRegisterId: cashRegister?.id || 'default',
                                status: 'OPEN',
                                startAmount: 0,
                                openingTime: new Date(),
                                note: `Gestión panel ${user.role} — ventas propias (descuentos/admin)`,
                            }
                        });
                    }
                    finalShiftId = ownerShift.id;
                }
            }

            // WEB/apps cobrados → turno CAJERA. Carritos PENDING no se cuelgan al turno.
            const saleStartsPaid = (initialStatus || 'CONFIRMED') === 'CONFIRMED';
            if (!finalShiftId && channel !== 'POS' && saleStartsPaid) {
                const cashierShift = await findOpenCashierShift(tx);
                if (cashierShift) finalShiftId = cashierShift.id;
            }

            // Generar código único secuencial (con retry para race conditions)
            let uniqueCode = '';
            for (let attempt = 0; attempt < 5; attempt++) {
                const lastSale = await tx.sale.findFirst({
                    orderBy: { createdAt: 'desc' },
                    select: { code: true }
                });

                let nextNumber = 1;
                if (lastSale && lastSale.code) {
                    const match = lastSale.code.match(/\d+/);
                    if (match) {
                        nextNumber = parseInt(match[0]) + 1 + attempt;
                    }
                }

                uniqueCode = `#${nextNumber.toString().padStart(4, '0')}`;
                // Verificar que no exista
                const exists = await tx.sale.findUnique({ where: { code: uniqueCode } });
                if (!exists) break;
            }

            const sale = await tx.sale.create({
                data: {
                    total: totalAmount,
                    channel: channel,
                    status: initialStatus || 'CONFIRMED',
                    userId: userId || undefined,
                    shippingData: loyaltyUserId && (initialStatus || 'CONFIRMED') === 'PENDING'
                        ? { ...(saleShipping || {}), loyalty: { redeem: pointsRedeemed, earn: Math.floor(subtotalBeforePoints * 0.04), spent: subtotalBeforePoints } }
                        : saleShipping || undefined,
                    code: uniqueCode,
                    paymentMethod: (savedMethod === 'MP' ? 'MERCADO_PAGO' : savedMethod) as any,
                    paymentStatus: initialStatus === 'CONFIRMED' ? 'APPROVED' : 'PENDING',
                    shiftId: finalShiftId || undefined,
                    discount: discountValue,
                    discountType: discountType || 'FIXED',
                    discountReason: (createSaleDto as any).discountReason || 'POS Discount',
                    note: (createSaleDto as any).note,
                    fulfillmentType: fulfillmentType || (channel === 'WEB' && shippingData ? 'DELIVERY' : 'TAKEAWAY'),
                    tableId: tableId || undefined,
                }
            });

            const createdItemIds: string[] = [];
            for (const pItem of processedItems) {
                const saleItem = await tx.saleItem.create({
                    data: {
                        saleId: sale.id,
                        sellingProductId: pItem.productId || undefined,
                        productVariantId: pItem.variantId || undefined,
                        quantity: pItem.quantity,
                        priceUnit: pItem.priceUnit,
                        modifiers: pItem.modifiers !== undefined ? pItem.modifiers : undefined,
                    }
                });
                createdItemIds.push(saleItem.id);

                await tx.recipeSnapshot.create({
                    data: {
                        saleItemId: saleItem.id,
                        resolvedBoM: JSON.parse(JSON.stringify(pItem.bomSnapshot)),
                        costSnapshot: pItem.costSnapshot || 0,
                        priceSnapshot: Number(pItem.priceUnit) || 0,
                        costBreakdown: pItem.costBreakdown || {},
                    }
                });
            }

            // ✅ Solo descontar inventario y crear ticket si la venta no está PENDING
            // Las ventas WEB empiezan en PENDING hasta que MercadoPago aprueba el pago
            const isPending = (initialStatus || OrderStatus.CONFIRMED) === 'PENDING';

            if (!isPending) {
                // ✅ LOCK + VERIFY: Usa SELECT FOR UPDATE para prevenir race conditions
                // Si POS y Web intentan comprar el último producto, solo la primera pasa.
                const itemIds = [...totalRequirements.keys()];
                
                // Canales externos ya fueron aceptados por la plataforma → solo alertar, no bloquear
                const isExternalChannel = channel === 'UBER_EATS' || channel === 'PEDIDOS_YA';

                if (isInventoryEnforced() && itemIds.length > 0) {
                    // Lock rows — la segunda transacción esperará hasta que la primera haga commit
                    const lockedItems: any[] = await tx.$queryRawUnsafe(
                        `SELECT id, name, "currentStock" FROM "InventoryItem" WHERE id IN (${itemIds.map((_: any, i: number) => `$${i + 1}`).join(',')}) FOR UPDATE`,
                        ...itemIds
                    );

                    // Verificar stock con los datos lockeados
                    for (const lockedItem of lockedItems) {
                        const requiredQty = totalRequirements.get(lockedItem.id) || 0;
                        if (Number(lockedItem.currentStock) < requiredQty) {
                            if (isExternalChannel) {
                                // ⚠️ Órdenes externas: alertar pero NO bloquear (ya fueron aceptadas en la app)
                                this.logger.warn(
                                    `⚠️ [${channel}] Stock insuficiente para "${lockedItem.name}" ` +
                                    `(Disponible: ${Number(lockedItem.currentStock).toFixed(2)}, Requerido: ${requiredQty.toFixed(2)}) ` +
                                    `— Pedido ingresado de igual forma`
                                );
                            } else {
                                // 🔴 POS/WEB: bloquear — el operador puede resolver en el momento
                                throw new BadRequestException(
                                    `Stock insuficiente para "${lockedItem.name}". Disponible: ${Number(lockedItem.currentStock).toFixed(2)}, Requerido: ${requiredQty.toFixed(2)}`
                                );
                            }
                        }
                    }

                    // Deduct inventory (safe — rows are locked)
                    for (const [itemId, qty] of totalRequirements.entries()) {
                        await tx.inventoryItem.update({
                            where: { id: itemId },
                            data: {
                                currentStock: { decrement: qty },
                                movements: {
                                    create: {
                                        quantity: -qty,
                                        reason: 'SALE',
                                        referenceId: sale.id
                                    }
                                }
                            }
                        });
                    }

                    this.availabilityService.invalidateCache();
                } else if (!isInventoryEnforced()) {
                    this.logger.warn('Inventario en pausa — no se bloquea ni se descuenta stock');
                }

                // ✅ REGISTRAR EN FLUJO DE CAJA — TODOS LOS CANALES con turno activo
                if (finalShiftId) {
                    const channelLabel = channel === 'POS' ? 'POS' 
                        : channel === 'UBER_EATS' ? 'Uber Eats'
                        : channel === 'PEDIDOS_YA' ? 'PedidosYa'
                        : channel === 'WEB' ? 'Web'
                        : channel === 'WHATSAPP' ? 'WhatsApp'
                        : channel;
                    await tx.cashTransaction.create({
                        data: {
                            shiftId: finalShiftId,
                            type: 'SALE_INCOME',
                            amount: totalAmount,
                            description: `Venta ${channelLabel} ${uniqueCode} (${savedMethod})`,
                            relatedSaleId: sale.id
                        }
                    });
                }
            }

            // Solo crear ticket de cocina si la venta está confirmada (no PENDING de pago)
            // Para ventas WEB con MP, el ticket se crea en handleApprovedOrder al confirmar el pago
            const shouldSendKitchen = sendToKitchen !== false && !isPending;
            if (shouldSendKitchen) {
                const isTable = fulfillmentType === 'DINE_IN';
                const kitchenLabel = channel === 'WEB'
                    ? 'WEB'
                    : channel === 'UBER_EATS'
                        ? 'UBER'
                        : channel === 'PEDIDOS_YA'
                            ? 'PEDIDOS YA'
                            : (isTable ? 'MESA' : 'RETIRO');
                await tx.kitchenTicket.create({
                    data: {
                        saleId: sale.id,
                        status: isTable ? 'PREPARING' : 'WAITING',
                        batchNumber: 1,
                        label: kitchenLabel,
                        itemIds: createdItemIds,
                    }
                });
                await tx.saleItem.updateMany({
                    where: { id: { in: createdItemIds } },
                    data: { sentToKitchenAt: new Date() },
                });
            }

            // === LOYALTY POINTS ENGINE ===
            // Pendientes de pago: los puntos se aplican al aprobarse (PaymentsService) según shippingData.loyalty.
            if (loyaltyUserId && !isPending) {
                // 1) Descontar puntos redimidos
                if (pointsRedeemed > 0) {
                    await tx.user.update({
                        where: { id: loyaltyUserId },
                        data: {
                            loyaltyPoints: { decrement: pointsRedeemed },
                            pointsUsed: { increment: pointsRedeemed }
                        }
                    });
                }

                // 2) Acreditar 4% de puntos sobre subtotal de productos
                const pointsToCredit = Math.floor(subtotalBeforePoints * 0.04);
                if (pointsToCredit > 0) {
                    await tx.user.update({
                        where: { id: loyaltyUserId },
                        data: {
                            loyaltyPoints: { increment: pointsToCredit },
                            pointsEarned: { increment: pointsToCredit },
                            historicalOrders: { increment: 1 },
                            historicalSpent: { increment: subtotalBeforePoints }
                        }
                    });
                }
            }

            // Invalidar cache de disponibilidad después de descontar inventario
            if (!isPending) {
                this.availabilityService.invalidateCache();
            }

            return sale;
        }, { maxWait: 10000, timeout: 30000 });
    }

    async findAll() {
        return (this.prisma as any).sale.findMany({
            include: {
                items: {
                    include: {
                        sellingProduct: { select: { id: true, name: true, category: true } },
                        productVariant: { select: { id: true, name: true } },
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
    }

    async updateStatus(id: string, status: string) {
        if (status === OrderStatus.CANCELLED) {
            throw new BadRequestException('Para anular usa "Anular pedido" (pide PIN y queda registrado)');
        }
        if (!Object.values(OrderStatus).includes(status)) throw new BadRequestException('Estado inválido');
        return (this.prisma as any).sale.update({
            where: { id },
            data: { status }
        });
    }

    /**
     * Quita productos (o parte de su cantidad) de una cuenta abierta o de una venta ya cobrada.
     * Si ya estaba cobrada, deja la devolución en la caja. Quitar todo se hace con "Anular pedido".
     */
    async voidItems(saleId: string, lines: { saleItemId: string; quantity: number }[], approval: VoidApproval) {
        if (!Array.isArray(lines) || !lines.length) throw new BadRequestException('Indica qué productos quitar');
        const sale = await (this.prisma as any).sale.findUnique({
            where: { id: saleId },
            include: { items: { include: { sellingProduct: { select: { name: true } } } } },
        });
        if (!sale) throw new NotFoundException('Venta no encontrada');
        if (sale.status === OrderStatus.CANCELLED) throw new BadRequestException('La venta está anulada');

        const seen = new Set<string>();
        const removals = lines.map((line) => {
            const item = sale.items.find((i: any) => i.id === line?.saleItemId);
            if (!item || seen.has(item.id)) throw new BadRequestException('Producto inválido');
            seen.add(item.id);
            const quantity = validQuantity(line.quantity);
            if (quantity > item.quantity) throw new BadRequestException(`Solo hay ${item.quantity} de ${item.sellingProduct?.name || 'ese producto'}`);
            return { item, quantity, amount: Number(item.priceUnit) * quantity };
        });

        const paid = sale.paymentStatus === 'APPROVED';
        const totalUnits = sale.items.reduce((s: number, i: any) => s + i.quantity, 0);
        const removedUnits = removals.reduce((s, r) => s + r.quantity, 0);
        if (paid && removedUnits >= totalUnits) throw new BadRequestException('Para quitar todo usa "Anular pedido"');

        const previousTotal = Number(sale.total);
        const amount = removedUnits >= totalUnits
            ? previousTotal
            : Math.min(removals.reduce((s, r) => s + r.amount, 0), previousTotal);
        const newTotal = previousTotal - amount;

        await (this.prisma as any).$transaction(async (tx: any) => {
            const fresh = await tx.sale.updateMany({
                where: { id: sale.id, total: sale.total, status: { not: OrderStatus.CANCELLED } },
                data: { total: newTotal },
            });
            if (fresh.count !== 1) throw new ConflictException('La cuenta cambió mientras tanto. Vuelve a abrirla.');

            for (const { item, quantity } of removals) {
                if (quantity === item.quantity) {
                    await tx.recipeSnapshot.deleteMany({ where: { saleItemId: item.id } });
                    await tx.saleItem.delete({ where: { id: item.id } });
                } else {
                    await tx.saleItem.update({ where: { id: item.id }, data: { quantity: { decrement: quantity } } });
                }
            }

            if (paid && amount > 0) {
                const shiftId = sale.shiftId
                    || (await findOpenCashierShift(tx))?.id
                    || (await tx.cashShift.findFirst({
                        where: { status: 'OPEN' }, orderBy: { openingTime: 'desc' }, select: { id: true },
                    }))?.id;
                if (shiftId) {
                    await tx.cashTransaction.create({
                        data: {
                            shiftId,
                            type: 'REFUND',
                            amount,
                            description: `Devolución ${sale.code || ''} (${sale.paymentMethod || 'CASH'})`,
                            relatedSaleId: sale.id,
                        },
                    });
                }
            }

            await this.audit.log({
                action: 'ITEM_VOID',
                actorId: approval.actorId,
                approver: approval.approver,
                saleId: sale.id,
                saleCode: sale.code,
                amount,
                reason: approval.reason,
                details: {
                    paid,
                    paymentMethod: sale.paymentMethod || null,
                    previousTotal,
                    newTotal,
                    items: removals.map((r) => ({
                        name: r.item.sellingProduct?.name || 'Producto',
                        quantity: r.quantity,
                        priceUnit: Number(r.item.priceUnit),
                    })),
                },
            }, tx);
        });

        return { saleId: sale.id, total: newTotal, refund: paid ? amount : 0 };
    }
}
