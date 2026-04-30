import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const external = await prisma.externalOrder.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
    });
    
    console.log("--- Últimas ExternalOrders ---");
    for (const o of external) {
        console.log(`  ${o.externalOrderId} | extStatus=${o.externalStatus} | saleId=${o.saleId ? '✅' : '❌ null'} | ${o.createdAt}`);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sales = await prisma.sale.findMany({
        where: { 
            channel: 'UBER_EATS',
            createdAt: { gte: today }
        },
        orderBy: { createdAt: 'desc' },
    });
    
    console.log(`\n--- Ventas Uber de hoy (${sales.length}) ---`);
    for (const s of sales) {
        const notePreview = (s.note || '').substring(0, 100);
        console.log(`  ${s.code} | ${s.status} | $${s.total} | ${notePreview}`);
    }

    console.log("\n--- Buscar órdenes 6A16F y 6BCA7 ---");
    const search1 = await prisma.externalOrder.findFirst({ where: { externalOrderId: { contains: '6A16F' } } });
    const search2 = await prisma.externalOrder.findFirst({ where: { externalOrderId: { contains: '6BCA7' } } });
    console.log(`  6A16F: ${search1 ? `extStatus=${search1.externalStatus} (sale=${search1.saleId})` : 'NO ENCONTRADA'}`);
    console.log(`  6BCA7: ${search2 ? `extStatus=${search2.externalStatus} (sale=${search2.saleId})` : 'NO ENCONTRADA'}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
