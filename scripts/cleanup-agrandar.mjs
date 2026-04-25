import { PrismaClient } from '@lomasrico/database';

const prisma = new PrismaClient();

async function main() {
    console.log("Cleaning up negative prices and 'AGRANDA' modifiers...");

    // 1. Delete all "AGRANDA" modifiers from products entirely
    const resAgrandar = await prisma.productModifier.deleteMany({
        where: {
            modifierGroup: {
                name: { contains: "AGRANDA", mode: "insensitive" }
            }
        }
    });
    console.log(`✅ Deleted ${resAgrandar.count} 'AGRANDA' modifier links.`);

    // 2. Fix negative prices in Formato options
    const negativeOptions = await prisma.modifierOption.findMany({
        where: { priceAdjustment: { lt: 0 } },
        include: { modifierGroup: true }
    });

    for (const opt of negativeOptions) {
        // Just set negative price diffs to 0 since the base product shouldn't cost MORE than the smallest option.
        await prisma.modifierOption.update({
            where: { id: opt.id },
            data: { priceAdjustment: 0 }
        });
        console.log(`✅ Fixed negative price (${opt.priceAdjustment}) for option ${opt.name} in group ${opt.modifierGroup.name} to 0`);
    }

    console.log("Cleanup complete!");
}

main().finally(() => prisma.$disconnect());
