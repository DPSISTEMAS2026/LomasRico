import { Injectable, Logger, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SalesService } from '../sales/sales.service';
import { ProductMapperService } from './product-mapper.service';
import { CreateExternalOrderDto, ExternalPlatform } from './dto/create-external-order.dto';
import { CreateSaleDto } from '../sales/dto/create-sale.dto';

export interface IngestionResult {
    externalOrderId: string;
    platform: ExternalPlatform;
    status: 'created' | 'duplicate' | 'partial' | 'failed';
    saleId?: string;
    saleCode?: string;
    mappingLog: MappingLogEntry[];
    error?: string;
}

interface MappingLogEntry {
    externalName: string;
    quantity: number;
    mapped: boolean;
    confidence: string;
    internalProduct?: string;
    internalVariantId?: string;
}

@Injectable()
export class ExternalOrdersService {
    private readonly logger = new Logger(ExternalOrdersService.name);

    constructor(
        private prisma: PrismaService,
        private salesService: SalesService,
        private productMapper: ProductMapperService,
    ) {}

    /**
     * Ingest a single external order.
     * Steps:
     * 1. Check for duplicate (by platform + externalOrderId)
     * 2. Map external product names to internal IDs
     * 3. Create a Sale via SalesService.create()
     * 4. Record the ExternalOrder link
     */
    async ingestOrder(dto: CreateExternalOrderDto): Promise<IngestionResult> {
        const { platform, externalOrderId } = dto;

        // 1. Deduplication check
        const existing = await (this.prisma as any).externalOrder.findFirst({
            where: {
                platform,
                externalOrderId,
            },
        });

        if (existing) {
            this.logger.warn(`⏩ Duplicate: ${platform}#${externalOrderId} already exists (saleId=${existing.saleId})`);
            return {
                externalOrderId,
                platform,
                status: 'duplicate',
                saleId: existing.saleId,
                mappingLog: [],
            };
        }

        // 2. Map products
        const mappingLog: MappingLogEntry[] = [];
        const saleItems: CreateSaleDto['items'] = [];
        let hasUnmapped = false;

        for (const item of dto.items) {
            // If pre-resolved, use directly
            if (item.resolvedVariantId || item.resolvedProductId) {
                saleItems.push({
                    productVariantId: item.resolvedVariantId,
                    sellingProductId: item.resolvedProductId,
                    quantity: item.quantity,
                });
                mappingLog.push({
                    externalName: item.externalName,
                    quantity: item.quantity,
                    mapped: true,
                    confidence: 'manual',
                    internalVariantId: item.resolvedVariantId,
                });
                continue;
            }

            // Auto-map
            const mapping = this.productMapper.mapProduct(item.externalName);

            mappingLog.push({
                externalName: item.externalName,
                quantity: item.quantity,
                mapped: mapping.matched,
                confidence: mapping.confidence,
                internalProduct: mapping.productName,
                internalVariantId: mapping.variantId,
            });

            // Parse modifiers from item notes (e.g., "Salmón, Camarón, Machas")
            const modifiers = this.parseModifiers(item.notes);

            if (mapping.matched && mapping.variantId) {
                saleItems.push({
                    productVariantId: mapping.variantId,
                    quantity: item.quantity,
                    modifiers,
                });
            } else if (mapping.matched && mapping.productId) {
                saleItems.push({
                    sellingProductId: mapping.productId,
                    quantity: item.quantity,
                    modifiers,
                });
            } else {
                hasUnmapped = true;
                this.logger.warn(`❌ Unmapped item: "${item.externalName}" from ${platform}#${externalOrderId}`);
            }
        }

        // 3. If no items mapped, record as failed
        if (saleItems.length === 0) {
            await this.recordExternalOrder(dto, null, mappingLog);
            return {
                externalOrderId,
                platform,
                status: 'failed',
                mappingLog,
                error: 'No items could be mapped to internal products',
            };
        }

        // 4. Create the Sale
        try {
            const channel = platform === 'UBER_EATS' ? 'UBER_EATS' : 'PEDIDOS_YA';

            const saleDto: CreateSaleDto = {
                channel: channel as any,
                items: saleItems,
                note: this.buildNote(dto),
                // External orders are already paid through the platform
                paymentMethod: 'OTHER',
                status: 'CONFIRMED',
                shippingData: dto.deliveryAddress
                    ? {
                          address: dto.deliveryAddress,
                          cost: 0, // External platforms handle delivery
                          estimateId: `${platform}-${externalOrderId}`,
                      }
                    : undefined,
            } as any;

            // Try to link to existing customer by phone
            if (dto.customerPhone) {
                const cleanPhone = dto.customerPhone.replace(/\D/g, '').slice(-9);
                const customer = await this.prisma.user.findFirst({
                    where: { phone: { contains: cleanPhone } },
                });
                if (customer) {
                    saleDto.userId = customer.id;
                }
            }

            const sale = await this.salesService.create(saleDto);

            // 5. Record the external order link
            await this.recordExternalOrder(dto, sale.id, mappingLog);

            this.logger.log(
                `✅ ${platform}#${externalOrderId} → Sale ${sale.code} (${saleItems.length} items, ${hasUnmapped ? 'PARTIAL' : 'FULL'})`,
            );

            return {
                externalOrderId,
                platform,
                status: hasUnmapped ? 'partial' : 'created',
                saleId: sale.id,
                saleCode: sale.code,
                mappingLog,
            };
        } catch (error: any) {
            this.logger.error(`💥 Failed to create sale for ${platform}#${externalOrderId}: ${error.message}`);

            // Still record the external order for manual resolution
            await this.recordExternalOrder(dto, null, mappingLog);

            return {
                externalOrderId,
                platform,
                status: 'failed',
                mappingLog,
                error: error.message,
            };
        }
    }

    /**
     * Ingest multiple orders (bulk from scraper).
     */
    async ingestBulk(orders: CreateExternalOrderDto[]): Promise<IngestionResult[]> {
        const results: IngestionResult[] = [];

        for (const order of orders) {
            const result = await this.ingestOrder(order);
            results.push(result);

            // Small delay between orders to avoid overwhelming the DB
            await new Promise(r => setTimeout(r, 100));
        }

        // Summary log
        const created = results.filter(r => r.status === 'created').length;
        const duplicates = results.filter(r => r.status === 'duplicate').length;
        const partial = results.filter(r => r.status === 'partial').length;
        const failed = results.filter(r => r.status === 'failed').length;

        this.logger.log(
            `📊 Bulk ingestion complete: ${created} created, ${duplicates} duplicates, ${partial} partial, ${failed} failed`,
        );

        return results;
    }

    /**
     * List all external orders with optional filters.
     */
    async findAll(filters?: { platform?: string; status?: string; limit?: number }) {
        return (this.prisma as any).externalOrder.findMany({
            where: {
                ...(filters?.platform ? { platform: filters.platform } : {}),
                ...(filters?.status ? { externalStatus: filters.status } : {}),
            },
            orderBy: { scrapedAt: 'desc' },
            take: filters?.limit || 50,
        });
    }

    /**
     * Get a single external order by ID.
     */
    async findOne(id: string) {
        return (this.prisma as any).externalOrder.findUnique({
            where: { id },
        });
    }

    /**
     * Retry a failed external order (after fixing mapping).
     */
    async retryOrder(id: string): Promise<IngestionResult> {
        const extOrder = await (this.prisma as any).externalOrder.findUnique({
            where: { id },
        });

        if (!extOrder) {
            throw new BadRequestException('External order not found');
        }

        if (extOrder.saleId) {
            throw new ConflictException('This order already has an associated sale');
        }

        // Re-ingest with the stored raw payload
        const dto: CreateExternalOrderDto = {
            platform: extOrder.platform,
            externalOrderId: extOrder.externalOrderId,
            externalStatus: extOrder.externalStatus,
            customerName: extOrder.customerName,
            customerPhone: extOrder.customerPhone,
            rawPayload: extOrder.rawPayload,
            items: extOrder.rawPayload?.items || [],
        };

        // Delete the old record so dedup doesn't block
        await (this.prisma as any).externalOrder.delete({ where: { id } });

        return this.ingestOrder(dto);
    }

    /**
     * Refresh the product mapper cache (after product changes).
     */
    async refreshMapper(): Promise<{ entries: number }> {
        await this.productMapper.refreshCatalog();
        return { entries: (this.productMapper as any).catalogMap?.size || 0 };
    }

    // ─────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────

    private async recordExternalOrder(
        dto: CreateExternalOrderDto,
        saleId: string | null,
        mappingLog: MappingLogEntry[],
    ) {
        try {
            await (this.prisma as any).externalOrder.create({
                data: {
                    platform: dto.platform,
                    externalOrderId: dto.externalOrderId,
                    externalStatus: dto.externalStatus || 'NEW',
                    customerName: dto.customerName,
                    customerPhone: dto.customerPhone,
                    saleId,
                    rawPayload: dto.rawPayload || dto,
                    mappingLog,
                    scrapedAt: new Date(),
                    syncedAt: saleId ? new Date() : null,
                },
            });
        } catch (error: any) {
            // If duplicate constraint fires, it's fine
            if (error.code === 'P2002') {
                this.logger.debug(`Duplicate external order record suppressed: ${dto.platform}#${dto.externalOrderId}`);
            } else {
                this.logger.error(`Failed to record external order: ${error.message}`);
            }
        }
    }

    private buildNote(dto: CreateExternalOrderDto): string {
        const lines: string[] = [];

        // Line 1: Platform + Order ID + Customer
        const header = [`[${dto.platform}] #${dto.externalOrderId}`];
        if (dto.customerName) header.push(`👤 ${dto.customerName}`);
        lines.push(header.join(' | '));

        // Line 2+: Each item on its own line (clear for kitchen)
        for (const item of dto.items) {
            let line = `• ${item.quantity}x ${item.externalName}`;
            if (item.notes) line += ` → ${item.notes}`;
            lines.push(line);
        }

        // Total from external platform (for admin reference)
        if (dto.externalTotal && dto.externalTotal > 0) {
            lines.push(`💰 Total Uber: $${dto.externalTotal.toLocaleString('es-CL')}`);
        }

        // Delivery info
        if (dto.deliveryAddress) lines.push(`📍 ${dto.deliveryAddress}`);
        if (dto.notes) lines.push(`💬 ${dto.notes}`);

        return lines.join('\n');
    }

    /**
     * Parse modifier notes from Uber Eats into structured modifiers.
     * Input: "Salmón, Camarón, Machas, Sopaipillas (3 uni) + salsa verde"
     * Output: { selectedProteins: ["Salmón", "Camarón", "Machas"] }
     */
    private parseModifiers(notes?: string): { selectedProteins?: string[]; removedIngredients?: string[] } | undefined {
        if (!notes) return undefined;

        const proteins = ['salmon', 'atun', 'camaron', 'machas', 'reineta', 'pulpo'];
        const parts = notes.split(',').map(s => s.trim()).filter(Boolean);

        const selectedProteins: string[] = [];
        for (const part of parts) {
            const normalized = part.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (proteins.some(p => normalized.includes(p))) {
                selectedProteins.push(part);
            }
        }

        if (selectedProteins.length === 0) return undefined;
        return { selectedProteins };
    }
}
