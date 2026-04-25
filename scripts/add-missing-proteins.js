
const API_URL = 'https://pro-lomasrico-api.onrender.com';

const proteinsToAdd = [
    {
        name: 'Pulpo',
        category: 'PROTEINAS',
        type: 'RAW',
        unit: 'KG',
        currentStock: 100, // Stock inicial para que aparezcan disponibles
        minStock: 10,
        costPerUnit: 0,
        isActive: true
    },
    {
        name: 'Macha',
        category: 'PROTEINAS',
        type: 'RAW',
        unit: 'KG',
        currentStock: 100, // Stock inicial
        minStock: 10,
        costPerUnit: 0,
        isActive: true
    }
];

async function addProteins() {
    console.log('🔄 Checking existing inventory...');

    try {
        const res = await fetch(`${API_URL}/inventory`);
        const inventory = await res.json();

        for (const protein of proteinsToAdd) {
            const exists = inventory.find(i => i.name === protein.name && i.category === 'PROTEINAS');

            if (exists) {
                console.log(`⚠️ ${protein.name} already exists (ID: ${exists.id})`);
            } else {
                console.log(`➕ Adding ${protein.name}...`);
                const createRes = await fetch(`${API_URL}/inventory`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(protein)
                });

                if (createRes.ok) {
                    const newItem = await createRes.json();
                    console.log(`✅ Created ${protein.name} (ID: ${newItem.id})`);
                } else {
                    console.error(`❌ Failed to create ${protein.name}:`, await createRes.text());
                }
            }
        }

        console.log('🎉 Done! All proteins should be available in POS now.');

    } catch (error) {
        console.error('API Error:', error);
    }
}

addProteins();
