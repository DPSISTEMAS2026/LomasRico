import { PrismaClient } from '@lomasrico/database';

const prisma = new PrismaClient();

async function main() {
    const products = await prisma.sellingProduct.findMany({
        where: { isActive: true },
        select: { id: true, name: true, category: true, price: true }
    });

    const ceviches = products.filter(p => p.category.includes('CEVICHE') || p.category === 'LO MÁS RICO');
    
    // Group by prefix (ignoring the weight at the end)
    const groups = {};
    for (const c of ceviches) {
        // Regex to match things like " (350g)", " 500g", " (750g)", etc at the end
        const match = c.name.match(/^(.*?)(?:\s*\(?(?:350g|500g|750g|1Kg|1 Litro)\)?)*$/i);
        let baseName = match ? match[1].trim() : c.name;
        
        if (!groups[baseName]) groups[baseName] = [];
        groups[baseName].push(c);
    }
    
    for (const [baseName, items] of Object.entries(groups)) {
        if (items.length > 1) {
            console.log(`\nBase Name: ${baseName}`);
            items.sort((a,b) => a.price - b.price);
            items.forEach(i => console.log(`  - [${i.id}] ${i.name} ($${i.price})`));
        }
    }
}

main().finally(() => prisma.$disconnect());
