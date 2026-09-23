import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = dotenv.parse(fs.readFileSync(path.join(root, '.env')));
const raw = env.DATABASE_URL || '';
const m = raw.match(/^postgresql:\/\/([^:]+):([^@]+)@/);
if (!m) {
  console.error('parse fail');
  process.exit(1);
}
const pass = encodeURIComponent(m[2]);
const next = `postgresql://postgres.xnwbrdnorjafwwyfhysx:${pass}@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`;

for (const f of ['.env', 'apps/api/.env', 'packages/database/.env']) {
  const p = path.join(root, f);
  let t = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  if (/^DATABASE_URL=/m.test(t)) t = t.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${next}"`);
  else t = `DATABASE_URL="${next}"\n${t}`;
  fs.writeFileSync(p, t);
  console.log('updated', f);
}
