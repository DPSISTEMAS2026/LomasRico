/**
 * Genera un JWT de owner directamente con el JWT_SECRET y lo usa para
 * insertar los productos e inventario faltantes via API local.
 * Uso: node scripts/seed-missing-authenticated.js
 */
require('dotenv').config({ path: '.env' });
const jwt = require('jsonwebtoken');

const API_URL = 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-local-testing-2026';

// ── Datos faltantes ─────────────────────────────────────────────────────────

const missingProducts = [
  { name: 'Coca Cola Zero 591cc',  description: 'Sin azúcar',                     price: 1600,  category: 'BEBIDAS',         imageKey: 'Coca Cola Zero 591cc.png',  isActive: true, isConfigurable: false },
  { name: 'Limón Soda 350cc',      description: 'Refrescante',                    price: 1200,  category: 'BEBIDAS',         imageKey: 'Limon Soda 350cc.png',      isActive: true, isConfigurable: false },
  { name: 'Monster 475cc',         description: 'Energética',                     price: 2500,  category: 'BEBIDAS',         imageKey: 'Monster 475cc.png',         isActive: true, isConfigurable: false },
  { name: 'Agua Mineral Puyehue',  description: 'Sin gas 500cc',                  price: 1200,  category: 'BEBIDAS',         imageKey: 'Agua mineral Puyehue.png',  isActive: true, isConfigurable: false },
  { name: 'Kem Piña 350cc',        description: 'Sabor piña',                     price: 1400,  category: 'BEBIDAS',         imageKey: 'Kem_Pina_350cc.jpeg',       isActive: true, isConfigurable: false },
  { name: 'Pancitos con Ajo',      description: '6 unidades con mantequilla de ajo', price: 2500, category: 'EXTRAS',       imageKey: 'Pancitos con Ajo.jpg',      isActive: true, isConfigurable: false },
  { name: 'Sopaipillas 10 uni',    description: 'Tradicionales chilenas',          price: 3000,  category: 'EXTRAS',         imageKey: 'Sopaipillas 10 uni.jpg',    isActive: true, isConfigurable: false },
  { name: 'Papas a la Crema',      description: 'Con salsa de la casa',            price: 4000,  category: 'PAPAS / FRITOS', imageKey: 'Papas a la Crema.jpg',      isActive: true, isConfigurable: false },
  { name: 'Leche de Tigre',        description: 'Shot 200cc para acompañar',      price: 2000,  category: 'EXTRAS',         imageKey: 'Leche de Tigre.jpg',        isActive: true, isConfigurable: false },
  { name: 'Handroll de Pollo',     description: 'Pollo teriyaki con palta',        price: 3500,  category: 'HAND ROLLS',     imageKey: 'Handroll de Pollo.jpg',     isActive: true, isConfigurable: false },
  { name: 'Mix Empanadas',         description: '6 empanadas variadas',            price: 14000, category: 'EMPANADAS',      imageKey: 'Mix Empanadas.jpg',         isActive: true, isConfigurable: false },
];

const missingInventory = [
  // Salsas → role BASE (condimentos base)
  { name: 'Salsa Ají Casera',     category: 'SALSAS',    unit: 'LT', type: 'RAW',    costPerUnit: 0, currentStock: 50,  role: 'BASE'    },
  { name: 'Salsa Tártara',        category: 'SALSAS',    unit: 'LT', type: 'RAW',    costPerUnit: 0, currentStock: 50,  role: 'BASE'    },
  { name: 'Salsa Rosada',         category: 'SALSAS',    unit: 'LT', type: 'RAW',    costPerUnit: 0, currentStock: 50,  role: 'BASE'    },
  { name: 'Salsa Soya',           category: 'SALSAS',    unit: 'LT', type: 'RAW',    costPerUnit: 0, currentStock: 50,  role: 'BASE'    },
  // Bebidas → type RETAIL + role RETAIL
  { name: 'Coca Cola Zero 591cc', category: 'BEBIDAS',   unit: 'UN', type: 'RETAIL', costPerUnit: 0, currentStock: 100, role: 'RETAIL'  },
  { name: 'Limón Soda 350cc',     category: 'BEBIDAS',   unit: 'UN', type: 'RETAIL', costPerUnit: 0, currentStock: 100, role: 'RETAIL'  },
  { name: 'Monster 475cc',        category: 'BEBIDAS',   unit: 'UN', type: 'RETAIL', costPerUnit: 0, currentStock: 100, role: 'RETAIL'  },
  { name: 'Agua Mineral Puyehue', category: 'BEBIDAS',   unit: 'UN', type: 'RETAIL', costPerUnit: 0, currentStock: 100, role: 'RETAIL'  },
  { name: 'Kem Piña 350cc',       category: 'BEBIDAS',   unit: 'UN', type: 'RETAIL', costPerUnit: 0, currentStock: 100, role: 'RETAIL'  },
  // Abarrotes → role VEGGIE (sin categoría propia, más cercano a insumo)
  { name: 'Pan de Ajo',           category: 'ABARROTES', unit: 'UN', type: 'RAW',    costPerUnit: 0, currentStock: 100, role: 'VEGGIE'  },
  { name: 'Sopaipillas',          category: 'ABARROTES', unit: 'UN', type: 'RAW',    costPerUnit: 0, currentStock: 100, role: 'VEGGIE'  },
  { name: 'Crema Ácida',          category: 'ABARROTES', unit: 'LT', type: 'RAW',    costPerUnit: 0, currentStock: 50,  role: 'VEGGIE'  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeToken() {
  // Payload igual al que genera NestJS JwtService en AuthService.generateToken()
  return jwt.sign(
    { userId: 'seed-script', email: 'owner@lomasrico.cl', role: 'OWNER' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function post(path, body, token) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const token = makeToken();
  console.log('🔑 JWT generado (1h)\n');

  // Verificar que la API responde (usamos /inventory con token)
  try {
    const ping = await fetch(`${API_URL}/inventory`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (ping.status === 401 || ping.status === 500) throw new Error(`HTTP ${ping.status}`);
    console.log('✅ API local disponible en', API_URL, '\n');
  } catch (e) {
    console.error('❌ API no disponible en', API_URL, '- ¿está corriendo npm run dev:api?');
    console.error('   Detalle:', e.message);
    process.exit(1);
  }

  // ── Productos ──────────────────────────────────────────────────────────────
  console.log(`📦 Inserting ${missingProducts.length} productos...\n`);
  let ok = 0, skip = 0, fail = 0;
  for (const p of missingProducts) {
    try {
      const r = await post('/products', { ...p, imageUrl: `/assets/${p.imageKey}` }, token);
      if (r.id) { console.log(`  ✅ ${p.name}`); ok++; }
      else       { console.log(`  ⚠️  ${p.name}: ${r.message || JSON.stringify(r).substring(0, 120)}`); skip++; }
    } catch (e) { console.log(`  ❌ ${p.name}: ${e.message}`); fail++; }
  }
  console.log(`\n   → ${ok} insertados, ${skip} saltados, ${fail} errores\n`);

  // ── Inventario ─────────────────────────────────────────────────────────────
  console.log(`🏷️  Inserting ${missingInventory.length} items de inventario...\n`);
  let ok2 = 0, skip2 = 0, fail2 = 0;
  for (const item of missingInventory) {
    try {
      const r = await post('/inventory', item, token);
      if (r.id) { console.log(`  ✅ ${item.name}`); ok2++; }
      else       { console.log(`  ⚠️  ${item.name}: ${r.message || JSON.stringify(r).substring(0, 120)}`); skip2++; }
    } catch (e) { console.log(`  ❌ ${item.name}: ${e.message}`); fail2++; }
  }
  console.log(`\n   → ${ok2} insertados, ${skip2} saltados, ${fail2} errores`);
  console.log('\n✨ Proceso completado!');
}

main().catch(console.error);
