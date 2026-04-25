import { PrismaClient } from '@lomasrico/database';

const prisma = new PrismaClient();

async function main() {
    const toDeactivate = [
        "250g Elige hasta 3 proteínas",
        "500g Elige hasta 3 proteína",
        "750g Elige hasta 3 proteínas",
        "1 KG Elige hasta 3 proteínas",
        "250g Elige tu proteína",
        "500g Elige tu proteína",
        "1Kg Elige tu proteína",
        "350g Arma tu gusto!",
        "500g Arma tu gusto!",
        "750g Arma a tu gusto!",
        "1 KG Arma a tu gusto",
        "Peruano 500g ",
        "2 Bowl's LoMASrico regulares"
    ];

    console.log("Deactivating legacy badly-named variants...");

    for (const name of toDeactivate) {
        const res = await prisma.sellingProduct.updateMany({
            where: { name: name },
            data: { isActive: false }
        });
        if (res.count > 0) {
            console.log(`✅ Deactivated: ${name}`);
        } else {
            console.log(`⚠️ Not found/Already inactive: ${name}`);
        }
    }

    console.log("\nDone cleaning up catalog!");
}

main().finally(() => prisma.$disconnect());
