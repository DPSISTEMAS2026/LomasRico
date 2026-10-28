#!/usr/bin/env node
/**
 * Cobros en la máquina TUU: ¿cada cobro aprobado quedó en una venta?
 * Caso típico: la máquina imprimió el voucher, pero el sistema dijo "rechazado".
 *
 *   node scripts/ops/tuu-check.mjs                      cobros de hoy y su venta
 *   node scripts/ops/tuu-check.mjs --key <clave>        revisar una clave puntual
 *
 * Recuperar un cobro aprobado sin venta (crea la venta POS, la asocia al turno y la manda a cocina):
 *   node scripts/ops/tuu-check.mjs --recover <clave> --like 30            copia los platos de la venta #0030
 *   node scripts/ops/tuu-check.mjs --recover <clave> --items items.json   platos a mano
 *   ... --apply para ejecutar · --shift <id> para otro turno · --note "texto"
 *
 * items.json: [{ "sellingProductId": "...", "quantity": 1, "modifiers": { ... } }]
 */
import { readFileSync } from 'fs';
import { APPLY, api, arg, clp, dryRunNote, fail, hhmm, itemsLine, startOfTodayChile } from './_lib.mjs';

const recoverKey = arg('recover');
const singleKey = arg('key');

const sales = await api('/sales');
const saleByKey = new Map(
  sales.filter((s) => s.shippingData?.terminalPayment?.key).map((s) => [s.shippingData.terminalPayment.key, s]),
);

async function describe(key, extra = {}) {
  const st = await api(`/payments/terminal/${encodeURIComponent(key)}`).catch((e) => ({ status: `ERROR ${e.message}` }));
  const sale = saleByKey.get(key);
  const orphan = st.status === 'COMPLETED' && !sale;
  return { key, status: st.status, amount: st.amount ?? extra.amount ?? null, sale, orphan, ...extra };
}

function print(row) {
  const tag = row.orphan ? 'HUÉRFANO' : row.sale ? 'OK      ' : row.status === 'COMPLETED' ? '?       ' : '-       ';
  const when = row.at ? `${hhmm(row.at)} ` : '';
  const who = row.actor ? ` por ${row.actor}` : '';
  const ref = row.reference ? ` ref "${row.reference}"` : '';
  const sale = row.sale ? ` → ${row.sale.code} ${clp(row.sale.total)}` : '';
  console.log(`  ${tag} ${when}${clp(row.amount)} ${row.method || ''} ${row.status}${sale}${who}${ref}\n           key ${row.key}`);
}

if (recoverKey) {
  const row = await describe(recoverKey);
  print(row);
  if (row.sale) fail(`Ese cobro ya está en la venta ${row.sale.code}`);
  if (row.status !== 'COMPLETED') fail(`La máquina dice ${row.status}: no hay cobro aprobado que recuperar`);

  let items;
  const like = arg('like');
  if (like) {
    const code = `#${String(like).replace(/\D/g, '').padStart(4, '0')}`;
    const ref = sales.find((s) => s.code === code);
    if (!ref) fail(`No encontré ${code} entre las últimas 200 ventas`);
    items = ref.items.map((i) => ({
      sellingProductId: i.sellingProductId || undefined,
      productVariantId: i.productVariantId || undefined,
      quantity: i.quantity,
      modifiers: i.modifiers || {},
    }));
    console.log(`\nPlatos copiados de ${code}: ${itemsLine(ref)}`);
  } else if (arg('items')) {
    items = JSON.parse(readFileSync(arg('items'), 'utf8'));
  } else {
    fail('Indica los platos: --like <código> o --items archivo.json');
  }

  const audits = await api(`/audit?action=TERMINAL_CHARGE&from=${encodeURIComponent(startOfTodayChile().toISOString())}`).catch(() => []);
  const method = arg('method') || audits.find((a) => a.details?.key === recoverKey)?.details?.method || 'DEBIT';

  let shiftId = arg('shift');
  if (!shiftId) {
    const open = await api('/shifts?status=OPEN');
    const latest = open.sort((a, b) => new Date(b.openingTime) - new Date(a.openingTime))[0];
    if (!latest) fail('No hay turno abierto: abre caja o usa --shift');
    shiftId = latest.id;
    console.log(`Turno: ${latest.cashier?.name || '?'} (abierto ${new Date(latest.openingTime).toLocaleString('es-CL', { timeZone: 'America/Santiago' })})`);
  }

  const body = {
    channel: 'POS',
    paymentMethod: method,
    shiftId,
    fulfillmentType: 'TAKEAWAY',
    terminalPaymentKey: recoverKey,
    note: arg('note') || 'Recuperado: cobro TUU aprobado sin venta',
    items,
  };
  if (!APPLY) {
    console.log(`\nCrearía venta POS ${method} por lo cobrado (${clp(row.amount)}), a cocina:`);
    console.log(JSON.stringify(body, null, 2));
    dryRunNote();
    process.exit(0);
  }
  const sale = await api('/sales', { method: 'POST', body });
  console.log(`\nCreada ${sale.code} ${clp(sale.total)} ${sale.status} — en cocina`);
  if (Number(row.amount) > Number(sale.total)) {
    console.log(`Ojo: la máquina cobró ${clp(row.amount)} y la venta es ${clp(sale.total)} (¿propina?)`);
  }
  process.exit(0);
}

if (singleKey) {
  print(await describe(singleKey));
  process.exit(0);
}

const audits = await api(`/audit?action=TERMINAL_CHARGE&from=${encodeURIComponent(startOfTodayChile().toISOString())}`);
if (!audits.length) {
  console.log('Hoy no hay cobros TUU registrados (se registran desde el deploy de este cambio).');
  console.log('Para un cobro anterior usa --key <clave> si la tienes.');
  process.exit(0);
}
const rows = [];
for (const a of audits) {
  rows.push(await describe(a.details?.key, {
    amount: Number(a.amount),
    method: a.details?.method,
    reference: a.reason,
    actor: a.actorName,
    at: a.createdAt,
  }));
}
const orphans = rows.filter((r) => r.orphan);
console.log(`Cobros TUU hoy: ${rows.length} · aprobados ${rows.filter((r) => r.status === 'COMPLETED').length} · HUÉRFANOS ${orphans.length}`);
rows.forEach(print);
if (orphans.length) {
  console.log('\nHuérfano = la máquina cobró y no hay venta. Recuperar:');
  console.log('  node scripts/ops/tuu-check.mjs --recover <key> --like <código de una venta con los mismos platos>');
  process.exit(2);
}
