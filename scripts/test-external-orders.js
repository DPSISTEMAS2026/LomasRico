/**
 * test-external-orders.js
 * 
 * Script para probar la ingesta de pedidos externos.
 * Simula pedidos de Uber Eats y PedidosYa con datos realistas.
 * 
 * Uso: node scripts/test-external-orders.js
 * 
 * Requiere que la API esté corriendo en localhost:3001 o la URL de producción.
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';

// ══════════════════════════════════════════════════════════
// TEST 1: Pedido de Uber Eats
// ══════════════════════════════════════════════════════════
const uberOrder = {
    platform: 'UBER_EATS',
    externalOrderId: 'UE-2026-00001',
    externalStatus: 'CONFIRMED',
    customerName: 'Juan Pérez',
    customerPhone: '+56912345678',
    deliveryAddress: 'Av. Colón 123, Concepción',
    items: [
        {
            externalName: 'Ceviche Clásico',
            quantity: 1,
            unitPrice: 8900,
            notes: 'Salmón y Atún'
        },
        {
            externalName: 'Papas Fritas',
            quantity: 1,
            unitPrice: 4500
        },
        {
            externalName: 'Coca Cola',
            quantity: 2,
            unitPrice: 1400
        }
    ],
    externalTotal: 16200,
    notes: 'Sin cebolla en el ceviche'
};

// ══════════════════════════════════════════════════════════
// TEST 2: Pedido de PedidosYa
// ══════════════════════════════════════════════════════════
const pedidosYaOrder = {
    platform: 'PEDIDOS_YA',
    externalOrderId: 'PY-2026-00001',
    externalStatus: 'ACCEPTED',
    customerName: 'María González',
    customerPhone: '+56987654321',
    deliveryAddress: 'Calle O\'Higgins 456, Concepción',
    items: [
        {
            externalName: 'Ceviche Peruano',
            quantity: 1,
            unitPrice: 10900
        },
        {
            externalName: 'Empanada de queso',
            quantity: 3,
            unitPrice: 2000
        },
        {
            externalName: 'Limonada',
            quantity: 1,
            unitPrice: 3000
        }
    ],
    externalTotal: 19900,
    notes: 'Timbrar a la entrada'
};

// ══════════════════════════════════════════════════════════
// TEST 3: Mapper testing
// ══════════════════════════════════════════════════════════
const testNames = [
    'Ceviche Clásico',
    'Ceviche Lo Más Rico',
    'Papas Fritas',
    'French Fries',
    'Empanada de queso',
    'Coca Cola',
    'Limonada',
    'Bowl Acevichado',
    'Roll Black Pacific',
    'Producto Inventado XYZ',
];

async function run() {
    console.log(`\n🧪 Testing External Orders API at ${API_URL}\n`);

    // ── Test mapper first ──
    console.log('═══════════════════════════════════════');
    console.log('🔍 MAPPER TEST');
    console.log('═══════════════════════════════════════');

    for (const name of testNames) {
        try {
            const res = await fetch(`${API_URL}/external-orders/mapper/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            const result = await res.json();
            const icon = result.matched ? '✅' : '❌';
            const conf = result.confidence?.toUpperCase() || 'NONE';
            console.log(`  ${icon} "${name}" → ${result.productName || 'NO MATCH'} [${conf}]`);
        } catch (e) {
            console.error(`  💥 Error testing "${name}":`, e.message);
        }
    }

    // ── Test single ingestion ──
    console.log('\n═══════════════════════════════════════');
    console.log('📥 SINGLE INGEST: Uber Eats');
    console.log('═══════════════════════════════════════');

    try {
        const res = await fetch(`${API_URL}/external-orders/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(uberOrder)
        });
        const result = await res.json();
        console.log(`  Status: ${result.status}`);
        console.log(`  Sale ID: ${result.saleId || 'N/A'}`);
        console.log(`  Sale Code: ${result.saleCode || 'N/A'}`);
        console.log(`  Mapping Log:`);
        for (const log of (result.mappingLog || [])) {
            const icon = log.mapped ? '✅' : '❌';
            console.log(`    ${icon} "${log.externalName}" → ${log.internalProduct || 'UNMAPPED'} [${log.confidence}]`);
        }
    } catch (e) {
        console.error('  💥 Error:', e.message);
    }

    // ── Test duplicate detection ──
    console.log('\n═══════════════════════════════════════');
    console.log('🔁 DUPLICATE TEST (same Uber order again)');
    console.log('═══════════════════════════════════════');

    try {
        const res = await fetch(`${API_URL}/external-orders/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(uberOrder)
        });
        const result = await res.json();
        console.log(`  Status: ${result.status}`);
        console.log(`  Expected: "duplicate" ✓`);
    } catch (e) {
        console.error('  💥 Error:', e.message);
    }

    // ── Test bulk ingestion ──
    console.log('\n═══════════════════════════════════════');
    console.log('📥 BULK INGEST: PedidosYa');
    console.log('═══════════════════════════════════════');

    try {
        const res = await fetch(`${API_URL}/external-orders/ingest/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orders: [pedidosYaOrder] })
        });
        const results = await res.json();
        for (const result of results) {
            console.log(`  ${result.platform}#${result.externalOrderId}: ${result.status} (Sale: ${result.saleCode || 'N/A'})`);
        }
    } catch (e) {
        console.error('  💥 Error:', e.message);
    }

    console.log('\n✅ Tests complete!\n');
}

run().catch(console.error);
