import { PrismaClient } from '@lomasrico/database';

const prisma = new PrismaClient();

async function main() {
    console.log("Deactivating the last remaining duplicate ceviches...");

    const targets = [
        "Ceviche LOMASRICO (250G)",
        "Ceviche Sin Verduras (250g)",
        "Ceviche Tropical (250g)",
        "Ceviche Lo mas Rico" // The one starting with 13900
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
