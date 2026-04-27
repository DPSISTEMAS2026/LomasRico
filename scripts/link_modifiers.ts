/**
 * Script to link modifier groups to products that are missing them.
 * Run with: npx tsx scripts/link_modifiers.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Modifier Group IDs (from production DB)
const GROUPS = {
    EXTRAS_LOMASRICO: '75b0e60c-5249-4bd3-a6bb-b58807698b6e',
    PROTEINAS_3: '06d562f6-af92-4369-9120-e5cd054e734f',
    LIMONADA: 'e7d09e35-671e-47e4-ac7a-1f8ea88a00d1',
    SALSAS: 'd565c274-7888-4a1c-9d03-c3df70781bc9',
};

// Products that need modifiers added
const LINKS: { productId: string; productName: string; groups: { groupId: string; sortOrder: number; isRequired: boolean; overrideMin?: number; overrideMax?: number }[] }[] = [
    {
        productId: '69b9f98b-732b-453c-ba04-8d3fa8d350bc',
        productName: 'Cevichada',
        groups: [
            { groupId: GROUPS.EXTRAS_LOMASRICO, sortOrder: 1, isRequired: false },
            { groupId: GROUPS.LIMONADA, sortOrder: 2, isRequired: false },
        ]
    },
    {
        productId: '7dc5652a-4656-4882-998e-3526306202be',
        productName: "2 Bowl's LoMASRico",
        groups: [
            { groupId: GROUPS.PROTEINAS_3, sortOrder: 1, isRequired: true, overrideMin: 1, overrideMax: 3 },
            { groupId: GROUPS.SALSAS, sortOrder: 2, isRequired: false },
            { groupId: GROUPS.EXTRAS_LOMASRICO, sortOrder: 3, isRequired: false },
        ]
    },
    {
        productId: '4a55dbab-151e-4fac-836b-3e5b3453d2d6',
        productName: 'Acevichado LoMasRico',
        groups: [
            { groupId: GROUPS.EXTRAS_LOMASRICO, sortOrder: 1, isRequired: false },
            { groupId: GROUPS.LIMONADA, sortOrder: 2, isRequired: false },
        ]
    },
    {
        productId: '7c05815c-84e3-4990-8bfb-22a3ae703925',
        productName: 'Black Pacific (sin arroz)',
        groups: [
            { groupId: GROUPS.EXTRAS_LOMASRICO, sortOrder: 1, isRequired: false },
            { groupId: GROUPS.LIMONADA, sortOrder: 2, isRequired: false },
        ]
    },
    {
        productId: '893a1cd1-c38b-4fba-860b-b804fc0e3f5f',
        productName: 'Pink Nikkei',
        groups: [
            { groupId: GROUPS.EXTRAS_LOMASRICO, sortOrder: 1, isRequired: false },
            { groupId: GROUPS.LIMONADA, sortOrder: 2, isRequired: false },
        ]
    },
    {
        productId: '55392100-7a43-45ae-9433-98bd2d7f1a8d',
        productName: 'Mix Empanadas (4 unidades)',
        groups: [
            { groupId: GROUPS.EXTRAS_LOMASRICO, sortOrder: 1, isRequired: false },
        ]
    },
    {
        productId: '8e34f968-3d68-4099-977f-653212fce9b7',
        productName: 'Papas a la crema',
        groups: [
            { groupId: GROUPS.EXTRAS_LOMASRICO, sortOrder: 1, isRequired: false },
        ]
    },
    {
        productId: 'a9a863b4-a03f-44fa-9609-fa4b1ec2e853',
        productName: 'Papas Fritas XL',
        groups: [
            { groupId: GROUPS.EXTRAS_LOMASRICO, sortOrder: 1, isRequired: false },
        ]
    },
    {
        productId: '0b062eca-f6d4-4d07-b42f-9f8338dc6933',
        productName: 'Sopaipillas',
        groups: [
            { groupId: GROUPS.EXTRAS_LOMASRICO, sortOrder: 1, isRequired: false },
        ]
    },
    // Agua CACHANTUN no necesita modificadores - se vende tal cual
];

async function main() {
    console.log('🔗 Linking modifier groups to products...\n');

    for (const link of LINKS) {
        console.log(`📦 ${link.productName}`);

        for (const g of link.groups) {
            // Check if already linked
            const existing = await prisma.productModifier.findFirst({
                where: {
                    sellingProductId: link.productId,
                    modifierGroupId: g.groupId,
                }
            });

            if (existing) {
                console.log(`   ⏭️  Already linked: ${g.groupId}`);
                continue;
            }

            await prisma.productModifier.create({
                data: {
                    sellingProductId: link.productId,
                    modifierGroupId: g.groupId,
                    sortOrder: g.sortOrder,
                    isRequired: g.isRequired,
                    overrideMin: g.overrideMin ?? null,
                    overrideMax: g.overrideMax ?? null,
                }
            });
            console.log(`   ✅ Linked: ${g.groupId} (sort: ${g.sortOrder})`);
        }
    }

    console.log('\n✅ Done! All products now have their modifier groups.');
}

main()
    .catch(e => { console.error('❌ Error:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
