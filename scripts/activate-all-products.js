// Script para activar TODOS los productos
const API_URL = 'https://pro-lomasrico-api.onrender.com';

async function activateAllProducts() {
    console.log('🔄 Activando TODOS los productos...\n');

    // 1. Obtener todos los productos
    const res = await fetch(`${API_URL}/products`);
    const allProducts = await res.json();

    console.log(`📦 Total de productos: ${allProducts.length}\n`);

    // 2. Activar todos
    for (const product of allProducts) {
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

    console.log('\n✨ Activación completada!\n');

    // 3. Verificar productos activos
    const activeRes = await fetch(`${API_URL}/products/active`);
    const activeProducts = await activeRes.json();

    console.log(`\n📊 Resumen Final:`);
    console.log(`   Total productos activos: ${activeProducts.length}`);
    console.log(`\nProductos por categoría:`);

    const categories = {};
    activeProducts.forEach(p => {
        categories[p.category] = (categories[p.category] || 0) + 1;
    });

    Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
        console.log(`   - ${cat}: ${count} productos`);
    });
}

activateAllProducts().catch(console.error);
