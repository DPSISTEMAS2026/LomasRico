'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Bike,
    CheckCircle2,
    Loader2,
    MapPin,
    Phone,
    RefreshCw,
    Package,
} from 'lucide-react';
import { API_URL } from '../../../services/api';
import { authFetch } from '../../../services/authFetch';

type DeliveryStatus = 'QUEUED' | 'PICKED' | 'OUT' | 'DONE';

interface DriverOrder {
    id: string;
    code: string;
    total: number;
    shippingCost: number;
    courierPay: number;
    createdAt: string;
    address: string;
    customerName: string;
    customerPhone: string;
    readyForPickup: boolean;
    deliveryStatus: DeliveryStatus;
}

/** Poll lento: no saturar API/Supabase. Pausado con pestaña oculta. */
const POLL_MS = 45_000;

const STATUS_LABEL: Record<DeliveryStatus, string> = {
    QUEUED: 'En cola',
    PICKED: 'Tomado',
    OUT: 'En camino',
    DONE: 'Entregado',
};

const NEXT_ACTION: Partial<Record<DeliveryStatus, { next: DeliveryStatus; label: string }>> = {
    QUEUED: { next: 'PICKED', label: 'Tomar pedido' },
    PICKED: { next: 'OUT', label: 'Salí a repartir' },
    OUT: { next: 'DONE', label: 'Entregado' },
};

function money(n: number) {
    return `$${Math.round(n).toLocaleString('es-CL')}`;
}

function timeAgo(iso: string) {
    const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (mins < 1) return 'ahora';
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)} h`;
}

function mapsUrl(address: string) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function wazeUrl(address: string) {
    return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=true`;
}

export default function DriverPage() {
    const [orders, setOrders] = useState<DriverOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'active' | 'all'>('active');
    const inFlight = useRef(false);

    const load = useCallback(async (silent = false) => {
        if (inFlight.current) return;
        if (typeof document !== 'undefined' && document.hidden) return;
        inFlight.current = true;
        if (!silent) setError('');
        try {
            const q = filter === 'all' ? '?includeDone=1' : '';
            const res = await authFetch(`${API_URL}/delivery/queue${q}`);
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.message || 'No se pudo cargar la cola');
            }
            setOrders(await res.json());
        } catch (e: any) {
            if (!silent) setError(e.message || 'Error de red');
        } finally {
            inFlight.current = false;
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        setLoading(true);
        void load(false);
        const t = setInterval(() => void load(true), POLL_MS);
        const onVis = () => {
            if (!document.hidden) void load(true);
        };
        document.addEventListener('visibilitychange', onVis);
        return () => {
            clearInterval(t);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [load]);

    const advance = async (order: DriverOrder) => {
        const action = NEXT_ACTION[order.deliveryStatus];
        if (!action) return;
        setBusyId(order.id);
        setError('');
        try {
            const res = await authFetch(`${API_URL}/delivery/${order.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: action.next }),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.message || 'No se pudo actualizar');
            }
            const updated: DriverOrder = await res.json();
            setOrders((prev) => {
                if (filter === 'active' && updated.deliveryStatus === 'DONE') {
                    return prev.filter((o) => o.id !== updated.id);
                }
                return prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o));
            });
        } catch (e: any) {
            setError(e.message || 'Error al actualizar');
        } finally {
            setBusyId(null);
        }
    };

    const active = orders.filter((o) => o.deliveryStatus !== 'DONE');
    const outCount = active.filter((o) => o.deliveryStatus === 'OUT').length;
    const readyCount = active.filter((o) => o.readyForPickup && o.deliveryStatus === 'QUEUED').length;

    return (
        <div className="min-h-[100dvh] bg-slate-50 pb-8">
            <header className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                            <Bike size={22} />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                                Reparto
                            </h1>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">
                                {active.length} activos · {readyCount} listos · {outCount} en camino
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => { setLoading(true); void load(false); }}
                        className="w-11 h-11 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-800 active:scale-95"
                        aria-label="Actualizar"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div className="flex gap-2 mt-4">
                    <button
                        type="button"
                        onClick={() => setFilter('active')}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                            filter === 'active' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                    >
                        Activos
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter('all')}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                            filter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                    >
                        Incluir entregados
                    </button>
                </div>
            </header>

            <div className="px-4 pt-4 space-y-3 max-w-lg mx-auto">
                {error && (
                    <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-xs font-bold text-red-700">
                        {error}
                    </div>
                )}

                {loading && orders.length === 0 && (
                    <div className="flex justify-center py-16 text-slate-400">
                        <Loader2 className="animate-spin" size={28} />
                    </div>
                )}

                {!loading && orders.length === 0 && (
                    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
                        <Package className="mx-auto text-slate-300 mb-3" size={36} />
                        <p className="font-black uppercase italic text-slate-900">Sin despachos</p>
                        <p className="text-xs font-bold text-slate-500 mt-1">Cuando haya pedidos delivery aparecerán aquí.</p>
                    </div>
                )}

                {orders.map((order) => {
                    const action = NEXT_ACTION[order.deliveryStatus];
                    const busy = busyId === order.id;
                    return (
                        <article
                            key={order.id}
                            className={`rounded-3xl border-2 bg-white p-4 ${
                                order.deliveryStatus === 'OUT'
                                    ? 'border-orange-500'
                                    : order.readyForPickup
                                        ? 'border-slate-900'
                                        : 'border-slate-100'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        #{order.code} · {timeAgo(order.createdAt)}
                                    </p>
                                    <h2 className="text-lg font-black italic uppercase tracking-tight text-slate-900 leading-tight mt-0.5">
                                        {order.customerName}
                                    </h2>
                                </div>
                                <span
                                    className={`shrink-0 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                                        order.deliveryStatus === 'OUT'
                                            ? 'bg-orange-50 text-orange-600'
                                            : order.deliveryStatus === 'DONE'
                                                ? 'bg-slate-100 text-slate-600'
                                                : order.readyForPickup
                                                    ? 'bg-slate-900 text-white'
                                                    : 'bg-slate-100 text-slate-700'
                                    }`}
                                >
                                    {STATUS_LABEL[order.deliveryStatus]}
                                </span>
                            </div>

                            <div className="mt-3 flex items-start gap-2 text-sm font-bold text-slate-800">
                                <MapPin size={16} className="text-orange-500 shrink-0 mt-0.5" />
                                <span className="leading-snug">{order.address}</span>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                {order.customerPhone && (
                                    <a
                                        href={`tel:${order.customerPhone}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest"
                                    >
                                        <Phone size={14} /> {order.customerPhone}
                                    </a>
                                )}
                                {order.address && (
                                    <a
                                        href={mapsUrl(order.address)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Abrir en Google Maps"
                                        aria-label="Abrir en Google Maps"
                                        className="w-11 h-11 rounded-xl border-2 border-slate-200 bg-white flex items-center justify-center active:scale-95"
                                    >
                                        <img src="/assets/maps/google-maps.svg" alt="" width={22} height={22} className="w-[22px] h-[22px] object-contain" />
                                    </a>
                                )}
                                {order.address && (
                                    <a
                                        href={wazeUrl(order.address)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Abrir en Waze"
                                        aria-label="Abrir en Waze"
                                        className="w-11 h-11 rounded-xl border-2 border-slate-200 bg-white flex items-center justify-center active:scale-95"
                                    >
                                        <img src="/assets/maps/waze.svg" alt="" width={22} height={22} className="w-[22px] h-[22px] object-contain" />
                                    </a>
                                )}
                            </div>

                            <div className="mt-3">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total</p>
                                <p className="text-xl font-black italic text-slate-900 leading-none">{money(order.total)}</p>
                                {order.courierPay > 0 && (
                                    <p className="text-[10px] font-bold text-slate-500 mt-1">
                                        Pago repartidor {money(order.courierPay)}
                                        {order.shippingCost <= 0 ? ' · gratis para el cliente' : ''}
                                    </p>
                                )}
                            </div>

                            {action && (
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void advance(order)}
                                    className="mt-4 w-full py-4 rounded-2xl bg-orange-500 text-white font-black uppercase italic tracking-widest text-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60 hover:bg-orange-600"
                                >
                                    {busy ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                                    {action.label}
                                </button>
                            )}
                        </article>
                    );
                })}
            </div>
        </div>
    );
}
