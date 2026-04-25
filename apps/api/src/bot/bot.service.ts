import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ShippingService } from '../shipping/shipping.service';
import { SalesService } from '../sales/sales.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CreateSaleDto } from '../sales/dto/create-sale.dto';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class BotService {
    constructor(
        private prisma: PrismaService,
        private shippingService: ShippingService,
        private salesService: SalesService,
        private whatsappService: WhatsAppService,
        private paymentsService: PaymentsService
    ) { }

    // 1. Identificar Usuario por Teléfono (WhatsApp)
    async identifyByPhone(phone: string) {
        const cleanPhone = phone.replace('whatsapp:', '').replace('+', '');
        // @ts-ignore
        const user = await this.prisma.user.findFirst({
            where: { phone: { contains: cleanPhone } },
            include: {
                addresses: true,
                sales: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                }
            }
        });

        if (!user) {
            // CRÍTICO: Registramos al usuario de inmediato para tener un ID real
            const newUser = await this.prisma.user.create({
                data: {
                    phone: cleanPhone,
                    email: `${cleanPhone}@whatsapp.lomasrico.cl`,
                    name: 'Cliente WhatsApp',
                    role: 'CUSTOMER'
                }
            });

            return {
                isNewUser: true,
                id: newUser.id,
                name: newUser.name,
                phone: newUser.phone,
                addresses: [],
                lastOrder: null
            };
        }

        return {
            isNewUser: false,
            id: user.id,
            name: user.name,
            phone: user.phone,
            addresses: user.addresses,
            lastOrder: user.sales[0] || null
        };
    }

    // 1b. Identificar Usuario por ID (Existente)
    async identifyUser(userId: string) {
        // @ts-ignore
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                addresses: true,
                sales: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        items: {
                            include: { sellingProduct: true }
                        }
                    }
                }
            }
        });

        if (!user) throw new NotFoundException('Usuario no encontrado');

        const lastOrder = user.sales[0];

        return {
            name: user.name,
            phone: user.phone,
            addresses: user.addresses,
            lastOrder: lastOrder ? {
                id: lastOrder.id,
                total: lastOrder.total,
                items: lastOrder.items.map(i => `${i.quantity}x ${i.sellingProduct?.name}`).join(', ')
            } : null
        };
    }

    // 2. Obtener Catálogo para Bot (con modifiers completos)
    async getCatalog() {
        // @ts-ignore
        const products = await this.prisma.sellingProduct.findMany({
            where: { isActive: true },
            include: {
                variants: true,
                productModifiers: {
                    include: {
                        modifierGroup: {
                            include: {
                                options: {
                                    where: { isActive: true },
                                    orderBy: { sortOrder: 'asc' }
                                }
                            }
                        }
                    },
                    orderBy: { sortOrder: 'asc' }
                }
            }
        });

        return products.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            category: p.category,
            price: Number(p.price),
            isConfigurable: p.isConfigurable,
            maxProteins: p.maxProteins,
            variants: p.variants.map((v: any) => ({
                id: v.id,
                name: v.name,
                price: Number(v.price)
            })),
            // Modifier groups con opciones completas (mismo formato que el sitio web)
            modifiers: (p.productModifiers || []).map((pm: any) => ({
                groupId: pm.modifierGroupId,
                groupName: pm.modifierGroup.name,
                displayName: pm.modifierGroup.displayName,
                type: pm.modifierGroup.type,
                isRequired: pm.isRequired,
                sortOrder: pm.sortOrder,
                minSelections: pm.overrideMin ?? pm.modifierGroup.minSelections,
                maxSelections: pm.overrideMax ?? pm.modifierGroup.maxSelections,
                options: pm.modifierGroup.options.map((o: any) => ({
                    id: o.id,
                    name: o.name,
                    priceAdjustment: Number(o.priceAdjustment),
                    isDefault: o.isDefault,
                })),
            }))
        }));
    }

    // 3. Cotizar Envío y GUARDAR dirección
    async quoteShipping(address: string, phone?: string) {
        // Si viene el teléfono, guardamos la dirección permanentemente
        if (phone) {
            try {
                const cleanPhone = phone.replace('whatsapp:', '').replace('+', '').replace(/\D/g, '');

                // Buscar si el usuario existe por teléfono
                let user = await this.prisma.user.findFirst({
                    where: { phone: { contains: cleanPhone } }
                });

                // Si no existe, lo creamos como Guest (o usuario básico)
                if (!user) {
                    user = await this.prisma.user.create({
                        data: {
                            phone: cleanPhone,
                            email: `${cleanPhone}@whatsapp.lomasrico.cl`, // Requerido por schema
                            name: 'Cliente WhatsApp',
                            role: 'CUSTOMER'
                        }
                    });
                }

                // Verificar si la dirección ya existe para este usuario
                const decodedAddress = address.trim();
                const existingAddress = await this.prisma.userAddress.findFirst({
                    where: {
                        userId: user.id,
                        addressText: { contains: decodedAddress.split(',')[0].trim() }
                    }
                });

                // Si es una dirección nueva, la guardamos
                if (!existingAddress) {
                    await this.prisma.userAddress.create({
                        data: {
                            userId: user.id,
                            addressText: decodedAddress,
                            isDefault: true
                        }
                    });
                }
            } catch (error) {
                console.error('[BOT] Error saving address:', error);
                // No bloqueamos la cotización si falla el guardado
            }
        }

        return this.shippingService.calculateQuote({
            address,
            city: 'Concepción',
            channel: 'WHATSAPP'
        });
    }

    // 4. Crear Orden y Link de Pago
    async createBotOrder(data: {
        userId: string,
        items: any[],
        shippingAddress: string,
        shippingCost: number
    }) {
        // Resolver items: Maxi puede enviar productId o variantId
        const resolvedItems = [];
        for (const item of data.items) {
            let productId = item.productId || null;
            let variantId = item.variantId || null;

            // Si viene con nombre del producto, buscar ID
            if (!productId && !variantId && item.name) {
                const product = await this.prisma.sellingProduct.findFirst({
                    where: {
                        name: { contains: item.name, mode: 'insensitive' as any },
                        isActive: true
                    },
                    include: { variants: true }
                });
                if (product) {
                    productId = product.id;
                    // Usar primera variante si existe
                    if (product.variants.length > 0) {
                        variantId = product.variants[0].id;
                    }
                }
            }

            resolvedItems.push({
                sellingProductId: productId,
                productVariantId: variantId,
                quantity: item.quantity || 1,
                modifiers: item.dynamicSelections
                    ? { dynamicSelections: item.dynamicSelections }
                    : (item.modifiers || {})
            });
        }

        // Adaptar data para SalesService
        const saleDto: CreateSaleDto = {
            channel: 'WHATSAPP', // Enum value
            userId: data.userId,
            items: resolvedItems,
            shippingData: {
                address: data.shippingAddress,
                cost: data.shippingCost,
                estimateId: 'BOT-' + Date.now()
            }
        };

        const sale = await this.salesService.create(saleDto);

        // Generar Link de Pago Real usando Mercado Pago
        const preference = await this.paymentsService.createPreference({
            orderId: sale.id,
            amount: Number(sale.total),
            channel: 'WHATSAPP',
            shippingCost: data.shippingCost,
            items: data.items.map(i => ({
                id: i.productId || i.variantId || 'unknown',
                title: i.name || 'Producto',
                quantity: i.quantity || 1,
                unit_price: Number(i.price || 0)
            }))
        });

        // Retornamos el link de pago real (initPoint)
        const paymentLink = preference.initPoint;

        return {
            orderId: sale.id,
            orderCode: sale.code,
            total: sale.total,
            paymentLink
        };
    }

    async logBotResponse(payload: { phone: string, text: string }) {
        const cleanPhone = payload.phone.replace(/\D/g, '').slice(-9);

        let conversation = await (this.prisma as any).conversation.findFirst({
            where: { contactId: { contains: cleanPhone } }
        });

        if (!conversation) {
            conversation = await (this.prisma as any).conversation.create({
                data: { contactId: cleanPhone, mode: 'BOT', status: 'OPEN' }
            });
        }

        return (this.prisma as any).message.create({
            data: {
                conversationId: conversation.id,
                direction: 'OUT',
                body: payload.text,
                authorType: 'BOT',
                createdAt: new Date()
            }
        });
    }
}
