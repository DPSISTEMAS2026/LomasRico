'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
    RefreshCcw,
    Flame,
    Clock,
    ShoppingBag,
    Users,
} from 'lucide-react';
import { API_URL } from '../../../services/api';
import { authFetch } from '../../../services/authFetch';

const BarChart = dynamic(() => import('recharts').then((mod) => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then((mod) => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((mod) => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((mod) => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then((mod) => mod.ResponsiveContainer), { ssr: false });

function chileYmd(d = new Date()) {
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
}

function chileDaysAgo(days: number) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return chileYmd(d);
}

const METHOD_LABEL: Record<string, string> = {
    CASH: 'Efectivo',
    DEBIT: 'Débito',
    CREDIT: 'Crédito',
    TRANSFER: 'Transferencia',
    MERCADO_PAGO: 'MercadoPago',
    MP: 'MercadoPago',
    TUU: 'Web TUU',
    OTHER: 'Otro',
};

export default function OwnerDashboardPage() {
    const [from, setFrom] = useState(() => chileDaysAgo(6));
    const [to, setTo] = useState(() => chileYmd());
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'hours' | 'top' | 'customers' | 'payments'>('hours');

    const loadData = async () => {
        setLoading(true);
        try {
            const q = new URLSearchParams({ from, to });
            const res = await authFetch(`${API_URL}/stats/range?${q.toString()}`, { cache: 'no-store' });
            if (res.ok) setData(await res.json());
            else setData(null);
        } catch (e) {
            console.error('Error loading resumen:', e);
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const peakHours = (data?.hours || []).filter((h: any) => h.count > 0);
    const strongHours = (data?.peakHours || []).slice(0, 5);

    return (
        <div className="space-y-4 md:space-y-5 animate-in fade-in duration-700 pb-10 min-w-0 overflow-x-hidden">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 pl-14 lg:pl-0 text-right lg:text-left">
                    <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                        Resumen
                    </h1>
                </div>
                <button
                    type="button"
                    onClick={loadData}
                    className="shrink-0 bg-white p-2.5 md:px-4 md:py-3 rounded-xl border border-slate-100 flex items-center justify-center gap-2 shadow-sm font-black text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-slate-50"
                >
                    <RefreshCcw size={14} className={`text-orange-500 ${loading ? 'animate-spin' : ''}`} />
                    <span className="hidden md:inline">Refrescar</span>
                </button>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Desde</label>
                    <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" />
                </div>
                <div className="flex-1">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Hasta</label>
                    <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" />
                </div>
                <button
                    type="button"
                    onClick={loadData}
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest italic disabled:opacity-50"
                >
                    Buscar
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 text-sm">
                <Row label="Ventas" value={`$${Number(data?.total || 0).toLocaleString('es-CL')}`} />
                <Row label="Pedidos" value={String(data?.count || 0)} />
                <Row label="Ticket promedio" value={`$${Number(data?.avgTicket || 0).toLocaleString('es-CL')}`} />
                {!!data?.tipsTotal && <Row label="Propinas" value={`$${Number(data.tipsTotal).toLocaleString('es-CL')}`} />}
                {!!data?.courierPay && <Row label="Pago repartidor" value={`$${Number(data.courierPay).toLocaleString('es-CL')}`} />}
                {!!data?.courierFree && <Row label="Reparto gratis al cliente" value={`$${Number(data.courierFree).toLocaleString('es-CL')}`} />}
            </div>

            {strongHours.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">Horarios fuertes</p>
                    <div className="flex flex-wrap gap-2">
                        {strongHours.map((h: any) => (
                            <span key={h.hour} className="px-3 py-1.5 rounded-xl bg-orange-50 text-orange-700 text-xs font-black">
                                {String(h.hour).padStart(2, '0')}:00 · {h.count}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-2xl">
                {[
                    { key: 'hours' as const, label: 'Horas', Icon: Clock },
                    { key: 'top' as const, label: 'Top', Icon: Flame },
                    { key: 'customers' as const, label: 'Clientes', Icon: Users },
                    { key: 'payments' as const, label: 'Pagos', Icon: ShoppingBag },
                ].map((t) => {
                    const active = tab === t.key;
                    const Icon = t.Icon;
                    return (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => setTab(t.key)}
                            className={`flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-1.5 py-2 rounded-xl font-black uppercase italic text-[9px] md:text-xs ${active ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-700'}`}
                        >
                            <Icon size={14} />
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {loading && (
                <div className="py-16 flex justify-center">
                    <RefreshCcw size={28} className="text-orange-500 animate-spin" />
                </div>
            )}

            {!loading && tab === 'hours' && (
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-4">Distribución horaria</p>
                    <div className="h-[240px] md:h-[280px]">
                        {peakHours.length ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={peakHours}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} tickFormatter={(h: number) => `${h}`} />
                                    <YAxis hide />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 20px rgb(0 0 0 / 0.08)' }} />
                                    <Bar dataKey="count" fill="#f2642e" radius={[8, 8, 4, 4]} barSize={22} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <Empty />
                        )}
                    </div>
                </div>
            )}

            {!loading && tab === 'top' && (
                <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
                    {(data?.topProducts || []).length ? (data.topProducts as any[]).map((p, i) => (
                        <div key={p.name} className="flex items-center justify-between px-4 py-3 gap-3">
                            <span className="text-xs font-black text-slate-400 w-5">{i + 1}</span>
                            <span className="flex-1 text-sm font-black uppercase italic tracking-tighter text-slate-800 truncate">{p.name}</span>
                            <span className="text-sm font-black text-slate-900">{p.quantity}</span>
                        </div>
                    )) : <div className="p-8"><Empty /></div>}
                </div>
            )}

            {!loading && tab === 'customers' && (
                <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
                    {(data?.habitualCustomers || []).length ? (data.habitualCustomers as any[]).map((c) => (
                        <div key={c.userId} className="flex items-center justify-between px-4 py-3 gap-3">
                            <div className="min-w-0">
                                <p className="text-sm font-black uppercase italic tracking-tighter text-slate-900 truncate">{c.name}</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{c.phone || 'Sin teléfono'} · {c.orders} pedidos</p>
                            </div>
                            <span className="text-sm font-black text-slate-900 shrink-0">${Number(c.total).toLocaleString('es-CL')}</span>
                        </div>
                    )) : <div className="p-8"><Empty label="Sin clientes habituales en el rango" /></div>}
                </div>
            )}

            {!loading && tab === 'payments' && (
                <div className="space-y-3">
                    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
                        <p className="px-4 pt-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Medios de pago</p>
                        {(data?.byPayment || []).map((p: any) => (
                            <div key={p.method} className="flex justify-between px-4 py-2.5 text-xs font-black uppercase">
                                <span>{METHOD_LABEL[p.method] || p.method} ({p.count})</span>
                                <span>${Number(p.total).toLocaleString('es-CL')}</span>
                            </div>
                        ))}
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
                        <p className="px-4 pt-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Canales</p>
                        {(data?.byChannel || []).map((c: any) => (
                            <div key={c.channel} className="flex justify-between px-4 py-2.5 text-xs font-black uppercase">
                                <span>{c.channel} ({c.count})</span>
                                <span>${Number(c.total).toLocaleString('es-CL')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-center px-4 py-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
            <span className="font-black italic text-slate-900 tracking-tighter text-lg">{value}</span>
        </div>
    );
}

function Empty({ label = 'Sin datos en el rango' }: { label?: string }) {
    return (
        <div className="h-full min-h-[120px] flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
            <p className="text-slate-300 font-black uppercase text-[10px] tracking-widest text-center px-4">{label}</p>
        </div>
    );
}
