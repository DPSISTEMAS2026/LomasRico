#!/usr/bin/env node
/**
 * Pedidos web de hoy: ¿los pagados llegaron a cocina?
 *
 *   node scripts/ops/web-check.mjs           revisa
 *   node scripts/ops/web-check.mjs --apply   manda a cocina los pagados sin comanda
 *
 * PENDING = carrito sin pagar (abandonado). No se toca.
 */
import { APPLY, api, clp, dryRunNote, hhmm, itemsLine, startOfTodayChile } from './_lib.mjs';

const since = startOfTodayChile();
const [sales, active, history] = await Promise.all([
  api('/sales'),
  api('/kitchen/active'),
  api('/kitchen/history'),
]);
const inKitchen = new Set([...active, ...history].map((t) => t.saleId || t.sale?.id));

const web = sales.filter((s) => s.channel === 'WEB' && new Date(s.createdAt) >= since);
const paid = web.filter((s) => s.paymentStatus === 'APPROVED' && s.status !== 'CANCELLED');
const missing = paid.filter((s) => !inKitchen.has(s.id));
const pending = web.filter((s) => s.paymentStatus === 'PENDING' && s.status === 'PENDING');

console.log(`Web hoy: ${paid.length} pagados · ${pending.length} sin pagar (abandonados) · ${missing.length} pagados SIN cocina`);
for (const s of paid) {
  const flag = inKitchen.has(s.id) ? 'OK     ' : 'FALTA  ';
  console.log(`  ${flag}${s.code} ${hhmm(s.createdAt)} ${clp(s.total)} ${s.status} — ${itemsLine(s)}`);
}

if (!missing.length) {
  console.log('\nTodo lo pagado está en cocina.');
  process.exit(0);
}

for (const s of missing) {
  if (!APPLY) {
    console.log(`\nMandaría a cocina ${s.code}`);
    continue;
  }
  const res = await api('/payments/manual-confirm', { method: 'POST', body: { orderId: s.id } });
  console.log(`\n${s.code} → cocina ${res.ok ? 'OK' : JSON.stringify(res)}`);
}
dryRunNote();
process.exit(APPLY ? 0 : 2);
