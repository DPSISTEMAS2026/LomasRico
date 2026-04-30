import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RecipeResolverService } from '../recipe-engineering/recipe-resolver.service';
import { InventoryService } from '../inventory/inventory.service';
import { ShippingService } from '../shipping/shipping.service';
import { AvailabilityService } from '../availability/availability.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ValidateSaleItemDto } from './dto/validate-item.dto';

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
                false
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
            shiftId
        } = createSaleDto as any;

        // Determine initial status based on payment method
        let initialStatus = manualStatus;
        if (channel === 'POS') {
            if (paymentMethod === 'MERCADO_PAGO' || paymentMethod === 'MP') {
                initialStatus = OrderStatus.PENDING;
            } else {
                initialStatus = OrderStatus.CONFIRMED; // CASH, TRANSFER
            }
        } else if (channel === 'WEB' && !initialStatus) {
            initialStatus = OrderStatus.PENDING;
        }

        // Separate items by type
        const itemsWithProductId: any[] = [];
        const itemsWithVariantId: any[] = [];

        for (const item of items) {
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

        const productMap = new Map(products.map((p: any) => [p.id, p]));
        const variantMap = new Map(variants.map((v: any) => [v.id, v]));

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
                false
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
                    throw new BadRequestException(`Dirección fuera de rango: ${quote.reason}`);
                }

                // Use the cost from Server, ignore client 'cost'
                computedShippingCost = Number(quote.cost);
                confirmedEstimationId = quote.estimateId; // Update estimate ID if fresh quote

                // Update shippingData with trusted values
                shippingData.cost = computedShippingCost;
                shippingData.estimateId = confirmedEstimationId;

            } catch (error) {
                // Allow POS to override freely, but WEB must be strict
                if (channel === 'WEB') {
                    throw new BadRequestException('Error calculando despacho. Verifique su dirección.');
                }
            }
        } else if (shippingData?.cost) {
            // For POS or simple manual entry, we trust the input for now
            computedShippingCost = Number(shippingData.cost);
        }

        // --- APPLY DISCOUNT (solo sobre subtotal de productos, NO sobre envío) ---
        const { discount, discountType } = createSaleDto as any;
        let discountValue = 0;
        if (discount && discount > 0) {
            if (discountType === 'PERCENT') {
                discountValue = totalAmount * (discount / 100);
            } else {
                discountValue = discount;
            }
            totalAmount = Math.max(0, totalAmount - discountValue);
        }

        // --- LOYALTY POINTS REDEMPTION (1 punto = $1 CLP) ---
        const subtotalBeforePoints = totalAmount; // Guardamos para calcular puntos ganados
        const { pointsToRedeem } = createSaleDto as any;
        let pointsRedeemed = 0;
        if (pointsToRedeem && pointsToRedeem > 0 && userId) {
            const customer = await this.prisma.user.findUnique({ where: { id: userId } });
            if (customer && (customer as any).loyaltyPoints >= pointsToRedeem) {
                pointsRedeemed = Math.min(pointsToRedeem, totalAmount); // No puede exceder el total
                totalAmount = Math.max(0, totalAmount - pointsRedeemed);
            }
        }

        // Sumar envío DESPUÉS del descuento y puntos para no descontar sobre el despacho
        totalAmount += computedShippingCost;

        // Transaction (timeout extendido para pedidos con modificadores dinámicos)
        return this.prisma.$transaction(async (tx: any) => {
            let finalShiftId = shiftId;

            // Si es POS y no hay shiftId, verificar si es DUEÑO para auto-gestionar el turno
            if (channel === 'POS' && !finalShiftId && userId) {
                const user = await tx.user.findUnique({ where: { id: userId } });
                if (user && (user.role === 'OWNER' || user.role === 'ADMIN')) {
                    // Buscar turno abierto del dueño o crear uno permanente
                    let ownerShift = await tx.cashShift.findFirst({
                        where: { cashierId: userId, status: 'OPEN' }
                    });

                    if (!ownerShift) {
                        // Crear turno automático si no hay uno
                        const cashRegister = await tx.cashRegister.findFirst({ where: { name: 'Caja Principal' } });
                        ownerShift = await tx.cashShift.create({
                            data: {
                                cashierId: userId,
                                cashRegisterId: cashRegister?.id || 'default',
                                status: 'OPEN',
                                startAmount: 0,
                                openingTime: new Date(),
                                note: `Turno Permanente Auto-generado por ${user.role} (Oscar/Admin)`
                            }
                        });
                    }
                    finalShiftId = ownerShift.id;
                }
            }

            // ✅ FIX: Para canales sin shiftId (WEB, UBER_EATS, PEDIDOS_YA, WHATSAPP),
            // vincular al turno de caja abierto más reciente para que registre en reportes
            if (!finalShiftId) {
                const activeShift = await tx.cashShift.findFirst({
                    where: { status: 'OPEN' },
                    orderBy: { openingTime: 'desc' },
                });
                if (activeShift) finalShiftId = activeShift.id;
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
                    shippingData: shippingData || undefined,
                    code: uniqueCode,
                    paymentMethod: (paymentMethod === 'MP' ? 'MERCADO_PAGO' : paymentMethod) as any,
                    paymentStatus: initialStatus === 'CONFIRMED' ? 'APPROVED' : 'PENDING',
                    shiftId: finalShiftId || undefined,
                    discount: discountValue,
                    discountType: discountType || 'FIXED',
                    discountReason: (createSaleDto as any).discountReason || 'POS Discount',
                    note: (createSaleDto as any).note
                }
            });

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

                if (itemIds.length > 0) {
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

                // Invalidar cache de disponibilidad después de descontar stock
                this.availabilityService.invalidateCache();

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
                            description: `Venta ${channelLabel} ${uniqueCode} (${paymentMethod})`,
                            relatedSaleId: sale.id
                        }
                    });
                }
            }

            // Solo crear ticket de cocina si la venta está confirmada (no PENDING de pago)
            // Para ventas WEB con MP, el ticket se crea en handleApprovedOrder al confirmar el pago
            if (!isPending) {
                // External orders (Uber, PedidosYa) go straight to PREPARING
                // since they're already confirmed by the platform
                const isExternalOrder = channel === 'UBER_EATS' || channel === 'PEDIDOS_YA';
                await tx.kitchenTicket.create({
                    data: {
                        saleId: sale.id,
                        status: isExternalOrder ? 'PREPARING' : 'WAITING'
                    }
                });
            }

            // === LOYALTY POINTS ENGINE ===
            // Solo procesar puntos si hay un usuario identificado
            if (userId) {
                // 1) Descontar puntos redimidos
                if (pointsRedeemed > 0) {
                    await tx.user.update({
                        where: { id: userId },
                        data: {
                            loyaltyPoints: { decrement: pointsRedeemed },
                            pointsUsed: { increment: pointsRedeemed }
                        }
                    });
                }

                // 2) Acreditar 4% de puntos sobre subtotal de productos (solo ventas confirmadas)
                if (!isPending) {
                    const pointsToCredit = Math.floor(subtotalBeforePoints * 0.04);
                    if (pointsToCredit > 0) {
                        await tx.user.update({
                            where: { id: userId },
                            data: {
                                loyaltyPoints: { increment: pointsToCredit },
                                pointsEarned: { increment: pointsToCredit },
                                historicalOrders: { increment: 1 },
                                historicalSpent: { increment: subtotalBeforePoints }
                            }
                        });
                    }
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
                        sellingProduct: true, // Ventas directas por producto (sin variante)
                        productVariant: {
                            include: {
                                sellingProduct: true
                            }
                        },
                        recipeSnapshot: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async updateStatus(id: string, status: string) {
        return (this.prisma as any).sale.update({
            where: { id },
            data: { status }
        });
    }
}
