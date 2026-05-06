import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Órdenes externas de hoy
    const external = await prisma.externalOrder.findMany({
        where: { createdAt: { gte: today } },
        orderBy: { createdAt: 'desc' },
    });
    
    console.log(`--- ${external.length} ExternalOrders de hoy ---`);
    for (const o of external) {
        const status = o.saleId ? '✅ SALE CREADA' : '❌ SIN SALE';
        console.log(`  ${o.externalOrderId} | ${o.customerName} | ${status} | saleId=${o.saleId || 'null'}`);
    }

    // Ventas Uber de hoy
    const sales = await prisma.sale.findMany({
        where: { channel: 'UBER_EATS', createdAt: { gte: today } },
        orderBy: { createdAt: 'desc' },
    });
    
    console.log(`\n--- ${sales.length} ventas Uber hoy ---`);
    for (const s of sales) {
        const note = (s.note || '').substring(0, 80);
        console.log(`  ${s.code} | ${s.status} | $${s.total} | ${note}`);
    }

    // Pendientes históricos
    const pending = await prisma.externalOrder.findMany({
        where: { saleId: null },
    });
    console.log(`\n--- ${pending.length} ExternalOrders pendientes (sin sale) ---`);
    for (const o of pending) {
        console.log(`  ${o.externalOrderId} | ${o.customerName} | ${o.createdAt}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
