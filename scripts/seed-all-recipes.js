/**
 * seed-all-recipes.js
 * 
 * Script para cargar TODAS las recetas de venta a Supabase desde los documentos de referencia.
 * Basado en:
 *   - docs/references/gramajes.html (Gramajes exactos de ceviches)
 *   - docs/references/RECETAS LOMASRICO.pdf (Recetas completas)
 * 
 * Uso: node scripts/seed-all-recipes.js
 * 
 * DATOS REALES DEL INVENTARIO (obtenidos de GET /inventory)
 * Los IDs son UUIDs reales de Supabase.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ════════════════════════════════════════════════════════════════════
// MAPA DE IDs DE INVENTARIO (fuente: GET /inventory en Supabase)
// ════════════════════════════════════════════════════════════════════
const INV = {
    // --- PROTEÍNAS FRESCAS ---
    salmon: '6cd821c6-443d-404e-96f0-602cd95f786c',
    atun: '9c484d99-0d24-48b0-b33e-d708844d5d4e',
    camaron: 'd00a36e2-0d2d-4343-a00d-623c98cb778d',
    reineta: '1ed212be-95ac-47fd-b3be-2e59c717843b',
    pulpo: '3fa25db6-22da-404d-abde-a7efb7c03f82',    // Pulpo Fresco
    macha: '5f03a7bf-b2ca-449d-8bcc-0c5d883aca64',
    pollo: '8eb7e2e5-680b-4381-90a3-ed3c916fd928',
    pescaDelDia: 'fdc9fb33-b445-45d6-b3d1-1660e1df65e1',

    // --- BASES (PREPARACIONES) ---
    baseLomásRico: 'eb3d02c9-f56f-4a3c-aae0-32a6f77ad99a',  // Base Ceviche LoMASRico 4kg
    basePeruano: '96321922-2935-4cb3-a079-88ac90b32394',  // Base Ceviche Peruano 4kg
    lecheTigreTradicional: 'f507479e-ee59-4020-835a-7a60a0fd0a2d', // Leche de Tigre Tradicional
    lecheTigrePeruana: '8733900f-74b6-4447-86e0-c300d179f783',  // Leche de Tigre Peruana
    lecheTigreTropical: 'f842404f-9de5-4c16-a121-2b2f886842ba',

    // --- VERDURAS ---
    pimenton: '5a61d75e-0a62-4266-b41d-b07418f983f9',  // Pimentón Rojo
    choclo: 'eb6f2297-2a8c-4dc5-8e8a-c31eb819d1d3',  // Choclo Peruano
    chocloNormal: '1b36799f-ac75-440f-adc6-82259ebd6e1e',  // Choclo Normal
    cebollo: 'e1a21247-cd76-4d40-9d82-607100c88b0a',  // Cebolla Morada
    palta: '0b112cd0-d2a0-43c8-bee6-c4997ce3f834',
    limon: '3ade96a9-36fa-47d4-9aa1-d8878523be67',  // Limón Sutil
    cilantro: 'b73bc029-223a-4edb-b49a-bbd9e9375278',
    cebollín: '330bc1a9-a36a-4e1d-b260-7d808c9da540',
    jengibre: 'f25266e8-58d7-4bd3-b208-03acf60b2257',
    rocoto: 'ad5e77de-bd9b-4628-89be-a15be3d2d408',
    ajoOjoAguila: '20dba7ed-e0a6-4bba-a903-1158c8cfed39',
    lechuga: 'fb326536-a9b9-4abf-872e-009ab6019240',
    champiñon: '9ea5f424-69ee-4272-9c83-e62f48629e18',
    apio: '1cc6cf1b-d5d8-47af-97ae-ca0eab9019cb',
    camote: '615618a2-7993-424a-87b1-bc75f3bc7235',
    canchita: 'a0e8b587-6386-4860-976c-14a9f35eb004',

    // --- EMPANADAS ---
    masaEmpanada: 'e3f204fe-86ae-4c95-acd8-d1876914731c',  // Masa Empanada
    quesoMozzarella: '302fad6f-6fcd-41bc-bf05-146c6e8b1995',
    salsaBechamel: '3de9f9b4-932f-4528-98f3-dc921bbe57ba',
    salsaVerde: '44dc5553-ef9d-41bc-9ce5-da6f4d2fa4d0',

    // --- FRITOS / EXTRAS ---
    aros: 'b47b3577-f819-4fbe-bf3c-1cae83bf91ca',  // Aros de Cebolla
    papasCongeladas: '1b731661-18d0-4b4f-9604-149265771192', // Papas Fritas (Congeladas)
    camaronApanado: '4543057f-1627-4bf8-a2c3-3fbb7461bca9', // Camarones Apanados
    sopaipillas: '6ff9bb3d-0291-416e-8641-494831720f77',

    // --- BEBIDAS ---
    cocaCola591: '24aadca2-e6a8-4e6e-bc0f-23e81e2934f2',
    soda350: '46ab256e-cd1f-4203-8935-50f80320fdea',
    monster: '45bd3b46-6193-47af-9cc0-bcc9c22821fd',
    aguaMineral: 'a434a896-d9c3-48fd-9793-1be64c53d942',

    // --- SALSAS ---
    salsaAjoCasera: 'fb20a4eb-f0f4-46d6-b1e3-ee51a98b9d44',
    salsaAjoConfitado: '456175fc-38db-49f6-a0c1-d3e7244d07e4',
    salsaMerquen: '9605a641-8575-4de8-a09b-d20fe3a34420',
    panDeAjo: 'a434a896-d9c3-48fd-9793-1be64c53d942', // fallback
};

// ════════════════════════════════════════════════════════════════════
// HELPER: POST al endpoint de seed de recetas
// ════════════════════════════════════════════════════════════════════
async function seedRecipe(productName, recipeName, baseWeight, items) {
    // Primero buscar el producto por nombre
    const productsRes = await fetch(`${API_URL}/products`);
    const products = await productsRes.json();

    const product = products.find(p =>
        p.name.toLowerCase().includes(productName.toLowerCase()) ||
        productName.toLowerCase().includes(p.name.toLowerCase())
    );

    if (!product) {
        console.warn(`  ⚠️  Producto no encontrado: "${productName}"`);
        return false;
    }

    // Construir receta via POST /recipes
    const body = {
        targetId: product.id,
        type: 'PRODUCT',
        baseWeight,
        items: items.map(item => ({
            ingredientId: item.id,
            quantity: item.qty,
            unit: item.unit || 'KG',
            role: item.role || 'BASE'
        }))
    };

    try {
        const res = await fetch(`${API_URL}/recipes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            console.log(`  ✅ ${productName} → receta creada/actualizada (${items.length} items)`);
            return true;
        } else {
            const err = await res.json().catch(() => ({ message: 'Unknown error' }));
            console.error(`  ❌ ${productName} → Error: ${err.message}`);
            return false;
        }
    } catch (e) {
        console.error(`  ❌ ${productName} → Excepción: ${e.message}`);
        return false;
    }
}

// ════════════════════════════════════════════════════════════════════
// RECETAS DESDE DOCUMENTOS DE REFERENCIA
// ════════════════════════════════════════════════════════════════════
// 
// NOTA: Los gramajes de verduras son POR PORCIÓN (ej: 1KG de ceviche).
// Los ceviches usan Base (preparación) + Verduras individuales + Leche de Tigre + Proteína.
// Las proteínas son el slot configurable (se maneja via RecipeResolver dinámicamente).
// Aquí definimos Salmón como proteína "placeholder" default — se reemplaza al vender.
//
// GRAMAJES EXACTOS DE gramajes.html:
// ─────────────────────────────────────────────────────────────────
// Formato 1KG:  360g proteína | 60g pimentón | 100g choclo | 120g cebolla | 40g palta | 225ml leche
// Formato 750g: 280g proteína | 45g pimentón | 75g choclo  | 90g cebolla  | 30g palta | 225ml leche
// Formato 500g: 180g proteína | 30g pimentón | 50g choclo  | 60g cebolla  | 20g palta | 150ml leche
// Formato 350g: 140g proteína | 20g pimentón | 30g choclo  | 40g cebolla  | 14g palta | 125ml leche
// Formato 250g: 90g proteína  | 16g pimentón | 24g choclo  | 32g cebolla  | 11g palta | 100ml leche (estimado)
// ─────────────────────────────────────────────────────────────────
// Peruano: misma base de verduras pero con Leche de Tigre Peruana + Canchita

const RECIPES = [
    // ───────────────────────────────────────────────────────────────
    // CEVICHES LOMASRICO (Base Tradicional)
    // ───────────────────────────────────────────────────────────────
    {
        productName: 'Ceviche LoMASRico 250g',
        recipeName: 'Receta Ceviche LMR 250g',
        baseWeight: 0.250,
        items: [
            { id: INV.salmon, qty: 0.090, unit: 'KG', role: 'PROTEIN_MAIN' },
            { id: INV.pimenton, qty: 0.016, unit: 'KG', role: 'VEGGIE' },
            { id: INV.choclo, qty: 0.024, unit: 'KG', role: 'VEGGIE' },
            { id: INV.cebollo, qty: 0.032, unit: 'KG', role: 'VEGGIE' },
            { id: INV.palta, qty: 0.011, unit: 'KG', role: 'VEGGIE' },
            { id: INV.lecheTigreTradicional, qty: 0.100, unit: 'LT', role: 'BASE' },
        ]
    },
    {
        productName: 'Ceviche LoMASRico 350g',
        recipeName: 'Receta Ceviche LMR 350g',
        baseWeight: 0.350,
        items: [
            { id: INV.salmon, qty: 0.140, unit: 'KG', role: 'PROTEIN_MAIN' },
            { id: INV.pimenton, qty: 0.020, unit: 'KG', role: 'VEGGIE' },
            { id: INV.choclo, qty: 0.030, unit: 'KG', role: 'VEGGIE' },
            { id: INV.cebollo, qty: 0.040, unit: 'KG', role: 'VEGGIE' },
            { id: INV.palta, qty: 0.014, unit: 'KG', role: 'VEGGIE' },
            { id: INV.lecheTigreTradicional, qty: 0.125, unit: 'LT', role: 'BASE' },
        ]
    },
    {
        productName: 'Ceviche LoMASRico 500g',
        recipeName: 'Receta Ceviche LMR 500g',
        baseWeight: 0.500,
        items: [
            { id: INV.salmon, qty: 0.180, unit: 'KG', role: 'PROTEIN_MAIN' },
            { id: INV.pimenton, qty: 0.030, unit: 'KG', role: 'VEGGIE' },
            { id: INV.choclo, qty: 0.050, unit: 'KG', role: 'VEGGIE' },
            { id: INV.cebollo, qty: 0.060, unit: 'KG', role: 'VEGGIE' },
            { id: INV.palta, qty: 0.020, unit: 'KG', role: 'VEGGIE' },
            { id: INV.lecheTigreTradicional, qty: 0.150, unit: 'LT', role: 'BASE' },
        ]
    },
    {
        productName: 'Ceviche LoMASRico 750g',
        recipeName: 'Receta Ceviche LMR 750g',
        baseWeight: 0.750,
        items: [
            { id: INV.salmon, qty: 0.280, unit: 'KG', role: 'PROTEIN_MAIN' },
            { id: INV.pimenton, qty: 0.045, unit: 'KG', role: 'VEGGIE' },
            { id: INV.choclo, qty: 0.075, unit: 'KG', role: 'VEGGIE' },
            { id: INV.cebollo, qty: 0.090, unit: 'KG', role: 'VEGGIE' },
            { id: INV.palta, qty: 0.030, unit: 'KG', role: 'VEGGIE' },
            { id: INV.lecheTigreTradicional, qty: 0.225, unit: 'LT', role: 'BASE' },
        ]
    },
    {
        productName: 'Ceviche LoMASRico 1KG',
        recipeName: 'Receta Ceviche LMR 1KG',
        baseWeight: 1.000,
        items: [
            { id: INV.salmon, qty: 0.360, unit: 'KG', role: 'PROTEIN_MAIN' },
            { id: INV.pimenton, qty: 0.060, unit: 'KG', role: 'VEGGIE' },
            { id: INV.choclo, qty: 0.100, unit: 'KG', role: 'VEGGIE' },
            { id: INV.cebollo, qty: 0.120, unit: 'KG', role: 'VEGGIE' },
            { id: INV.palta, qty: 0.040, unit: 'KG', role: 'VEGGIE' },
            { id: INV.lecheTigreTradicional, qty: 0.225, unit: 'LT', role: 'BASE' },
        ]
    },

    // ───────────────────────────────────────────────────────────────
    // CEVICHES PERUANOS (Base Peruana + Leche Peruana + Canchita)
    // ───────────────────────────────────────────────────────────────
    {
        productName: 'Ceviche Peruano 350g',
        recipeName: 'Receta Ceviche Peruano 350g',
        baseWeight: 0.350,
        items: [
            { id: INV.salmon, qty: 0.140, unit: 'KG', role: 'PROTEIN_MAIN' },
            { id: INV.choclo, qty: 0.045, unit: 'KG', role: 'VEGGIE' },  // Choclo Peruano (grano)
            { id: INV.cebollo, qty: 0.052, unit: 'KG', role: 'VEGGIE' },
            { id: INV.lecheTigrePeruana, qty: 0.108, unit: 'LT', role: 'BASE' },
            { id: INV.canchita, qty: 0.015, unit: 'KG', role: 'BASE' },   // 15g canchita (doc)
        ]
    },
    {
        productName: 'Ceviche Peruano 500g',
        recipeName: 'Receta Ceviche Peruano 500g',
        baseWeight: 0.500,
        items: [
            { id: INV.salmon, qty: 0.180, unit: 'KG', role: 'PROTEIN_MAIN' },
            { id: INV.choclo, qty: 0.063, unit: 'KG', role: 'VEGGIE' },
            { id: INV.cebollo, qty: 0.073, unit: 'KG', role: 'VEGGIE' },
            { id: INV.lecheTigrePeruana, qty: 0.150, unit: 'LT', role: 'BASE' },
            { id: INV.canchita, qty: 0.025, unit: 'KG', role: 'BASE' },   // 25g (doc)
        ]
    },
    {
        productName: 'Ceviche Peruano 750g',
        recipeName: 'Receta Ceviche Peruano 750g',
        baseWeight: 0.750,
        items: [
            { id: INV.salmon, qty: 0.280, unit: 'KG', role: 'PROTEIN_MAIN' },
            { id: INV.choclo, qty: 0.094, unit: 'KG', role: 'VEGGIE' },
            { id: INV.cebollo, qty: 0.109, unit: 'KG', role: 'VEGGIE' },
            { id: INV.lecheTigrePeruana, qty: 0.225, unit: 'LT', role: 'BASE' },
            { id: INV.canchita, qty: 0.035, unit: 'KG', role: 'BASE' },   // 35g (doc)
        ]
    },
    {
        productName: 'Ceviche Peruano 1KG',
        recipeName: 'Receta Ceviche Peruano 1KG',
        baseWeight: 1.000,
        items: [
            { id: INV.salmon, qty: 0.360, unit: 'KG', role: 'PROTEIN_MAIN' },
            { id: INV.choclo, qty: 0.125, unit: 'KG', role: 'VEGGIE' },  // 500g/4kg * proporción
            { id: INV.cebollo, qty: 0.145, unit: 'KG', role: 'VEGGIE' },  // 580g/4kg * proporción
            { id: INV.lecheTigrePeruana, qty: 0.300, unit: 'LT', role: 'BASE' },    // 1200ml/4kg
            { id: INV.canchita, qty: 0.050, unit: 'KG', role: 'BASE' },    // 50g (doc)
        ]
    },

    // ───────────────────────────────────────────────────────────────
    // EMPANADAS
    // ───────────────────────────────────────────────────────────────
    {
        productName: 'Empanada Queso',
        recipeName: 'Receta Empanada Queso',
        baseWeight: 0.090,
        items: [
            { id: INV.masaEmpanada, qty: 1, unit: 'UN', role: 'BASE' },
            { id: INV.quesoMozzarella, qty: 0.030, unit: 'KG', role: 'BASE' },    // 30g queso
            { id: INV.salsaBechamel, qty: 0.010, unit: 'LT', role: 'BASE' },   // 10g bechamel
        ]
    },
    {
        productName: 'Empanada Camarón',
        recipeName: 'Receta Empanada Camarón-Queso',
        baseWeight: 0.100,
        items: [
            { id: INV.masaEmpanada, qty: 1, unit: 'UN', role: 'BASE' },
            { id: INV.camaron, qty: 0.020, unit: 'KG', role: 'PROTEIN_MAIN' },  // 20g camarón
            { id: INV.quesoMozzarella, qty: 0.020, unit: 'KG', role: 'BASE' },
            { id: INV.salsaBechamel, qty: 0.010, unit: 'LT', role: 'BASE' },
        ]
    },
    {
        productName: 'Empanada Macha',
        recipeName: 'Receta Empanada Macha-Queso',
        baseWeight: 0.100,
        items: [
            { id: INV.masaEmpanada, qty: 1, unit: 'UN', role: 'BASE' },
            { id: INV.macha, qty: 0.025, unit: 'KG', role: 'PROTEIN_MAIN' },  // 25g macha
            { id: INV.quesoMozzarella, qty: 0.020, unit: 'KG', role: 'BASE' },
            { id: INV.salsaBechamel, qty: 0.010, unit: 'LT', role: 'BASE' },
        ]
    },

    // ───────────────────────────────────────────────────────────────
    // EXTRAS / ACOMPAÑAMIENTOS
    // ───────────────────────────────────────────────────────────────
    {
        productName: 'Papas',
        recipeName: 'Receta Papas Fritas Porción',
        baseWeight: 0.200,
        items: [
            { id: INV.papasCongeladas, qty: 0.140, unit: 'KG', role: 'BASE' },
        ]
    },
    {
        productName: 'Aros de Cebolla',
        recipeName: 'Receta Aros de Cebolla (10 un)',
        baseWeight: 0.250,
        items: [
            { id: INV.aros, qty: 0.250, unit: 'KG', role: 'BASE' },
        ]
    },
    {
        productName: 'Camarones Apanados',
        recipeName: 'Receta Camarones Apanados (10 un)',
        baseWeight: 0.300,
        items: [
            { id: INV.camaronApanado, qty: 0.250, unit: 'KG', role: 'PROTEIN_MAIN' },
            { id: INV.salsaVerde, qty: 0.050, unit: 'LT', role: 'BASE' },
        ]
    },
    {
        productName: 'Sopaipillas',
        recipeName: 'Receta Sopaipillas (10 un)',
        baseWeight: 0.400,
        items: [
            { id: INV.sopaipillas, qty: 10, unit: 'UN', role: 'BASE' },
            { id: INV.salsaVerde, qty: 0.100, unit: 'LT', role: 'BASE' },
        ]
    },

    // ───────────────────────────────────────────────────────────────
    // PROMOS (recetas parciales — proteína la elige el usuario)
    // ───────────────────────────────────────────────────────────────
    {
        productName: 'PROMO 1',
        recipeName: 'Receta Promo 1 (250g + Papas + Camarones + Aros)',
        baseWeight: 0.900,
        items: [
            { id: INV.salmon, qty: 0.090, unit: 'KG', role: 'PROTEIN_MAIN' },
            { id: INV.pimenton, qty: 0.016, unit: 'KG', role: 'VEGGIE' },
            { id: INV.choclo, qty: 0.024, unit: 'KG', role: 'VEGGIE' },
            { id: INV.cebollo, qty: 0.032, unit: 'KG', role: 'VEGGIE' },
            { id: INV.palta, qty: 0.011, unit: 'KG', role: 'VEGGIE' },
            { id: INV.lecheTigreTradicional, qty: 0.100, unit: 'LT', role: 'BASE' },
            { id: INV.papasCongeladas, qty: 0.140, unit: 'KG', role: 'BASE' },
            { id: INV.camaronApanado, qty: 0.250, unit: 'KG', role: 'BASE' },
            { id: INV.aros, qty: 0.250, unit: 'KG', role: 'BASE' },
        ]
    },
    {
        productName: 'PROMO 2',
        recipeName: 'Receta Promo 2 (350g + 2 Empanadas Queso + Papas)',
        baseWeight: 0.700,
        items: [
            { id: INV.salmon, qty: 0.140, unit: 'KG', role: 'PROTEIN_MAIN' },
            { id: INV.pimenton, qty: 0.020, unit: 'KG', role: 'VEGGIE' },
            { id: INV.choclo, qty: 0.030, unit: 'KG', role: 'VEGGIE' },
            { id: INV.cebollo, qty: 0.040, unit: 'KG', role: 'VEGGIE' },
            { id: INV.palta, qty: 0.014, unit: 'KG', role: 'VEGGIE' },
            { id: INV.lecheTigreTradicional, qty: 0.125, unit: 'LT', role: 'BASE' },
            { id: INV.masaEmpanada, qty: 2, unit: 'UN', role: 'BASE' },  // 2 empanadas
            { id: INV.quesoMozzarella, qty: 0.060, unit: 'KG', role: 'BASE' },
            { id: INV.papasCongeladas, qty: 0.140, unit: 'KG', role: 'BASE' },
        ]
    },
    {
        productName: 'PROMO 3',
        recipeName: 'Receta Promo 3 (500g + Papas Medianas + 10 Aros)',
        baseWeight: 0.950,
        items: [
            { id: INV.salmon, qty: 0.180, unit: 'KG', role: 'PROTEIN_MAIN' },
            { id: INV.pimenton, qty: 0.030, unit: 'KG', role: 'VEGGIE' },
            { id: INV.choclo, qty: 0.050, unit: 'KG', role: 'VEGGIE' },
            { id: INV.cebollo, qty: 0.060, unit: 'KG', role: 'VEGGIE' },
            { id: INV.palta, qty: 0.020, unit: 'KG', role: 'VEGGIE' },
            { id: INV.lecheTigreTradicional, qty: 0.150, unit: 'LT', role: 'BASE' },
            { id: INV.papasCongeladas, qty: 0.140, unit: 'KG', role: 'BASE' },
            { id: INV.aros, qty: 0.250, unit: 'KG', role: 'BASE' },
        ]
    },
    {
        productName: 'De Miedo',
        recipeName: 'Receta De Miedo (750g Salmón + 4 Empanadas + Pancitos)',
        baseWeight: 1.200,
        items: [
            { id: INV.salmon, qty: 0.280, unit: 'KG', role: 'PROTEIN_MAIN' },
            { id: INV.pimenton, qty: 0.045, unit: 'KG', role: 'VEGGIE' },
            { id: INV.choclo, qty: 0.075, unit: 'KG', role: 'VEGGIE' },
            { id: INV.cebollo, qty: 0.090, unit: 'KG', role: 'VEGGIE' },
            { id: INV.palta, qty: 0.030, unit: 'KG', role: 'VEGGIE' },
            { id: INV.lecheTigreTradicional, qty: 0.225, unit: 'LT', role: 'BASE' },
            { id: INV.masaEmpanada, qty: 4, unit: 'UN', role: 'BASE' },  // 4 empanadas
            { id: INV.quesoMozzarella, qty: 0.120, unit: 'KG', role: 'BASE' },
        ]
    },
    {
        productName: 'MEGA PROMO',
        recipeName: 'Receta Mega Promo (1KG Salmón + 6 Empanadas + Pancitos + Salsa)',
        baseWeight: 1.600,
        items: [
            { id: INV.salmon, qty: 0.360, unit: 'KG', role: 'PROTEIN_MAIN' },
            { id: INV.pimenton, qty: 0.060, unit: 'KG', role: 'VEGGIE' },
            { id: INV.choclo, qty: 0.100, unit: 'KG', role: 'VEGGIE' },
            { id: INV.cebollo, qty: 0.120, unit: 'KG', role: 'VEGGIE' },
            { id: INV.palta, qty: 0.040, unit: 'KG', role: 'VEGGIE' },
            { id: INV.lecheTigreTradicional, qty: 0.225, unit: 'LT', role: 'BASE' },
            { id: INV.masaEmpanada, qty: 6, unit: 'UN', role: 'BASE' },  // 6 empanadas
            { id: INV.quesoMozzarella, qty: 0.180, unit: 'KG', role: 'BASE' },
        ]
    },
    {
        productName: 'Promo Express',
        recipeName: 'Receta Promo Express (250g Salmón + Acomp + Bebida)',
        baseWeight: 0.500,
        items: [
            { id: INV.salmon, qty: 0.090, unit: 'KG', role: 'PROTEIN_MAIN' },
            { id: INV.pimenton, qty: 0.016, unit: 'KG', role: 'VEGGIE' },
            { id: INV.choclo, qty: 0.024, unit: 'KG', role: 'VEGGIE' },
            { id: INV.cebollo, qty: 0.032, unit: 'KG', role: 'VEGGIE' },
            { id: INV.palta, qty: 0.011, unit: 'KG', role: 'VEGGIE' },
            { id: INV.lecheTigreTradicional, qty: 0.100, unit: 'LT', role: 'BASE' },
            { id: INV.cocaCola591, qty: 1, unit: 'UN', role: 'BASE' },
        ]
    },
];

// ════════════════════════════════════════════════════════════════════
// EJECUCIÓN
// ════════════════════════════════════════════════════════════════════
async function main() {
    console.log(`\n🚀 Iniciando seed de recetas en ${API_URL}...\n`);
    console.log(`   Total de recetas a procesar: ${RECIPES.length}\n`);

    let ok = 0;
    let fail = 0;

    for (const recipe of RECIPES) {
        process.stdout.write(`→ ${recipe.productName}... `);
        const result = await seedRecipe(
            recipe.productName,
            recipe.recipeName,
            recipe.baseWeight,
            recipe.items
        );
        if (result) ok++;
        else fail++;

        // Pequeña pausa para no saturar la API
        await new Promise(r => setTimeout(r, 200));
    }

    console.log('\n════════════════════════════════════════');
    console.log(`✅ Exitosas: ${ok}/${RECIPES.length}`);
    console.log(`❌ Fallidas: ${fail}/${RECIPES.length}`);
    console.log('════════════════════════════════════════\n');

    if (fail > 0) {
        console.log('💡 Las recetas fallidas pueden deberse a:');
        console.log('   1) El nombre del producto no coincide exactamente con Supabase');
        console.log('   2) El ID de un ingrediente cambió en Supabase');
        console.log('   3) La API no está corriendo en http://localhost:3001');
    }
}

main().catch(console.error);
