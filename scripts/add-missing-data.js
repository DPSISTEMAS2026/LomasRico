// Script para agregar datos faltantes a la base de datos
// Ejecutar con: node scripts/add-missing-data.js

const API_URL = process.env.API_URL || 'https://pro-lomasrico-api.onrender.com';

async function addMissingProducts() {
    const missingProducts = [
        // BEBIDAS ADICIONALES
        {
            id: 'prod-coca-cola-zero-591cc',
            name: 'Coca Cola Zero 591cc',
            description: 'Sin azúcar',
            price: 1600,
            category: 'BEBIDAS',
            imageKey: 'Coca Cola Zero 591cc.png',
            isActive: true,
            isConfigurable: false
        },
        {
            id: 'prod-limon-soda-350cc',
            name: 'Limón Soda 350cc',
            description: 'Refrescante',
            price: 1200,
            category: 'BEBIDAS',
            imageKey: 'Limon Soda 350cc.png',
            isActive: true,
            isConfigurable: false
        },
        {
            id: 'prod-monster-475cc',
            name: 'Monster 475cc',
            description: 'Energética',
            price: 2500,
            category: 'BEBIDAS',
            imageKey: 'Monster 475cc.png',
            isActive: true,
            isConfigurable: false
        },
        {
            id: 'prod-agua-mineral-puyehue',
            name: 'Agua Mineral Puyehue',
            description: 'Sin gas 500cc',
            price: 1200,
            category: 'BEBIDAS',
            imageKey: 'Agua mineral Puyehue.png',
            isActive: true,
            isConfigurable: false
        },
        {
            id: 'prod-kem-pina-350cc',
            name: 'Kem Piña 350cc',
            description: 'Sabor piña',
            price: 1400,
            category: 'BEBIDAS',
            imageKey: 'Kem_Pina_350cc.jpeg',
            isActive: true,
            isConfigurable: false
        },

        // EXTRAS / ACOMPAÑAMIENTOS
        {
            id: 'prod-pancitos-con-ajo',
            name: 'Pancitos con Ajo',
            description: '6 unidades con mantequilla de ajo',
            price: 2500,
            category: 'EXTRAS',
            imageKey: 'Pancitos con Ajo.jpg',
            isActive: true,
            isConfigurable: false
        },
        {
            id: 'prod-sopaipillas-10-uni',
            name: 'Sopaipillas 10 uni',
            description: 'Tradicionales chilenas',
            price: 3000,
            category: 'EXTRAS',
            imageKey: 'Sopaipillas 10 uni.jpg',
            isActive: true,
            isConfigurable: false
        },
        {
            id: 'prod-papas-a-la-crema',
            name: 'Papas a la Crema',
            description: 'Con salsa de la casa',
            price: 4000,
            category: 'PAPAS / FRITOS',
            imageKey: 'Papas a la Crema.jpg',
            isActive: true,
            isConfigurable: false
        },
        {
            id: 'prod-leche-de-tigre',
            name: 'Leche de Tigre',
            description: 'Shot 200cc para acompañar',
            price: 2000,
            category: 'EXTRAS',
            imageKey: 'Leche de Tigre.jpg',
            isActive: true,
            isConfigurable: false
        },

        // HAND ROLLS ADICIONALES
        {
            id: 'prod-handroll-de-pollo',
            name: 'Handroll de Pollo',
            description: 'Pollo teriyaki con palta',
            price: 3500,
            category: 'HAND ROLLS',
            imageKey: 'Handroll de Pollo.jpg',
            isActive: true,
            isConfigurable: false
        },

        // EMPANADAS ADICIONALES
        {
            id: 'prod-mix-empanadas',
            name: 'Mix Empanadas',
            description: '6 empanadas variadas',
            price: 14000,
            category: 'EMPANADAS',
            imageKey: 'Mix Empanadas.jpg',
            isActive: true,
            isConfigurable: false
        }
    ];

    console.log(`\n🔄 Agregando ${missingProducts.length} productos faltantes...\n`);

    for (const product of missingProducts) {
        try {
            const response = await fetch(`${API_URL}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...product,
                    imageUrl: `/assets/${product.imageKey}`
                })
            });

            if (response.ok) {
                console.log(`✅ Agregado: ${product.name}`);
            } else {
                const error = await response.text();
                console.log(`⚠️  ${product.name}: ${error}`);
            }
        } catch (error) {
            console.error(`❌ Error con ${product.name}:`, error.message);
        }
    }
}

async function addMissingInventoryItems() {
    const missingItems = [
        // SALSAS Y CONDIMENTOS
        {
            name: 'Salsa Ají Casera',
            category: 'SALSAS',
            unit: 'LT',
            costPerUnit: 0,
            currentStock: 50,
            role: 'CONDIMENT'
        },
        {
            name: 'Salsa Tártara',
            category: 'SALSAS',
            unit: 'LT',
            costPerUnit: 0,
            currentStock: 50,
            role: 'CONDIMENT'
        },
        {
            name: 'Salsa Rosada',
            category: 'SALSAS',
            unit: 'LT',
            costPerUnit: 0,
            currentStock: 50,
            role: 'CONDIMENT'
        },
        {
            name: 'Salsa Soya',
            category: 'SALSAS',
            unit: 'LT',
            costPerUnit: 0,
            currentStock: 50,
            role: 'CONDIMENT'
        },

        // BEBIDAS COMO INSUMOS
        {
            name: 'Coca Cola Zero 591cc',
            category: 'BEBIDAS',
            unit: 'UN',
            costPerUnit: 0,
            currentStock: 100,
            role: 'PRODUCT'
        },
        {
            name: 'Limón Soda 350cc',
            category: 'BEBIDAS',
            unit: 'UN',
            costPerUnit: 0,
            currentStock: 100,
            role: 'PRODUCT'
        },
        {
            name: 'Monster 475cc',
            category: 'BEBIDAS',
            unit: 'UN',
            costPerUnit: 0,
            currentStock: 100,
            role: 'PRODUCT'
        },
        {
            name: 'Agua Mineral Puyehue',
            category: 'BEBIDAS',
            unit: 'UN',
            costPerUnit: 0,
            currentStock: 100,
            role: 'PRODUCT'
        },
        {
            name: 'Kem Piña 350cc',
            category: 'BEBIDAS',
            unit: 'UN',
            costPerUnit: 0,
            currentStock: 100,
            role: 'PRODUCT'
        },

        // EXTRAS
        {
            name: 'Pan de Ajo',
            category: 'ABARROTES',
            unit: 'UN',
            costPerUnit: 0,
            currentStock: 100,
            role: 'INGREDIENT'
        },
        {
            name: 'Sopaipillas',
            category: 'ABARROTES',
            unit: 'UN',
            costPerUnit: 0,
            currentStock: 100,
            role: 'INGREDIENT'
        },
        {
            name: 'Crema Ácida',
            category: 'ABARROTES',
            unit: 'LT',
            costPerUnit: 0,
            currentStock: 50,
            role: 'INGREDIENT'
        }
    ];

    console.log(`\n🔄 Agregando ${missingItems.length} items de inventario faltantes...\n`);

    for (const item of missingItems) {
        try {
            const response = await fetch(`${API_URL}/inventory`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });

            if (response.ok) {
                console.log(`✅ Agregado: ${item.name}`);
            } else {
                const error = await response.text();
                console.log(`⚠️  ${item.name}: ${error}`);
            }
        } catch (error) {
            console.error(`❌ Error con ${item.name}:`, error.message);
        }
    }
}

async function main() {
    console.log('🚀 Iniciando carga de datos faltantes...\n');
    console.log(`📡 API: ${API_URL}\n`);

    await addMissingProducts();
    await addMissingInventoryItems();

    console.log('\n✨ Proceso completado!\n');
}

main().catch(console.error);
