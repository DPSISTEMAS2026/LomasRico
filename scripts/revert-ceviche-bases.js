/**
 * Revert Base Ceviche PREPARATIONs → Put raw ingredients directly in ceviche recipes
 * 
 * - Remove Base Ceviche LMR, Peruano, Tropical from inventory
 * - Update ceviche recipes with direct ingredients for 1KG format
 * - Keep Leche de Tigre Tradicional/Peruano/Tropical as PREPARATION (they ARE batch-produced)
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const INVENTORY = {
    // Verduras
    pimenton:       '8275a41e-f3cc-4b32-b8f2-36b15a977b33',
    chocloNormal:   'f81256f1-1514-45d7-bba5-83160848f07d',
    chocloPeruano:  'dad871d3-a08f-4f2a-aef3-8fe502c0bb59',
    cebollaA:       '3e42c1e3-b4df-40a8-8255-6e30493d6809',
    palta:          '3fa25db6-22da-404d-abde-a7efb7c03f82',
    mangoCubos:     '5f750adc-9e31-42a7-a974-2b60fcd671d7',
    canchita:       '9605a641-8575-4de8-a09b-d20fe3a34420',

    // Leches de tigre (KEEP as PREPARATION)
    ldtTradicional: '26cf2a8d-fad1-40dc-907f-66aaf995d552',
    ldtPeruano:     'c008fb5d-b87a-46a4-80be-c0a39acdb6fb',
    ldtTropical:    'bd93d9ab-b997-4fa3-98f1-84acc157a2b5',

    // Champiñón
    champinon:      null, // will be looked up
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

// Base Ceviche items to DELETE (created in previous migration)
const BASE_CEVICHE_IDS = {
    baseLMR:     'df01eb1e-5655-4947-83fc-acc7cfa414c2',
    basePeruano: 'ffa68594-cbe7-461a-ab8c-07c2561e10ec',
    baseTropical:'8af325a6-dc6c-44db-b2a2-ae904f609f42',
};

async function main() {
    console.log('\n🔄 REVERSIÓN: Bases de Ceviche → Ingredientes Directos\n');

    // Find champiñón
    const champi = await p.inventoryItem.findFirst({ where: { name: { contains: 'hampi', mode: 'insensitive' } } });
    INVENTORY.champinon = champi?.id;

    // ─── STEP 1: Delete Base Ceviche items and their recipes ───
    console.log('📌 STEP 1: Eliminar Base Ceviche PREPARATIONs...');
    for (const [name, id] of Object.entries(BASE_CEVICHE_IDS)) {
        // Delete recipe items first
        const recipe = await p.recipe.findFirst({ where: { outputItemId: id } });
        if (recipe) {
            await p.recipeItem.deleteMany({ where: { recipeId: recipe.id } });
            await p.recipe.delete({ where: { id: recipe.id } });
        }
        // Delete stock movements
        await p.stockMovement.deleteMany({ where: { inventoryItemId: id } });
        // Delete inventory item
        await p.inventoryItem.delete({ where: { id } }).catch(() => console.log(`   ⚠️ ${name} ya no existe`));
        console.log(`   ✅ Eliminado: ${name} (${id})`);
    }

    // ─── STEP 2: Update ceviche recipes with direct ingredients for 1KG ───
    console.log('\n📌 STEP 2: Recetas con ingredientes directos (formato 1KG)...');

    async function setRecipe(recipeId, label, items, extras = {}) {
        await p.recipeItem.deleteMany({ where: { recipeId } });
        for (const item of items) {
            await p.recipeItem.create({ data: { recipeId, ...item } });
        }
        if (Object.keys(extras).length > 0) {
            await p.recipe.update({ where: { id: recipeId }, data: extras });
        }
        console.log(`   ✅ ${label}: ${items.length} items`);
    }

    // ── Ceviche Tradicional (1KG) ──
    // Gramajes del SOP: pimentón 60g, choclo 100g, cebolla 120g, palta 40g, leche tigre 225ml
    await setRecipe(CEVICHE_RECIPES.tradicional, 'Ceviche Tradicional', [
        { ingredientId: INVENTORY.pimenton, quantity: 0.060, role: 'VEGGIE' },
        { ingredientId: INVENTORY.chocloNormal, quantity: 0.100, role: 'VEGGIE' },
        { ingredientId: INVENTORY.cebollaA, quantity: 0.120, role: 'VEGGIE' },
        { ingredientId: INVENTORY.palta, quantity: 0.040, role: 'VEGGIE' },
        { ingredientId: INVENTORY.ldtTradicional, quantity: 0.225, role: 'BASE' },
    ], { baseWeight: 1000, maxProteins: 3 });

    // ── Ceviche Peruano (1KG) ──
    // Peruano: choclo peruano, cebolla, leche tigre peruano, canchita
    // Gramajes del SOP (Base Peruano 4KG / 4): choclo 125g, cebolla 145g, LdT peruano 300ml, canchita 50g
    await setRecipe(CEVICHE_RECIPES.peruano, 'Ceviche Peruano', [
        { ingredientId: INVENTORY.chocloPeruano, quantity: 0.125, role: 'VEGGIE' },
        { ingredientId: INVENTORY.cebollaA, quantity: 0.145, role: 'VEGGIE' },
        { ingredientId: INVENTORY.ldtPeruano, quantity: 0.300, role: 'BASE' },
        { ingredientId: INVENTORY.canchita, quantity: 0.050, role: 'BASE' },
    ], { baseWeight: 1000, maxProteins: 3 });

    // ── Ceviche Tropical (1KG) ──
    // Tropical: mango, cebolla, choclo, leche tigre tropical
    await setRecipe(CEVICHE_RECIPES.tropical, 'Ceviche Tropical', [
        { ingredientId: INVENTORY.mangoCubos, quantity: 0.100, role: 'VEGGIE' },
        { ingredientId: INVENTORY.cebollaA, quantity: 0.100, role: 'VEGGIE' },
        { ingredientId: INVENTORY.chocloNormal, quantity: 0.080, role: 'VEGGIE' },
        { ingredientId: INVENTORY.pimenton, quantity: 0.040, role: 'VEGGIE' },
        { ingredientId: INVENTORY.ldtTropical, quantity: 0.225, role: 'BASE' },
    ], { baseWeight: 1000, maxProteins: 3 });

    // ── Ceviche Especial / quita verduras (1KG) ──
    // Misma base que tradicional — el "quita verduras" lo maneja el resolver con removedIngredients
    await setRecipe(CEVICHE_RECIPES.especial, 'Ceviche Especial (sin verduras)', [
        { ingredientId: INVENTORY.pimenton, quantity: 0.060, role: 'VEGGIE' },
        { ingredientId: INVENTORY.chocloNormal, quantity: 0.100, role: 'VEGGIE' },
        { ingredientId: INVENTORY.cebollaA, quantity: 0.120, role: 'VEGGIE' },
        { ingredientId: INVENTORY.palta, quantity: 0.040, role: 'VEGGIE' },
        { ingredientId: INVENTORY.ldtTradicional, quantity: 0.225, role: 'BASE' },
    ], { baseWeight: 1000, maxProteins: 3 });

    // ── Ceviche Vegetariano (500g base) ──
    // Sin proteínas, con champiñón. Gramajes para 500g
    if (INVENTORY.champinon) {
        await setRecipe(CEVICHE_RECIPES.vegetariano, 'Ceviche Vegetariano', [
            { ingredientId: INVENTORY.champinon, quantity: 0.070, role: 'BASE' },
            { ingredientId: INVENTORY.pimenton, quantity: 0.030, role: 'VEGGIE' },
            { ingredientId: INVENTORY.chocloNormal, quantity: 0.050, role: 'VEGGIE' },
            { ingredientId: INVENTORY.cebollaA, quantity: 0.060, role: 'VEGGIE' },
            { ingredientId: INVENTORY.palta, quantity: 0.020, role: 'VEGGIE' },
            { ingredientId: INVENTORY.ldtTradicional, quantity: 0.150, role: 'BASE' },
        ], { baseWeight: 500, maxProteins: 0 });
    }

    // ── Ceviche + Pisco Sour (750g) ──
    // Proporcional a 750g: pimentón 45g, choclo 75g, cebolla 90g, palta 30g, LdT 225ml
    await setRecipe(CEVICHE_RECIPES.piscoSour, 'Ceviche + Pisco Sour', [
        { ingredientId: INVENTORY.pimenton, quantity: 0.045, role: 'VEGGIE' },
        { ingredientId: INVENTORY.chocloNormal, quantity: 0.075, role: 'VEGGIE' },
        { ingredientId: INVENTORY.cebollaA, quantity: 0.090, role: 'VEGGIE' },
        { ingredientId: INVENTORY.palta, quantity: 0.030, role: 'VEGGIE' },
        { ingredientId: INVENTORY.ldtTradicional, quantity: 0.225, role: 'BASE' },
    ], { baseWeight: 750, maxProteins: 3 });

    // ── Ceviche Sin Verduras 500g ──
    await setRecipe(CEVICHE_RECIPES.sinVerduras, 'Ceviche Sin Verduras', [
        { ingredientId: INVENTORY.ldtTradicional, quantity: 0.225, role: 'BASE' },
    ], { baseWeight: 1000, maxProteins: 3 });

    // ─── STEP 3: Verify ───
    console.log('\n📌 STEP 3: Verificación final...');
    const allRecipes = await p.recipe.findMany({
        where: { id: { in: Object.values(CEVICHE_RECIPES) } },
        include: {
            sellingProduct: { select: { name: true, price: true } },
            items: { include: { ingredient: { select: { name: true, type: true, unit: true, costPerUnit: true } } }, orderBy: { role: 'asc' } }
        }
    });

    for (const r of allRecipes) {
        const prod = r.sellingProduct;
        let totalCost = 0;
        console.log(`\n   ${prod?.name} (baseWeight: ${r.baseWeight}, maxProteins: ${r.maxProteins})`);
        for (const i of r.items) {
            let qty = i.quantity;
            const cost = qty * Number(i.ingredient.costPerUnit);
            totalCost += cost;
            console.log(`      [${i.role.padEnd(8)}] ${i.ingredient.name.padEnd(28)} ${String(qty).padEnd(8)} ${i.ingredient.unit} → $${Math.round(cost)} (${i.ingredient.type})`);
        }
        console.log(`      --- Costo base (1KG): $${Math.round(totalCost)} | Precio: $${Number(prod?.price)} | Margen base: ${Math.round(((Number(prod?.price) - totalCost) / Number(prod?.price)) * 100)}%`);
        
        // Show what 500g would cost
        const scale500 = 500 / r.baseWeight;
        console.log(`      --- Costo base (500g): $${Math.round(totalCost * scale500)}`);
    }

    // Check preparations still exist
    console.log('\n   === PREPARACIONES RESTANTES ===');
    const preps = await p.inventoryItem.findMany({ where: { type: 'PREPARATION' } });
    for (const prep of preps) {
        console.log(`   ✅ ${prep.name} (${prep.unit})`);
    }

    console.log('\n✅ REVERSIÓN COMPLETADA\n');
    await p.$disconnect();
}

main().catch(e => { console.error('❌ ERROR:', e); p.$disconnect(); });
