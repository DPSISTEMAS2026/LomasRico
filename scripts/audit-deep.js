const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // 1. TODOS los productos (activos e inactivos)
  const products = await p.sellingProduct.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    include: {
      recipe: {
        include: {
          items: {
            include: { ingredient: true },
            orderBy: { role: 'asc' }
          }
        }
      },
      variants: { orderBy: { price: 'asc' } },
      productModifiers: {
        include: {
          modifierGroup: {
            include: { options: true }
          }
        }
      }
    }
  });

  console.log(`\nTOTAL PRODUCTOS: ${products.length} (${products.filter(p=>p.isActive).length} activos)\n`);

  for (const prod of products) {
    const active = prod.isActive ? '✅' : '❌';
    const price = Number(prod.price).toLocaleString();
    const config = prod.isConfigurable ? `Config(max ${prod.maxProteins || '?'} prot)` : 'Simple';
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`${active} ${prod.name} — $${price} | Cat: ${prod.category || '-'} | ${config}`);
    console.log(`   ID: ${prod.id}`);
    
    // Variants
    if (prod.variants.length > 0) {
      console.log(`   📦 VARIANTES:`);
      prod.variants.forEach(v => {
        console.log(`      - ${v.name} → $${Number(v.price).toLocaleString()} (ID: ${v.id})`);
      });
    }

    // Modifiers
    if (prod.productModifiers && prod.productModifiers.length > 0) {
      console.log(`   🎛️  MODIFICADORES:`);
      prod.productModifiers.forEach(mg => {
        const g = mg.modifierGroup;
        const opts = g.options.map(o => o.name).join(', ');
        console.log(`      - [${g.displayName || g.name}] ${opts}`);
      });
    }

    // Recipe
    if (prod.recipe) {
      const r = prod.recipe;
      console.log(`   📋 RECETA: "${r.name}" | Base: ${r.baseWeight}g`);
      if (r.items.length === 0) {
        console.log(`      ⚠️  RECETA VACÍA — 0 ingredientes`);
      }
      for (const item of r.items) {
        const qty = item.quantity;
        const unit = item.ingredient.unit;
        const cost = Number(item.ingredient.costPerUnit);
        const itemCost = unit === 'KG' || unit === 'LT' ? (qty * cost).toFixed(0) : (qty * cost).toFixed(0);
        console.log(`      ${(item.role || 'BASE').padEnd(18)} ${item.ingredient.name.padEnd(30)} ${qty}${unit.padEnd(4)} costo: $${itemCost}`);
      }
      // Total recipe cost
      let totalCost = 0;
      for (const item of r.items) {
        const qty = item.quantity;
        const cost = Number(item.ingredient.costPerUnit);
        totalCost += qty * cost;
      }
      console.log(`      ─── COSTO RECETA: $${totalCost.toFixed(0)} | PRECIO: $${price} | MARGEN: ${((1 - totalCost / Number(prod.price)) * 100).toFixed(0)}%`);
    } else {
      console.log(`   ⚠️  SIN RECETA`);
    }
  }

  // Summary of duplicates
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('RESUMEN DE POSIBLES DUPLICADOS:');
  const names = products.filter(p => p.isActive).map(p => p.name.toLowerCase().replace(/[!\s]+/g, ' ').trim());
  const seen = new Map();
  for (const prod of products.filter(p => p.isActive)) {
    const key = prod.name.toLowerCase().replace(/[!\s]+/g, ' ').trim().replace(/lomasrico/g, 'lomasrico');
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key).push(prod);
  }
  for (const [key, prods] of seen) {
    if (prods.length > 1) {
      console.log(`  DUPLICADO: "${key}" — ${prods.map(p => `${p.name} ($${Number(p.price).toLocaleString()}) ID:${p.id}`).join(' vs ')}`);
    }
  }

  await p.$disconnect();
})();
