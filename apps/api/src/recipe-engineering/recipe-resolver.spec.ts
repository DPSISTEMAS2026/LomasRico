
import { Test, TestingModule } from '@nestjs/testing';
import { RecipeResolverService } from './recipe-resolver.service';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('RecipeResolverService Logic Verification', () => {
    let service: RecipeResolverService;
    let prisma: PrismaService;

    // MOCK DATA
    const MOCK_PRODUCT_ID = 'prod-ceviche-350';
    const MOCK_VARIANT_ID_500 = 'var-ceviche-500'; // Should scale 1.42x
    const MOCK_VARIANT_ID_1KG = 'var-ceviche-1kg';   // Should scale 2.85x (approx 2.85) -> Actually 1000/350 = 2.857

    const MOCK_INGREDIENT_SALMON = {
        id: 'ing-salmon',
        name: 'Salmon Filete',
        unit: 'KG',
        type: 'RAW'
    };

    const MOCK_RECIPE = {
        baseWeight: 350, // 350g Base
        items: [
            {
                ingredientId: 'ing-salmon',
                quantity: 0.100, // 100g in 350g serving
                role: 'PROTEIN_MAIN',
                ingredient: MOCK_INGREDIENT_SALMON
            },
            {
                ingredientId: 'ing-limon',
                quantity: 0.050, // 50g Juice
                role: 'BASE',
                ingredient: { id: 'ing-limon', name: 'Jugo Limon', unit: 'LT', type: 'RAW' }
            }
        ]
    };

    const MOCK_PRODUCT = {
        id: MOCK_PRODUCT_ID,
        name: 'Ceviche Clasico 350g',
        recipe: MOCK_RECIPE
    };

    const MOCK_VARIANT_500 = {
        id: MOCK_VARIANT_ID_500,
        name: 'Ceviche Clasico 500g', // Parser should catch "500g"
        sellingProduct: MOCK_PRODUCT
    };

    const MOCK_VARIANT_1KG = {
        id: MOCK_VARIANT_ID_1KG,
        name: 'Ceviche Clasico 1KG', // Parser should catch "1KG" -> 1000g
        sellingProduct: MOCK_PRODUCT
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RecipeResolverService,
                {
                    provide: PrismaService,
                    useValue: {
                        sellingProduct: {
                            findUnique: jest.fn().mockImplementation(({ where }) => {
                                if (where.id === MOCK_PRODUCT_ID) return Promise.resolve(MOCK_PRODUCT);
                                return Promise.resolve(null);
                            }),
                        },
                        productVariant: {
                            findUnique: jest.fn().mockImplementation(({ where }) => {
                                if (where.id === MOCK_VARIANT_ID_500) return Promise.resolve(MOCK_VARIANT_500);
                                if (where.id === MOCK_VARIANT_ID_1KG) return Promise.resolve(MOCK_VARIANT_1KG);
                                return Promise.resolve(null);
                            }),
                        },
                        inventoryItem: {
                            findUnique: jest.fn(), // Not needed for basic resolution unless modifiers used
                        }
                    },
                },
            ],
        }).compile();

        service = module.get<RecipeResolverService>(RecipeResolverService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('Scaling Logic (Variant Analysis)', () => {

        it('should NOT scale when resolving the Base Product (350g)', async () => {
            const bom = await service.resolveBom(MOCK_PRODUCT_ID, {}, false);

            const salmon = bom.find(i => i.inventoryItemId === 'ing-salmon');
            expect(salmon).toBeDefined();
            expect(salmon.quantity).toBeCloseTo(0.100, 4); // Exact match expected
        });

        it('should scale UP correctly for "500g" Variant (Factor ~1.428)', async () => {
            const bom = await service.resolveBom(MOCK_VARIANT_ID_500, {}, false);

            const salmon = bom.find(i => i.inventoryItemId === 'ing-salmon');

            // Expected: 0.100 * (500 / 350) = 0.142857
            const expectedQty = 0.100 * (500 / 350);

            expect(salmon.quantity).toBeCloseTo(expectedQty, 4);
            console.log(`[500g TEST] Base: 0.100 vs Scaled: ${salmon.quantity}`);
        });

        it('should scale UP correctly for "1KG" Variant (Factor ~2.857)', async () => {
            const bom = await service.resolveBom(MOCK_VARIANT_ID_1KG, {}, false);

            const salmon = bom.find(i => i.inventoryItemId === 'ing-salmon');

            // Expected: 0.100 * (1000 / 350)
            const expectedQty = 0.100 * (1000 / 350);

            expect(salmon.quantity).toBeCloseTo(expectedQty, 4);
            console.log(`[1KG TEST] Base: 0.100 vs Scaled: ${salmon.quantity}`);
        });
    });

    describe('Modifier Logic (Proteins)', () => {
        // Add logic test for modifiers if needed, but scaling is the primary new feature
    });
});
