/**
 * FINAL FIX: Remove Leche de Tigre as PREPARATION items
 * Inline all LdT ingredients directly into ceviche recipes
 * Revert unrollBases to false (empanadas need it)
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const INVENTORY = {
    limonAmarillo:  'feb6d2f7-d928-4384-92a4-3c5e96904d36',
    limonSutil:     'ad5e77de-bd9b-4628-89be-a15be3d2d408',
    cilantro:       '9c484d99-0d24-48b0-b33e-d708844d5d4e',
    jengibre:       '330bc1a9-a36a-4e1d-b260-7d808c9da540',
    alinoLMR:       'dae15634-00d2-45e8-933b-a47dd1beb7cf',
    apio:           '52c768ce-2b1a-419e-8dd1-e18423e812a3',
    cebollaA:       '3e42c1e3-b4df-40a8-8255-6e30493d6809',
    pimenton:       '8275a41e-f3cc-4b32-b8f2-36b15a977b33',
    lecheEvaporada: 'c04daeea-1f6f-434a-a9a2-2aea0eee479e',
    chocloNormal:   'f81256f1-1514-45d7-bba5-83160848f07d',
    chocloPeruano:  'dad871d3-a08f-4f2a-aef3-8fe502c0bb59',
    palta:          '3fa25db6-22da-404d-abde-a7efb7c03f82',
    mangoCubos:     '5f750adc-9e31-42a7-a974-2b60fcd671d7',
    canchita:       '9605a641-8575-4de8-a09b-d20fe3a34420',
    pulpaMango:     'faa3e7ed-3717-4925-aaca-6fe2f9c2386d',

    ldtTradicional: '26cf2a8d-fad1-40dc-907f-66aaf995d552',
    ldtPeruano:     'c008fb5d-b87a-46a4-80be-c0a39acdb6fb',
    ldtTropical:    'bd93d9ab-b997-4fa3-98f1-84acc157a2b5',
};

const CEVICHE_RECIPES = {
    tradicional:   '0605c455-80ff-40df-9120-ef5c6a4addcd',
    sinVerduras:   '29c3bba3-5ce1-4eba-991d-3c49e790cbec',
    peruano:       'a1b2c3d4-1111-4aaa-bbbb-ceviperuan01',
    especial:      'a1b2c3d4-2222-4aaa-bbbb-cevisinver01',
    tropical:      'a1b2c3d4-3333-4aaa-bbbb-cevitropca01',
    vegetariano:   'a1b2c3d4-4444-4aaa-bbbb-cevivegan01',
    piscoSour:     'cccc0002-0001-4aaa-bbbb-cevisour0001',
};

// LdT Tradicional ingredientes por 1KG de ceviche (225ml ÷ 2.4L batch = 0.09375 scale)
// Batch 2.4L: limón 1KG, cilantro 120g, jengibre 16g, aliño 160g, apio 200g, cebolla 100g, pimentón 60g, leche evap 240g
const LDT_TRADICIONAL_PER_KG = [
    { ingredientId: INVENTORY.limonAmarillo, quantity: 0.094, role: 'BASE' },   // 94g
    { ingredientId: INVENTORY.cilantro, quantity: 0.011, role: 'BASE' },        // 11g
    { ingredientId: INVENTORY.jengibre, quantity: 0.002, role: 'BASE' },        // 2g
    { ingredientId: INVENTORY.alinoLMR, quantity: 0.015, role: 'BASE' },        // 15g
    { ingredientId: INVENTORY.apio, quantity: 0.019, role: 'BASE' },            // 19g
    { ingredientId: INVENTORY.lecheEvaporada, quantity: 0.023, role: 'BASE' },  // 23g
];

// LdT Peruano por 1KG de ceviche (300ml ÷ 2.4L batch = 0.125 scale)
// Batch 2.4L: limón sutil 1KG, cilantro 120g, jengibre 16g, aliño 160g, apio 200g, cebolla 100g, pimentón 30g, leche evap 240g
const LDT_PERUANO_PER_KG = [
    { ingredientId: INVENTORY.limonSutil, quantity: 0.125, role: 'BASE' },      // 125g
    { ingredientId: INVENTORY.cilantro, quantity: 0.015, role: 'BASE' },        // 15g
    { ingredientId: INVENTORY.jengibre, quantity: 0.002, role: 'BASE' },        // 2g
    { ingredientId: INVENTORY.alinoLMR, quantity: 0.020, role: 'BASE' },        // 20g
    { ingredientId: INVENTORY.apio, quantity: 0.025, role: 'BASE' },            // 25g
    { ingredientId: INVENTORY.lecheEvaporada, quantity: 0.030, role: 'BASE' },  // 30g
];

// LdT Tropical por 1KG de ceviche (225ml ÷ 1.2L batch = 0.1875 scale)
// Batch 1.2L: limón 500g, jengibre 8g, aliño 70g, pulpa mango 100g, apio 100g, cebolla 50g, leche evap 120g
const LDT_TROPICAL_PER_KG = [
    { ingredientId: INVENTORY.limonAmarillo, quantity: 0.094, role: 'BASE' },   // 94g
    { ingredientId: INVENTORY.jengibre, quantity: 0.002, role: 'BASE' },        // 2g
    { ingredientId: INVENTORY.alinoLMR, quantity: 0.013, role: 'BASE' },        // 13g
    { ingredientId: INVENTORY.pulpaMango, quantity: 0.019, role: 'BASE' },      // 19g
    { ingredientId: INVENTORY.apio, quantity: 0.019, role: 'BASE' },            // 19g
    { ingredientId: INVENTORY.lecheEvaporada, quantity: 0.023, role: 'BASE' },  // 23g
];

async function setRecipe(recipeId, label, items) {
    await p.recipeItem.deleteMany({ where: { recipeId } });
    for (const item of items) {
        await p.recipeItem.create({ data: { recipeId, ...item } });
    }
    console.log(`   ✅ ${label}: ${items.length} items`);
}

async function main() {
    console.log('\n🔧 FINAL: Inline LdT ingredients into ceviche recipes\n');

    // ── STEP 1: Update all ceviche recipes with inlined LdT ──
    console.log('📌 STEP 1: Actualizar recetas de ceviches...');

    // Ceviche Tradicional (1KG): verduras + LdT Tradicional inlined
    await setRecipe(CEVICHE_RECIPES.tradicional, 'Ceviche Tradicional', [
        { ingredientId: INVENTORY.pimenton, quantity: 0.060, role: 'VEGGIE' },
        { ingredientId: INVENTORY.chocloNormal, quantity: 0.100, role: 'VEGGIE' },
        { ingredientId: INVENTORY.cebollaA, quantity: 0.120, role: 'VEGGIE' },
        { ingredientId: INVENTORY.palta, quantity: 0.040, role: 'VEGGIE' },
        ...LDT_TRADICIONAL_PER_KG,
    ]);

    // Ceviche Especial (misma receta que Tradicional, resolver quita verduras)
    await setRecipe(CEVICHE_RECIPES.especial, 'Ceviche Especial', [
        { ingredientId: INVENTORY.pimenton, quantity: 0.060, role: 'VEGGIE' },
        { ingredientId: INVENTORY.chocloNormal, quantity: 0.100, role: 'VEGGIE' },
        { ingredientId: INVENTORY.cebollaA, quantity: 0.120, role: 'VEGGIE' },
        { ingredientId: INVENTORY.palta, quantity: 0.040, role: 'VEGGIE' },
        ...LDT_TRADICIONAL_PER_KG,
    ]);

    // Ceviche Peruano (1KG): verduras + LdT Peruano inlined + canchita
    await setRecipe(CEVICHE_RECIPES.peruano, 'Ceviche Peruano', [
        { ingredientId: INVENTORY.chocloPeruano, quantity: 0.125, role: 'VEGGIE' },
        { ingredientId: INVENTORY.cebollaA, quantity: 0.145, role: 'VEGGIE' },
        { ingredientId: INVENTORY.canchita, quantity: 0.050, role: 'BASE' },
        ...LDT_PERUANO_PER_KG,
    ]);

    // Ceviche Tropical (1KG): verduras + LdT Tropical inlined
    await setRecipe(CEVICHE_RECIPES.tropical, 'Ceviche Tropical', [
        { ingredientId: INVENTORY.mangoCubos, quantity: 0.100, role: 'VEGGIE' },
        { ingredientId: INVENTORY.cebollaA, quantity: 0.100, role: 'VEGGIE' },
        { ingredientId: INVENTORY.chocloNormal, quantity: 0.080, role: 'VEGGIE' },
        { ingredientId: INVENTORY.pimenton, quantity: 0.040, role: 'VEGGIE' },
        ...LDT_TROPICAL_PER_KG,
    ]);

    // Ceviche Vegetariano (500g base)
    const champi = await p.inventoryItem.findFirst({ where: { name: { contains: 'hampi', mode: 'insensitive' } } });
    if (champi) {
        const ldtVeg = LDT_TRADICIONAL_PER_KG.map(i => ({ ...i, quantity: i.quantity * 0.67 })); // ~150ml LdT for 500g
        await setRecipe(CEVICHE_RECIPES.vegetariano, 'Ceviche Vegetariano', [
            { ingredientId: champi.id, quantity: 0.070, role: 'BASE' },
            { ingredientId: INVENTORY.pimenton, quantity: 0.030, role: 'VEGGIE' },
            { ingredientId: INVENTORY.chocloNormal, quantity: 0.050, role: 'VEGGIE' },
            { ingredientId: INVENTORY.cebollaA, quantity: 0.060, role: 'VEGGIE' },
            { ingredientId: INVENTORY.palta, quantity: 0.020, role: 'VEGGIE' },
            ...ldtVeg,
        ]);
    }

    // Ceviche + Pisco Sour (750g base)
    const ldtPisco = LDT_TRADICIONAL_PER_KG.map(i => ({ ...i, quantity: Math.round(i.quantity * 1000) / 1000 }));
    await setRecipe(CEVICHE_RECIPES.piscoSour, 'Ceviche + Pisco Sour', [
        { ingredientId: INVENTORY.pimenton, quantity: 0.045, role: 'VEGGIE' },
        { ingredientId: INVENTORY.chocloNormal, quantity: 0.075, role: 'VEGGIE' },
        { ingredientId: INVENTORY.cebollaA, quantity: 0.090, role: 'VEGGIE' },
        { ingredientId: INVENTORY.palta, quantity: 0.030, role: 'VEGGIE' },
        ...ldtPisco,
    ]);

    // Ceviche Sin Verduras (solo LdT)
    await setRecipe(CEVICHE_RECIPES.sinVerduras, 'Ceviche Sin Verduras', [
        ...LDT_TRADICIONAL_PER_KG,
    ]);

    // ── STEP 2: Delete LdT PREPARATION items ──
    console.log('\n📌 STEP 2: Eliminar Leche de Tigre del inventario...');
    for (const [name, id] of [['Tradicional', INVENTORY.ldtTradicional], ['Peruano', INVENTORY.ldtPeruano], ['Tropical', INVENTORY.ldtTropical]]) {
        // Remove recipe items referencing this LdT
        await p.recipeItem.deleteMany({ where: { ingredientId: id } });
        // Remove its production recipe
        const recipe = await p.recipe.findFirst({ where: { outputItemId: id } });
        if (recipe) {
            await p.recipeItem.deleteMany({ where: { recipeId: recipe.id } });
            await p.recipe.delete({ where: { id: recipe.id } });
        }
        // Remove stock movements
        await p.stockMovement.deleteMany({ where: { inventoryItemId: id } });
        // Remove inventory item
        try {
            await p.inventoryItem.delete({ where: { id } });
            console.log(`   ✅ Eliminado: LdT ${name}`);
        } catch (e) {
            console.log(`   ⚠️ LdT ${name}: ${e.message}`);
        }
    }

    // ── STEP 3: Verify ──
    console.log('\n📌 STEP 3: Verificación final...');
    const recipes = await p.recipe.findMany({
        where: { id: { in: Object.values(CEVICHE_RECIPES) } },
        include: {
            sellingProduct: { select: { name: true, price: true } },
            items: { include: { ingredient: { select: { name: true, type: true, unit: true, costPerUnit: true } } }, orderBy: { role: 'asc' } }
        }
    });

    for (const r of recipes) {
        let totalCost = 0;
        const hasPrepItems = r.items.some(i => i.ingredient.type === 'PREPARATION');
        console.log(`\n   ${r.sellingProduct?.name} (baseWeight: ${r.baseWeight}) ${hasPrepItems ? '⚠️ STILL HAS PREPARATION ITEMS' : '✅'}`);
        for (const i of r.items) {
            const cost = i.quantity * Number(i.ingredient.costPerUnit);
            totalCost += cost;
            console.log(`      [${i.role.padEnd(8)}] ${i.ingredient.name.padEnd(25)} ${i.quantity} ${i.ingredient.unit} → $${Math.round(cost)}`);
        }
        console.log(`      TOTAL BASE: $${Math.round(totalCost)}`);
    }

    // Verify no LdT in inventory
    const ldts = await p.inventoryItem.findMany({ where: { name: { contains: 'Leche de Tigre' } } });
    console.log(`\n   LdT items en inventario: ${ldts.length === 0 ? '0 ✅' : ldts.map(l => l.name).join(', ')}`);

    // Verify preparations remaining (should be just empanadas + bechamel)
    const preps = await p.inventoryItem.findMany({ where: { type: 'PREPARATION' } });
    console.log('   Preparaciones restantes:');
    for (const prep of preps) console.log(`      ${prep.name}`);

    console.log('\n✅ DONE\n');
    await p.$disconnect();
}

main().catch(e => { console.error('❌', e); p.$disconnect(); });
