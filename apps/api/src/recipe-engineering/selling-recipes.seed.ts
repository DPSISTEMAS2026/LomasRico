import { PrismaClient } from '@prisma/client';

// Helper to find Inventory Item ID
async function findInvId(prisma: PrismaClient, searchName: string, fallbackId: string) {
    const exact = await prisma.inventoryItem.findFirst({
        where: { name: { equals: searchName, mode: 'insensitive' } }
    });
    if (exact) return exact.id;
    const partial = await prisma.inventoryItem.findFirst({
        where: { name: { contains: searchName, mode: 'insensitive' } }
    });
    return partial ? partial.id : fallbackId;
}

// Helper to find Selling Product ID
async function findProductId(prisma: PrismaClient, productName: string) {
    const p = await prisma.sellingProduct.findFirst({
        where: { name: { contains: productName, mode: 'insensitive' } }
    });
    return p ? p.id : null;
}

export const seedSellingRecipes = async (prisma: PrismaClient) => {
    console.log('🍔 Seeding Selling Product Recipes (Kitchen Menu)...');

    // 1. Resolve Ingredients
    const idCamaronApanado = await findInvId(prisma, 'Camarones Apanados', 'c8');
    const idAros = await findInvId(prisma, 'Aros de Cebolla', 'c7');
    const idPapas = await findInvId(prisma, 'Papas Fritas', 'c9');
    const idSopaipilla = await findInvId(prisma, 'Sopaipillas', 'c11');
    const idMasa = await findInvId(prisma, 'Masas', 'c10');
    const idQueso = await findInvId(prisma, 'Queso Mozzarella', 'a13');
    const idSalmon = await findInvId(prisma, 'Salmón', 'p1');
    const idCamaron = await findInvId(prisma, 'Camarón', 'p4'); // Raw Shrimp
    const idPollo = await findInvId(prisma, 'Pollo', 'p8');
    const idArroz = await findInvId(prisma, 'Arroz', '30'); // Raw Rice
    const idQuesoCrema = await findInvId(prisma, 'Queso Crema', 'a17');
    const idPalta = await findInvId(prisma, 'Palta', 'v8');
    const idCebollin = await findInvId(prisma, 'Cebollín', 'v4');

    // Preparations (Salsas & Bases)
    const idSalsaVerde = await findInvId(prisma, 'Salsa Verde', 'prep-salsa-verde');
    const idBechamel = await findInvId(prisma, 'Salsa Bechamel', 'prep-salsa-bechamel');
    const idArrozSushi = await findInvId(prisma, 'Arroz Sushi', 'prep-arroz-sushi');
    const idBaseCeviche = await findInvId(prisma, 'Base Ceviche LoMASRico', 'prep-base-lomasrico-4kg'); // Solid Base

    // 2. Define Recipes to Upsert
    const recipes = [
        // --- PROMOS / APERITIVOS ---
        {
            productName: 'Camarones apanados',
            recipeName: 'Receta Camarones Apanados (10 un)',
            baseWeight: 0.300,
            items: [
                { ingredient: { connect: { id: idCamaronApanado } }, quantity: 0.250, role: 'BASE' },
                { ingredient: { connect: { id: idSalsaVerde } }, quantity: 0.050, role: 'BASE' }
            ]
        },
        {
            productName: 'Aros de cebolla',
            recipeName: 'Receta Aros de Cebolla (10 un)',
            baseWeight: 0.250,
            items: [
                { ingredient: { connect: { id: idAros } }, quantity: 0.250, role: 'BASE' }
            ]
        },
        {
            productName: 'Papas LoMASRico',
            recipeName: 'Receta Papas Fritas Porción',
            baseWeight: 0.400,
            items: [
                { ingredient: { connect: { id: idPapas } }, quantity: 0.14, role: 'BASE' } // ~350g from 2.5kg bag
            ]
        },
        {
            productName: 'Sopaipillas 10 (uni)',
            recipeName: 'Receta Sopaipillas (10 un)',
            baseWeight: 0.500,
            items: [
                { ingredient: { connect: { id: idSopaipilla } }, quantity: 10, role: 'BASE' },
                { ingredient: { connect: { id: idSalsaVerde } }, quantity: 0.100, role: 'BASE' }
            ]
        },

        // --- EMPANADAS (Uses Bechamel + Queso + Masa) ---
        // Camarón-Queso: 20g Camarón, 20g Queso, 10g Bechamel, 1 Masa
        {
            productName: 'Camarón-Queso',
            recipeName: 'Receta Empanada Camarón-Queso',
            baseWeight: 0.100,
            items: [
                { ingredient: { connect: { id: idMasa } }, quantity: 1, role: 'BASE' },
                { ingredient: { connect: { id: idCamaron } }, quantity: 0.020, role: 'PROTEIN_MAIN' },
                { ingredient: { connect: { id: idQueso } }, quantity: 0.020, role: 'BASE' },
                { ingredient: { connect: { id: idBechamel } }, quantity: 0.010, role: 'BASE' }
            ]
        },
        // Queso: 30g Queso + 10g Bechamel? (Recipe says 750g queso/25 uni = 30g)
        {
            productName: 'Queso',
            recipeName: 'Receta Empanada Queso',
            baseWeight: 0.090,
            items: [
                { ingredient: { connect: { id: idMasa } }, quantity: 1, role: 'BASE' },
                { ingredient: { connect: { id: idQueso } }, quantity: 0.030, role: 'BASE' },
                { ingredient: { connect: { id: idBechamel } }, quantity: 0.010, role: 'BASE' }
            ]
        },
        // Carapacho (Use Pollo ID if Carapacho missing, or create item? I'll skip Carapacho item creation to avoid errors, map to Shrimp for now or generic)
        // Assume 'Marisco' uses mix.

        // --- HAND ROLLS (Uses Arroz Sushi) ---
        // 170g Arroz, 25g Queso, 25g Palta
        {
            productName: 'HandRoll Salmón',
            recipeName: 'Receta Handroll Salmón',
            baseWeight: 0.260,
            items: [
                { ingredient: { connect: { id: idArrozSushi } }, quantity: 0.170, role: 'BASE' },
                { ingredient: { connect: { id: idSalmon } }, quantity: 0.040, role: 'PROTEIN_MAIN' },
                { ingredient: { connect: { id: idQuesoCrema } }, quantity: 0.025, role: 'BASE' },
                { ingredient: { connect: { id: idPalta } }, quantity: 0.025, role: 'VEGGIE' }
                // Nori excluded (packaging/low cost) or missing ID
            ]
        },
        {
            productName: 'HandRoll Camarón',
            recipeName: 'Receta Handroll Camarón',
            baseWeight: 0.255,
            items: [
                { ingredient: { connect: { id: idArrozSushi } }, quantity: 0.170, role: 'BASE' },
                { ingredient: { connect: { id: idCamaron } }, quantity: 0.035, role: 'PROTEIN_MAIN' },
                { ingredient: { connect: { id: idQuesoCrema } }, quantity: 0.025, role: 'BASE' },
                { ingredient: { connect: { id: idPalta } }, quantity: 0.025, role: 'VEGGIE' }
            ]
        },
        // HandRoll Pollo (P8)
        {
            productName: 'HandRoll Pollo',
            recipeName: 'Receta Handroll Pollo',
            baseWeight: 0.260,
            items: [
                { ingredient: { connect: { id: idArrozSushi } }, quantity: 0.170, role: 'BASE' },
                { ingredient: { connect: { id: idPollo } }, quantity: 0.040, role: 'PROTEIN_MAIN' },
                { ingredient: { connect: { id: idQuesoCrema } }, quantity: 0.025, role: 'BASE' },
                { ingredient: { connect: { id: idPalta } }, quantity: 0.025, role: 'VEGGIE' }
            ]
        },

        // --- PLATOS PREP / BOWLS ---
        {
            productName: 'Bowl Acevichado',
            recipeName: 'Receta Bowl Acevichado',
            baseWeight: 0.500,
            items: [
                { ingredient: { connect: { id: idArrozSushi } }, quantity: 0.200, role: 'BASE' },
                { ingredient: { connect: { id: idBaseCeviche } }, quantity: 0.150, role: 'BASE' }, // Veggie Base Mix
                { ingredient: { connect: { id: idSalmon } }, quantity: 0.050, role: 'PROTEIN_MAIN' }, // Sample Protein
                { ingredient: { connect: { id: idPalta } }, quantity: 0.050, role: 'VEGGIE' }
            ]
        },
        {
            productName: 'Gohan',
            recipeName: 'Receta Base Gohan',
            baseWeight: 0.350,
            items: [
                { ingredient: { connect: { id: idArrozSushi } }, quantity: 0.200, role: 'BASE' },
                { ingredient: { connect: { id: idQuesoCrema } }, quantity: 0.050, role: 'BASE' },
                { ingredient: { connect: { id: idPalta } }, quantity: 0.100, role: 'VEGGIE' }
                // Protein chosen by user
            ]
        },

        // --- CEVICHES (Selling Products) ---
        // Using Base Sólida (~60%) + Fish (~40%) ratio?
        // 350g -> 210g Base + 140g Fish
        {
            productName: 'Ceviche LoMASRico 350g',
            recipeName: 'Receta Ceviche LMR 350g',
            baseWeight: 0.350,
            items: [
                { ingredient: { connect: { id: idBaseCeviche } }, quantity: 0.210, role: 'BASE' },
                // Fish is usually added via Modifier/Option in POS, but we need a default for Costing?
                // The Product allows "Elige 3 Proteinas".
                // If we don't add protein here, the base cost is low.
                // Let's add "Salmón" as default representative cost?
                { ingredient: { connect: { id: idSalmon } }, quantity: 0.140, role: 'PROTEIN_MAIN' }
            ]
        },
        {
            productName: 'Ceviche LoMASRico 500g',
            recipeName: 'Receta Ceviche LMR 500g',
            baseWeight: 0.500,
            items: [
                { ingredient: { connect: { id: idBaseCeviche } }, quantity: 0.300, role: 'BASE' },
                { ingredient: { connect: { id: idSalmon } }, quantity: 0.200, role: 'PROTEIN_MAIN' }
            ]
        },
        {
            productName: 'Ceviche LoMASRico 1KG',
            recipeName: 'Receta Ceviche LMR 1KG',
            baseWeight: 1.000,
            items: [
                { ingredient: { connect: { id: idBaseCeviche } }, quantity: 0.600, role: 'BASE' },
                { ingredient: { connect: { id: idSalmon } }, quantity: 0.400, role: 'PROTEIN_MAIN' }
            ]
        },
        {
            productName: 'Crudo de Salmón',
            recipeName: 'Receta Crudo Salmón',
            baseWeight: 0.250,
            items: [
                { ingredient: { connect: { id: idSalmon } }, quantity: 0.200, role: 'PROTEIN_MAIN' },
                { ingredient: { connect: { id: idPalta } }, quantity: 0.050, role: 'VEGGIE' }
            ]
        },

        // --- CEVICHES LOMASRICO (tamaños faltantes) ---
        {
            productName: 'Ceviche LoMASRico 250g',
            recipeName: 'Receta Ceviche LMR 250g',
            baseWeight: 0.250,
            items: [
                { ingredient: { connect: { id: idBaseCeviche } }, quantity: 0.160, role: 'BASE' },
                { ingredient: { connect: { id: idSalmon } }, quantity: 0.090, role: 'PROTEIN_MAIN' }
            ]
        },
        {
            productName: 'Ceviche LoMASRico 750g',
            recipeName: 'Receta Ceviche LMR 750g',
            baseWeight: 0.750,
            items: [
                { ingredient: { connect: { id: idBaseCeviche } }, quantity: 0.450, role: 'BASE' },
                { ingredient: { connect: { id: idSalmon } }, quantity: 0.300, role: 'PROTEIN_MAIN' }
            ]
        },

        // --- CEVICHES PERUANOS ---
        // Base Peruana = "Base Ceviche Peruano" (leche de tigre estilo peruano con rocoto/apio)
        // Si no existe en inventory, falls back a idBaseCeviche
        {
            productName: 'Ceviche Peruano 350g',
            recipeName: 'Receta Ceviche Peruano 350g',
            baseWeight: 0.350,
            items: [
                { ingredient: { connect: { id: idBaseCeviche } }, quantity: 0.210, role: 'BASE' },
                { ingredient: { connect: { id: idSalmon } }, quantity: 0.140, role: 'PROTEIN_MAIN' }
            ]
        },
        {
            productName: 'Ceviche Peruano 500g',
            recipeName: 'Receta Ceviche Peruano 500g',
            baseWeight: 0.500,
            items: [
                { ingredient: { connect: { id: idBaseCeviche } }, quantity: 0.300, role: 'BASE' },
                { ingredient: { connect: { id: idSalmon } }, quantity: 0.200, role: 'PROTEIN_MAIN' }
            ]
        },
        {
            productName: 'Ceviche Peruano 750g',
            recipeName: 'Receta Ceviche Peruano 750g',
            baseWeight: 0.750,
            items: [
                { ingredient: { connect: { id: idBaseCeviche } }, quantity: 0.450, role: 'BASE' },
                { ingredient: { connect: { id: idSalmon } }, quantity: 0.300, role: 'PROTEIN_MAIN' }
            ]
        },
        {
            productName: 'Ceviche Peruano 1KG',
            recipeName: 'Receta Ceviche Peruano 1KG',
            baseWeight: 1.000,
            items: [
                { ingredient: { connect: { id: idBaseCeviche } }, quantity: 0.600, role: 'BASE' },
                { ingredient: { connect: { id: idSalmon } }, quantity: 0.400, role: 'PROTEIN_MAIN' }
            ]
        }
    ];

    // 3. Execution Loop
    for (const r of recipes) {
        const pid = await findProductId(prisma, r.productName);
        if (pid) {
            console.log(`Creating Recipe for ${r.productName} -> ${pid}`);
            try {
                const existingRecipe = await prisma.recipe.findFirst({
                    where: { sellingProduct: { id: pid } }
                });

                if (existingRecipe) {
                    await prisma.recipe.update({
                        where: { id: existingRecipe.id },
                        data: {
                            name: r.recipeName,
                            baseWeight: r.baseWeight,
                            sellingProduct: { connect: { id: pid } },
                            items: {
                                deleteMany: {},
                                create: r.items.map(i => ({
                                    ingredient: i.ingredient,
                                    quantity: i.quantity,
                                    role: (i.role || 'BASE') as any
                                }))
                            }
                        }
                    });
                } else {
                    await prisma.recipe.create({
                        data: {
                            name: r.recipeName,
                            baseWeight: r.baseWeight,
                            sellingProduct: { connect: { id: pid } }, // Link to Product
                            items: {
                                create: r.items.map(i => ({
                                    ingredient: i.ingredient,
                                    quantity: i.quantity,
                                    role: (i.role || 'BASE') as any
                                }))
                            }
                        }
                    });
                }
            } catch (e) {
                console.error(`Error seeding recipe for ${r.productName}:`, e.message);
            }
        } else {
            console.warn(`Product not found for recipe: ${r.productName}`);
        }
    }

    console.log('✅ Selling Recipes Seeding Complete.');
};
