/**
 * Migration: Create Ceviche Base preparations and simplify ceviche recipes
 * 
 * Creates:
 * - "Base Ceviche LMR" (PREPARATION) with recipe: pimentón + choclo + cebolla + palta + leche de tigre
 * - "Base Ceviche Peruano" (PREPARATION) with recipe: choclo peruano + cebolla + leche de tigre peruano
 * - "Base Ceviche Tropical" (PREPARATION) with recipe: mango + cebolla + choclo + leche de tigre tropical
 * - "Leche de Tigre Peruano" (PREPARATION) - if not exists
 * - "Leche de Tigre Tropical" (PREPARATION) - if not exists
 * 
 * Updates ceviche product recipes to reference the base preparations instead of individual ingredients
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// IDs from production DB audit
const INVENTORY = {
    // Verduras
    pimenton:       '8275a41e-f3cc-4b32-b8f2-36b15a977b33',
    chocloNormal:   'f81256f1-1514-45d7-bba5-83160848f07d',
    chocloPeruano:  'dad871d3-a08f-4f2a-aef3-8fe502c0bb59',
    cebollaA:       '3e42c1e3-b4df-40a8-8255-6e30493d6809', // "Cebolla morada" (lowercase)
    cebollaB:       '20dba7ed-e0a6-4bba-a903-1158c8cfed39', // "Cebolla Morada" (uppercase)
    palta:          '3fa25db6-22da-404d-abde-a7efb7c03f82',
    mangoCubos:     '5f750adc-9e31-42a7-a974-2b60fcd671d7',
    pulpaMango:     'faa3e7ed-3717-4925-aaca-6fe2f9c2386d',
    canchita:       '9605a641-8575-4de8-a09b-d20fe3a34420',

    // Base ingredients for leche de tigre
    limonAmarillo:  'feb6d2f7-d928-4384-92a4-3c5e96904d36',
    limonSutil:     'ad5e77de-bd9b-4628-89be-a15be3d2d408',
    cilantro:       '9c484d99-0d24-48b0-b33e-d708844d5d4e',
    jengibre:       '330bc1a9-a36a-4e1d-b260-7d808c9da540',
    alinoLMR:       'dae15634-00d2-45e8-933b-a47dd1beb7cf',
    apio:           '52c768ce-2b1a-419e-8dd1-e18423e812a3',
    lecheEvaporada: 'c04daeea-1f6f-434a-a9a2-2aea0eee479e',

    // Existing preparations
    lecheDetigreExisting: '26cf2a8d-fad1-40dc-907f-66aaf995d552',
};

// Ceviche product recipe IDs from production
const CEVICHE_RECIPES = {
    tradicional:   '0605c455-80ff-40df-9120-ef5c6a4addcd',
    sinVerduras:   '29c3bba3-5ce1-4eba-991d-3c49e790cbec',
    peruano:       'a1b2c3d4-1111-4aaa-bbbb-ceviperuan01',
    especial:      'a1b2c3d4-2222-4aaa-bbbb-cevisinver01',
    tropical:      'a1b2c3d4-3333-4aaa-bbbb-cevitropca01',
    vegetariano:   'a1b2c3d4-4444-4aaa-bbbb-cevivegan01',
    piscoSour:     'cccc0002-0001-4aaa-bbbb-cevisour0001',
};

async function main() {
    console.log('\n🏗️  MIGRACIÓN: Bases de Ceviche como Preparaciones\n');
    console.log('='.repeat(60));

    // ─── STEP 1: Rename existing leche de tigre to "Leche de Tigre Tradicional" ───
    console.log('\n📌 STEP 1: Renombrar leche de tigre existente...');
    await p.inventoryItem.update({
        where: { id: INVENTORY.lecheDetigreExisting },
        data: { name: 'Leche de Tigre Tradicional' }
    });
    console.log('   ✅ "leche de tigre" → "Leche de Tigre Tradicional"');

    // ─── STEP 2: Create Leche de Tigre Peruano ───
    console.log('\n📌 STEP 2: Crear Leche de Tigre Peruano...');
    const ldtPeruano = await p.inventoryItem.create({
        data: {
            name: 'Leche de Tigre Peruano',
            type: 'PREPARATION',
            unit: 'LT',
            category: 'PREPARACIONES',
            role: 'BASE',
            currentStock: 0,
            costPerUnit: 0,
        }
    });
    // Recipe for LDT Peruano (2400cc batch - same structure, limón sutil instead of amarillo)
    const ldtPeruanoRecipe = await p.recipe.create({
        data: {
            name: 'Receta Leche de Tigre Peruano (2.4L)',
            baseWeight: 2.4,
            outputItemId: ldtPeruano.id,
            items: {
                create: [
                    { ingredientId: INVENTORY.limonSutil, quantity: 1.0, role: 'BASE' },      // 1L limón sutil
                    { ingredientId: INVENTORY.cilantro, quantity: 0.120, role: 'BASE' },       // 120g cilantro
                    { ingredientId: INVENTORY.jengibre, quantity: 0.016, role: 'BASE' },       // 16g jengibre
                    { ingredientId: INVENTORY.alinoLMR, quantity: 0.160, role: 'BASE' },       // 160g aliño
                    { ingredientId: INVENTORY.apio, quantity: 200, role: 'BASE' },             // BLT (200g apio)
                    { ingredientId: INVENTORY.cebollaA, quantity: 0.100, role: 'BASE' },       // BLT (100g cebolla)
                    { ingredientId: INVENTORY.pimenton, quantity: 0.030, role: 'BASE' },       // BLT (30g pimentón)
                    { ingredientId: INVENTORY.lecheEvaporada, quantity: 0.240, role: 'BASE' }, // 240cc leche evaporada
                ]
            }
        }
    });
    console.log(`   ✅ Creado: ${ldtPeruano.name} (${ldtPeruano.id}) + receta ${ldtPeruanoRecipe.id}`);

    // ─── STEP 3: Create Leche de Tigre Tropical ───
    console.log('\n📌 STEP 3: Crear Leche de Tigre Tropical...');
    const ldtTropical = await p.inventoryItem.create({
        data: {
            name: 'Leche de Tigre Tropical',
            type: 'PREPARATION',
            unit: 'LT',
            category: 'PREPARACIONES',
            role: 'BASE',
            currentStock: 0,
            costPerUnit: 0,
        }
    });
    const ldtTropicalRecipe = await p.recipe.create({
        data: {
            name: 'Receta Leche de Tigre Tropical (1.2L)',
            baseWeight: 1.2,
            outputItemId: ldtTropical.id,
            items: {
                create: [
                    { ingredientId: INVENTORY.limonAmarillo, quantity: 0.500, role: 'BASE' }, // 500cc limón
                    { ingredientId: INVENTORY.jengibre, quantity: 0.008, role: 'BASE' },      // 8g jengibre
                    { ingredientId: INVENTORY.alinoLMR, quantity: 0.070, role: 'BASE' },      // 70g aliño
                    { ingredientId: INVENTORY.pulpaMango, quantity: 0.100, role: 'BASE' },    // 100g pulpa mango
                    { ingredientId: INVENTORY.apio, quantity: 100, role: 'BASE' },            // BLT sin pimentón
                    { ingredientId: INVENTORY.cebollaA, quantity: 0.050, role: 'BASE' },      // BLT cebolla
                    { ingredientId: INVENTORY.lecheEvaporada, quantity: 0.120, role: 'BASE' },// 120cc leche evaporada
                ]
            }
        }
    });
    console.log(`   ✅ Creado: ${ldtTropical.name} (${ldtTropical.id}) + receta ${ldtTropicalRecipe.id}`);

    // ─── STEP 4: Create Base Ceviche LMR (PREPARATION) ───
    console.log('\n📌 STEP 4: Crear Base Ceviche LMR...');
    // Base for 4 KG: pimentón 240g, choclo 400g, cebolla 480g, palta 160g, leche tigre 1200ml
    // Per KG: pimentón 60g, choclo 100g, cebolla 120g, palta 40g, leche tigre 300ml
    const baseLMR = await p.inventoryItem.create({
        data: {
            name: 'Base Ceviche LMR',
            type: 'PREPARATION',
            unit: 'KG',
            category: 'PREPARACIONES',
            role: 'BASE',
            currentStock: 0,
            costPerUnit: 0,
        }
    });
    const baseLMRRecipe = await p.recipe.create({
        data: {
            name: 'Receta Base Ceviche LMR (4 KG)',
            baseWeight: 4.0,
            outputItemId: baseLMR.id,
            items: {
                create: [
                    { ingredientId: INVENTORY.pimenton, quantity: 0.240, role: 'VEGGIE' },           // 240g pimentón
                    { ingredientId: INVENTORY.chocloNormal, quantity: 0.400, role: 'VEGGIE' },       // 400g choclo
                    { ingredientId: INVENTORY.cebollaA, quantity: 0.480, role: 'VEGGIE' },           // 480g cebolla
                    { ingredientId: INVENTORY.palta, quantity: 0.160, role: 'VEGGIE' },              // 160g palta
                    { ingredientId: INVENTORY.lecheDetigreExisting, quantity: 1.200, role: 'BASE' }, // 1200ml leche tigre
                ]
            }
        }
    });
    console.log(`   ✅ Creado: ${baseLMR.name} (${baseLMR.id}) + receta ${baseLMRRecipe.id}`);

    // ─── STEP 5: Create Base Ceviche Peruano (PREPARATION) ───
    console.log('\n📌 STEP 5: Crear Base Ceviche Peruano...');
    // Base Peruano 4KG: choclo 500g, cebolla 580g, leche tigre peruano 1200ml
    const basePeruano = await p.inventoryItem.create({
        data: {
            name: 'Base Ceviche Peruano',
            type: 'PREPARATION',
            unit: 'KG',
            category: 'PREPARACIONES',
            role: 'BASE',
            currentStock: 0,
            costPerUnit: 0,
        }
    });
    const basePeruanoRecipe = await p.recipe.create({
        data: {
            name: 'Receta Base Ceviche Peruano (4 KG)',
            baseWeight: 4.0,
            outputItemId: basePeruano.id,
            items: {
                create: [
                    { ingredientId: INVENTORY.chocloPeruano, quantity: 0.500, role: 'VEGGIE' },  // 500g choclo peruano
                    { ingredientId: INVENTORY.cebollaA, quantity: 0.580, role: 'VEGGIE' },       // 580g cebolla
                    { ingredientId: ldtPeruano.id, quantity: 1.200, role: 'BASE' },              // 1200ml leche tigre peruano
                ]
            }
        }
    });
    console.log(`   ✅ Creado: ${basePeruano.name} (${basePeruano.id}) + receta ${basePeruanoRecipe.id}`);

    // ─── STEP 6: Create Base Ceviche Tropical (PREPARATION) ───
    console.log('\n📌 STEP 6: Crear Base Ceviche Tropical...');
    const baseTropical = await p.inventoryItem.create({
        data: {
            name: 'Base Ceviche Tropical',
            type: 'PREPARATION',
            unit: 'KG',
            category: 'PREPARACIONES',
            role: 'BASE',
            currentStock: 0,
            costPerUnit: 0,
        }
    });
    const baseTropicalRecipe = await p.recipe.create({
        data: {
            name: 'Receta Base Ceviche Tropical (4 KG)',
            baseWeight: 4.0,
            outputItemId: baseTropical.id,
            items: {
                create: [
                    { ingredientId: INVENTORY.mangoCubos, quantity: 0.400, role: 'VEGGIE' },     // mango
                    { ingredientId: INVENTORY.cebollaA, quantity: 0.400, role: 'VEGGIE' },       // cebolla
                    { ingredientId: INVENTORY.chocloNormal, quantity: 0.300, role: 'VEGGIE' },   // choclo
                    { ingredientId: ldtTropical.id, quantity: 1.200, role: 'BASE' },             // leche tigre tropical
                ]
            }
        }
    });
    console.log(`   ✅ Creado: ${baseTropical.name} (${baseTropical.id}) + receta ${baseTropicalRecipe.id}`);

    // ─── STEP 7: Simplify ceviche product recipes ───
    console.log('\n📌 STEP 7: Simplificar recetas de ceviches...');

    // Helper: wipe old recipe items and set new ones
    async function simplifyRecipe(recipeId, recipeName, newItems, extraData = {}) {
        // Delete old items
        await p.recipeItem.deleteMany({ where: { recipeId } });
        // Create new items
        for (const item of newItems) {
            await p.recipeItem.create({
                data: { recipeId, ...item }
            });
        }
        // Update recipe name if needed
        if (extraData.name || extraData.baseWeight !== undefined || extraData.maxProteins !== undefined) {
            await p.recipe.update({
                where: { id: recipeId },
                data: {
                    name: extraData.name || undefined,
                    baseWeight: extraData.baseWeight !== undefined ? extraData.baseWeight : undefined,
                    maxProteins: extraData.maxProteins !== undefined ? extraData.maxProteins : undefined,
                }
            });
        }
        console.log(`   ✅ ${recipeName}: ${newItems.length} items`);
    }

    // Ceviche Tradicional: Base LMR (0.640 KG for 1KG format)
    await simplifyRecipe(CEVICHE_RECIPES.tradicional, 'Ceviche Tradicional', [
        { ingredientId: baseLMR.id, quantity: 0.640, role: 'BASE' },
    ], { name: 'Fórmula Ceviche Tradicional', baseWeight: 1000, maxProteins: 3 });

    // Ceviche Peruano: Base Peruano + Canchita
    await simplifyRecipe(CEVICHE_RECIPES.peruano, 'Ceviche Peruano', [
        { ingredientId: basePeruano.id, quantity: 0.640, role: 'BASE' },
        { ingredientId: INVENTORY.canchita, quantity: 0.050, role: 'BASE' },
    ], { name: 'Fórmula Ceviche Peruano', baseWeight: 1000, maxProteins: 3 });

    // Ceviche Tropical: Base Tropical
    await simplifyRecipe(CEVICHE_RECIPES.tropical, 'Ceviche Tropical', [
        { ingredientId: baseTropical.id, quantity: 0.640, role: 'BASE' },
    ], { name: 'Fórmula Ceviche Tropical', baseWeight: 1000, maxProteins: 3 });

    // Ceviche Especial (quita verduras): Base LMR — same base, the "quita verduras" is handled by resolver
    await simplifyRecipe(CEVICHE_RECIPES.especial, 'Ceviche Especial (sin verduras)', [
        { ingredientId: baseLMR.id, quantity: 0.640, role: 'BASE' },
    ], { name: 'Fórmula Ceviche Especial', baseWeight: 1000, maxProteins: 3 });

    // Ceviche Vegetariano: Base LMR + Champiñón (no proteins)
    // Find champiñón
    const champi = await p.inventoryItem.findFirst({ where: { name: { contains: 'hampi', mode: 'insensitive' } } });
    if (champi) {
        await simplifyRecipe(CEVICHE_RECIPES.vegetariano, 'Ceviche Vegetariano', [
            { ingredientId: baseLMR.id, quantity: 0.430, role: 'BASE' },      // más base, menos proteína
            { ingredientId: champi.id, quantity: 0.070, role: 'BASE' },       // 70g champiñón (500g format)
        ], { name: 'Fórmula Ceviche Vegetariano', baseWeight: 500, maxProteins: 0 });
    }

    // Ceviche + Pisco Sour: Base LMR
    await simplifyRecipe(CEVICHE_RECIPES.piscoSour, 'Ceviche + Pisco Sour', [
        { ingredientId: baseLMR.id, quantity: 0.470, role: 'BASE' },
    ], { name: 'Fórmula Ceviche + Pisco Sour', baseWeight: 750, maxProteins: 3 });

    // Ceviche Sin Verduras (500g) — if active, same treatment
    if (CEVICHE_RECIPES.sinVerduras) {
        await simplifyRecipe(CEVICHE_RECIPES.sinVerduras, 'Ceviche Sin Verduras 500g', [
            { ingredientId: baseLMR.id, quantity: 0.320, role: 'BASE' },
        ], { name: 'Fórmula Ceviche Sin Verduras', baseWeight: 1000, maxProteins: 3 });
    }

    // ─── STEP 8: Verify ───
    console.log('\n📌 STEP 8: Verificación...');
    const allCeviches = await p.recipe.findMany({
        where: { id: { in: Object.values(CEVICHE_RECIPES) } },
        include: {
            sellingProduct: { select: { name: true } },
            items: { include: { ingredient: { select: { name: true, type: true, unit: true } } } }
        }
    });

    for (const r of allCeviches) {
        console.log(`\n   ${r.sellingProduct?.name || r.name}:`);
        for (const i of r.items) {
            console.log(`      [${i.role.padEnd(10)}] ${i.ingredient.name.padEnd(30)} ${i.quantity} ${i.ingredient.unit} (${i.ingredient.type})`);
        }
    }

    const allPreps = await p.inventoryItem.findMany({
        where: { type: 'PREPARATION' },
        include: { productionRecipe: { include: { items: { include: { ingredient: true } } } } }
    });
    console.log('\n   === PREPARACIONES ===');
    for (const prep of allPreps) {
        const hasRecipe = prep.productionRecipe ? `${prep.productionRecipe.items.length} items` : 'SIN RECETA';
        console.log(`   ${prep.name.padEnd(35)} | ${hasRecipe}`);
    }

    console.log('\n✅ MIGRACIÓN COMPLETADA\n');
    await p.$disconnect();
}

main().catch(e => { console.error('❌ ERROR:', e.message); p.$disconnect(); });
