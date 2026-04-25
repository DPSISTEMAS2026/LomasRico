import { PrismaClient } from '@lomasrico/database';

const prisma = new PrismaClient();

async function main() {
    const p = await prisma.sellingProduct.findMany({ select: { name: true, price: true, isActive: true }, where: { isActive: true } });
    console.log(JSON.stringify(p, null, 2));
}

main().finally(() => prisma.$disconnect());
