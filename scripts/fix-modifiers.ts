/**
 * Fix modifier groups and product-modifier sort orders
 * to match the correct business flow:
 *   1. Proteínas → 2. Salsas → 3. Extras → 4. Quita verduras → 5. Formato/Agrandar (último)
 */
import { PrismaClient } from '@lomasrico/database';

const prisma = new PrismaClient();

async function main() {
    console.log('\n🔧 FIXING MODIFIER GROUPS & SORT ORDERS\n');

    // ── 1. Fix "Formato" group: MULTI_SELECT → SINGLE_SELECT, min:0 ──
    const formatoGroup = await prisma.modifierGroup.findFirst({ where: { name: 'Formato' } });
    if (formatoGroup) {
        await prisma.modifierGroup.update({
            where: { id: formatoGroup.id },
            data: { type: 'SINGLE_SELECT', minSelections: 0, maxSelections: 1, sortOrder: 99 }
        });
        console.log('✅ "Formato" → SINGLE_SELECT, min:0, max:1, sortOrder:99');
    }

    // ── 2. Fix "QUITA las verduras" group: min:1 → min:0 ──
    const quitaGroup = await prisma.modifierGroup.findFirst({ where: { name: { contains: 'QUITA' } } });
    if (quitaGroup) {
        await prisma.modifierGroup.update({
            where: { id: quitaGroup.id },
            data: { minSelections: 0 }
        });
        console.log('✅ "QUITA las verduras" → minSelections: 0 (optional)');
    }

    // ── 3. Fix AGRANDA groups sortOrder to be last ──
    const agrandaGroups = await prisma.modifierGroup.findMany({
        where: { name: { contains: 'AGRANDA' } }
    });
    for (const g of agrandaGroups) {
        await prisma.modifierGroup.update({
            where: { id: g.id },
            data: { sortOrder: 90 }
        });
        console.log(`✅ "${g.name}" → sortOrder: 90 (near-last)`);
    }

    // ── 4. Fix Proteínas group sortOrder to be first ──
    const proteinGroup = await prisma.modifierGroup.findFirst({ 
        where: { name: { contains: 'proteínas' } }
    });
    if (proteinGroup) {
        await prisma.modifierGroup.update({
            where: { id: proteinGroup.id },
            data: { sortOrder: 1 }
        });
        console.log('✅ "Proteínas" → sortOrder: 1 (first)');
    }

    // protein tropical
    const proteinTropical = await prisma.modifierGroup.findFirst({
        where: { name: { contains: 'Tropical' } }
    });
    if (proteinTropical) {
        await prisma.modifierGroup.update({
            where: { id: proteinTropical.id },
            data: { sortOrder: 1 }
        });
        console.log('✅ "Proteínas Tropical" → sortOrder: 1 (first)');
    }

    // ── 5. Fix Salsas group sortOrder ──
    const salsasGroup = await prisma.modifierGroup.findFirst({ where: { name: 'Salsas' } });
    if (salsasGroup) {
        await prisma.modifierGroup.update({
            where: { id: salsasGroup.id },
            data: { sortOrder: 5 }
        });
        console.log('✅ "Salsas" → sortOrder: 5');
    }

    // Salsas GOHAN
    const salsasGohan = await prisma.modifierGroup.findFirst({ where: { name: 'Salsas GOHAN' } });
    if (salsasGohan) {
        await prisma.modifierGroup.update({
            where: { id: salsasGohan.id },
            data: { sortOrder: 5 }
        });
        console.log('✅ "Salsas GOHAN" → sortOrder: 5');
    }

    // ── 6. Fix Extras group sortOrder ──
    const extrasGroup = await prisma.modifierGroup.findFirst({ where: { name: 'Extras LoMasRico' } });
    if (extrasGroup) {
        await prisma.modifierGroup.update({
            where: { id: extrasGroup.id },
            data: { sortOrder: 10 }
        });
        console.log('✅ "Extras LoMasRico" → sortOrder: 10');
    }

    // ── 7. Fix Limonada group sortOrder (after extras) ──
    const limonadaGroup = await prisma.modifierGroup.findFirst({ where: { name: { contains: 'Limonada' } } });
    if (limonadaGroup) {
        await prisma.modifierGroup.update({
            where: { id: limonadaGroup.id },
            data: { sortOrder: 15 }
        });
        console.log('✅ "Limonada LoMASrico" → sortOrder: 15');
    }

    // ── 8. Fix QUITA verduras sortOrder ──
    if (quitaGroup) {
        await prisma.modifierGroup.update({
            where: { id: quitaGroup.id },
            data: { sortOrder: 20 }
        });
        console.log('✅ "QUITA verduras" → sortOrder: 20');
    }

    // ── 9. NOW fix all productModifier sortOrders to match group order ──
    console.log('\n📋 Fixing productModifier sortOrders...');
    
    const allProductModifiers = await prisma.productModifier.findMany({
        include: { modifierGroup: true }
    });

    for (const pm of allProductModifiers) {
        if (pm.sortOrder !== pm.modifierGroup.sortOrder) {
            await prisma.productModifier.update({
                where: { id: pm.id },
                data: { sortOrder: pm.modifierGroup.sortOrder }
            });
        }
    }
    console.log(`✅ Updated ${allProductModifiers.length} productModifier sortOrders`);

    // ── 10. Deactivate duplicate products ──
    console.log('\n🗑️ Cleaning up duplicates...');
    
    const dupes = [
        'HandRoll Pollo',  // duplicate of "Handroll de Pollo"
    ];
    
    for (const name of dupes) {
        const p = await prisma.sellingProduct.findFirst({ where: { name } });
        if (p && p.isActive) {
            await prisma.sellingProduct.update({ 
                where: { id: p.id }, 
                data: { isActive: false } 
            });
            console.log(`✅ Deactivated duplicate: "${name}"`);
        }
    }

    // ── 11. Fix "AGRANDA A 1Kg" to have an option if empty ──
    const agranda1kg = await prisma.modifierGroup.findFirst({
        where: { name: { contains: 'AGRANDA TU CEVICHE A 1Kg' } },
        include: { options: true }
    });
    if (agranda1kg && agranda1kg.options.length === 0) {
        await prisma.modifierOption.create({
            data: {
                modifierGroupId: agranda1kg.id,
                name: 'Sí, agrandar a 1Kg',
                priceAdjustment: 0,
                isDefault: false,
                isActive: true,
                sortOrder: 0
            }
        });
        console.log('✅ Added option to "AGRANDA A 1Kg" group');
    }

    console.log('\n🎉 ALL FIXES APPLIED SUCCESSFULLY\n');
}

main()
    .catch(e => { console.error('ERROR:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
