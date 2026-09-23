import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env'), override: true });

const raw = process.env.DATABASE_URL || '';
const m = raw.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/([^?]+)/);
if (!m) {
  console.error('BAD_URL_SHAPE');
  process.exit(2);
}
const [, user, password, host] = m;
const passEnc = encodeURIComponent(password);

const candidates = [];
if (process.env.TRY_URL) {
  candidates.push({ label: 'try', url: process.env.TRY_URL });
} else {
  const project = 'xnwbrdnorjafwwyfhysx';
  const regions = ['aws-0-us-east-1', 'aws-1-us-east-1', 'aws-0-us-east-2', 'aws-0-sa-east-1', 'aws-0-us-west-1'];
  for (const r of regions) {
    candidates.push({
      label: `${r}:5432`,
      url: `postgresql://postgres.${project}:${passEnc}@${r}.pooler.supabase.com:5432/postgres?sslmode=require`,
    });
  }
}

console.log(JSON.stringify({
  currentHost: host,
  isDirectDb: host.startsWith('db.'),
  candidates: candidates.length,
}));

for (const c of candidates) {
  process.env.DATABASE_URL = c.url;
  const prisma = new PrismaClient();
  try {
    const products = await prisma.sellingProduct.count();
    const inventory = await prisma.inventoryItem.count();
    const sales = await prisma.sale.count();
    console.log(JSON.stringify({ connected: true, via: c.label, products, inventory, sales }));
    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.log(JSON.stringify({ via: c.label, ok: false, msg: String(e.message).slice(0, 120) }));
    await prisma.$disconnect().catch(() => {});
  }
}

console.error('ALL_FAIL');
process.exit(1);
