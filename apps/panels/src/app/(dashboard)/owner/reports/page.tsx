'use client';

import { useState, useEffect } from 'react';
import {
    BarChart3,
    Calendar,
    Download,
    TrendingUp,
    DollarSign,
    Package,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    CreditCard,
    Users,
    CheckCircle,
    Clock,
    Loader2
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { API_URL } from '../../../../services/api';
import { authFetch } from '../../../../services/authFetch';

// Dynamic imports for charts to avoid SSR issues
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });

export default function ReportsBusinessIntelligencePage() {
    const [sales, setSales] = useState<any[]>([]);
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('7d');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [salesRes, dashRes] = await Promise.all([
                authFetch(`${API_URL}/sales`),
                authFetch(`${API_URL}/stats/dashboard`)
            ]);

            if (salesRes.ok) setSales(await salesRes.json());
            if (dashRes.ok) setDashboardData(await dashRes.json());
        } catch (e) {
            console.error('Failed to load real data', e);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Stats
    const totalRevenue = sales.reduce((acc, sale) => acc + Number(sale.total), 0);
    const avgTicket = sales.length > 0 ? totalRevenue / sales.length : 0;
    const pendingOrders = sales.filter(s => s.status === 'PENDING' || s.status === 'PREPARING').length;

    // Chart Data Preparation (Last 7 Days)
    const chartData = sales.slice(0, 10).map(s => ({
        name: new Date(s.createdAt).toLocaleDateString('es-CL', { weekday: 'short' }),
        total: s.total
    })).reverse();

    if (loading) return (
        <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-orange-500 mb-4" size={48} />
            <p className="font-black uppercase text-xs tracking-widest text-slate-400 italic">Generando Auditoría de Ventas...</p>
        </div>
    );

    return (
        <div className="space-y-6 md:space-y-12 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                        AUDITORÍA <span className="text-orange-500">GLOBAL</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase text-[8px] md:text-[10px] tracking-widest mt-2 px-1">
                        Métricas de Rendimiento y Salud Financiera
                    </p>
                </div>

                <div className="flex flex-row gap-3 w-full lg:w-auto">
                    <button
                        onClick={() => setPeriod(prev => prev === '7d' ? '30d' : '7d')}
                        className="flex-1 lg:flex-none px-4 md:px-6 py-3 md:py-4 bg-white border border-slate-100 rounded-xl md:rounded-3xl flex items-center justify-center gap-2 md:gap-3 font-black text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 hover:border-slate-900 hover:text-slate-900 transition-all shadow-sm italic whitespace-nowrap"
                    >
                        <Calendar size={14} className="text-orange-500 shrink-0" /> <span className="truncate">{period === '7d' ? 'Últimos 7 días' : 'Este Mes'}</span>
                    </button>
                    <button
                        onClick={() => alert('Exportando reporte a Excel...')}
                        className="flex-1 lg:flex-none px-4 md:px-8 py-3 md:py-4 bg-slate-900 text-white rounded-xl md:rounded-3xl flex items-center justify-center gap-2 md:gap-3 font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 hover:bg-orange-600 transition-all italic whitespace-nowrap"
                    >
                        <Download size={14} className="shrink-0" /> <span className="truncate">Exportar</span>
                    </button>
                </div>
            </header>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <KpiCard title="Ventas Acumuladas" value={`$${totalRevenue.toLocaleString()}`} icon={<DollarSign />} note="Histórico" />
                <KpiCard title="Tickets Emitidos" value={sales.length.toString()} icon={<CreditCard />} note="Tickets" />
                <KpiCard title="Ticket Promedio" value={`$${Math.round(avgTicket).toLocaleString()}`} icon={<TrendingUp />} note="Performance" />
                <KpiCard title="Flujo en Cocina" value={pendingOrders.toString()} icon={<Clock />} note="Pendientes" highlight />
            </div>

            {/* Charts & Highlights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                <div className="lg:col-span-2 bg-white p-5 md:p-10 rounded-3xl md:rounded-[3rem] shadow-sm border border-slate-100 border-b-8 border-b-slate-900">
                    <div className="flex justify-between items-center mb-6 md:mb-10">
                        <h3 className="text-lg md:text-2xl font-black italic tracking-tighter uppercase text-slate-900">Curva de Ingresos</h3>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-orange-500 animate-pulse"></span>
                            <span className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Live Feed</span>
                        </div>
                    </div>
                    <div className="h-[200px] sm:h-[250px] md:h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }}
                                    tickFormatter={(val) => `$${val / 1000}k`}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                    itemStyle={{ color: '#0f172a', fontWeight: 900, textTransform: 'uppercase', fontSize: '9px' }}
                                    formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Venta']}
                                />
                                <Bar dataKey="total" fill="#f97316" radius={[8, 8, 8, 8]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-slate-900 text-white p-6 md:p-10 rounded-3xl md:rounded-[3rem] shadow-2xl relative overflow-hidden group flex flex-col justify-between border-b-8 border-b-orange-500 min-h-[250px] md:min-h-[300px]">
                    <div className="relative z-10">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 md:mb-8 border border-white/10 group-hover:bg-orange-500 transition-all duration-700">
                            <Package className="text-white w-6 h-6 md:w-8 md:h-8" />
                        </div>
                        <h3 className="text-2xl md:text-4xl font-black italic tracking-tighter uppercase leading-none mb-2 md:mb-4">MÁS <span className="text-orange-500">PEDIDO</span></h3>
                        <p className="text-slate-400 font-bold text-[9px] md:text-xs uppercase tracking-widest italic">Favorito de la Audiencia</p>
                    </div>

                    <div className="relative z-10 mt-6 md:mt-12 bg-white/5 p-5 md:p-8 rounded-2xl md:rounded-[2rem] border border-white/5 backdrop-blur-sm">
                        <h2 className="text-xl md:text-4xl font-black uppercase tracking-tighter leading-none italic group-hover:text-orange-500 transition-colors truncate">
                            {dashboardData?.topProduct?.name || 'Ceviche Mixto'}
                        </h2>
                        <div className="mt-3 md:mt-6 flex flex-wrap items-center gap-3 md:gap-4">
                            <div className="px-3 md:px-4 py-1.5 md:py-2 bg-orange-500 text-white rounded-full text-[9px] md:text-[10px] font-black uppercase italic shadow-lg shadow-orange-500/20">
                                {dashboardData?.topProduct?.quantity || 128} Vendidos
                            </div>
                            <span className="text-slate-500 text-[8px] md:text-[9px] font-black uppercase tracking-widest italic">+12% vs ayer</span>
                        </div>
                    </div>

                    {/* Aura Decoration */}
                    <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-orange-500 rounded-full blur-[120px] opacity-10 group-hover:opacity-30 transition-opacity duration-1000" />
                </div>
            </div>

            {/* Detailed Transaction Log */}
            <section className="bg-white rounded-3xl md:rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden border-b-8 border-b-slate-900">
                <div className="p-5 md:p-10 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-lg md:text-2xl font-black italic tracking-tighter uppercase text-slate-900">Bitácora de Ventas</h3>
                    <button
                        onClick={() => alert('Cargando historial completo de transacciones...')}
                        className="text-[8px] md:text-[10px] font-black uppercase text-orange-500 hover:underline italic tracking-widest"
                    >
                        Ver Historial
                    </button>
                </div>

                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left min-w-[800px] md:min-w-0">
                        <thead className="bg-slate-50/50">
                            <tr className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                                <th className="px-5 md:px-10 py-5 md:py-8 whitespace-nowrap">Venta / Código</th>
                                <th className="px-5 py-5 md:py-8 whitespace-nowrap">Cronología</th>
                                <th className="px-5 py-5 md:py-8 text-center uppercase tracking-tighter whitespace-nowrap">Canal</th>
                                <th className="px-5 py-5 md:py-8 text-right whitespace-nowrap">Estatus</th>
                                <th className="px-5 md:px-10 py-5 md:py-8 text-right pr-6 md:pr-14 text-slate-900 whitespace-nowrap">Liquidado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {sales.slice(0, 10).map((sale) => (
                                <tr key={sale.id} className="group hover:bg-slate-50 transition-colors">
                                    <td className="px-5 md:px-10 py-4 md:py-6">
                                        <div className="flex items-center gap-2 md:gap-3">
                                            <div className="w-1 md:w-2 h-6 md:h-8 bg-slate-900 rounded-full group-hover:bg-orange-500 transition-colors shrink-0" />
                                            <div className="min-w-0">
                                                <p className="font-black italic text-xs md:text-base tracking-tighter text-slate-900 uppercase truncate">#{sale.code || 'SALE-MASTER'}</p>
                                                <p className="text-[8px] md:text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-0.5 truncate">ID: {sale.id.substring(0, 8)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 md:py-6 whitespace-nowrap">
                                        <p className="font-black text-[9px] md:text-xs text-slate-500 italic uppercase">{new Date(sale.createdAt).toLocaleDateString('es-CL')}</p>
                                        <p className="text-[8px] md:text-[10px] font-bold text-slate-300 uppercase mt-0.5">{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </td>
                                    <td className="px-5 py-4 md:py-6 text-center">
                                        <span className={`px-2.5 md:px-4 py-1 md:py-1.5 rounded-full text-[8px] md:text-[9px] font-black uppercase italic tracking-widest
                                            ${sale.channel === 'WEB' ? 'bg-indigo-50 text-indigo-500' : 'bg-blue-50 text-blue-500'}`}>
                                            {sale.channel}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 md:py-6 transition-all text-right">
                                        <div className="flex items-center justify-end gap-1.5 md:gap-2">
                                            <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full shrink-0 ${sale.status === 'COMPLETED' ? 'bg-green-500' : 'bg-orange-500'}`} />
                                            <span className="font-black italic uppercase text-[8px] md:text-[10px] text-slate-900">{sale.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 md:px-10 py-4 md:py-6 text-right pr-6 md:pr-14">
                                        <p className="text-sm md:text-xl font-black italic tracking-tighter text-slate-900 group-hover:text-orange-500 transition-colors">
                                            ${Number(sale.total).toLocaleString()}
                                        </p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

function KpiCard({ title, value, icon, note, highlight }: { title: string, value: string, icon: any, note: string, highlight?: boolean }) {
    return (
        <div className={`p-6 md:p-8 rounded-[2rem] border shadow-sm transition-all duration-500 flex flex-col justify-between h-40 md:h-48 group hover:-translate-y-2
            ${highlight ? 'bg-orange-500 border-orange-400 text-white shadow-orange-500/20' : 'bg-white border-slate-100 hover:border-slate-900 text-slate-900'}`}>
            <div className="flex justify-between items-start">
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 shrink-0
                    ${highlight ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-300 group-hover:bg-slate-900 group-hover:text-white'}`}>
                    <div className="scale-75 md:scale-100">{icon}</div>
                </div>
                <div className={`px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[7px] md:text-[8px] font-black uppercase tracking-widest italic whitespace-nowrap
                    ${highlight ? 'bg-white text-orange-600 shadow-xl shadow-orange-600/10' : 'bg-slate-50 text-slate-400'}`}>
                    {note}
                </div>
            </div>
            <div>
                <p className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-1 italic leading-none ${highlight ? 'text-orange-200' : 'text-slate-400'}`}>{title}</p>
                <h3 className="text-2xl md:text-4xl font-black italic tracking-tighter leading-none">{value}</h3>
            </div>
        </div>
    );
}
