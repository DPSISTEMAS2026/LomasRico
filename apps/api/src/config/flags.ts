/** Inventario en pausa salvo INVENTORY_ENFORCEMENT=true */
export function isInventoryEnforced(): boolean {
  return process.env.INVENTORY_ENFORCEMENT === 'true';
}

/** Pedidos web (delivery/retiro con pago online) cerrados salvo WEB_ORDERS_ENABLED=true */
export function isWebOrdersEnabled(): boolean {
  return process.env.WEB_ORDERS_ENABLED === 'true';
}

/** Horario de pedidos web en hora de Chile. WEB_HOURS="11:00-22:00" */
export function storeStatus(now = new Date()) {
  const [opensAt, closesAt] = (process.env.WEB_HOURS || '11:00-22:00').split('-').map((s) => s.trim());
  const toMin = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + (m || 0);
  };
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0);
  const current = hour * 60 + minute;
  const start = toMin(opensAt);
  const end = toMin(closesAt);
  const open = start <= end ? current >= start && current < end : current >= start || current < end;
  return { open, opensAt, closesAt };
}
