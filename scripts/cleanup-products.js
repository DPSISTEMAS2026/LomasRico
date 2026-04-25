// Script para limpiar productos duplicados y activar todos los productos
const API_URL = 'https://pro-lomasrico-api.onrender.com';

async function cleanupProducts() {
    console.log('🧹 Iniciando limpieza de productos...\n');

    // 1. Obtener todos los productos
    const res = await fetch(`${API_URL}/products`);
    const allProducts = await res.json();

    console.log(`📦 Total de productos en DB: ${allProducts.length}\n`);

    // 2. Identificar productos con prefijo "prod-" (antiguos/duplicados)
    const oldProducts = allProducts.filter(p => p.id.startsWith('prod-'));
    const newProducts = allProducts.filter(p => !p.id.startsWith('prod-'));

    console.log(`❌ Productos antiguos (prod-*): ${oldProducts.length}`);
    console.log(`✅ Productos nuevos: ${newProducts.length}\n`);

    // 3. Desactivar productos antiguos
    console.log('🔄 Desactivando productos antiguos...\n');
    for (const product of oldProducts) {
        try {
            const updateRes = await fetch(`${API_URL}/products/${product.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: false })
            });

            if (updateRes.ok) {
                console.log(`  ✓ Desactivado: ${product.name} (${product.id})`);
            } else {
                console.log(`  ✗ Error: ${product.name}`);
            }
        } catch (e) {
            console.log(`  ✗ Error: ${product.name} - ${e.message}`);
        }
    }

    // 4. Activar todos los productos nuevos
    console.log('\n🔄 Activando productos correctos...\n');
    for (const product of newProducts) {
        try {
            const updateRes = await fetch(`${API_URL}/products/${product.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: true })
            });

            if (updateRes.ok) {
                console.log(`  ✓ Activado: ${product.name} (${product.id})`);
            } else {
                console.log(`  ✗ Error: ${product.name}`);
            }
        } catch (e) {
            console.log(`  ✗ Error: ${product.name} - ${e.message}`);
        }
    }

    console.log('\n✨ Limpieza completada!\n');

    // 5. Verificar productos activos
    const activeRes = await fetch(`${API_URL}/products/active`);
    const activeProducts = await activeRes.json();

    console.log(`\n📊 Resumen Final:`);
    console.log(`   Total productos activos: ${activeProducts.length}`);
    console.log(`\nProductos por categoría:`);

    const categories = {};
    activeProducts.forEach(p => {
        categories[p.category] = (categories[p.category] || 0) + 1;
    });

    Object.entries(categories).forEach(([cat, count]) => {
        console.log(`   - ${cat}: ${count} productos`);
    });
}

cleanupProducts().catch(console.error);
