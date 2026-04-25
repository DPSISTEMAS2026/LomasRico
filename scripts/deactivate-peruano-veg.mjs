import { PrismaClient } from '@lomasrico/database';

const prisma = new PrismaClient();

async function main() {
    console.log("Deactivating duplicate Peruano and Vegano...");

    const targets = [
        "Peruano",
        "Ceviche Veg" 
    ];

    for (const name of targets) {
        const res = await prisma.sellingProduct.updateMany({
            where: { name: name },
            data: { isActive: false }
        });
        if (res.count > 0) {
            console.log(`✅ Deactivated: ${name}`);
        } else {
            console.log(`⚠️ Not found or already inactive: ${name}`);
        }
    }
}

main().finally(() => prisma.$disconnect());
