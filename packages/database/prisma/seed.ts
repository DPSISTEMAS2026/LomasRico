
require('dotenv').config({ path: '../../.env' }); // Load root .env
import { PrismaClient, ItemType, MeasureUnit, IngredientRole, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Seed from "Fichas De Productos – Lo Más Rico"...');

    // 1. Core Data Persistence (Only ensure basic users and system data)
    try {
        // We will NOT deleteMany() on SellingProduct or Recipes here anymore
        // as they are managed by the API Service to avoid catalog loss.
        console.log('Skipping destructive cleanup...');
    } catch (e) {
        console.warn('⚠️ Warning during cleanup:', e);
    }

    // 2. Create Users (Ensure admin user exists with correct password for this user)
    await prisma.user.upsert({
        where: { email: 'soporte@lomasrico.cl' },
        update: { role: UserRole.OWNER, pin: '1234' },
        create: {
            id: 'staff-1',
            name: 'Soporte LoMásRico',
            email: 'soporte@lomasrico.cl',
            role: UserRole.OWNER,
            pin: '1234'
        }
    });

    await prisma.user.upsert({
        where: { email: 'oscar@lomasrico.cl' },
        update: { pin: 'Maxi2026' }, // The user explicitly asked for this password
        create: {
            name: 'Oscar',
            email: 'oscar@lomasrico.cl',
            role: UserRole.ADMIN,
            pin: 'Maxi2026'
        }
    });

    // 3. Create INGREDIENTS (If they don't exist)
    // We use upsert where possible or just skip if already populated

    // ... Logic for Ingredients and Bases follows (Optional, as they are likely already there)
    // But we certainly STOP the hardcoded old product creation below.
    console.log('Ingredients/Bases setup (already handled or stable in DB)');

    console.log('✅ Seed maintenance completed safely!');
}

async function createItem(name: string, type: ItemType, unit: MeasureUnit, role: IngredientRole) {
    return await prisma.inventoryItem.create({
        data: { name, type, unit, role, currentStock: 100 } // Initial stock for testing
    });
}

async function createCevicheProduct(id: string, name: string, price: number, cat: string, totalWeight: number, proteinWeight: number, baseWeight: number, baseItemId: string) {
    // Create Recipe
    const recipe = await prisma.recipe.create({
        data: {
            name: `RECETA_${id.toUpperCase()}`,
            baseWeight: totalWeight,
            maxProteins: 3,
            internalRules: {
                proteinWeight,
                baseItemId,
                baseWeightRequirement: baseWeight
            },
            items: {
                create: [
                    { ingredientId: baseItemId, quantity: baseWeight, role: IngredientRole.BASE }
                ]
            }
        }
    });

    // Create Product
    await prisma.sellingProduct.create({
        data: {
            id,
            name,
            category: cat,
            price,
            isConfigurable: true,
            maxProteins: 3,
            recipeId: recipe.id
        }
    });
}

async function createProduct(id: string, name: string, price: number, cat: string) {
    await prisma.sellingProduct.create({
        data: {
            id,
            name,
            price,
            category: cat,
            isActive: true
        }
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
