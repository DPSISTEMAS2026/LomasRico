#!/usr/bin/env node
/**
 * Chequeo rápido ops (apertura/servicio).
 * Uso: node scripts/ops-status.mjs
 * URL: OPS_API_URL o https://api.lomasrico.cl
 */
const base = (process.env.OPS_API_URL || 'https://api.lomasrico.cl').replace(/\/$/, '');
const url = `${base}/store/status`;

const res = await fetch(url);
if (!res.ok) {
  console.error(`FAIL HTTP ${res.status} ${url}`);
  process.exit(1);
}
const s = await res.json();
const ok = s.ordersEnabled !== false && s.open !== false && s.envKillSwitch !== true;
const line = [
  ok ? 'OK' : 'ALERTA',
  `open=${s.open}`,
  `ordersEnabled=${s.ordersEnabled}`,
  `hours=${s.opensAt || '?'}-${s.closesAt || '?'}`,
  s.envKillSwitch ? 'envKillSwitch=ON' : null,
].filter(Boolean).join(' | ');
console.log(line);
console.log(JSON.stringify(s));
process.exit(ok ? 0 : 2);
