const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // Get ALL recipes with their items and linked products
  const recipes = await p.recipe.findMany({
    include: {
      items: { include: { ingredient: true }, orderBy: { role: 'asc' } },
      sellingProduct: { select: { name: true, price: true, isActive: true, category: true } },
      outputItem: { select: { name: true, unit: true } }
    },
    orderBy: { name: 'asc' }
  });

  console.log(`TOTAL RECETAS EN DB: ${recipes.length}\n`);

  // Separate production recipes from product recipes
  const prodRecipes = recipes.filter(r => r.outputItemId);
  const sellRecipes = recipes.filter(r => r.sellingProduct);
  const orphanRecipes = recipes.filter(r => !r.outputItemId && !r.sellingProduct);

  console.log('='.repeat(80));
  console.log('RECETAS DE PRODUCCIÓN (sub-recetas):', prodRecipes.length);
  console.log('='.repeat(80));
  for (const r of prodRecipes) {
    console.log(`\n📋 "${r.name}" → produce: ${r.outputItem?.name} (${r.baseWeight}g)`);
    let cost = 0;
    for (const i of r.items) {
      const sub = i.quantity * Number(i.ingredient.costPerUnit);
      cost += sub;
      console.log(`   ${i.role.padEnd(16)} ${i.ingredient.name.padEnd(28)} ${i.quantity}${i.ingredient.unit} → $${sub.toFixed(0)}`);
    }
    console.log(`   ─── COSTO TOTAL: $${cost.toFixed(0)}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('RECETAS DE PRODUCTOS DE VENTA:', sellRecipes.length);
  console.log('='.repeat(80));
  for (const r of sellRecipes) {
    const active = r.sellingProduct?.isActive ? '✅' : '❌';
    const cat = r.sellingProduct?.category || 'SIN CAT';
    console.log(`\n${active} "${r.name}" | ${cat} | $${Number(r.sellingProduct?.price || 0).toLocaleString()} | base:${r.baseWeight}g`);
    let cost = 0;
    for (const i of r.items) {
      const sub = i.quantity * Number(i.ingredient.costPerUnit);
      cost += sub;
      console.log(`   ${i.role.padEnd(16)} ${i.ingredient.name.padEnd(28)} ${i.quantity}${i.ingredient.unit} → $${sub.toFixed(0)}`);
    }
    const price = Number(r.sellingProduct?.price || 0);
    const margin = price > 0 ? ((1 - cost / price) * 100).toFixed(0) : '?';
    console.log(`   ─── COSTO: $${cost.toFixed(0)} | MARGEN: ${margin}%`);
  }

  if (orphanRecipes.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('RECETAS HUÉRFANAS (sin producto ni producción):', orphanRecipes.length);
    console.log('='.repeat(80));
    for (const r of orphanRecipes) {
      console.log(`  ⚠️ "${r.name}" (${r.items.length} items, base:${r.baseWeight}g)`);
    }
  }

  // Check inventory items
  const allItems = await p.inventoryItem.findMany({ orderBy: { role: 'asc' } });
  console.log('\n' + '='.repeat(80));
  console.log('INVENTARIO COMPLETO:', allItems.length, 'items');
  console.log('='.repeat(80));
  for (const item of allItems) {
    console.log(`  ${item.role.padEnd(18)} ${item.name.padEnd(30)} $${Number(item.costPerUnit).toLocaleString().padStart(7)}/${item.unit} stock:${item.currentStock}`);
  }

  await p.$disconnect();
})();
