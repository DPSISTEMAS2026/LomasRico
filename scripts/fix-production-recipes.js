const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function getOrCreateItem(name, type, unit, costPerUnit, role) {
  let item = await p.inventoryItem.findFirst({ where: { name } });
  if (!item) {
    item = await p.inventoryItem.create({
      data: { name, type, unit, costPerUnit, role, currentStock: 20 }
    });
    console.log(`    🆕 Creado item: ${name} ($${costPerUnit}/${unit})`);
  }
  return item;
}

async function rewriteProductionRecipe(recipeName, newItems) {
  const recipe = await p.recipe.findFirst({
    where: { name: recipeName },
    include: { items: true }
  });
  if (!recipe) {
    console.log(`  ❌ Receta "${recipeName}" no encontrada`);
    return null;
  }
  // Delete existing items
  await p.recipeItem.deleteMany({ where: { recipeId: recipe.id } });
  console.log(`  🗑️  Eliminados ${recipe.items.length} items de "${recipeName}"`);
  
  // Create new items
  for (const item of newItems) {
    const ingredient = await getOrCreateItem(item.name, item.type || 'RAW', item.unit, item.cost, item.role || 'BASE');
    await p.recipeItem.create({
      data: {
        recipeId: recipe.id,
        ingredientId: ingredient.id,
        quantity: item.qty,
        role: item.role || 'BASE',
        priority: item.priority || 0
      }
    });
    console.log(`    ✅ + ${ingredient.name} ${item.qty}${ingredient.unit}`);
  }
  return recipe;
}

async function createProductionRecipe(name, outputItemName, baseWeight, items) {
  // Check if recipe already exists
  const existing = await p.recipe.findFirst({ where: { name } });
  if (existing) {
    console.log(`  ℹ️  Receta "${name}" ya existe, reescribiendo...`);
    return await rewriteProductionRecipe(name, items);
  }
  
  const outputItem = await p.inventoryItem.findFirst({ where: { name: outputItemName } });
  if (!outputItem) {
    console.log(`  ❌ Item de salida "${outputItemName}" no encontrado`);
    return null;
  }

  const recipe = await p.recipe.create({
    data: {
      name,
      baseWeight,
      outputItemId: outputItem.id,
      items: {
        create: await Promise.all(items.map(async (item, i) => {
          const ingredient = await getOrCreateItem(item.name, item.type || 'RAW', item.unit, item.cost, item.role || 'BASE');
          return {
            ingredientId: ingredient.id,
            quantity: item.qty,
            role: item.role || 'BASE',
            priority: i
          };
        }))
      }
    }
  });
  console.log(`  ✅ Receta "${name}" creada (${baseWeight}g) → ${outputItemName}`);
  return recipe;
}

(async () => {
  console.log('🔧 CORRIGIENDO RECETAS DE PRODUCCIÓN...\n');

  // ====================================================
  // 1. LECHE DE TIGRE TRADICIONAL (2,400cc)
  // PDF: Limón Amarillo 1L + Cilantro 120g + Jengibre 16g + Agua 200cc
  //      + Aliño 160g + BLT (Apio 200g + Cebolla 100g + Pimentón 30g)
  //      + Leche Evaporada 240cc
  // ====================================================
  console.log('=== LECHE DE TIGRE TRADICIONAL ===');
  await rewriteProductionRecipe('Formula Leche Tigre Base (Tradicional)', [
    { name: 'Limón Amarillo', qty: 1, unit: 'KG', cost: 1100, role: 'VEGGIE' },
    { name: 'Cilantro', qty: 0.12, unit: 'KG', cost: 1000, role: 'VEGGIE' },
    { name: 'Jengibre', qty: 0.016, unit: 'KG', cost: 1490, role: 'VEGGIE' },
    { name: 'Aliño', qty: 0.16, unit: 'KG', cost: 3600, role: 'BASE' },
    { name: 'Apio', qty: 0.2, unit: 'KG', cost: 1200, role: 'VEGGIE' },      // BLT
    { name: 'Cebolla Morada', qty: 0.1, unit: 'KG', cost: 900, role: 'VEGGIE' }, // BLT
    { name: 'Pimentón Rojo', qty: 0.03, unit: 'KG', cost: 25000, role: 'VEGGIE' }, // BLT
    { name: 'Leche Evaporada', qty: 0.24, unit: 'KG', cost: 1250, role: 'BASE' },
  ]);

  // ====================================================
  // 2. LECHE DE TIGRE PERUANA (2,400cc)
  // Igual pero con Limón Sutil + Rocoto
  // ====================================================
  console.log('\n=== LECHE DE TIGRE PERUANA ===');
  await rewriteProductionRecipe('Formula Leche Tigre Peruana (1.2L)', [
    { name: 'Limón Sutil', qty: 1, unit: 'KG', cost: 2500, role: 'VEGGIE' },
    { name: 'Cilantro', qty: 0.12, unit: 'KG', cost: 1000, role: 'VEGGIE' },
    { name: 'Jengibre', qty: 0.016, unit: 'KG', cost: 1490, role: 'VEGGIE' },
    { name: 'Aliño', qty: 0.16, unit: 'KG', cost: 3600, role: 'BASE' },
    { name: 'Rocoto', qty: 0.1, unit: 'KG', cost: 5850, role: 'VEGGIE' },
    { name: 'Apio', qty: 0.2, unit: 'KG', cost: 1200, role: 'VEGGIE' },
    { name: 'Cebolla Morada', qty: 0.1, unit: 'KG', cost: 900, role: 'VEGGIE' },
    { name: 'Pimentón Rojo', qty: 0.03, unit: 'KG', cost: 25000, role: 'VEGGIE' },
    { name: 'Leche Evaporada', qty: 0.24, unit: 'KG', cost: 1250, role: 'BASE' },
  ]);

  // ====================================================
  // 3. LECHE DE TIGRE TROPICAL (1,200cc)
  // PDF: Limón 500cc + Jengibre 8g + Agua 150cc + Aliño 70g
  //      + Pulpa Mango 100g + BLT sin pimentón + Leche Evap 120cc
  // ====================================================
  console.log('\n=== LECHE DE TIGRE TROPICAL ===');
  await rewriteProductionRecipe('Formula Leche Tigre Tropical (1.2L)', [
    { name: 'Limón Amarillo', qty: 0.5, unit: 'KG', cost: 1100, role: 'VEGGIE' },
    { name: 'Jengibre', qty: 0.008, unit: 'KG', cost: 1490, role: 'VEGGIE' },
    { name: 'Aliño', qty: 0.07, unit: 'KG', cost: 3600, role: 'BASE' },
    { name: 'Pulpa Mango', qty: 0.1, unit: 'KG', cost: 5400, role: 'BASE' },
    { name: 'Apio', qty: 0.1, unit: 'KG', cost: 1200, role: 'VEGGIE' },      // BLT sin pimentón
    { name: 'Cebolla Morada', qty: 0.05, unit: 'KG', cost: 900, role: 'VEGGIE' },
    { name: 'Leche Evaporada', qty: 0.12, unit: 'KG', cost: 1250, role: 'BASE' },
  ]);

  // ====================================================
  // 4. SALSA VERDE (rinde ~650g)
  // ====================================================
  console.log('\n=== CREANDO SUB-RECETAS DE SALSAS ===');
  await createProductionRecipe('Salsa Verde (batch)', 'Salsa Verde', 650, [
    { name: 'Cilantro', qty: 0.08, unit: 'KG', cost: 1000, role: 'VEGGIE' },
    { name: 'Limón Amarillo', qty: 0.06, unit: 'KG', cost: 1100, role: 'VEGGIE' },
    { name: 'Sal', qty: 0.012, unit: 'KG', cost: 690, role: 'BASE' },
    { name: 'Aceite Vegetal', qty: 0.4, unit: 'LT', cost: 2038, role: 'BASE' },
    { name: 'Huevo Deshidratado', qty: 0.015, unit: 'KG', cost: 14000, role: 'BASE' },
  ]);

  // ====================================================
  // 5. SALSA MERQUÉN (rinde ~570g)
  // ====================================================
  // First ensure Merquén exists as inventory item
  await getOrCreateItem('Merquén', 'RAW', 'KG', 5000, 'BASE');
  
  await createProductionRecipe('Salsa Merquén (batch)', 'Salsa Merquén', 570, [
    { name: 'Merquén', qty: 0.015, unit: 'KG', cost: 5000, role: 'BASE' },
    { name: 'Limón Amarillo', qty: 0.06, unit: 'KG', cost: 1100, role: 'VEGGIE' },
    { name: 'Sal', qty: 0.012, unit: 'KG', cost: 690, role: 'BASE' },
    { name: 'Aceite Vegetal', qty: 0.45, unit: 'LT', cost: 2038, role: 'BASE' },
    { name: 'Huevo Deshidratado', qty: 0.015, unit: 'KG', cost: 14000, role: 'BASE' },
  ]);

  // ====================================================
  // 6. SALSA AJO CONFITADO (rinde ~670g)
  // ====================================================
  await createProductionRecipe('Salsa Ajo Confitado (batch)', 'Salsa Ajo Confitado', 670, [
    { name: 'Ajo', qty: 0.05, unit: 'KG', cost: 3000, role: 'VEGGIE' },
    { name: 'Aceite Vegetal', qty: 0.35, unit: 'LT', cost: 2038, role: 'BASE' },
    { name: 'Huevo Deshidratado', qty: 0.015, unit: 'KG', cost: 14000, role: 'BASE' },
    { name: 'Sal', qty: 0.006, unit: 'KG', cost: 690, role: 'BASE' },
    { name: 'Limón Amarillo', qty: 0.04, unit: 'KG', cost: 1100, role: 'VEGGIE' },
  ]);

  // ====================================================
  // 7. SALSA BECHAMEL (rinde ~1,375g)
  // ====================================================
  await createProductionRecipe('Salsa Bechamel (batch)', 'Salsa Bechamel', 1375, [
    { name: 'Mantequilla', qty: 0.25, unit: 'KG', cost: 2500, role: 'BASE' },
    { name: 'Harina', qty: 0.125, unit: 'KG', cost: 1100, role: 'BASE' },
    { name: 'Leche Entera', qty: 1, unit: 'LT', cost: 1050, role: 'BASE' },
  ]);

  // ====================================================
  // 8. SALSA ROCOTO (rinde ~700g) — need item first
  // ====================================================
  await getOrCreateItem('Salsa Rocoto', 'PREPARATION', 'LT', 1500, 'BASE');
  
  await createProductionRecipe('Salsa Rocoto (batch)', 'Salsa Rocoto', 700, [
    { name: 'Rocoto', qty: 0.205, unit: 'KG', cost: 5850, role: 'VEGGIE' },
    { name: 'Sal', qty: 0.015, unit: 'KG', cost: 690, role: 'BASE' },
    { name: 'Huevo Deshidratado', qty: 0.03, unit: 'KG', cost: 14000, role: 'BASE' },
    { name: 'Aceite Maravilla', qty: 0.45, unit: 'LT', cost: 2140, role: 'BASE' },
  ]);

  // ====================================================
  // 9. VINAGRETA (rinde ~1,038g)
  // ====================================================
  await getOrCreateItem('Vinagreta', 'PREPARATION', 'KG', 2000, 'BASE');
  
  await createProductionRecipe('Vinagreta (batch)', 'Vinagreta', 1038, [
    { name: 'Vinagre', qty: 0.5, unit: 'LT', cost: 1500, role: 'BASE' },
    { name: 'Sal', qty: 0.03, unit: 'KG', cost: 690, role: 'BASE' },
    { name: 'Azúcar Granulada', qty: 0.5, unit: 'KG', cost: 5730, role: 'BASE' },
    { name: 'Jengibre', qty: 0.008, unit: 'KG', cost: 1490, role: 'VEGGIE' },
  ]);

  // ====================================================
  // RECALCULATE COSTS for Leche de Tigre items
  // ====================================================
  console.log('\n📊 RECALCULANDO COSTOS DE PREPARACIONES...');
  
  // Get all production recipes and recalculate
  const prodRecipes = await p.recipe.findMany({
    where: { outputItemId: { not: null } },
    include: { items: { include: { ingredient: true } }, outputItem: true }
  });

  for (const rec of prodRecipes) {
    let totalCost = 0;
    for (const i of rec.items) {
      totalCost += i.quantity * Number(i.ingredient.costPerUnit);
    }
    // Cost per unit (LT or KG) based on baseWeight
    const costPerUnit = rec.baseWeight > 0 ? (totalCost / rec.baseWeight) * 1000 : 0;
    
    if (rec.outputItem) {
      await p.inventoryItem.update({
        where: { id: rec.outputItem.id },
        data: { costPerUnit: Math.round(costPerUnit) }
      });
      console.log(`  ✅ ${rec.outputItem.name}: $${totalCost.toFixed(0)} / ${rec.baseWeight}g = $${Math.round(costPerUnit)}/${rec.outputItem.unit}`);
    }
  }

  console.log('\n✅ TODAS LAS CORRECCIONES P1 COMPLETADAS');
  
  await p.$disconnect();
})();
