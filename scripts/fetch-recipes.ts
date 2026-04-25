import { PrismaClient } from '@lomasrico/database';

const prisma = new PrismaClient();

async function run() {
    const recipes = await prisma.recipe.findMany({
        include: {
            items: { include: { ingredient: true } },
            sellingProduct: true
        }
    });

    console.log(JSON.stringify(recipes, null, 2));
    process.exit(0);
}
run();
