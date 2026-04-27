'use client';

import { useState, useEffect } from 'react';
import {
    BarChart3, Calendar, Download, TrendingUp, DollarSign,
    Package, AlertTriangle, CreditCard, Clock, Loader2,
    Flame, ShoppingBag, ArrowUpRight, ArrowDownRight, Zap,
    Trophy, AlertCircle
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { API_URL } from '../../../../services/api';
import { authFetch } from '../../../../services/authFetch';

// Dynamic imports for charts
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });

const CHANNEL_COLORS: Record<string, { bg: string, text: string, fill: string, label: string }> = {
    POS: { bg: 'bg-blue-500', text: 'text-blue-600', fill: '#3b82f6', label: '🖥️ POS' },
    UBER_EATS: { bg: 'bg-green-500', text: 'text-green-600', fill: '#22c55e', label: '🟢 Uber Eats' },
    PEDIDOS_YA: { bg: 'bg-red-500', text: 'text-red-600', fill: '#ef4444', label: '🔴 PedidosYa' },
    WEB: { bg: 'bg-purple-500', text: 'text-purple-600', fill: '#a855f7', label: '🌐 Web' },
    WHATSAPP: { bg: 'bg-emerald-500', text: 'text-emerald-600', fill: '#10b981', label: '💬 WhatsApp' },
};

export default function ReportsPage() {
    const [sales, setSales] = useState<any[]>([]);
    const [dashboard, setDashboard] = useState<any>(null);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        try {
            const [salesRes, dashRes, topRes, invRes] = await Promise.all([
                authFetch(`${API_URL}/sales`),
                authFetch(`${API_URL}/stats/dashboard`),
                authFetch(`${API_URL}/stats/top-products`),
                authFetch(`${API_URL}/inventory`),
            ]);
            if (salesRes.ok) setSales(await salesRes.json());
            if (dashRes.ok) setDashboard(await dashRes.json());
            if (topRes.ok) setTopProducts(await topRes.json());
            if (invRes.ok) setInventory(await invRes.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    // Calculations
    const totalRevenue = sales.reduce((a, s) => a + Number(s.total), 0);
    const completedSales = sales.filter(s => s.status === 'COMPLETED' || s.status === 'DELIVERED');
    const avgTicket = completedSales.length > 0 ? completedSales.reduce((a, s) => a + Number(s.total), 0) / completedSales.length : 0;

    // Daily chart data (last 7 days)
    const dailyData = (() => {
        const days: Record<string, number> = {};
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now); d.setDate(d.getDate() - i);
            const key = d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' });
            days[key] = 0;
        }
        sales.forEach(s => {
            if (s.status === 'CANCELLED') return;
            const d = new Date(s.createdAt);
            const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
            if (diff <= 6) {
                const key = d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' });
                if (days[key] !== undefined) days[key] += Number(s.total);
            }
        });
        return Object.entries(days).map(([name, total]) => ({ name, total }));
    })();

    // Channel breakdown
    const channelData = dashboard?.orders?.byChannel || [];

    // Low stock items
    const lowStockItems = inventory.filter(i =>
        i.isActive !== false && (i.currentStock || 0) < (i.minStockThreshold || 10)
    ).sort((a, b) => (a.currentStock || 0) - (b.currentStock || 0)).slice(0, 8);

    // Stock valorizado
    const totalStockValue = inventory.reduce((a, i) =>
        a + ((i.currentStock || 0) * (i.costPerUnit || 0)), 0
    );

    if (loading) return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="animate-spin text-orange-500 mb-4" size={48} />
            <p className="font-black uppercase text-xs tracking-widest text-slate-400 italic">Generando Auditoría...</p>
        </div>
    );

    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                        AUDITORÍA <span className="text-orange-500">GLOBAL</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase text-[8px] md:text-[10px] tracking-widest mt-2 px-1">
                        Métricas de Rendimiento · Inventario · Márgenes
                    </p>
                </div>
                <button onClick={() => alert('Exportando reporte...')}
                    className="px-6 py-3 bg-slate-900 text-white rounded-2xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 hover:bg-orange-600 transition-all italic">
                    <Download size={14} /> Exportar
                </button>
            </header>

            {/* KPI Grid — 5 cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                <KpiCard title="Ventas Hoy" value={`$${(dashboard?.sales?.today || 0).toLocaleString()}`} icon={<DollarSign />}
                    trend={dashboard?.sales?.trend} highlight />
                <KpiCard title="Ventas Mes" value={`$${(dashboard?.sales?.month || 0).toLocaleString()}`} icon={<BarChart3 />} />
                <KpiCard title="Tickets" value={completedSales.length.toString()} icon={<CreditCard />} />
                <KpiCard title="Ticket Promedio" value={`$${Math.round(avgTicket).toLocaleString()}`} icon={<TrendingUp />} />
                <KpiCard title="Stock Valorizado" value={`$${Math.round(totalStockValue).toLocaleString()}`} icon={<Package />} />
            </div>

            {/* Main Content: Chart + Channel Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-slate-100 border-b-4 border-b-slate-900">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-black italic tracking-tighter uppercase text-slate-900">Ingresos 7 Días</h3>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest italic">Live</span>
                        </div>
                    </div>
                    <div className="h-[220px] md:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false}
                                    tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false}
                                    tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }}
                                    tickFormatter={(v) => v >= 1000 ? `$${v / 1000}k` : `$${v}`} />
                                <Tooltip cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                    formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Venta']} />
                                <Bar dataKey="total" fill="#f97316" radius={[8, 8, 4, 4]} barSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Channel Breakdown */}
                <div className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl border-b-4 border-b-orange-500 flex flex-col">
                    <h3 className="text-lg font-black italic tracking-tighter uppercase mb-6">Ventas por <span className="text-orange-400">Canal</span></h3>
                    <div className="space-y-3 flex-1">
                        {channelData.length === 0 && <p className="text-slate-500 text-xs italic">Sin datos de canales</p>}
                        {channelData.map((ch: any) => {
                            const cfg = CHANNEL_COLORS[ch.channel] || { bg: 'bg-slate-500', text: 'text-slate-400', fill: '#64748b', label: ch.channel };
                            const pct = totalRevenue > 0 ? ((ch._sum?.total || 0) / totalRevenue * 100) : 0;
                            return (
                                <div key={ch.channel} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-black uppercase italic">{cfg.label}</span>
                                        <span className="text-orange-400 font-black text-sm italic">${(ch._sum?.total || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${cfg.bg}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 w-10 text-right">{pct.toFixed(0)}%</span>
                                    </div>
                                    <p className="text-[9px] font-bold text-slate-500 mt-1">{ch._count?.id || 0} pedidos</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Top Products + Low Stock */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Top 5 Products */}
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 border-b-4 border-b-orange-500">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                            <Trophy size={18} className="text-orange-500" />
                        </div>
                        <h3 className="text-lg font-black italic tracking-tighter uppercase text-slate-900">Top 5 Productos</h3>
                    </div>
                    <div className="space-y-3">
                        {topProducts.length === 0 && <p className="text-slate-400 text-xs italic font-bold">Sin datos de productos</p>}
                        {topProducts.map((p: any, i: number) => {
                            const maxQty = topProducts[0]?.quantity || 1;
                            const pct = (p.quantity / maxQty) * 100;
                            const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                            return (
                                <div key={i} className="group">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-lg">{medals[i]}</span>
                                            <span className="font-black text-sm uppercase italic tracking-tight text-slate-900 truncate">{p.name}</span>
                                        </div>
                                        <span className="font-black text-orange-500 text-sm italic shrink-0 ml-2">{p.quantity} un</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-700"
                                            style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Low Stock Alerts */}
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 border-b-4 border-b-red-500">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                <AlertCircle size={18} className="text-red-500" />
                            </div>
                            <h3 className="text-lg font-black italic tracking-tighter uppercase text-slate-900">Alertas Stock</h3>
                        </div>
                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-black">{lowStockItems.length}</span>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {lowStockItems.length === 0 && (
                            <div className="text-center py-8">
                                <span className="text-3xl">✅</span>
                                <p className="text-sm font-black text-green-600 uppercase italic mt-2">Stock OK</p>
                                <p className="text-[10px] text-slate-400 font-bold">Todos los insumos por encima del mínimo</p>
                            </div>
                        )}
                        {lowStockItems.map((item: any) => {
                            const threshold = item.minStockThreshold || 10;
                            const pct = Math.min(((item.currentStock || 0) / threshold) * 100, 100);
                            const isCritical = pct < 25;
                            return (
                                <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isCritical ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'}`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black text-white ${isCritical ? 'bg-red-500' : 'bg-orange-400'}`}>
                                        {item.category?.substring(0, 3) || '???'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-xs uppercase italic tracking-tight text-slate-900 truncate">{item.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${isCritical ? 'bg-red-500' : 'bg-orange-400'}`} style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className="text-[9px] font-black text-slate-500">{item.currentStock || 0}/{threshold} {item.unit}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Recent Sales Log */}
            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden border-b-4 border-b-slate-900">
                <div className="p-5 md:p-8 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="text-lg font-black italic tracking-tighter uppercase text-slate-900">Últimas Ventas</h3>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest italic">{sales.length} registros</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[700px]">
                        <thead className="bg-slate-50/50">
                            <tr className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 italic">
                                <th className="px-6 py-5">Código</th>
                                <th className="px-4 py-5">Fecha</th>
                                <th className="px-4 py-5 text-center">Canal</th>
                                <th className="px-4 py-5 text-center">Estado</th>
                                <th className="px-6 py-5 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {sales.slice(0, 15).map((sale) => {
                                const chCfg = CHANNEL_COLORS[sale.channel] || { bg: 'bg-slate-400', label: sale.channel };
                                const statusColors: Record<string, string> = {
                                    COMPLETED: 'bg-green-100 text-green-700',
                                    DELIVERED: 'bg-green-100 text-green-700',
                                    PREPARING: 'bg-blue-100 text-blue-700',
                                    WAITING: 'bg-orange-100 text-orange-700',
                                    CANCELLED: 'bg-red-100 text-red-700',
                                    PENDING: 'bg-yellow-100 text-yellow-700',
                                };
                                return (
                                    <tr key={sale.id} className="group hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-black italic text-sm tracking-tighter text-slate-900 uppercase">#{sale.code || sale.id.slice(0, 6)}</p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="text-xs font-bold text-slate-500 italic">{new Date(sale.createdAt).toLocaleDateString('es-CL')}</p>
                                            <p className="text-[9px] font-bold text-slate-300">{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase italic tracking-wider ${
                                                sale.channel === 'UBER_EATS' ? 'bg-green-100 text-green-700' :
                                                sale.channel === 'PEDIDOS_YA' ? 'bg-red-100 text-red-700' :
                                                sale.channel === 'POS' ? 'bg-blue-100 text-blue-700' :
                                                'bg-purple-100 text-purple-700'
                                            }`}>{chCfg.label}</span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${statusColors[sale.status] || 'bg-slate-100 text-slate-500'}`}>
                                                {sale.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="text-base font-black italic tracking-tighter text-slate-900 group-hover:text-orange-500 transition-colors">
                                                ${Number(sale.total).toLocaleString()}
                                            </p>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

function KpiCard({ title, value, icon, trend, highlight }: { title: string, value: string, icon: any, trend?: string, highlight?: boolean }) {
    const trendNum = parseFloat(trend || '0');
    const isPositive = trendNum >= 0;
    return (
        <div className={`p-5 md:p-6 rounded-2xl border shadow-sm transition-all duration-300 group hover:-translate-y-1 ${
            highlight ? 'bg-orange-500 border-orange-400 text-white col-span-2 sm:col-span-1' : 'bg-white border-slate-100 hover:border-slate-300'
        }`}>
            <div className="flex justify-between items-start mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    highlight ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-300 group-hover:bg-slate-900 group-hover:text-white'
                }`}>
                    <div className="scale-75">{icon}</div>
                </div>
                {trend && (
                    <div className={`flex items-center gap-0.5 px-2 py-1 rounded-full text-[9px] font-black ${
                        highlight ? 'bg-white/20' :
                        isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                    }`}>
                        {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {Math.abs(trendNum).toFixed(0)}%
                    </div>
                )}
            </div>
            <p className={`text-[8px] font-black uppercase tracking-widest italic ${highlight ? 'text-orange-200' : 'text-slate-400'}`}>{title}</p>
            <h3 className="text-xl md:text-2xl font-black italic tracking-tighter leading-none mt-1">{value}</h3>
        </div>
    );
}
