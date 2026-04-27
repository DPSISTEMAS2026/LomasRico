const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  console.log('🧹 EJECUTANDO LIMPIEZA COMPLETA...\n');

  // ====================================================
  // 1. DESACTIVAR PRODUCTOS DUPLICADOS
  // ====================================================
  const duplicatesToDeactivate = [
    '96661635-f312-40bf-a9de-56f231f3b6de', // MEGA PROMO (sin modificadores, $45.9K)
    'e5079a37-6627-479f-b3ae-aa5b388427c2', // Papas LoMASRico (duplicado de Papas Fritas LoMASRico)
    'ef493f77-cc3c-4380-862f-be535453c01a', // Gohan (duplicado de "Elige tu GOHAN!")
    'a385757b-af98-4c17-8e3f-ea2a4a955d67', // Sopaipillas 10 (uni) (duplicado)
    '3cd40b2e-0a4d-4ffe-a4a4-88777ab03157', // Agua mineral cachantun (duplicado de Agua CACHANTUN)
  ];

  for (const id of duplicatesToDeactivate) {
    const prod = await p.sellingProduct.update({
      where: { id },
      data: { isActive: false },
      select: { name: true }
    });
    console.log(`  ❌ Desactivado: ${prod.name}`);
  }

  // ====================================================
  // 2. CORREGIR COSTOS DE INVENTARIO
  // ====================================================
  console.log('\n📦 CORRIGIENDO COSTOS...');

  const costFixes = [
    // Masa Empanada: paquete de 18 unidades = $3,200 → $178/UN
    { name: 'Masa Empanada', costPerUnit: 178 },
    // Pan de Ajo: estimado
    { name: 'Pan de Ajo', costPerUnit: 150 },
    // Leche de Tigre Tradicional: costo calculado de su propia receta ($4195 / 1.2L ≈ $3,496/LT)
    { name: 'Leche de Tigre Tradicional', costPerUnit: 3496 },
    // Leche de Tigre genérica
    { name: 'Leche de Tigre', costPerUnit: 3496 },
    // Leche de Tigre LoMASRico (similar)
    { name: 'Leche de Tigre LoMASRico', costPerUnit: 3500 },
    // Salsas
    { name: 'Salsa Bechamel', costPerUnit: 2000 },
    { name: 'Salsa Merquén', costPerUnit: 1500 },
    { name: 'Salsa Verde', costPerUnit: 1200 },
    { name: 'Salsa Ajo Confitado', costPerUnit: 1500 },
    { name: 'Salsa Tártara', costPerUnit: 1500 },
    { name: 'Salsa Rosada', costPerUnit: 1200 },
    { name: 'Salsa Agridulce', costPerUnit: 1200 },
    // Vinagre
    { name: 'Vinagre', costPerUnit: 1500 },
    // Ajo
    { name: 'Ajo', costPerUnit: 3000 },
    // Bebidas retail
    { name: 'Coca Cola 591cc', costPerUnit: 700 },
    { name: 'Coca Cola Zero 591cc', costPerUnit: 700 },
    { name: 'Kem Piña 350cc', costPerUnit: 500 },
    { name: 'Limón Soda 350cc', costPerUnit: 500 },
    { name: 'Monster 475cc', costPerUnit: 1200 },
    { name: 'Agua Mineral Puyehue', costPerUnit: 400 },
  ];

  for (const fix of costFixes) {
    try {
      const result = await p.inventoryItem.updateMany({
        where: { name: fix.name },
        data: { costPerUnit: fix.costPerUnit }
      });
      if (result.count > 0) {
        console.log(`  ✅ ${fix.name}: $${fix.costPerUnit.toLocaleString()}`);
      } else {
        console.log(`  ⚠️  ${fix.name}: NO ENCONTRADO`);
      }
    } catch (e) {
      console.log(`  ❌ ${fix.name}: ERROR - ${e.message}`);
    }
  }

  // ====================================================
  // 3. CORREGIR PALTA EN RECETA CEVICHE LOMASRICO (1KG → 0.04KG)
  // ====================================================
  console.log('\n📋 CORRIGIENDO RECETAS...');

  // Find the recipe for Ceviche LOMASRICO
  const cevicheLMR = await p.sellingProduct.findFirst({
    where: { id: '5c464a84-9dfc-460c-9bfa-8adc059d602a' },
    include: { recipe: { include: { items: { include: { ingredient: true } } } } }
  });

  if (cevicheLMR?.recipe) {
    const paltaItem = cevicheLMR.recipe.items.find(i => i.ingredient.name === 'Palta' && i.quantity === 1);
    if (paltaItem) {
      await p.recipeItem.update({
        where: { id: paltaItem.id },
        data: { quantity: 0.04 }
      });
      console.log('  ✅ Ceviche LOMASRICO: Palta corregida 1KG → 0.04KG');
    } else {
      console.log('  ℹ️  Palta en Ceviche LOMASRICO no tiene 1KG (ya corregido?)');
    }
  }

  // Fix baseWeight of production recipes (1.2g → 1200g for Leche de Tigre)
  const ldtRecipes = await p.recipe.findMany({
    where: { 
      outputItemId: { not: null },
      baseWeight: { lt: 10 } // Those wrongly set to grams instead of actual grams
    }
  });

  for (const rec of ldtRecipes) {
    // 1.2g should be 1200g (1.2 liters), 2.48g should be 2480g
    const newWeight = rec.baseWeight * 1000;
    await p.recipe.update({
      where: { id: rec.id },
      data: { baseWeight: newWeight }
    });
    console.log(`  ✅ Receta "${rec.name}": baseWeight ${rec.baseWeight}g → ${newWeight}g`);
  }

  // ====================================================
  // 4. CREAR ITEM "POLLO" (falta en inventario)
  // ====================================================
  console.log('\n🍗 CREANDO ITEMS FALTANTES...');

  const existingPollo = await p.inventoryItem.findFirst({ where: { name: 'Pollo' } });
  if (!existingPollo) {
    await p.inventoryItem.create({
      data: {
        name: 'Pollo',
        type: 'RAW',
        unit: 'KG',
        currentStock: 5,
        costPerUnit: 4750,
        role: 'PROTEIN_MAIN',
        minStockThreshold: 2
      }
    });
    console.log('  ✅ Pollo creado: $4,750/KG, stock 5KG');
  } else {
    console.log('  ℹ️  Pollo ya existe');
  }

  // ====================================================
  // 5. RESET STOCK PROTEÍNAS (negativos → iniciales)
  // ====================================================
  console.log('\n📊 RESETEANDO STOCK DE PROTEÍNAS...');

  const stockResets = [
    { name: 'Salmón', stock: 10 },
    { name: 'Reineta', stock: 10 },
    { name: 'Atún', stock: 5 },
    { name: 'Camarón', stock: 5 },
    { name: 'Camarón Calibre 30/40', stock: 3 },
    { name: 'Pulpo', stock: 5 },
    { name: 'Macha', stock: 3 },
    // Items con stock negativo o excesivo
    { name: 'Palta', stock: 10 },
    { name: 'Cebolla Morada', stock: 10 },
    { name: 'Leche de Tigre Tradicional', stock: 5 },
    { name: 'Arroz Sushi (Vinagreta)', stock: 10 },
    { name: 'Masa Empanada', stock: 40 },
  ];

  for (const reset of stockResets) {
    const result = await p.inventoryItem.updateMany({
      where: { name: reset.name },
      data: { currentStock: reset.stock }
    });
    if (result.count > 0) {
      console.log(`  ✅ ${reset.name}: stock → ${reset.stock}`);
    }
  }

  // ====================================================
  // 6. SET minStockThreshold para items críticos
  // ====================================================
  console.log('\n⚠️  CONFIGURANDO ALERTAS DE STOCK MÍNIMO...');

  const minStockAlerts = [
    { name: 'Salmón', min: 3 },
    { name: 'Reineta', min: 3 },
    { name: 'Atún', min: 2 },
    { name: 'Camarón', min: 2 },
    { name: 'Pulpo', min: 2 },
    { name: 'Macha', min: 1 },
    { name: 'Palta', min: 3 },
    { name: 'Cebolla Morada', min: 3 },
    { name: 'Limón Sutil', min: 3 },
    { name: 'Leche de Tigre Tradicional', min: 2 },
    { name: 'Papas Fritas (Congeladas)', min: 5 },
    { name: 'Arroz Sushi (Vinagreta)', min: 3 },
    { name: 'Masa Empanada', min: 10 },
  ];

  for (const alert of minStockAlerts) {
    const result = await p.inventoryItem.updateMany({
      where: { name: alert.name },
      data: { minStockThreshold: alert.min }
    });
    if (result.count > 0) {
      console.log(`  ✅ ${alert.name}: alerta bajo stock < ${alert.min}`);
    }
  }

  // ====================================================
  // RESUMEN FINAL
  // ====================================================
  const activeProducts = await p.sellingProduct.count({ where: { isActive: true } });
  const inventoryCount = await p.inventoryItem.count();
  const recipeCount = await p.recipe.count();

  console.log('\n\n✅ LIMPIEZA COMPLETADA');
  console.log(`   Productos activos: ${activeProducts}`);
  console.log(`   Items inventario: ${inventoryCount}`);
  console.log(`   Recetas totales: ${recipeCount}`);

  await p.$disconnect();
})();
