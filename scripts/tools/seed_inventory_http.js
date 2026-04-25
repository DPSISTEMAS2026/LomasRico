const http = require('http');

async function post(data) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const req = http.request({
            hostname: 'localhost',
            port: 3333,
            path: '/inventory',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) resolve();
            else reject(`Status ${res.statusCode}`);
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

const ITEMS = [
    // VERDURAS
    { name: "Zanahoria", unit: "kg", price: 1190, cat: "VERDURAS" },
    { name: "Repollo", unit: "unidad", price: 1000, cat: "VERDURAS" },
    { name: "Cilantro", unit: "120g", price: 1000, cat: "VERDURAS" },
    { name: "Cebollín", unit: "unidad", price: 1490, cat: "VERDURAS" },
    { name: "Cebolla", unit: "kg", price: 900, cat: "VERDURAS" },
    { name: "Limón amarillo", unit: "kg", price: 1100, cat: "VERDURAS" },
    { name: "Limón sutil", unit: "kg", price: 2500, cat: "VERDURAS" },
    { name: "Pimentón", unit: "caja", price: 25000, cat: "VERDURAS" },
    { name: "Palta", unit: "kg", price: 4500, cat: "VERDURAS" },
    { name: "Rocoto", unit: "kg", price: 5850, cat: "VERDURAS" },
    { name: "Ají", unit: "kg", price: 5390, cat: "VERDURAS" },
    { name: "Champiñón", unit: "200g", price: 1250, cat: "VERDURAS" },
    { name: "Jengibre", unit: "120g", price: 1490, cat: "VERDURAS" },
    { name: "Ajo", unit: "unidad", price: 1200, cat: "VERDURAS" },
    { name: "Apio", unit: "unidad", price: 1200, cat: "VERDURAS" },

    // PROTEÍNAS Y CONGELADOS -> PROTEINAS
    { name: "Salmón", unit: "kg", price: 8500, cat: "PROTEINAS" },
    { name: "Atún", unit: "kg", price: 9750, cat: "PROTEINAS" },
    { name: "Machas", unit: "kg", price: 8300, cat: "PROTEINAS" },
    { name: "Camarón", unit: "kg", price: 6850, cat: "PROTEINAS" },
    { name: "Pulpo", unit: "kg", price: 11900, cat: "PROTEINAS" },
    { name: "Pesca del día", unit: "kg", price: 7000, cat: "PROTEINAS" },
    { name: "Choclo normal", unit: "kg", price: 1970, cat: "PROTEINAS" },
    { name: "Choclo peruano", unit: "400g", price: 2440, cat: "PROTEINAS" },
    { name: "Mango en cubos", unit: "350g", price: 2300, cat: "PROTEINAS" },
    { name: "Pulpa mango", unit: "kg", price: 5400, cat: "PROTEINAS" },
    { name: "Pulpa maracuyá", unit: "kg", price: 5800, cat: "PROTEINAS" },
    { name: "Pulpa frambuesa", unit: "kg", price: 5400, cat: "PROTEINAS" },
    { name: "Aros de cebolla", unit: "kg", price: 8620, cat: "PROTEINAS" },
    { name: "Camarones apanados", unit: "kg", price: 5880, cat: "PROTEINAS" },
    { name: "Papas fritas", unit: "2.5k", price: 5100, cat: "PROTEINAS" },
    { name: "Masas", unit: "unidad", price: 3200, cat: "PROTEINAS" },
    { name: "Sopaipillas", unit: "unidad", price: 3200, cat: "PROTEINAS" },
    { name: "Pan", unit: "unidad", price: 0, cat: "PROTEINAS" },
    { name: "Pollo", unit: "kg", price: 4750, cat: "PROTEINAS" },

    // ABARROTES
    { name: "Arroz", unit: "kg", price: 3570, cat: "ABARROTES" },
    { name: "Azúcar flor", unit: "kg", price: 1920, cat: "ABARROTES" },
    { name: "Azúcar gran", unit: "kg", price: 1500, cat: "ABARROTES" } // Inferred generic price for safety
];

async function seed() {
    console.log("🌱 Starting Seeding Process...");

    for (const item of ITEMS) {
        try {
            const body = {
                name: item.name,
                category: item.cat,
                unit: item.unit,
                costPerUnit: item.price
            };

            await post(body);
            console.log(`✅ ${item.name} OK`);
        } catch (e) {
            console.error(`❌ ${item.name} ERROR: ${e}`);
        }
    }
    console.log("🏁 Seeding Completed!");
}

seed();
