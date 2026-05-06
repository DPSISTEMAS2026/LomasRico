import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

/**
 * ProductMapperService
 * 
 * Maps product names from external platforms (Uber Eats, PedidosYa)
 * to internal SellingProduct/ProductVariant IDs.
 * 
 * Uses a combination of:
 * 1. Exact match dictionary (manually maintained)
 * 2. Fuzzy matching on product name
 * 3. Category-based fallback
 * 
 * The dictionary is loaded from DB on startup and can be refreshed.
 */

interface ProductMapping {
    productId: string;
    variantId: string | null;
    productName: string;
    price: number;
    isConfigurable: boolean;
}

interface MappingResult {
    matched: boolean;
    productId?: string;
    variantId?: string;
    productName?: string;
    price?: number;
    confidence: 'exact' | 'fuzzy' | 'manual' | 'none';
    isConfigurable?: boolean;
}

@Injectable()
export class ProductMapperService implements OnModuleInit {
    private readonly logger = new Logger(ProductMapperService.name);

    // Internal catalog cache: lowercase name → mapping
    private catalogMap: Map<string, ProductMapping> = new Map();

    // Manual overrides: external name → internal name (for common mismatches)
    private readonly MANUAL_ALIASES: Record<string, string> = {
        // ═══════════════════════════════════════════════════════════
        // EMPANADAS — Uber Eats vende por sabor, internamente es
        // "Empanada Frita" + modificador de sabor
        // ═══════════════════════════════════════════════════════════
        'carapacho queso': 'empanada frita',
        'macha queso': 'empanada frita',
        'camaron queso': 'empanada frita',
        'camarón queso': 'empanada frita',
        'macha-queso': 'empanada frita',
        'empanada carapacho queso': 'empanada frita',
        'empanada macha queso': 'empanada frita',
        'empanada de queso': 'empanada frita',
        'empanada frita de queso': 'empanada frita',
        'empanada camaron queso': 'empanada frita',
        'empanada cheese': 'empanada frita',
        'empanada marisco': 'empanada frita',

        // ═══════════════════════════════════════════════════════════
        // BOWLS
        // ═══════════════════════════════════════════════════════════
        "bowl's acevichados": "bowl acevichado",
        "bowl´s acevichados": "bowl acevichado",
        "bowls acevichados": "bowl acevichado",


        // ═══════════════════════════════════════════════════════════
        // CEVICHES POR PESO — Uber Eats los nombra "500 gm Peruano"
        // Internamente: "Ceviche Peruano" + mod Formato 500gr
        // ═══════════════════════════════════════════════════════════
        '500 gm peruano': 'ceviche peruano',
        '350 gm peruano': 'ceviche peruano',
        '750 gm peruano': 'ceviche peruano',
        '1 kg peruano': 'ceviche peruano',
        '250 gm peruano': 'ceviche peruano',

        // Ceviche LOMASRICO (nombre genérico en Uber)
        '500 gm elige hasta 3 proteinas': 'ceviche lomasrico',
        '350 gm elige hasta 3 proteinas': 'ceviche lomasrico',
        '750 gm elige hasta 3 proteinas': 'ceviche lomasrico',
        '1 kg elige hasta 3 proteinas': 'ceviche lomasrico',
        '500 gm': 'ceviche lomasrico',
        '350 gm': 'ceviche lomasrico',
        '750 gm': 'ceviche lomasrico',
        '1 kg': 'ceviche lomasrico',

        // Aliases directos
        'ceviche clasico': 'ceviche lomasrico',
        'ceviche tradicional': 'ceviche lomasrico',
        'ceviche classic': 'ceviche lomasrico',
        'ceviche lo mas rico': 'ceviche lomasrico',
        'ceviche lomasrico': 'ceviche lomasrico',
        'ceviche peruano': 'ceviche peruano',

        // ═══════════════════════════════════════════════════════════
        // LIMONADAS — Uber dice "Limonada LoMASRico"
        // ═══════════════════════════════════════════════════════════
        'limonada lomasrico': 'limonada artesanal',
        'limonada lo mas rico': 'limonada artesanal',
        'limonada': 'limonada artesanal',
        'lemonade': 'limonada artesanal',
        'limonada artesanal': 'limonada artesanal',

        // ═══════════════════════════════════════════════════════════
        // SOPAIPILLAS (modifier en Uber, producto en interno)
        // ═══════════════════════════════════════════════════════════
        'sopaipillas 3 uni salsa verde': 'sopaipillas',
        'sopaipillas 3 uni': 'sopaipillas',
        'sopaipillas 10 uni': 'sopaipillas 10 (uni)',
        'sopaipillas salsa verde y merquen 10 uni': 'sopaipillas 10 (uni)',
        'sopaipillas salsa verde y merquen 3 uni': 'sopaipillas',
        'sopaipillas salsa verde 10 uni': 'sopaipillas 10 (uni)',
        'sopaipillas salsa verde 3 uni': 'sopaipillas',
        'sopaipillas salsa merquen 10 uni': 'sopaipillas 10 (uni)',
        'sopaipillas salsa merquen 3 uni': 'sopaipillas',
        'sopaipillas 10 unidades': 'sopaipillas 10 (uni)',
        'sopaipillas con salsa': 'sopaipillas',

        // ═══════════════════════════════════════════════════════════
        // SALSAS EXTRAS (modifier en Uber)
        // ═══════════════════════════════════════════════════════════
        'salsa merquen ahumado': 'salsa merquen',
        'salsa ajo confitado': 'salsa ajo',
        'salsa verde': 'salsa verde',

        // ═══════════════════════════════════════════════════════════
        // OTROS PRODUCTOS
        // ═══════════════════════════════════════════════════════════
        'papas fritas': 'papas fritas lomasrico',
        'french fries': 'papas fritas lomasrico',
        'rolls acevichado': 'acevichado lomasrico',
        'camarones apanados 10': 'camarones apanados',
        'aros de cebolla 10': 'aros de cebolla',
        'onion rings': 'aros de cebolla',
        'pancitos': 'porcion de pancitos (10 un)',
        'pan con ajo': 'porcion de pancitos (10 un)',
        'garlic bread': 'porcion de pancitos (10 un)',
        'coca cola': 'bebida individual',
        'coca-cola': 'bebida individual',
        'pepsi': 'bebida individual',
        'fanta': 'bebida individual',
        'sprite': 'bebida individual',
        'agua mineral': 'agua cachantun 500cc',
        'agua': 'agua cachantun 500cc',
        'bowl acevichado': 'bowl acevichado',
        'crudo salmon': 'crudo de salmon',
        'crudo atun': 'crudo de atun',
        'crudo de salmon': 'crudo de salmon',
        'crudo de atun': 'crudo de atun',
        'crudo de atun (2 pers)': 'crudo de atun',
        'crudo de salmon (2 pers)': 'crudo de salmon',
        'gohan': 'gohan',
        'bowl gohan': 'gohan',
        'apanados lomasrico': 'apanados lomasrico',
        'mango fuego': 'mango fuego',
        'pink nikkei': 'pink nikkei',
        'black pacific sin arroz': 'black pacific (sin arroz)',
        'leche de tigre': 'leche de tigre',

        // Ceviche Vegetariano (Uber lo pone como "Ceviche Veg")
        'ceviche veg': 'ceviche vegetariano',
        'ceviche vegetariano': 'ceviche vegetariano',
        'ceviche veggie': 'ceviche vegetariano',

        // Empanada de Marisco (Uber la pone como solo "Marisco")
        'marisco': 'empanada frita',

        // ═══════════════════════════════════════════════════════════
        // HANDROLLS — Uber los vende por sabor: "HandRoll de Salmón"
        // Internamente: "Handroll" genérico (configurable)
        // ═══════════════════════════════════════════════════════════
        'handroll de salmon': 'handroll',
        'handroll salmon': 'handroll',
        'handroll de camaron': 'handroll',
        'handroll camaron': 'handroll',
        'handroll de pollo': 'handroll',
        'handroll pollo': 'handroll',
        'hand roll de salmon': 'handroll',
        'hand roll salmon': 'handroll',
        'hand roll de camaron': 'handroll',
        'hand roll camaron': 'handroll',
        'hand roll de pollo': 'handroll',
        'hand roll pollo': 'handroll',

        // Ceviche Tropical variantes
        'ceviche tropical mango': 'ceviche tropical',
        'tropical mango': 'ceviche tropical',

        // === PedidosYa aliases ===
        'papas con salsa': 'papas fritas lomasrico',
        'mix empanadas': 'mix empanadas (4 unidades)',
        'promo express': 'promo express',
    };

    constructor(private prisma: PrismaService) {}

    async onModuleInit() {
        await this.refreshCatalog();
    }

    /**
     * Refresh the internal catalog cache from the database.
     * Call this after product changes.
     */
    async refreshCatalog(): Promise<void> {
        this.logger.log('🔄 Refreshing product catalog cache...');

        const products = await this.prisma.sellingProduct.findMany({
            where: { isActive: true },
            include: {
                variants: { where: { isActive: true } },
            },
        });

        this.catalogMap.clear();

        for (const product of products) {
            const key = this.normalize(product.name);
            const defaultVariant = product.variants[0]; // First active variant

            this.catalogMap.set(key, {
                productId: product.id,
                variantId: defaultVariant?.id || null,
                productName: product.name,
                price: Number(product.price),
                isConfigurable: product.isConfigurable,
            });

            // Also index each variant by its full name
            for (const variant of product.variants) {
                const variantKey = this.normalize(variant.name);
                if (variantKey !== key) {
                    this.catalogMap.set(variantKey, {
                        productId: product.id,
                        variantId: variant.id,
                        productName: `${product.name} - ${variant.name}`,
                        price: Number(variant.price),
                        isConfigurable: product.isConfigurable,
                    });
                }
            }
        }

        this.logger.log(`✅ Catalog cache loaded: ${this.catalogMap.size} entries`);
    }

    /**
     * Map an external product name to an internal product/variant.
     */
    mapProduct(externalName: string): MappingResult {
        const normalized = this.normalize(externalName);

        // 1. Try exact match on catalog
        const exact = this.catalogMap.get(normalized);
        if (exact) {
            return {
                matched: true,
                productId: exact.productId,
                variantId: exact.variantId || undefined,
                productName: exact.productName,
                price: exact.price,
                confidence: 'exact',
                isConfigurable: exact.isConfigurable,
            };
        }

        // 2. Try manual alias → then exact match
        const alias = this.MANUAL_ALIASES[normalized];
        if (alias) {
            const aliasResult = this.catalogMap.get(this.normalize(alias));
            if (aliasResult) {
                return {
                    matched: true,
                    productId: aliasResult.productId,
                    variantId: aliasResult.variantId || undefined,
                    productName: aliasResult.productName,
                    price: aliasResult.price,
                    confidence: 'manual',
                    isConfigurable: aliasResult.isConfigurable,
                };
            }
        }

        // 3. Fuzzy: find best substring match
        const fuzzy = this.fuzzyMatch(normalized);
        if (fuzzy) {
            return {
                matched: true,
                productId: fuzzy.productId,
                variantId: fuzzy.variantId || undefined,
                productName: fuzzy.productName,
                price: fuzzy.price,
                confidence: 'fuzzy',
                isConfigurable: fuzzy.isConfigurable,
            };
        }

        // 4. No match
        return { matched: false, confidence: 'none' };
    }

    /**
     * Map all items in an order, returning resolved mappings.
     */
    mapOrderItems(items: { externalName: string; quantity: number; unitPrice: number }[]) {
        return items.map(item => ({
            ...item,
            mapping: this.mapProduct(item.externalName),
        }));
    }

    private normalize(name: string): string {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9\s]/g, '') // Remove special chars
            .replace(/\s+/g, ' ')
            .trim();
    }

    private fuzzyMatch(normalized: string): ProductMapping | null {
        let bestMatch: ProductMapping | null = null;
        let bestScore = 0;

        for (const [key, mapping] of this.catalogMap) {
            // Check if normalized contains the catalog key or vice versa
            const score = this.similarityScore(normalized, key);
            if (score > bestScore && score >= 0.6) {
                bestScore = score;
                bestMatch = mapping;
            }
        }

        return bestMatch;
    }

    private similarityScore(a: string, b: string): number {
        // Simple Jaccard-like word overlap score
        const wordsA = new Set(a.split(' ').filter(w => w.length > 2));
        const wordsB = new Set(b.split(' ').filter(w => w.length > 2));

        if (wordsA.size === 0 || wordsB.size === 0) return 0;

        let intersection = 0;
        for (const word of wordsA) {
            if (wordsB.has(word)) intersection++;
        }

        const union = new Set([...wordsA, ...wordsB]).size;
        return intersection / union;
    }
}
