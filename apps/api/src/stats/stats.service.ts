import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class StatsService {
    constructor(private prisma: PrismaService) { }

    async getDashboardStats() {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfYesterday = new Date(startOfDay);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

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

        // Alertas reales: items debajo de su stock mínimo individual
        const allItems = await (this.prisma as any).inventoryItem.findMany({
            where: { isActive: true },
            select: { id: true, currentStock: true, minStockThreshold: true }
        });
        const lowStockItems = allItems.filter((i: any) => {
            const threshold = i.minStockThreshold ?? 10;
            return (i.currentStock ?? 0) < threshold;
        });

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
        // Agrupar por sellingProductId (cubre ventas directas y por variante)
        const byProduct = await (this.prisma as any).saleItem.groupBy({
            by: ['sellingProductId'],
            where: { sellingProductId: { not: null } },
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 5
        });

        // Hydrate con nombres
        const hydrated = await Promise.all(byProduct.map(async (item: any) => {
            try {
                const product = await (this.prisma as any).sellingProduct.findUnique({
                    where: { id: item.sellingProductId },
                    select: { name: true }
                });
                return {
                    name: product?.name || 'Producto sin nombre',
                    quantity: item._sum.quantity || 0
                };
            } catch {
                return { name: 'Desconocido', quantity: item._sum.quantity || 0 };
            }
        }));

        return hydrated;
    }

    async getPeakHours() {
        // This requires raw query or many fetches if Prisma doesn't support hour extraction easily
        // Standard approach for MVP: get all sales for last 7 days and group by hour in JS
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const sales = await (this.prisma as any).sale.findMany({
            where: { createdAt: { gte: sevenDaysAgo } },
            select: { createdAt: true }
        });

        const hours = new Array(24).fill(0);
        sales.forEach((s: any) => {
            const hour = new Date(s.createdAt).getHours();
            hours[hour]++;
        });

        return hours.map((count, hour) => ({ hour, count }));
    }
}
