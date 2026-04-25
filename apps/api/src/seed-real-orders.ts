import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SalesService } from './sales/sales.service';
import { PrismaService } from './database/prisma.service';

async function bootstrap() {
    console.log('Iniciando simulacion oficial de ordenes mediante el Motor de NestJS...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const salesService = app.get(SalesService);
    const prisma = app.get(PrismaService);

    // 1. Limpiar ordenes de prueba anteriores para dejar la cocina limpia
    await prisma.kitchenTicket.deleteMany({
        where: { sale: { code: { contains: 'TEST-' } } }
    });
    await prisma.kitchenTicket.deleteMany({
        where: { sale: { code: { contains: 'WEB-' } } }
    });
    await prisma.recipeSnapshot.deleteMany({
        where: { saleItem: { sale: { code: { contains: 'TEST-' } } } }
    });
    await prisma.recipeSnapshot.deleteMany({
        where: { saleItem: { sale: { code: { contains: 'WEB-' } } } }
    });
    await prisma.saleItem.deleteMany({
        where: { sale: { code: { contains: 'TEST-' } } }
    });
    await prisma.saleItem.deleteMany({
        where: { sale: { code: { contains: 'WEB-' } } }
    });
    await prisma.sale.deleteMany({
        where: { code: { contains: 'TEST-' } }
    });
    await prisma.sale.deleteMany({
        where: { code: { contains: 'WEB-' } }
    });
    console.log('Cocina limpiada de ejemplos anteriores.');

    // 2. Buscar Producto Real (Ceviche)
    let product = await prisma.sellingProduct.findFirst({
        where: { isConfigurable: true, name: { contains: 'Ceviche' } },
        include: { recipe: true }
    });

    if (!product) {
        console.log('Error: No se encontró ningún producto "Ceviche Lo Mas Rico".');
        process.exit(1);
    }

    // Buscar Insumos Reales basados en la documentacion (inv_list.txt)
    const inventario = await prisma.inventoryItem.findMany();
    const getId = (nameLike: string) => {
        const item = inventario.find(i => i.name.toLowerCase().includes(nameLike.toLowerCase()));
        return item ? item.id : 'default-id';
    };

    const salmonId = getId('salmón') || getId('salmon');
    const reinetaId = getId('reineta');
    const camaronId = getId('camarón') || getId('camaron');
    const pulpoId = getId('pulpo');
    const merquenId = getId('salsa merquén') || getId('merquen');

    // Fix Camaron role
    if (camaronId !== 'default-id') {
        await prisma.inventoryItem.update({ where: { id: camaronId }, data: { role: 'PROTEIN_SPECIAL' }});
    }
    
    // Verduras y Bases (gramajes.txt)
    const cebollaId = getId('cebolla morada');
    const pimentonId = getId('pimentón rojo');
    const chocloId = getId('choclo peruano');
    const paltaId = getId('palta');
    const lecheTigreId = getId('leche de tigre');

    // 3. SEMBRAR LA RECETA BASE REAL SI NO EXISTE
    // Basado en gramajes.txt para "Ceviche 350gr" o Base 1000g.
    // Nosotros configuramos la receta base para 1000g, y el sistema escala hacia abajo o arriba.
    // Segun gramajes.txt: 1KG Peruano = 360g proteina (120/120/120), Verduras: 60g pim, 100g choclo, 120g cebolla, 40g palta, 225ml leche.
    if (!product.recipeId) {
        console.log('Sembrando la receta maestra oficial en base a gramajes.txt de 1KG...');
        const recetaOficial = await prisma.recipe.create({
            data: {
                name: 'Receta Maestra Ceviche LMR (Base 1KG)',
                baseWeight: 1000,
                items: {
                    create: [
                        { ingredientId: salmonId, quantity: 120, role: 'PROTEIN_MAIN', priority: 1, isOptional: false },
                        { ingredientId: reinetaId, quantity: 120, role: 'PROTEIN_MAIN', priority: 1, isOptional: false },
                        { ingredientId: pulpoId, quantity: 120, role: 'PROTEIN_SPECIAL', priority: 1, isOptional: false },
                        { ingredientId: pimentonId, quantity: 60, role: 'VEGGIE', priority: 1, isOptional: false },
                        { ingredientId: chocloId, quantity: 100, role: 'VEGGIE', priority: 1, isOptional: true },
                        { ingredientId: cebollaId, quantity: 120, role: 'VEGGIE', priority: 1, isOptional: false },
                        { ingredientId: paltaId, quantity: 40, role: 'VEGGIE', priority: 1, isOptional: true },
                        { ingredientId: lecheTigreId, quantity: 225, role: 'BASE', priority: 1, isOptional: false }
                    ]
                }
            }
        });
        await prisma.sellingProduct.update({ where: { id: product.id }, data: { recipeId: recetaOficial.id } });
        product = await prisma.sellingProduct.findUnique({ where: { id: product.id }, include: { recipe: true } }) as any;
    }

    // === ORDEN 1: CEVICHE NORMAL ===
    console.log('\n--- Generando Orden 1: Ceviche 350g, 1 Proteina, Normal ---');
    try {
        await salesService.create({
            channel: 'WEB',
            paymentMethod: 'TRANSFER',
            status: 'CONFIRMED',
            items: [{
                sellingProductId: product!.id,
                quantity: 1,
                modifiers: {
                    dynamicSelections: [
                        { groupName: 'Formato', selectedOptions: [{ id: 'opt1', name: '350g', price: 0 }] },
                        { groupName: 'Proteína', selectedOptions: [{ id: salmonId, name: 'Salmón', price: 0 }] }
                    ],
                    selectedProteins: [salmonId],
                    removedIngredients: []
                }
            }],
            shippingData: { method: 'PICKUP', cost: 0 },
            discount: 0, discountType: 'FIXED', userId: null, shiftId: null
        } as any);
        console.log('Orden 1 Enviada.');
    } catch(e:any) { console.error('Error O1', e.message); }

    // === ORDEN 2: CEVICHE 750g + 3 PROTEINAS ===
    console.log('\n--- Generando Orden 2: Ceviche 750g (Agrandado), 3 Proteínas ---');
    try {
        await salesService.create({
            channel: 'WEB',
            paymentMethod: 'TRANSFER',
            status: 'CONFIRMED',
            items: [{
                sellingProductId: product!.id,
                quantity: 1,
                modifiers: {
                    dynamicSelections: [
                        { groupName: 'Formato', selectedOptions: [{ id: 'opt2', name: '750g (Agrandado)', price: 4000 }] },
                        { groupName: 'Proteínas', selectedOptions: [
                            { id: salmonId, name: 'Salmón', price: 0 },
                            { id: reinetaId, name: 'Reineta', price: 0 },
                            { id: camaronId, name: 'Camarón', price: 0 }
                        ] }
                    ],
                    selectedProteins: [salmonId, reinetaId, camaronId].filter(id => id !== 'default-id'),
                    removedIngredients: []
                }
            }],
            shippingData: { method: 'PICKUP', cost: 0 },
            discount: 0, discountType: 'FIXED', userId: null, shiftId: null
        } as any);
        console.log('Orden 2 Enviada.');
    } catch(e:any) { console.error('Error O2', e.message); }

    // === ORDEN 3: CEVICHE 1KG ESPECIAL (Sin Verduras) como en la captura ===
    console.log('\n--- Generando Orden 3: Ceviche 1KG, 3 Prots, Sin Verduras, Con Salsa Especial ---');
    try {
        await salesService.create({
            channel: 'WEB',
            paymentMethod: 'TRANSFER',
            status: 'CONFIRMED',
            items: [{
                sellingProductId: product!.id,
                quantity: 1,
                modifiers: {
                    dynamicSelections: [
                        { groupName: 'Formato', selectedOptions: [{ id: 'opt3', name: '1KG', price: 8000 }] },
                        { groupName: 'Proteínas', selectedOptions: [
                            { id: salmonId, name: 'Salmón', price: 0 },
                            { id: reinetaId, name: 'Reineta', price: 0 },
                            { id: camaronId, name: 'Camarón', price: 0 }
                        ] },
                        { groupName: 'Salsas', selectedOptions: [{ id: merquenId, name: 'Salsa Merquén ahumado', price: 0 }] },
                        { groupName: 'Quitar Verduras', selectedOptions: [
                            { id: 'sin-palta', name: 'SIN Palta', price: 600 },
                            { id: 'sin-choclo', name: 'SIN Choclo', price: 600 }
                        ] }
                    ],
                    selectedProteins: [salmonId, reinetaId, camaronId].filter(id => id !== 'default-id'),
                    removedIngredients: ['Palta', 'Choclo']
                }
            }],
            shippingData: { method: 'PICKUP', cost: 0 },
            discount: 0, discountType: 'FIXED', userId: null, shiftId: null
        } as any);
        console.log('Orden 3 Enviada.');
    } catch(e:any) { console.error('Error O3', e.message); }

    console.log('\n>>> TODO LISTO! Abre tu panel de Kitchen y revisa las ordenes OFICIALES procesadas por el motor de resolucion de recetas. <<<');
    await app.close();
    process.exit(0);
}

bootstrap();
