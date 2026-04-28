const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    const count = await p.$queryRaw`SELECT COUNT(*) as total FROM "User"`;
    console.log('Total usuarios:', count);
    
    const roles = await p.$queryRaw`SELECT role, COUNT(*) as total FROM "User" GROUP BY role ORDER BY total DESC`;
    console.log('\nPor rol:', roles);
    
    const users = await p.$queryRaw`SELECT id, name, email, phone, role, "loyaltyPoints", "historicalSpent", "historicalOrders", "createdAt" FROM "User" ORDER BY "createdAt" DESC LIMIT 30`;
    console.log(`\nÚltimos 30 usuarios:`);
    users.forEach(u => console.log(`  [${u.role}] ${u.name} | ${u.email} | ${u.phone || '-'} | pts:${u.loyaltyPoints || 0} | $${u.historicalSpent || 0} | ${u.createdAt}`));
    
    await p.$disconnect();
}
main();
