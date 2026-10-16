import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

const TZ = 'America/Santiago';
const PAID = { status: { not: 'CANCELLED' }, paymentStatus: 'APPROVED' };

function zoned(date: Date) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-US', {
            timeZone: TZ,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            hourCycle: 'h23',
            timeZoneName: 'longOffset',
        }).formatToParts(date).map((p) => [p.type, p.value]),
    );
    const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(parts.timeZoneName || '');
    const offsetMin = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0)) : 0;
    return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), hour: Number(parts.hour), offsetMin };
}

/** Instante UTC de las 00:00 en Santiago para esa fecha local. */
function santiagoMidnight(year: number, month: number, day: number) {
    const guess = Date.UTC(year, month - 1, day);
    return new Date(guess - zoned(new Date(guess)).offsetMin * 60000);
}

@Injectable()
export class StatsService {
    private readonly logger = new Logger(StatsService.name);

    constructor(private prisma: PrismaService) { }

    async getDashboardStats() {
        const today = zoned(new Date());
        const startOfDay = santiagoMidnight(today.year, today.month, today.day);
        const startOfYesterday = santiagoMidnight(today.year, today.month, today.day - 1);
        const startOfMonth = santiagoMidnight(today.year, today.month, 1);
        const prevMonthYear = today.month === 1 ? today.year - 1 : today.year;
        const prevMonth = today.month === 1 ? 12 : today.month - 1;
        const startOfPrevMonth = santiagoMidnight(prevMonthYear, prevMonth, 1);

        const [daySales, yesterdaySales, monthSales, prevMonthSales, channelStats, topProducts] = await Promise.all([
            this.getSalesForRange(startOfDay),
            this.getSalesForRange(startOfYesterday, startOfDay),
            this.getSalesForRange(startOfMonth),
            this.getSalesForRange(startOfPrevMonth, startOfMonth),
            this.getOrdersByChannel(startOfMonth),
            this.getTopProducts(),
        ]);

        const activeOrders = await (this.prisma as any).kitchenTicket.count({
            where: { status: { in: ['WAITING', 'PREPARING'] }, sale: { status: { not: 'CANCELLED' } } }
        });

        // InventoryItem no tiene isActive; un where con ese campo tumba /stats/dashboard
        let lowStockItems: { id: string; currentStock: number; minStockThreshold: number }[] = [];
        try {
            const allItems = await (this.prisma as any).inventoryItem.findMany({
                select: { id: true, currentStock: true, minStockThreshold: true }
            });
            lowStockItems = allItems.filter((i: any) => {
                const threshold = i.minStockThreshold ?? 10;
                return (i.currentStock ?? 0) < threshold;
            });
        } catch (err: any) {
            this.logger.warn(`lowStock: ${err?.message || err}`);
        }

        const todayTotal = Number(daySales._sum.total || 0);
        const yesterdayTotal = Number(yesterdaySales._sum.total || 0);
        const monthTotal = Number(monthSales._sum.total || 0);
        const prevMonthTotal = Number(prevMonthSales._sum.total || 0);
        let salesTrend = 0;
        if (yesterdayTotal > 0) {
            salesTrend = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
        }
        let monthTrend = 0;
        if (prevMonthTotal > 0) {
            monthTrend = ((monthTotal - prevMonthTotal) / prevMonthTotal) * 100;
        }

        return {
            sales: {
                today: todayTotal,
                month: monthTotal,
                trend: salesTrend.toFixed(1),
                monthTrend: monthTrend.toFixed(1),
            },
            orders: {
                active: activeOrders,
                byChannel: channelStats,
            },
            inventory: {
                lowStock: lowStockItems.length,
            },
            topProduct: topProducts[0] || null
        };
    }

    /** Propinas registradas en salón (shippingData.tip), por garzón. */
    async getTipsReport(days = 30) {
        const since = new Date(Date.now() - Math.max(1, Math.min(90, days)) * 24 * 60 * 60 * 1000);
        const sales = await (this.prisma as any).sale.findMany({
            where: {
                createdAt: { gte: since },
                ...PAID,
                shippingData: { not: null },
            },
            select: {
                id: true,
                code: true,
                total: true,
                createdAt: true,
                shippingData: true,
                table: { select: { number: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 2000,
        });

        const byWaiter = new Map<string, { waiterId: string | null; waiterName: string; tips: number; count: number }>();
        const recent: any[] = [];
        let tipsTotal = 0;
        let tipCount = 0;

        for (const s of sales) {
            const tip = (s.shippingData as any)?.tip;
            const amount = Math.round(Number(tip?.amount || 0));
            if (!(amount > 0)) continue;
            tipsTotal += amount;
            tipCount += 1;
            const waiterId = tip?.waiterId ? String(tip.waiterId) : null;
            const waiterName = String(tip?.waiterName || 'Sin asignar');
            const key = waiterId || waiterName;
            const row = byWaiter.get(key) || { waiterId, waiterName, tips: 0, count: 0 };
            row.tips += amount;
            row.count += 1;
            byWaiter.set(key, row);
            if (recent.length < 40) {
                recent.push({
                    code: s.code,
                    table: s.table?.number ?? null,
                    saleTotal: Number(s.total || 0),
                    tip: amount,
                    percent: tip?.percent ?? null,
                    waiterName,
                    at: s.createdAt,
                });
            }
        }

        return {
            days,
            tipsTotal,
            tipCount,
            byWaiter: [...byWaiter.values()].sort((a, b) => b.tips - a.tips),
            recent,
        };
    }

    private async getSalesForRange(startDate: Date, endDate?: Date) {
        return (this.prisma as any).sale.aggregate({
            where: {
                createdAt: {
                    gte: startDate,
                    ...(endDate ? { lt: endDate } : {})
                },
                ...PAID,
            },
            _sum: { total: true },
            _count: { id: true }
        });
    }

    /** Las ventas de mesa se guardan como POS + DINE_IN; en reportes van como SALON. */
    private async getOrdersByChannel(since: Date) {
        const rows = await (this.prisma as any).sale.groupBy({
            by: ['channel', 'fulfillmentType'],
            _count: { id: true },
            _sum: { total: true },
            where: { createdAt: { gte: since }, ...PAID },
        });
        const merged = new Map<string, { channel: string; _count: { id: number }; _sum: { total: number } }>();
        for (const r of rows) {
            const channel = r.channel === 'POS' && r.fulfillmentType === 'DINE_IN' ? 'SALON' : r.channel;
            const cur = merged.get(channel) || { channel, _count: { id: 0 }, _sum: { total: 0 } };
            cur._count.id += r._count.id;
            cur._sum.total += Number(r._sum.total || 0);
            merged.set(channel, cur);
        }
        return [...merged.values()].sort((a, b) => b._sum.total - a._sum.total);
    }

    /** Resumen del mes en curso (hora de Chile) calculado sobre todas las ventas pagadas. */
    async getMonthReport() {
        const today = zoned(new Date());
        const startOfMonth = santiagoMidnight(today.year, today.month, 1);
        const startOfWeek = santiagoMidnight(today.year, today.month, today.day - 6);
        const since = startOfWeek < startOfMonth ? startOfWeek : startOfMonth;
        const sales = await (this.prisma as any).sale.findMany({
            where: { createdAt: { gte: since }, ...PAID },
            select: { total: true, createdAt: true, paymentMethod: true },
        });

        const days: { key: string; total: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = santiagoMidnight(today.year, today.month, today.day - i);
            const z = zoned(new Date(d.getTime() + 12 * 3600_000));
            days.push({ key: `${z.year}-${z.month}-${z.day}`, total: 0 });
        }
        const byDay = new Map(days.map((d) => [d.key, d]));
        const payments = new Map<string, { method: string; total: number; count: number }>();
        let monthTotal = 0;
        let monthCount = 0;
        for (const s of sales) {
            const at = new Date(s.createdAt);
            const total = Number(s.total || 0);
            const z = zoned(at);
            const day = byDay.get(`${z.year}-${z.month}-${z.day}`);
            if (day) day.total += total;
            if (at >= startOfMonth) {
                monthTotal += total;
                monthCount++;
                const method = s.paymentMethod || 'OTHER';
                const p = payments.get(method) || { method, total: 0, count: 0 };
                p.total += total;
                p.count++;
                payments.set(method, p);
            }
        }

        return {
            days: days.map((d) => {
                const [y, m, dd] = d.key.split('-').map(Number);
                const label = new Date(Date.UTC(y, m - 1, dd, 12)).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
                return { name: label, total: d.total };
            }),
            monthTotal,
            monthCount,
            avgTicket: monthCount ? monthTotal / monthCount : 0,
            byChannel: await this.getOrdersByChannel(startOfMonth),
            byPayment: [...payments.values()].sort((a, b) => b.total - a.total),
        };
    }

    async getTopProducts() {
        const byProduct = await (this.prisma as any).saleItem.groupBy({
            by: ['sellingProductId'],
            where: { sellingProductId: { not: null }, sale: PAID },
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 5
        });
        if (!byProduct.length) return [];

        const products = await (this.prisma as any).sellingProduct.findMany({
            where: { id: { in: byProduct.map((item: any) => item.sellingProductId) } },
            select: { id: true, name: true },
        });
        const names = new Map(products.map((p: any) => [p.id, p.name]));

        return byProduct.map((item: any) => ({
            name: names.get(item.sellingProductId) || 'Producto sin nombre',
            quantity: item._sum.quantity || 0,
        }));
    }

    async getPeakHours() {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const sales = await (this.prisma as any).sale.findMany({
            where: { createdAt: { gte: sevenDaysAgo }, ...PAID },
            select: { createdAt: true }
        });

        const hours = new Array(24).fill(0);
        sales.forEach((s: any) => {
            hours[zoned(new Date(s.createdAt)).hour]++;
        });

        return hours.map((count, hour) => ({ hour, count }));
    }
}
