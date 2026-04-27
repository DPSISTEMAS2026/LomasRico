const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // 1. Inventario completo
  const items = await p.inventoryItem.findMany({
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, role: true, unit: true, currentStock: true, costPerUnit: true, minStockThreshold: true, type: true }
  });

  console.log('\n=== INVENTARIO ===');
  console.log('ROLE'.padEnd(20), 'NOMBRE'.padEnd(30), 'STOCK'.padStart(10), 'UNIDAD'.padStart(8), 'COSTO/U'.padStart(10), 'MIN'.padStart(6), 'TIPO');
  console.log('-'.repeat(110));
  for (const i of items) {
    const stock = Number(i.currentStock).toFixed(1);
    const cost = Number(i.costPerUnit).toFixed(0);
    console.log(
      (i.role || '-').padEnd(20),
      i.name.padEnd(30),
      stock.padStart(10),
      i.unit.padStart(8),
      ('$' + cost).padStart(10),
      String(i.minStockThreshold || 0).padStart(6),
      i.type || '-'
    );
  }

  // 2. Productos con recetas
  const products = await p.sellingProduct.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: {
      recipe: {
        include: {
          items: {
            include: { ingredient: true },
            orderBy: { role: 'asc' }
          }
        }
      },
      variants: { orderBy: { name: 'asc' } }
    }
  });

  console.log('\n\n=== PRODUCTOS CON RECETAS ===');
  for (const prod of products) {
    const price = Number(prod.price);
    const variants = prod.variants.map(v => `${v.name} ($${Number(v.price).toLocaleString()})`).join(', ');
    console.log(`\n🍽️  ${prod.name} — $${price.toLocaleString()} | Cat: ${prod.category || '-'} | Config: ${prod.isConfigurable ? 'SI' : 'NO'} | Max Prot: ${prod.maxProteins || '-'}`);
    if (variants) console.log(`   Variantes: ${variants}`);
    
    if (prod.recipe) {
      console.log(`   📋 Receta: "${prod.recipe.name}" | Peso Base: ${prod.recipe.baseWeight}g`);
      if (prod.recipe.items.length === 0) {
        console.log('   ⚠️  SIN INGREDIENTES EN RECETA');
      }
      for (const item of prod.recipe.items) {
        console.log(`      ${(item.role || 'BASE').padEnd(18)} ${item.ingredient.name.padEnd(25)} ${item.quantity}${item.ingredient.unit}`);
      }
    } else {
      console.log('   ⚠️  SIN RECETA ASIGNADA');
    }
  }

  // 3. Productos sin receta
  const noRecipe = products.filter(p => !p.recipe);
  if (noRecipe.length > 0) {
    console.log('\n\n⚠️  PRODUCTOS SIN RECETA:');
    noRecipe.forEach(p => console.log(`   - ${p.name}`));
  }

  await p.$disconnect();
})();
