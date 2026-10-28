#!/usr/bin/env node
/**
 * Turnos de caja abiertos y mesas con gente o cuenta sin cobrar.
 *
 *   node scripts/ops/floor-check.mjs
 *
 * Solo muestra. Cerrar un turno se hace en el panel (hay que contar la caja).
 */
import { api, clp, hhmm, startOfTodayChile } from './_lib.mjs';

const STALE_HOURS = 16;
const today = startOfTodayChile();
const [shifts, tables] = await Promise.all([api('/shifts?status=OPEN'), api('/tables')]);

console.log(`Turnos abiertos: ${shifts.length}`);
for (const s of shifts) {
  const hours = (Date.now() - new Date(s.openingTime).getTime()) / 3_600_000;
  const todaySales = (s.sales || []).filter((x) => new Date(x.createdAt) >= today);
  const total = todaySales.reduce((sum, x) => sum + Number(x.total || 0), 0);
  const opened = new Date(s.openingTime).toLocaleString('es-CL', { timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short' });
  const flag = hours > STALE_HOURS ? 'COLGADO' : 'OK     ';
  console.log(`  ${flag} ${s.cashier?.name || '?'} · abierto ${opened} (${Math.round(hours)} h) · hoy ${todaySales.length} ventas ${clp(total)}`);
}
if (shifts.some((s) => (Date.now() - new Date(s.openingTime).getTime()) / 3_600_000 > STALE_HOURS)) {
  console.log('  → Los COLGADOS se cierran en el panel (Caja → cerrar turno), contando el efectivo.');
}

const busy = tables.filter((t) => t.occupied || Number(t.openTotal) > 0);
console.log(`\nMesas ocupadas: ${busy.length} de ${tables.length}`);
for (const t of busy) {
  console.log(`  ${t.name || `Mesa ${t.number}`} · ${clp(t.openTotal)}${t.billRequest ? ' · PIDIÓ CUENTA' : ''}`);
  for (const g of t.guests || []) {
    console.log(`     - ${g.name}: ${clp(g.openSale?.total || 0)}${g.createdAt ? ` desde ${hhmm(g.createdAt)}` : ''}`);
  }
}
