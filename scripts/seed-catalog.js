
const API_URL = 'https://pro-lomasrico-api.onrender.com';

const CATALOG = [
    // --- CEVICHE LOMASRICO ---
    { name: 'Ceviche LoMASRico 250g', description: 'Elige hasta 3 proteínas. Base Tradicional.', price: 5900, category: 'CEVICHE LOMASRICO', allowsModifiers: true, maxProteins: 3, imageUrl: '/assets/Ceviche LoMASRico.jpg' },
    { name: 'Ceviche LoMASRico 350g', description: 'Elige hasta 3 proteínas. Base Tradicional.', price: 8900, category: 'CEVICHE LOMASRICO', allowsModifiers: true, maxProteins: 3, imageUrl: '/assets/Ceviche LoMASRico.jpg' },
    { name: 'Ceviche LoMASRico 500g', description: 'Elige hasta 3 proteínas. Base Tradicional.', price: 11900, category: 'CEVICHE LOMASRICO', allowsModifiers: true, maxProteins: 3, imageUrl: '/assets/Ceviche LoMASRico 500g.jpg' },
    { name: 'Ceviche LoMASRico 750g', description: 'Elige hasta 3 proteínas. Base Tradicional.', price: 16900, category: 'CEVICHE LOMASRICO', allowsModifiers: true, maxProteins: 3, imageUrl: '/assets/Ceviche LoMASRico 750g.jpg' },
    { name: 'Ceviche LoMASRico 1KG', description: 'Elige hasta 3 proteínas. Base Tradicional.', price: 20900, category: 'CEVICHE LOMASRICO', allowsModifiers: true, maxProteins: 3, imageUrl: '/assets/Ceviche LoMASRico 1KG.jpg' },

    // --- CEVICHE PERUANO ---
    { name: 'Ceviche Peruano 350g', description: 'Base Peruana (Rocoto/Apio). Proteínas a elección.', price: 10900, category: 'CEVICHE PERUANO', allowsModifiers: true, maxProteins: 3, imageUrl: '/assets/Peruano 350g.jpg' },
    { name: 'Ceviche Peruano 500g', description: 'Base Peruana (Rocoto/Apio). Proteínas a elección.', price: 13400, category: 'CEVICHE PERUANO', allowsModifiers: true, maxProteins: 3, imageUrl: '/assets/Ceviche Peruano 500g.jpeg' },
    { name: 'Ceviche Peruano 750g', description: 'Base Peruana (Rocoto/Apio). Proteínas a elección.', price: 18900, category: 'CEVICHE PERUANO', allowsModifiers: true, maxProteins: 3, imageUrl: '/assets/Peruano 750g.jpg' },
    { name: 'Ceviche Peruano 1KG', description: 'Base Peruana (Rocoto/Apio). Proteínas a elección.', price: 22900, category: 'CEVICHE PERUANO', allowsModifiers: true, maxProteins: 3, imageUrl: '/assets/Peruano 1KG.png' },

    // --- PROMOS ---
    { name: 'PROMO 1', description: 'Ceviche 250g + Papas + Camarones + Aros', price: 14900, category: 'PROMOS', allowsModifiers: true, maxProteins: 3, imageUrl: '/assets/PROMO 1.png' },
    { name: 'PROMO 2', description: 'Ceviche 350g + 2 Empanadas Queso + Papas', price: 12900, category: 'PROMOS', allowsModifiers: true, maxProteins: 3, imageUrl: '/assets/PROMO 2.png' },
    { name: 'PROMO 3', description: 'Ceviche 500g + Papas Medianas + 10 Aros', price: 16400, category: 'PROMOS', allowsModifiers: true, maxProteins: 3, imageUrl: '/assets/PROMO 3.png' },
    { name: 'De Miedo!', description: '750g Salmón (Fijo) + 4 Empanadas + Pancitos', price: 24900, category: 'PROMOS', allowsModifiers: false, imageUrl: '/assets/De Miedo.png' },
    { name: 'MEGA PROMO!', description: '1KG Salmón (Fijo) + 6 Empanadas + Pancitos + Salsa', price: 25900, category: 'PROMOS', allowsModifiers: false, imageUrl: '/assets/MEGA PROMO.png' },
    { name: 'Promo Express', description: 'Ceviche 250g Salmón + Acomp + Bebida', price: 7990, category: 'PROMOS', allowsModifiers: false, imageUrl: '/assets/Promo Express.png' },

    // --- EMPANADAS ---
    { name: 'Empanada Queso', description: 'Frita, solo queso', price: 2000, category: 'EMPANADAS', allowsModifiers: false, imageUrl: '/assets/Empanada Queso.jpg' },
    { name: 'Empanada Camarón-Queso', description: 'Frita, camarón y queso', price: 2500, category: 'EMPANADAS', allowsModifiers: false, imageUrl: '/assets/Empanada Camarón Queso.jpg' },
    { name: 'Empanada Macha-Queso', description: 'Frita, macha y queso', price: 2800, category: 'EMPANADAS', allowsModifiers: false, imageUrl: '/assets/Empanada Macha Queso.jpg' },

    // --- EXTRAS ---
    { name: 'Papas Fritas', price: 2900, category: 'EXTRAS', allowsModifiers: false, imageUrl: '/assets/Papas Fritas LoMASRico.png' },
    { name: 'Aros de Cebolla (10 un)', price: 2900, category: 'EXTRAS', allowsModifiers: false, imageUrl: '/assets/Apanados LoMASRico.png' },
    { name: 'Camarones Apanados (10 un)', price: 4900, category: 'EXTRAS', allowsModifiers: false, imageUrl: '/assets/Apanados LoMASRico.png' },
    { name: 'Pancitos con Ajo', price: 1500, category: 'EXTRAS', allowsModifiers: false, imageUrl: '/assets/Pancitos con Ajo.jpg' },
    { name: 'Pancitos Orégano', price: 1500, category: 'EXTRAS', allowsModifiers: false, imageUrl: '/assets/Pancitos con Ajo.jpg' },

    // --- BEBIDAS ---
    { name: 'Coca Cola 591cc', price: 1600, category: 'BEBIDAS', allowsModifiers: false, imageUrl: '/assets/Coca Cola 591cc.jpg' },
    { name: 'Limonada Clásica', price: 3000, category: 'BEBIDAS', allowsModifiers: false, imageUrl: '/assets/Limonada Clásica.jpg' }
];

async function seedCatalog() {
    console.log('🔄 Seeding catalog to API...');

    try {
        // 1. Get existing products to avoid duplicates
        const res = await fetch(`${API_URL}/products`);
        let existing = [];
        if (res.ok) {
            existing = await res.json();
        }

        for (const item of CATALOG) {
            // Check if exists by name
            const found = existing.find(ex => ex.name === item.name);
            if (found) {
                console.log(`⏩ Skipping ${item.name} (Already exists)`);
                continue;
            }

            console.log(`➕ Creating ${item.name}...`);
            const createRes = await fetch(`${API_URL}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...item,
                    description: item.description || '',
                    isConfigurable: item.allowsModifiers,
                    // API might define 'isConfigurable' instead of 'allowsModifiers' or map it
                })
            });

            if (createRes.ok) {
                console.log(`✅ Created ${item.name}`);
            } else {
                console.error(`❌ Failed to create ${item.name}:`, await createRes.text());
            }
        }
    } catch (error) {
        console.error('Seed Error:', error);
    }
}

seedCatalog();
