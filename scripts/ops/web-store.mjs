#!/usr/bin/env node
/**
 * Tienda web: abrir/cerrar pedidos y horario.
 *
 *   node scripts/ops/web-store.mjs                          estado
 *   node scripts/ops/web-store.mjs --on --apply             abrir pedidos web
 *   node scripts/ops/web-store.mjs --off --apply            cerrar pedidos web
 *   node scripts/ops/web-store.mjs --hours 12:30-22:00 --apply
 *   node scripts/ops/web-store.mjs --hours default --apply  volver al horario por defecto
 */
import { APPLY, api, arg, dryRunNote, fail } from './_lib.mjs';

const on = process.argv.includes('--on');
const off = process.argv.includes('--off');
const hours = arg('hours');
if (on && off) fail('Usa --on o --off, no ambos');
if (hours && hours !== 'default' && !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(hours)) fail('Horario en formato HH:MM-HH:MM, ej. 12:30-22:00');

const show = async () => {
  const [settings, status] = await Promise.all([api('/store/settings'), api('/store/status')]);
  console.log(`Pedidos web: ${settings.webOrdersEnabled ? 'ACTIVOS' : 'CERRADOS'} · horario ${settings.webHours || 'por defecto'} · ahora ${status.open ? 'ABIERTO' : 'CERRADO'} (${status.opensAt}-${status.closesAt})`);
};

await show();
const patch = {};
if (on) patch.webOrdersEnabled = true;
if (off) patch.webOrdersEnabled = false;
if (hours) patch.webHours = hours === 'default' ? null : hours;
if (!Object.keys(patch).length) process.exit(0);

if (!APPLY) {
  console.log(`\nCambiaría: ${JSON.stringify(patch)}`);
  dryRunNote();
  process.exit(0);
}
await api('/store/settings', { method: 'PATCH', body: patch });
console.log('\nListo:');
await show();
