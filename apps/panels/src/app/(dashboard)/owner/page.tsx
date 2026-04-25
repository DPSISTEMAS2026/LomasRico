'use client';

import { useState, useEffect } from 'react';
import {
    fetchOwnerDashboard,
    fetchTopProducts,
    fetchPeakHours
} from '../../../services/api';
import dynamic from 'next/dynamic';
import {
    TrendingUp,
    Users,
    ShoppingBag,
    AlertCircle,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    RefreshCcw
} from 'lucide-react';

// Dynamic imports for charts to avoid SSR issues
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });

export default function OwnerDashboardPage() {
    const [data, setData] = useState<any>(null);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [peakHours, setPeakHours] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [stats, products, shifts] = await Promise.all([
                fetchOwnerDashboard(),
                fetchTopProducts(),
                fetchPeakHours()
            ]);
            setData(stats);
            setTopProducts(products);
            setPeakHours(shifts);
        } catch (e) {
            console.error('Error loading analytics:', e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
                <RefreshCcw size={48} className="text-orange-500 mb-4 animate-spin" />
                <p className="text-xl font-black uppercase tracking-tighter italic animate-pulse">
                    Analizando Datos...
                </p>
            </div>
        );
    }

    const COLORS = ['#f2642e', '#0f172a', '#3b82f6', '#10b981'];

    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                        ESTADO DEL <span className="text-orange-500">NEGOCIO</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest mt-2 px-1">
                        Snapshot Estratégico de Rendimiento
                    </p>
                </div>
                <button
                    onClick={loadData}
                    className="w-full xl:w-auto bg-white px-4 py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-100 flex items-center justify-center gap-2 shadow-sm font-black text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                >
                    <RefreshCcw size={14} className="text-orange-500" />
                    Refrescar Resumen
                </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard
                    title="Ingresos Hoy"
                    value={`$${Number(data?.sales?.today || 0).toLocaleString()}`}
                    trend={`${data?.sales?.trend || 0}%`}
                    isUp={Number(data?.sales?.trend || 0) >= 0}
                    icon={<TrendingUp size={20} />}
                />
                <StatCard
                    title="Ventas del Mes"
                    value={`$${Number(data?.sales?.month || 0).toLocaleString()}`}
                    trend="Vs Mes Ant."
                    isUp={true}
                    icon={<ShoppingBag size={20} />}
                />
                <StatCard
                    title="Órdenes Activas"
                    value={data?.orders?.active || 0}
                    trend="En cocina"
                    isUp={true}
                    icon={<Users size={20} />}
                />
                <StatCard
                    title="Alertas de Stock"
                    value={data?.inventory?.lowStock || 0}
                    trend={data?.inventory?.lowStock > 0 ? "Crítico" : "Saludable"}
                    isUp={data?.inventory?.lowStock === 0}
                    icon={<AlertCircle size={20} />}
                    color={data?.inventory?.lowStock > 0 ? "text-red-500" : "text-green-500"}
                />
            </div>

            {/* Multi-Panel Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Distribution Chart */}
                <div className="lg:col-span-1 bg-white p-6 md:p-8 rounded-3xl md:rounded-[40px] shadow-sm border border-slate-100 flex flex-col">
                    <h3 className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-6 md:mb-8">Canales de Venta</h3>
                    <div className="h-[240px] md:h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data?.orders?.byChannel || []}
                                    innerRadius={60}
                                    outerRadius={85}
                                    paddingAngle={8}
                                    dataKey="_count.id"
                                    nameKey="channel"
                                    stroke="none"
                                >
                                    {(data?.orders?.byChannel || []).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:gap-4 mt-4 md:mt-6">
                        {(data?.orders?.byChannel || []).map((entry: any, index: number) => (
                            <div key={entry.channel} className="flex flex-col p-2.5 md:p-3 bg-slate-50 rounded-xl md:rounded-2xl">
                                <span className="flex items-center gap-1.5 md:gap-2 text-[8px] md:text-[9px] font-black uppercase text-slate-400">
                                    <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    {entry.channel}
                                </span>
                                <span className="text-base md:text-lg font-black italic text-slate-900 tracking-tighter">{entry._count.id}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Products Rank */}
                <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-3xl md:rounded-[40px] shadow-sm border border-slate-100 flex flex-col">
                    <div className="flex justify-between items-center mb-6 md:mb-10">
                        <h3 className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest">Productos más Vendidos</h3>
                        <div className="bg-orange-50 text-orange-600 px-2 md:px-3 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase">Top 5</div>
                    </div>
                    <div className="space-y-4 md:space-y-6 flex-1">
                        {topProducts && topProducts.length > 0 ? topProducts.map((p, i) => (
                            <div key={p.name} className="flex items-center gap-4 md:gap-6 group">
                                <span className="w-4 md:w-6 font-black italic text-slate-100 text-2xl md:text-3xl group-hover:text-orange-500 transition-colors duration-500">
                                    {i + 1}
                                </span>
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1.5 md:mb-2 text-wrap pr-1">
                                        <span className="font-black uppercase text-xs md:text-sm italic tracking-tighter text-slate-700 truncate max-w-[150px] md:max-w-none">{p.name}</span>
                                        <div className="flex items-center gap-1 shrink-0 ml-2">
                                            <span className="font-black text-xs md:text-sm text-slate-900">{p.quantity}</span>
                                            <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase">Uni.</span>
                                        </div>
                                    </div>
                                    <div className="h-2 md:h-3 bg-slate-50 rounded-full overflow-hidden p-0.5 border border-slate-100 shadow-inner">
                                        <div
                                            className="h-full bg-slate-800 rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: `${(p.quantity / topProducts[0].quantity) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="h-full min-h-[150px] flex flex-col items-center justify-center border-2 border-dashed border-slate-50 rounded-3xl md:rounded-[32px]">
                                <ShoppingBag size={32} className="text-slate-100 mb-2 md:w-12 md:h-12" />
                                <p className="text-slate-300 font-bold uppercase text-[9px] md:text-[10px] tracking-widest text-center px-4">Sin datos de productos</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Peak Hours Chart */}
            <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[40px] shadow-sm border border-slate-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 mb-8 md:mb-12">
                    <div>
                        <h3 className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest">Distribución Horaria</h3>
                        <p className="text-lg md:text-xl font-black italic uppercase tracking-tighter text-slate-900 mt-1">Horas de Mayor Demanda</p>
                    </div>
                    <div className="hidden sm:flex gap-1.5 h-10 shrink-0">
                        {[0, 1, 2, 3, 4, 5, 6].map(i => <div key={i} className="w-1.5 md:w-2 bg-slate-100 rounded-full h-full" />)}
                    </div>
                </div>
                <div className="h-[250px] md:h-[300px]">
                    {peakHours && peakHours.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={peakHours}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="hour"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }}
                                    tickFormatter={(h: number) => `${h}:00`}
                                />
                                <YAxis hide />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                                />
                                <Bar dataKey="count" fill="#f2642e" radius={[12, 12, 4, 4]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-50 rounded-3xl md:rounded-[40px]">
                            <p className="text-slate-200 font-black uppercase text-[10px] md:text-xs tracking-[0.2em] text-center px-6">Sincronizando Tendencias...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, trend, isUp, icon, color = "text-slate-900" }: any) {
    return (
        <div className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[40px] shadow-sm border border-slate-100 group hover:border-orange-500 hover:shadow-xl transition-all duration-500">
            <div className="flex justify-between items-start mb-4 md:mb-6">
                <div className="p-3 md:p-4 bg-slate-50 text-slate-900 rounded-xl md:rounded-2xl group-hover:bg-orange-500 group-hover:text-white transition-all duration-500 shadow-sm shrink-0">
                    <div className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center">
                        {icon}
                    </div>
                </div>
                <div className={`flex items-center gap-1 md:gap-1.5 text-[9px] md:text-[10px] font-black uppercase italic ${isUp ? 'text-green-500' : 'text-slate-300'} shrink-0`}>
                    {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    <span className="tracking-widest">{trend}</span>
                </div>
            </div>
            <div>
                <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] mb-1 md:mb-1.5">{title}</p>
                <p className={`text-2xl md:text-4xl font-black italic tracking-tighter uppercase leading-none transition-colors duration-500 truncate ${color === 'text-slate-900' ? 'group-hover:text-slate-900' : color}`}>
                    {value}
                </p>
            </div>
        </div>
    );
}
