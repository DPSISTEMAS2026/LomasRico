import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const msgs = await prisma.message.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { conversation: true }
    });
    console.log(JSON.stringify(msgs, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
