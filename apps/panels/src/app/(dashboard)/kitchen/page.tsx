'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    ChefHat, AlertCircle, Package, Truck, Flame, RefreshCw, Zap
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { API_URL } from '../../../services/api';
import { authFetch } from '../../../services/authFetch';
import { TicketCard } from '../../../components/kitchen/TicketCard';
import type { KitchenTicket, KitchenStatus } from '@lomasrico/shared-types';

// ─── Tab configuration ──────────────────────────────
type TabKey = 'WAITING' | 'PREPARING' | 'READY';

interface TabConfig {
    label: string;
    icon: typeof Zap;
    color: string;
    activeBg: string;
    activeText: string;
    badge: string;
    action: string;
    nextStatus: string;
    btnColor: string;
}

const TAB_CFG: Record<TabKey, TabConfig> = {
    WAITING:   { label: 'Entrantes',   icon: Zap,   color: 'orange', activeBg: 'bg-orange-500', activeText: 'text-white', badge: 'bg-orange-100 text-orange-700', action: 'Preparar',    nextStatus: 'PREPARING', btnColor: 'bg-orange-500 hover:bg-orange-600' },
    PREPARING: { label: 'Preparando',  icon: Flame, color: 'blue',   activeBg: 'bg-blue-500',   activeText: 'text-white', badge: 'bg-blue-100 text-blue-700',     action: 'Listo ✓',     nextStatus: 'READY',     btnColor: 'bg-blue-500 hover:bg-blue-600' },
    READY:     { label: 'Entrega',     icon: Truck, color: 'green',  activeBg: 'bg-green-500',  activeText: 'text-white', badge: 'bg-green-100 text-green-700',   action: 'Entregado ✓', nextStatus: 'DELIVERED',  btnColor: 'bg-green-500 hover:bg-green-600' },
};

// ─── Stat Card ──────────────────────────────────────
const STAT_COLORS: Record<string, string> = {
    orange: 'bg-orange-50 border-orange-100 text-orange-600',
    blue:   'bg-blue-50 border-blue-100 text-blue-600',
    green:  'bg-green-50 border-green-100 text-green-600',
};

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className={`px-5 py-3 rounded-2xl border-2 flex-1 sm:flex-none ${STAT_COLORS[color] || ''} flex flex-col min-w-[110px] md:min-w-[130px] transition-all`}>
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-70 mb-0.5 whitespace-nowrap">{label}</span>
            <span className="text-xl md:text-3xl font-black italic tracking-tighter leading-none">{value}</span>
        </div>
    );
}

// ─── Kitchen Page ───────────────────────────────────
export default function KitchenPage() {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<KitchenTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<TabKey>('WAITING');
    const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(new Set());
    const prevWaitingCount = useRef(0);

    // 🔔 Sound notification for new tickets
    const playNotificationSound = useCallback(() => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
            // Second beep
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.frequency.value = 1100;
            osc2.type = 'sine';
            gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.65);
            osc2.start(ctx.currentTime + 0.15);
            osc2.stop(ctx.currentTime + 0.65);
        } catch (e) { /* Audio not supported */ }
    }, []);

    const loadTickets = useCallback(async () => {
        try {
            const res = await authFetch(`${API_URL}/kitchen/active`, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const newWaiting = data.filter((t: any) => t.status === 'WAITING').length;
            if (newWaiting > prevWaitingCount.current && prevWaitingCount.current >= 0 && !loading) {
                playNotificationSound();
            }
            prevWaitingCount.current = newWaiting;
            setTickets(data);
            setError('');
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Error de conexión');
        } finally {
            setLoading(false);
        }
    }, [playNotificationSound]);

    useEffect(() => { loadTickets(); const i = setInterval(loadTickets, 8000); return () => clearInterval(i); }, [loadTickets]);

    const updateStatus = async (id: string, status: string) => {
        try {
            const res = await authFetch(`${API_URL}/kitchen/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
            if (!res.ok) throw new Error('Failed'); await loadTickets();
        } catch { alert('Error al actualizar'); }
    };

    const cancelTicket = async (id: string) => { if (confirm('¿Cancelar este pedido?')) await updateStatus(id, 'CANCELLED'); };
    const printTicket = (id: string) => { window.open(`${API_URL}/kitchen/${id}/print`, '_blank', 'width=350,height=600'); };
    const toggleRecipe = (key: string) => setExpandedRecipes(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

    const waitingTickets = tickets.filter(t => t.status === 'WAITING');
    const preparingTickets = tickets.filter(t => t.status === 'PREPARING');
    const readyTickets = tickets.filter(t => t.status === 'READY');
    const byTab: Record<TabKey, KitchenTicket[]> = { WAITING: waitingTickets, PREPARING: preparingTickets, READY: readyTickets };
    const current = byTab[activeTab];
    const cfg = TAB_CFG[activeTab];

    if (loading) return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
            <ChefHat size={64} className="text-orange-500 mb-4 animate-bounce" />
            <p className="text-xl font-black uppercase tracking-tighter italic animate-pulse">Sincronizando Cocina...</p>
        </div>
    );

    if (error) return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto">
            <div className="bg-red-50 p-8 rounded-3xl border-2 border-red-100">
                <AlertCircle size={64} className="text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-black text-red-900 mb-2 uppercase">ERROR DE CONEXIÓN</h1>
                <p className="text-slate-600 mb-6">{error}</p>
                <button onClick={loadTickets} className="w-full bg-red-500 text-white px-6 py-4 rounded-2xl font-black uppercase italic tracking-tighter hover:bg-red-600 transition-all shadow-lg shadow-red-500/20">Reintentar</button>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="shrink-0 px-4 md:px-6 pt-4 md:pt-6 pb-0">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">
                            CENTRAL DE <span className="text-orange-500">PRODUCCIÓN</span>
                        </h1>
                        <p className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest mt-2 flex items-center gap-2 px-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Monitoreo en Tiempo Real
                        </p>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                        <StatCard label="En Espera" value={waitingTickets.length} color="orange" />
                        <StatCard label="En Proceso" value={preparingTickets.length} color="blue" />
                        <StatCard label="Listos" value={readyTickets.length} color="green" />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-slate-200">
                    {(Object.keys(TAB_CFG) as TabKey[]).map(key => {
                        const t = TAB_CFG[key]; const count = byTab[key].length; const active = activeTab === key; const Icon = t.icon;
                        return (
                            <button key={key} onClick={() => setActiveTab(key)}
                                className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-black uppercase italic tracking-tight text-xs md:text-sm transition-all ${active ? `${t.activeBg} ${t.activeText} shadow-lg` : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}>
                                <Icon size={16} /> {t.label}
                                <span className={`min-w-[22px] h-5 flex items-center justify-center rounded-full text-[10px] font-black ${active ? 'bg-white/30' : t.badge}`}>{count}</span>
                            </button>
                        );
                    })}
                    <button onClick={loadTickets} className="ml-auto p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors self-center" title="Actualizar">
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Orders Grid */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6">
                {current.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[40vh] bg-white rounded-3xl md:rounded-[40px] border-2 border-dashed border-slate-200 p-8 text-center">
                        <Package size={60} className="text-slate-200 mb-4" />
                        <p className="text-lg font-black text-slate-400 uppercase italic">Sin pedidos en {cfg.label.toLowerCase()}</p>
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">Nuevos pedidos aparecerán aquí</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-5 auto-rows-min">
                        {current.map(ticket => (
                            <TicketCard key={ticket.id} ticket={ticket} cfg={cfg} expandedRecipes={expandedRecipes} toggleRecipe={toggleRecipe}
                                onAction={() => updateStatus(ticket.id, cfg.nextStatus)} onCancel={() => cancelTicket(ticket.id)} onPrint={() => printTicket(ticket.id)} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
