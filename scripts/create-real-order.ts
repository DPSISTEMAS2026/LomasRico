import { PrismaClient } from '@lomasrico/database';

const prisma = new PrismaClient();

async function run() {
    // 1. Rename existing dummy inventory to look very real
    await prisma.inventoryItem.updateMany({
        where: { name: 'Filete de Salmon' },
        data: { name: 'Salmón Fresco de la Patagonia' }
    });
    const pulpo = await prisma.inventoryItem.findFirst({
        where: { name: 'Tentaculo de Pulpo' }
    });
    if (pulpo) {
        await prisma.inventoryItem.update({
            where: { id: pulpo.id },
            data: { name: 'Camarón Calibre 30/40', role: 'PROTEIN_SPECIAL' }
        });
    }

    const product = await prisma.sellingProduct.findFirst({
        where: { recipeId: { not: null } }
    });

    if (!product) {
        console.error('No product with recipe attached.');
        process.exit(1);
    }

    // Calcular BOM Oficial Avanzado
    const fakeBom = [
        { name: 'Salmón', quantity: 143, unit: 'g', inventoryItemId: '6b496f94-cb44-46ec-bca1-3d9bacb05357', isBaseExpansion: false },
        { name: 'Reineta', quantity: 143, unit: 'g', inventoryItemId: '09dac030-a026-4df7-a1d1-a9c070207888', isBaseExpansion: false },
        { name: 'Camarón', quantity: 143, unit: 'g', inventoryItemId: 'f6e01df8-7b82-4755-997b-d508ef1a5f69', isBaseExpansion: false },
        { name: 'Cebolla Morada', quantity: 190, unit: 'g', inventoryItemId: '20dba7ed-e0a6-4bba-a903-1158c8cfed39', isBaseExpansion: false },
        { name: 'Pimentón Rojo', quantity: 95, unit: 'g', inventoryItemId: 'f25266e8-58d7-4bd3-b208-03acf60b2257', isBaseExpansion: false },
        { name: 'Leche de Tigre LoMASRico', quantity: 225, unit: 'ml', inventoryItemId: 'eb3d02c9-f56f-4a3c-aae0-32a6f77ad99a', isBaseExpansion: false },
        { name: 'Salsa Merquén', quantity: 1, unit: 'UN', inventoryItemId: 'f842404f-9de5-4c16-a121-2b2f886842ba', isBaseExpansion: false }
    ];

    console.log('Creando Venta Oficial Directa para producto:', product.name);

    // 2. Crear Venta y Ticket Directamente en Prisma
    const uniqueCode = `#WEB-${Math.floor(Math.random() * 10000)}`;

    const sale = await prisma.sale.create({
        data: {
            total: 25000,
            channel: 'WEB',
            status: 'CONFIRMED',
            code: uniqueCode,
            paymentMethod: 'TRANSFER',
            paymentStatus: 'APPROVED',
            items: {
                create: [
                    {
                        sellingProductId: product.id,
                        quantity: 1,
                        priceUnit: 25000,
                        modifiers: {
                            dynamicSelections: [
                                { groupName: 'Formato', selectedOptions: [{ name: '750g (Agrandado)' }] },
                                { groupName: 'Proteínas', selectedOptions: [{ name: 'Salmón' }, { name: 'Camarón' }] },
                                { groupName: 'Extras Adicionales', selectedOptions: [{ name: 'Porción Choclo Peruano Extra' }] }
                            ]
                        },
                        recipeSnapshot: {
                            create: {
                                resolvedBoM: JSON.parse(JSON.stringify(fakeBom)),
                                costSnapshot: 5000,
                                priceSnapshot: 25000,
                                costBreakdown: {}
                            }
                        }
                    }
                ]
            },
            kitchenTicket: {
                create: {
                    status: 'WAITING'
                }
            }
        }
    });

    console.log('\n✅ TICKET DE PRUEBA REALIZADO OFICIALMENTE ENVIADO A LA COCINA!');
    console.log(`Sale ID: ${sale.id}`);
    console.log('>>> ¡Ve a tu panel de Administración, entra en el módulo de "Cocina" o "Kitchen" y verás la orden en la pantalla para prepearla! <<<');
    process.exit(0);
}

run();
