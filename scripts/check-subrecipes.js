const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // Check production recipes (sub-recipes that produce inventory items)
  const prodRecipes = await p.recipe.findMany({
    where: { outputItemId: { not: null } },
    include: {
      items: { include: { ingredient: true } },
      outputItem: true
    }
  });

  console.log(`\nRECETAS DE PRODUCCIÓN (sub-recetas): ${prodRecipes.length}`);
  for (const rec of prodRecipes) {
    const outName = rec.outputItem ? rec.outputItem.name : '?';
    console.log(`\n📋 ${rec.name} → produce: "${outName}" (${rec.baseWeight}g)`);
    let totalCost = 0;
    for (const i of rec.items) {
      const cost = i.quantity * Number(i.ingredient.costPerUnit);
      totalCost += cost;
      console.log(`   ${i.ingredient.name.padEnd(25)} ${i.quantity}${i.ingredient.unit} → $${cost.toFixed(0)}`);
    }
    console.log(`   ─── COSTO TOTAL: $${totalCost.toFixed(0)} por ${rec.baseWeight}g`);
    if (rec.baseWeight > 0) {
      console.log(`   ─── COSTO POR LITRO: $${((totalCost / rec.baseWeight) * 1000).toFixed(0)}/LT`);
    }
  }

  // Check which preparation items DON'T have production recipes
  const prepItems = await p.inventoryItem.findMany({
    where: { type: 'PREPARATION' },
    include: { productionRecipe: true }
  });

  console.log(`\n\n=== PREPARACIONES SIN RECETA DE PRODUCCIÓN ===`);
  for (const item of prepItems) {
    if (!item.productionRecipe) {
      console.log(`  ⚠️  ${item.name} ($${Number(item.costPerUnit).toLocaleString()}/${item.unit}) — SIN RECETA BASE`);
    }
  }

  await p.$disconnect();
})();
