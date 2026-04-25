import { PrismaClient } from '@lomasrico/database';

const prisma = new PrismaClient();

async function main() {
    const p = await prisma.modifierGroup.findFirst({
        where: { name: 'Formato'},
        include: { options: true }
    });
    console.log(p);
}

main().finally(() => prisma.$disconnect());
