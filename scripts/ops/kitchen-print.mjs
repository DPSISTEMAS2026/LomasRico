#!/usr/bin/env node
/**
 * Reimprimir la comanda de una venta (o la cuenta con --account).
 * Guarda el HTML de 58mm y lo abre en el navegador de este PC para imprimir con Ctrl+P.
 *
 *   node scripts/ops/kitchen-print.mjs 41
 *   node scripts/ops/kitchen-print.mjs 41 --account
 *
 * Si la venta no tiene comanda y es web pagada: node scripts/ops/web-check.mjs --apply
 */
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { api, fail, positional } from './_lib.mjs';

const raw = positional(0);
if (!raw) fail('Uso: node scripts/ops/kitchen-print.mjs <código de venta>');
const code = `#${String(raw).replace(/\D/g, '').padStart(4, '0')}`;
const kind = process.argv.includes('--account') ? 'print-account' : 'print';

const [active, history] = await Promise.all([api('/kitchen/active'), api(`/kitchen/history?q=${encodeURIComponent(code)}`)]);
const tickets = [...active, ...history].filter((t) => t.sale?.code === code);
if (!tickets.length) fail(`${code} no tiene comanda en cocina (ni activa ni en las últimas 48 h)`);

const outDir = join(dirname(fileURLToPath(import.meta.url)), 'out');
mkdirSync(outDir, { recursive: true });
for (const t of tickets) {
  const html = await api(`/kitchen/${t.id}/${kind}`, { raw: true });
  const file = join(outDir, `${kind === 'print' ? 'comanda' : 'cuenta'}-${code.slice(1)}-${t.batchNumber || 1}.html`);
  writeFileSync(file, html);
  console.log(`${code} tanda ${t.batchNumber || 1} (${t.status}) → ${file}`);
  const opener = process.platform === 'win32' ? `start "" "${file}"` : process.platform === 'darwin' ? `open "${file}"` : `xdg-open "${file}"`;
  exec(opener);
}
console.log('Imprime con Ctrl+P en la impresora térmica (58mm).');
