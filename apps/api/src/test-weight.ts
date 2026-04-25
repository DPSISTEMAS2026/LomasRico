import { PrismaClient } from '@lomasrico/database';
import { RecipeResolverService } from './recipe-engineering/recipe-resolver.service';

const prisma = new PrismaClient();
const resolver = new RecipeResolverService(prisma as any);

async function test() {
    // Buscar el producto maestro "Ceviche Lo Más Rico"
    let product = await prisma.sellingProduct.findFirst();

    if (!product) {
        console.error('No se encontro ningun Producto en la BD');
        process.exit(1);
    }
    
    // Si no tiene receta asignada (porque limpiamos la BD), le asignamos una DUMMY en 1 segundo para la simulacion.
    if (!product.recipeId) {
        const salmonId = await prisma.inventoryItem.create({ data: { name: 'Filete de Salmon', type: 'RAW', unit: 'KG', currentStock: 10, role: 'PROTEIN_MAIN' }});
        const pulpoId = await prisma.inventoryItem.create({ data: { name: 'Tentaculo de Pulpo', type: 'RAW', unit: 'KG', currentStock: 5, role: 'PROTEIN_SPECIAL' }});
        const cebollaId = await prisma.inventoryItem.create({ data: { name: 'Cebolla Morada', type: 'RAW', unit: 'KG', currentStock: 20, role: 'VEGGIE' }});
        const lecheId = await prisma.inventoryItem.create({ data: { name: 'Leche de Tigre', type: 'PREPARATION', unit: 'LT', currentStock: 10, role: 'BASE' }});
        
        const dummyRecipe = await prisma.recipe.create({
            data: {
                name: 'Receta Maestra Simulada',
                baseWeight: 500, // 500g default
                items: {
                    create: [
                        { ingredientId: salmonId.id, quantity: 200, role: 'PROTEIN_MAIN', priority: 1 },
                        { ingredientId: pulpoId.id, quantity: 100, role: 'PROTEIN_SPECIAL', priority: 2 },
                        { ingredientId: cebollaId.id, quantity: 50, role: 'VEGGIE', priority: 1 },
                        { ingredientId: lecheId.id, quantity: 150, role: 'BASE', priority: 1 },
                    ]
                }
            }
        });
        await prisma.sellingProduct.update({ where: { id: product.id }, data: { recipeId: dummyRecipe.id } });
        product.recipeId = dummyRecipe.id;
    }

    console.log(`==== SIMULANDO ORDEN PARA: ${product.name} (ID: ${product.id}) ====`);

    console.log('\n--- CASO 1: CLIENTE PIDE FORMATO 500G ORIGINAL + 2 EXTRAS ---');
    try {
        const bom500 = await resolver.resolveBom(product.id, {
            // dynamicSelections is what the UI sends to checkout
            dynamicSelections: [
                {
                    groupId: 'formato-group',
                    groupName: 'Formato',
                    selectedOptions: [
                        { id: 'opt-1', name: '500g', price: 0 } // Elige 500g
                    ]
                },
                {
                    groupId: 'proteinas-group',
                    groupName: 'Elige tus proteínas',
                    selectedOptions: [
                        { id: 'salmon', name: 'Salmón', price: 0 },
                        { id: 'pulpo', name: 'Pulpo', price: 0 }
                    ]
                },
                {
                    groupId: 'extras-group',
                    groupName: 'Extras Adicionales',
                    selectedOptions: [
                        { id: 'camaron', name: 'Camaron Apanado (Extra)', price: 3000 },
                        { id: 'palta', name: 'Avocado Extra', price: 1000 }
                    ]
                }
            ] as any[]
        }, false);
        console.log("-> RESULTADO RECETA EN COCINA PARA 500G:");
        console.table(bom500);
    } catch (e) {
        console.error('Error 500g:', e);
    }

    console.log('\n--- CASO 2: EL CLIENTE SE ARREPIENTE Y PRESIONA "AGRANDAR A 750G" ---');
    try {
        // En el UI, "Agrandar" reemplaza la opción de Formato en el arreglo:
        const bom750 = await resolver.resolveBom(product.id, {
            dynamicSelections: [
                {
                    groupId: 'formato-group',
                    groupName: 'Formato',
                    selectedOptions: [
                        { id: 'opt-2', name: '750g', price: 4000 } // SE REEMPLAZÓ POR 750g
                    ]
                },
                {
                    groupId: 'proteinas-group',
                    groupName: 'Elige tus proteínas',
                    selectedOptions: [
                        { id: 'salmon', name: 'Salmón', price: 0 },
                        { id: 'pulpo', name: 'Pulpo', price: 0 }
                    ]
                },
                {
                    groupId: 'extras-group',
                    groupName: 'Extras Adicionales',
                    selectedOptions: [
                        { id: 'camaron', name: 'Camaron Apanado (Extra)', price: 3000 },
                        { id: 'palta', name: 'Avocado Extra', price: 1000 }
                    ]
                }
            ] as any[]
        }, false);
        console.log("-> RESULTADO RECETA EN COCINA PARA 750G (EL SISTEMA ESCALÓ EL REQUERIMIENTO):");
        console.table(bom750);
    } catch (e) {
        console.error('Error 750g:', e);
    }
    
    console.log('\n--- PRUEBA TERMINADA ---');
    process.exit(0);
}

test();
