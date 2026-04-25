
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedMasterRecipes } from './recipe-engineering/master-recipes.seed';
import { seedSellingRecipes } from './recipe-engineering/selling-recipes.seed';
import { INVENTORY_SEED } from './inventory/inventory.seed';

async function main() {
    const prisma = new PrismaClient();
    try {
        console.log('🔄 Starting Manual Seed...');

        // 0. Seed Inventory Items FIRST (Required for Recipes)
        console.log(`📦 Syncing ${INVENTORY_SEED.length} Inventory Items...`);
        for (const item of INVENTORY_SEED) {
            const exists = await prisma.inventoryItem.findFirst({ where: { name: { equals: item.name, mode: 'insensitive' } } });

            // Map UNIT to Enum (KG, LT, UN)
            let dbUnit: any = 'UN';
            if (item.unit === 'KG') dbUnit = 'KG';
            if (item.unit === 'LITRO' || item.unit === 'LT') dbUnit = 'LT';
            // Default UN for bags/units

            // Map TYPE to Enum (RAW, PREPARATION, RETAIL)
            let dbType: any = item.type || 'RAW';

            // Map Role
            let dbRole: any = item.role || 'BASE';

            if (!exists) {
                // Create
                try {
                    await prisma.inventoryItem.create({
                        data: {
                            id: item.id, // Use explicit string ID always. 
                            name: item.name,
                            unit: dbUnit,
                            costPerUnit: Number(item.costPerUnit),
                            // isActive: item.isActive, 
                            type: dbType,
                            role: dbRole,
                            currentStock: 100
                        }
                    });
                    console.log(`+ Created ${item.name}`);
                } catch (e) {
                    console.error(`Failed to create ${item.name}`, e.message);
                }
            } else {
                console.log(`= Exists ${item.name}`);
                // Ideally update cost/role/type if missing
            }
        }

        // 1. Master Recipes (Salsas, Bases)
        await seedMasterRecipes(prisma);

        // 2. Selling Recipes (Products)
        await seedSellingRecipes(prisma);

        console.log('✅ Manual Seed Completed Successfully.');
    } catch (e) {
        console.error('❌ SEED FAILED:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
