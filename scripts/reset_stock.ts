const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const result = await prisma.inventoryItem.updateMany({
        data: { currentStock: 0 }
    });
    console.log(`✅ Stock reseteado a 0 en ${result.count} insumos`);
    
    // Verify
    const items = await prisma.inventoryItem.findMany({
        select: { name: true, currentStock: true, costPerUnit: true }
    });
    console.log('\nEstado actual:');
    items.forEach(i => {
        console.log(`  ${i.name}: stock=${i.currentStock}, costo=$${i.costPerUnit}`);
    });
    
    await prisma.$disconnect();
}

main();
