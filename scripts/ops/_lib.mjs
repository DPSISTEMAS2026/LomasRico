/**
 * Base de los scripts ops: todo pasa por la API (respeta precios, turno, auditoría e inventario).
 *
 * Config (scripts/ops/.env, no se sube a git):
 *   OPS_PIN=1234                         PIN de un dueño/admin
 *   OPS_API_URL=https://api.lomasrico.cl  opcional
 *
 * Por defecto los scripts solo muestran lo que harían. Con --apply ejecutan.
 */
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const envFile = join(here, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export const API = (process.env.OPS_API_URL || 'https://api.lomasrico.cl').replace(/\/$/, '');
export const APPLY = process.argv.includes('--apply');

/** `--key valor` o `--key=valor`. */
export function arg(name, fallback) {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === `--${name}`) return argv[i + 1] ?? fallback;
    if (argv[i].startsWith(`--${name}=`)) return argv[i].slice(name.length + 3);
  }
  return fallback;
}

export function positional(index) {
  return process.argv.slice(2).filter((a) => !a.startsWith('--'))[index];
}

let token;
let me;

export async function login() {
  if (token) return me;
  const pin = process.env.OPS_PIN;
  if (!/^\d{4}$/.test(String(pin || ''))) {
    fail('Falta OPS_PIN (4 dígitos de un dueño/admin) en scripts/ops/.env');
  }
  const res = await fetch(`${API}/auth/pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.accessToken) fail(`Login PIN falló: ${data.message || res.status}`);
  token = data.accessToken;
  me = data.user;
  if (!['OWNER', 'ADMIN'].includes(me?.role)) fail(`El PIN es de ${me?.role}; los scripts ops necesitan dueño o admin`);
  return me;
}

export async function api(path, { method = 'GET', body, raw = false } = {}) {
  await login();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text).message || text; } catch { /* texto plano */ }
    throw new Error(`${method} ${path} → ${res.status}: ${Array.isArray(msg) ? msg.join(', ') : msg}`);
  }
  if (raw) return text;
  return text ? JSON.parse(text) : null;
}

export function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

export const clp = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CL')}`;

/** Hora Chile corta. */
export const hhmm = (d) => new Date(d).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' });

export function startOfTodayChile() {
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
  return new Date(`${day}T00:00:00-03:00`);
}

export function itemsLine(sale) {
  return (sale.items || [])
    .map((i) => {
      const name = i.sellingProduct?.name || i.productVariant?.name || '?';
      const opts = (i.modifiers?.dynamicSelections || [])
        .flatMap((g) => (g.selectedOptions || []).map((o) => o.name))
        .filter(Boolean);
      return `${i.quantity}x ${name}${opts.length ? ` (${opts.join(', ')})` : ''}`;
    })
    .join(' · ');
}

export function dryRunNote() {
  if (!APPLY) console.log('\n(solo vista previa — agrega --apply para ejecutar)');
}
