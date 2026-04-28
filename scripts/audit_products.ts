const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    const all = await p.$queryRaw`SELECT id, name, category, price, "isActive", "recipeId" FROM "SellingProduct" ORDER BY category, name`;
    
    const active = all.filter((p: any) => p.isActive);
    const inactive = all.filter((p: any) => !p.isActive);
    
    console.log(`=== PRODUCTOS ACTIVOS (visibles en web): ${active.length} ===`);
    active.forEach((p: any) => console.log(`  ✅ [${p.category}] ${p.name} — $${p.price} ${p.recipeId ? '📋 tiene receta' : '⚠️ SIN RECETA'}`));
    
    console.log(`\n=== PRODUCTOS INACTIVOS (ocultos): ${inactive.length} ===`);
    inactive.forEach((p: any) => console.log(`  ❌ [${p.category}] ${p.name} — $${p.price}`));
    
    console.log(`\nTOTAL: ${all.length} | Activos: ${active.length} | Inactivos: ${inactive.length}`);
    
    await p.$disconnect();
}
main();
