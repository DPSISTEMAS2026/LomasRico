/**
 * run-scrapers.js
 * 
 * Script standalone para ejecutar los scrapers de Uber Eats y PedidosYa.
 * 
 * Uso:
 *   node scripts/run-scrapers.js                # Ejecutar ambos
 *   node scripts/run-scrapers.js --uber          # Solo Uber Eats
 *   node scripts/run-scrapers.js --pedidosya     # Solo PedidosYa
 *   node scripts/run-scrapers.js --loop 300      # Loop cada 5 min
 * 
 * Prerequisitos:
 *   1. La API de Lo Más Rico debe estar corriendo
 *   2. Las cookies/tokens de los portales deben estar en .env
 *   
 * Variables de entorno necesarias (.env):
 *   API_URL=http://localhost:3001
 *   
 *   # Uber Eats (capturar de merchants.ubereats.com → DevTools → Network)
 *   UBER_EATS_COOKIE="sid=xxx; ..."
 *   UBER_EATS_CSRF_TOKEN="xxx"
 *   UBER_EATS_STORE_ID="xxx"
 *   
 *   # PedidosYa (capturar del portal de restaurante → DevTools → Network)
 *   PEDIDOSYA_PORTAL_COOKIE="session=xxx; ..."
 *   PEDIDOSYA_PORTAL_TOKEN="Bearer xxx"
 *   PEDIDOSYA_RESTAURANT_ID="12345"
 */

// Load .env
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3001';

// ═══════════════════════════════════════════════════════════════
// Simplified scraper runner (doesn't import TS modules directly)
// Instead, it calls the API endpoint that triggers the scrapers
// ═══════════════════════════════════════════════════════════════

async function runScraper(platform) {
    console.log(`\n🔄 Running ${platform} scraper...`);
    
    try {
        const res = await fetch(`${API_URL}/external-orders/scraper/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platform })
        });

        if (!res.ok) {
            console.error(`  ❌ API returned ${res.status}: ${await res.text()}`);
            return;
        }

        const result = await res.json();
        
        if (result.success) {
            console.log(`  ✅ ${platform}: ${result.ordersIngested} new orders (${result.ordersFound} found)`);
        } else {
            console.log(`  ⚠️ ${platform}: ${result.error}`);
        }

        if (result.errors?.length > 0) {
            for (const err of result.errors) {
                console.log(`     ⚠️ ${err}`);
            }
        }
    } catch (e) {
        console.error(`  💥 Failed to reach API: ${e.message}`);
        console.error(`     ¿Está corriendo la API en ${API_URL}?`);
    }
}

async function main() {
    const args = process.argv.slice(2);
    const uberOnly = args.includes('--uber');
    const pedidosyaOnly = args.includes('--pedidosya');
    const loopIdx = args.indexOf('--loop');
    const loopSeconds = loopIdx >= 0 ? parseInt(args[loopIdx + 1] || '300', 10) : 0;

    console.log('═══════════════════════════════════════');
    console.log('🛵 Lo Más Rico — External Orders Scraper');
    console.log(`   API: ${API_URL}`);
    console.log(`   Mode: ${loopSeconds > 0 ? `Loop every ${loopSeconds}s` : 'Single run'}`);
    console.log('═══════════════════════════════════════');

    const execute = async () => {
        const timestamp = new Date().toLocaleTimeString('es-CL');
        console.log(`\n[${timestamp}] Executing scraping cycle...`);

        if (!pedidosyaOnly) await runScraper('UBER_EATS');
        if (!uberOnly) await runScraper('PEDIDOS_YA');
    };

    await execute();

    if (loopSeconds > 0) {
        console.log(`\n⏱️ Looping every ${loopSeconds} seconds. Press Ctrl+C to stop.\n`);
        setInterval(execute, loopSeconds * 1000);
    }
}

main().catch(console.error);
