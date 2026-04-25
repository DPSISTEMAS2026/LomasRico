import { PrismaClient } from '@lomasrico/database';

const prisma = new PrismaClient();

async function main() {
    const activeProducts = await prisma.sellingProduct.findMany({
        where: { isActive: true },
        include: {
            productModifiers: {
                include: { modifierGroup: true }
            }
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }]
    });

    console.log("=== INFORME DE PRODUCTOS ACTIVOS ===\n");

    const withMods = [];
    const withoutMods = [];

    for (const p of activeProducts) {
        if (p.category === 'BEBIDAS' || p.category === 'AGREGADOS') {
            // Ignore drinks and basics for this list or just mark them
            withoutMods.push(`[${p.category}] ${p.name} ($${p.price}) - Ignorado (Bebible/Agregado)`);
            continue;
        }

        if (p.productModifiers && p.productModifiers.length > 0) {
            const modNames = p.productModifiers.map(m => m.modifierGroup.name).join(', ');
            withMods.push(`✅ [${p.category}] ${p.name} ($${p.price}) -> Modificadores: ${modNames}`);
        } else {
            withoutMods.push(`❌ [${p.category}] ${p.name} ($${p.price}) -> SIN modificadores`);
        }
    }

    console.log("▶ PRODUCTOS CONFIGURADOS (Con Modificadores):\n");
    console.log(withMods.join('\n'));
    
    console.log("\n\n▶ PRODUCTOS POTENCIALMENTE FANTASMAS (Sin Modificadores):\n");
    console.log(withoutMods.join('\n'));
}

main().finally(() => prisma.$disconnect());
