/**
 * super-seed-recipes.js
 * 
 * Carga MASIVA de recetas basada en los gramajes oficiales de Lo Más Rico.
 */

const API_URL = 'http://localhost:3001';

// Mapeo EXACTO de IDs de Inventario (UUIDs reales de tu Supabase)
const INV = {
    salmon: '6cd821c6-443d-404e-96f0-602cd95f786c',
    atun: '055a8768-c61a-45fd-83f9-abebc513c7a3',
    camaron: 'f6e01df8-7b82-4755-997b-d508ef1a5f69',
    reineta: '09dac030-a026-4df7-a1d1-a9c070207888',
    pulpo: 'd14211a4-b295-4ca4-a85f-497f0c761a1d',
    pollo: 'fde48d72-acbb-45e5-9ebf-5d0ab7fb5a25',
    champinon: '484aa057-02c9-4f8e-bf9b-9ba2d0ce4c94',

    // Bases y Leches
    lecheTradicional: '6ff9bb3d-0291-416e-8641-494831720f77',
    lechePeruana: '96321922-2935-4cb3-a079-88ac90b32394',
    lecheTropical: '0fdc58bd-f41f-43db-9661-9831f697e85b',
    lecheLoMASRico: 'eb3d02c9-f56f-4a3c-aae0-32a6f77ad99a',
    arrozSushi: '456175fc-38db-49f6-a0c1-d3e7244d07e4',

    // Verduras
    pimenton: '8275a41e-f3cc-4b32-b8f2-36b15a977b33',
    chocloPeruano: 'eb6f2297-2a8c-4dc5-8e8a-c31eb819d1d3',
    cebollaMorada: '20dba7ed-e0a6-4bba-a903-1158c8cfed39',
    palta: '3fa25db6-22da-404d-abde-a7efb7c03f82',
    mango: '1fed1afa-1a8f-49e1-bc42-3d9ad75701ea',
    canchita: '9605a641-8575-4de8-a09b-d20fe3a34420',

    // Insumos Empanadas/Fritos
    quesoMozzarella: '88bb4db0-d154-4e60-95a8-bd04360745c4',
    masaEmpanada: '22f7442d-d58c-41e1-bd36-6776ee6783bf',
    papas: 'e1e08666-7bf1-4909-8ccf-3ae9ceb020e0',
    quesoCrema: '1b36799f-ac75-440f-adc6-82259ebd6e1e'
};

const RECIPES = [
    // ────────────── CEVICHES TRADICIONALES ──────────────
    { name: 'Ceviche LoMASRico 1KG', weight: 1.0, protein: 0.360, leche: INV.lecheLoMASRico, l_qty: 0.225, type: 'LMR' },
    { name: 'Ceviche LoMASRico 750g', weight: 0.75, protein: 0.280, leche: INV.lecheLoMASRico, l_qty: 0.225, type: 'LMR' },
    { name: 'Ceviche LoMASRico 500g', weight: 0.5, protein: 0.180, leche: INV.lecheLoMASRico, l_qty: 0.150, type: 'LMR' },
    { name: 'Ceviche LoMASRico 350g', weight: 0.35, protein: 0.140, leche: INV.lecheLoMASRico, l_qty: 0.125, type: 'LMR' },
    { name: 'Ceviche LoMASRico 250g', weight: 0.25, protein: 0.090, leche: INV.lecheLoMASRico, l_qty: 0.100, type: 'LMR' },

    // ────────────── CEVICHES PERUANOS ──────────────
    { name: 'Ceviche Peruano 1KG', weight: 1.0, protein: 0.360, leche: INV.lechePeruana, l_qty: 0.300, type: 'PER' },
    { name: 'Ceviche Peruano 750g', weight: 0.75, protein: 0.280, leche: INV.lechePeruana, l_qty: 0.225, type: 'PER' },
    { name: 'Ceviche Peruano 500g', weight: 0.5, protein: 0.180, leche: INV.lechePeruana, l_qty: 0.150, type: 'PER' },
    { name: 'Ceviche Peruano 350g', weight: 0.35, protein: 0.140, leche: INV.lechePeruana, l_qty: 0.125, type: 'PER' },

    // ────────────── CEVICHES TROPICAL ──────────────
    { name: 'Tropical 1KG', weight: 1.0, protein: 0.360, leche: INV.lecheTropical, l_qty: 0.225, type: 'TRO' },
    { name: 'Tropical 750g', weight: 0.75, protein: 0.280, leche: INV.lecheTropical, l_qty: 0.225, type: 'TRO' },
    { name: 'Tropical 500g', weight: 0.5, protein: 0.180, leche: INV.lecheTropical, l_qty: 0.150, type: 'TRO' },
    { name: 'Tropical 350g', weight: 0.35, protein: 0.140, leche: INV.lecheTropical, l_qty: 0.125, type: 'TRO' },
    { name: 'Tropical 250g', weight: 0.25, protein: 0.090, leche: INV.lecheTropical, l_qty: 0.100, type: 'TRO' },

    // ────────────── CEVICHES SIN VERDURAS ──────────────
    { name: 'Sin Verduras 1KG', weight: 1.0, protein: 0.5, leche: INV.lecheTradicional, l_qty: 0.400, type: 'NONE' },
    { name: 'Sin Verduras 750g', weight: 0.75, protein: 0.4, leche: INV.lecheTradicional, l_qty: 0.300, type: 'NONE' },
    { name: 'Sin Verduras 500g', weight: 0.5, protein: 0.25, leche: INV.lecheTradicional, l_qty: 0.200, type: 'NONE' },
    { name: 'Sin Verduras 350g', weight: 0.35, protein: 0.2, leche: INV.lecheTradicional, l_qty: 0.150, type: 'NONE' },

    // ────────────── BOWL / GOHAN / CRUDO ──────────────
    { name: 'Bowl Acevichado', weight: 0.5, protein: 0.1, leche: INV.lecheTradicional, l_qty: 0.100, type: 'BOWL' },
    { name: 'Elige tu GOHAN!', weight: 0.4, protein: 0.08, leche: INV.lecheTradicional, l_qty: 0.05, type: 'GOHAN' },
    { name: 'Crudo de Salmón', weight: 0.3, protein: 0.2, leche: INV.lecheTradicional, l_qty: 0.05, type: 'CRUDO' },

    // ────────────── EMPANADAS ──────────────
    { name: 'Empanada Queso', weight: 0.1, items: [{ id: INV.masaEmpanada, q: 1, u: 'UN' }, { id: INV.quesoMozzarella, q: 0.04 }] },
    { name: 'Camarón-Queso', weight: 0.12, items: [{ id: INV.masaEmpanada, q: 1, u: 'UN' }, { id: INV.quesoMozzarella, q: 0.03 }, { id: INV.camaron, q: 0.03 }] },
    { name: 'Macha Queso', weight: 0.12, items: [{ id: INV.masaEmpanada, q: 1, u: 'UN' }, { id: INV.quesoMozzarella, q: 0.03 }, { id: INV.macha, q: 0.03 }] },

    // ────────────── JAPONES ──────────────
    { name: 'HandRoll Salmón', weight: 0.25, items: [{ id: INV.arrozSushi, q: 0.15 }, { id: INV.salmon, q: 0.05 }, { id: INV.quesoCrema, q: 0.03 }, { id: INV.palta, q: 0.02 }] },
    { name: 'HandRoll Camarón', weight: 0.25, items: [{ id: INV.arrozSushi, q: 0.15 }, { id: INV.camaron, q: 0.05 }, { id: INV.quesoCrema, q: 0.03 }, { id: INV.palta, q: 0.02 }] }
];

async function seed() {
    console.log('🚀 Iniciando Super Seed de Recetas...');
    const productsRes = await fetch(`${API_URL}/products`);
    const allProducts = await productsRes.json();

    for (const r of RECIPES) {
        const prod = allProducts.find(p => p.name.toLowerCase() === r.name.toLowerCase());
        if (!prod) {
            console.warn(`⚠️ No encontrado: ${r.name}`);
            continue;
        }

        let items = r.items || [];
        if (!r.items) {
            // Generar items para Ceviches automáticamente según tipo
            items.push({ id: r.leche, quantity: r.l_qty, role: 'BASE' });
            items.push({ id: INV.salmon, quantity: r.protein, role: 'PROTEIN_MAIN' }); // Placeholder

            if (r.type !== 'NONE') {
                items.push({ id: INV.cebollaMorada, quantity: r.weight * 0.12, role: 'VEGGIE' });
                items.push({ id: INV.chocloPeruano, quantity: r.weight * 0.10, role: 'VEGGIE' });
                if (r.type === 'TRO') items.push({ id: INV.mango, quantity: r.weight * 0.08, role: 'VEGGIE' });
                if (r.type === 'PER') items.push({ id: INV.canchita, quantity: 0.03, role: 'BASE' });
            }
        }

        const body = {
            targetId: prod.id,
            type: 'PRODUCT',
            baseWeight: r.weight,
            items: items.map(i => ({
                ingredientId: i.id || i.ingredientId,
                quantity: i.q || i.quantity,
                unit: i.u || 'KG',
                role: i.role || 'BASE'
            }))
        };

        const res = await fetch(`${API_URL}/recipes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) console.log(`✅ ${r.name} actualizado.`);
        else console.error(`❌ Falló ${r.name}`);
    }
}

seed();
