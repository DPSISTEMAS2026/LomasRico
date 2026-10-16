/** Inventario en pausa salvo INVENTORY_ENFORCEMENT=true */
export function isInventoryEnforced(): boolean {
  return process.env.INVENTORY_ENFORCEMENT === 'true';
}

/** Pedidos web (delivery/retiro con pago online) cerrados salvo WEB_ORDERS_ENABLED=true */
export function isWebOrdersEnabled(): boolean {
  return process.env.WEB_ORDERS_ENABLED === 'true';
}

type DayHours = { days: number[]; opensAt: string; closesAt: string; label: string };

/**
 * Horario de pedidos web (America/Santiago).
 * Default: Lun–Mié 14:30–21:00 · Jue–Dom 11:30–22:00
 *
 * Override:
 *   WEB_HOURS_SCHEDULE="1,2,3:14:30-21:00;0,4,5,6:11:30-22:00"  (0=dom … 6=sáb)
 *   WEB_HOURS="11:00-22:00"  → mismo rango todos los días
 */
const DEFAULT_SCHEDULE: DayHours[] = [
  { days: [1, 2, 3], opensAt: '14:30', closesAt: '21:00', label: 'Lun–Mié' },
  { days: [0, 4, 5, 6], opensAt: '11:30', closesAt: '22:00', label: 'Jue–Dom' },
];

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

function parseSchedule(): DayHours[] {
  const raw = String(process.env.WEB_HOURS_SCHEDULE || '').trim();
  if (raw) {
    const parsed: DayHours[] = [];
    for (const part of raw.split(';').map((s) => s.trim()).filter(Boolean)) {
      const m = part.match(/^([\d,]+):(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
      if (!m) continue;
      const days = m[1].split(',').map((d) => Number(d.trim())).filter((d) => d >= 0 && d <= 6);
      if (!days.length) continue;
      parsed.push({ days, opensAt: m[2], closesAt: m[3], label: days.join(',') });
    }
    if (parsed.length) return parsed;
  }

  const simple = String(process.env.WEB_HOURS || '').trim();
  if (/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(simple)) {
    const [opensAt, closesAt] = simple.split('-');
    return [{ days: [0, 1, 2, 3, 4, 5, 6], opensAt, closesAt, label: 'Todos los días' }];
  }

  return DEFAULT_SCHEDULE;
}

function chileClock(now: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Santiago',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value || 'Mon';
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    day: dayMap[weekday] ?? 1,
    current: Number(parts.find((p) => p.type === 'hour')?.value || 0) * 60
      + Number(parts.find((p) => p.type === 'minute')?.value || 0),
  };
}

export function storeStatus(now = new Date()) {
  const schedule = parseSchedule();
  const { day, current } = chileClock(now);
  const today = schedule.find((s) => s.days.includes(day)) || schedule[0];
  const { opensAt, closesAt } = today;
  const start = toMin(opensAt);
  const end = toMin(closesAt);
  const open = start <= end ? current >= start && current < end : current >= start || current < end;

  return {
    open,
    opensAt,
    closesAt,
    schedule: schedule.map(({ label, opensAt: o, closesAt: c }) => ({ label, opensAt: o, closesAt: c })),
  };
}
