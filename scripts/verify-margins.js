const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const prods = await p.sellingProduct.findMany({
    where: { isActive: true },
    include: { recipe: { include: { items: { include: { ingredient: true } } } } },
    orderBy: [{ category: 'asc' }, { name: 'asc' }]
  });

  console.log('\n=== MÁRGENES POST-LIMPIEZA ===\n');
  console.log('ST', 'PRODUCTO'.padEnd(32), 'PRECIO'.padStart(8), 'COSTO'.padStart(8), 'MARGEN'.padStart(7));
  console.log('-'.repeat(65));

  for (const prod of prods) {
    if (!prod.recipe) {
      console.log('⚠️', prod.name.padEnd(32), ('$' + Number(prod.price).toLocaleString()).padStart(8), 'SIN REC'.padStart(8), '-'.padStart(7));
      continue;
    }
    let cost = 0;
    for (const i of prod.recipe.items) {
      cost += i.quantity * Number(i.ingredient.costPerUnit);
    }
    const price = Number(prod.price);
    const margin = ((1 - cost / price) * 100).toFixed(0);
    const flag = Number(margin) < 0 ? '🔴' : Number(margin) < 30 ? '🟡' : '✅';
    console.log(flag, prod.name.padEnd(32), ('$' + price.toLocaleString()).padStart(8), ('$' + cost.toFixed(0)).padStart(8), (margin + '%').padStart(7));
  }

  await p.$disconnect();
})();
