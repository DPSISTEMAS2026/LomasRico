import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

const TZ = 'America/Santiago';

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

        const [daySales, yesterdaySales, monthSales, channelStats, topProducts] = await Promise.all([
            this.getSalesForRange(startOfDay),
            this.getSalesForRange(startOfYesterday, startOfDay),
            this.getSalesForRange(startOfMonth),
            this.getOrdersByChannel(),
            this.getTopProducts(),
        ]);

        const activeOrders = await (this.prisma as any).kitchenTicket.count({
            where: { status: { in: ['WAITING', 'PREPARING'] } }
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

        const todayTotal = daySales._sum.total || 0;
        const yesterdayTotal = yesterdaySales._sum.total || 0;
        let salesTrend = 0;
        if (yesterdayTotal > 0) {
            salesTrend = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
        }

        return {
            sales: {
                today: todayTotal,
                month: monthSales._sum.total || 0,
                trend: salesTrend.toFixed(1),
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

    private async getSalesForRange(startDate: Date, endDate?: Date) {
        return (this.prisma as any).sale.aggregate({
            where: {
                createdAt: {
                    gte: startDate,
                    ...(endDate ? { lt: endDate } : {})
                },
                status: { not: 'CANCELLED' }
            },
            _sum: { total: true },
            _count: { id: true }
        });
    }

    private async getOrdersByChannel() {
        return (this.prisma as any).sale.groupBy({
            by: ['channel'],
            _count: { id: true },
            _sum: { total: true },
            where: { status: { not: 'CANCELLED' } }
        });
    }

    async getTopProducts() {
        const byProduct = await (this.prisma as any).saleItem.groupBy({
            by: ['sellingProductId'],
            where: { sellingProductId: { not: null }, sale: { status: { not: 'CANCELLED' } } },
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
            where: { createdAt: { gte: sevenDaysAgo }, status: { not: 'CANCELLED' } },
            select: { createdAt: true }
        });

        const hours = new Array(24).fill(0);
        sales.forEach((s: any) => {
            hours[zoned(new Date(s.createdAt)).hour]++;
        });

        return hours.map((count, hour) => ({ hour, count }));
    }
}
