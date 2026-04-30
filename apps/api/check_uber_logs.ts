import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // Buscar las 2 órdenes fallidas (saleId = null)
    const failed = await prisma.externalOrder.findMany({
        where: { saleId: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
    });
    
    console.log(`\n${failed.length} órdenes pendientes de retry:`);
    for (const o of failed) {
        console.log(`  ID: ${o.id}`);
        console.log(`  External: ${o.externalOrderId} | ${o.customerName}`);
        console.log(`  Creada: ${o.createdAt}`);
        console.log(`  Para reintentar:`);
        console.log(`    POST https://pro-lomasrico-api-69je.onrender.com/external-orders/${o.id}/retry`);
        console.log('');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
