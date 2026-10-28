#!/usr/bin/env node
/**
 * Buscar ventas de hoy.
 *
 *   node scripts/ops/find-sale.mjs --amount 7000
 *   node scripts/ops/find-sale.mjs --text luis        (nombre, nota, producto)
 *   node scripts/ops/find-sale.mjs --code 41
 *   node scripts/ops/find-sale.mjs --from 17:00 --to 17:45
 *
 * --tol 500 acepta montos cercanos (sirve cuando hay propina o despacho).
 */
import { api, arg, clp, hhmm, itemsLine, startOfTodayChile } from './_lib.mjs';

const amount = arg('amount') ? Number(arg('amount')) : null;
const tol = Number(arg('tol', 0));
const text = String(arg('text', '')).toLowerCase();
const code = arg('code') ? `#${String(arg('code')).replace(/\D/g, '').padStart(4, '0')}` : null;
const at = (hm) => {
  if (!hm) return null;
  const d = new Date(startOfTodayChile());
  const [h, m] = hm.split(':').map(Number);
  d.setTime(d.getTime() + (h * 60 + (m || 0)) * 60_000);
  return d;
};
const from = at(arg('from')) || startOfTodayChile();
const to = at(arg('to'));

const sales = await api('/sales');
const found = sales.filter((s) => {
  const created = new Date(s.createdAt);
  if (code) return s.code === code;
  if (created < from || (to && created > to)) return false;
  const tip = Number(s.shippingData?.tip?.amount || 0);
  const charged = Number(s.shippingData?.terminalPayment?.amount || 0);
  if (amount != null && ![Number(s.total), Number(s.total) + tip, charged].some((v) => Math.abs(v - amount) <= tol)) return false;
  if (text) {
    const hay = [s.note, s.shippingData?.contact?.name, itemsLine(s)].join(' ').toLowerCase();
    if (!hay.includes(text)) return false;
  }
  return true;
});

if (!found.length) {
  console.log('Sin coincidencias hoy.');
  process.exit(0);
}
for (const s of found) {
  const tip = s.shippingData?.tip?.amount;
  const tuu = s.shippingData?.terminalPayment;
  console.log([
    `${s.code} ${hhmm(s.createdAt)} ${s.channel} ${clp(s.total)}${tip ? ` +propina ${clp(tip)}` : ''}`,
    `  ${s.status} / pago ${s.paymentStatus} / ${s.paymentMethod || '-'}${tuu ? ` / TUU ${clp(tuu.amount)} key ${tuu.key}` : ''}`,
    `  ${itemsLine(s)}`,
    s.note ? `  nota: ${String(s.note).replace(/\n/g, ' | ')}` : null,
  ].filter(Boolean).join('\n'));
}
