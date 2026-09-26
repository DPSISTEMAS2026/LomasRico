'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    ChefHat, AlertCircle, Package, Truck, Flame, RefreshCw, Zap, History, Search, Printer, Receipt
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { API_URL } from '../../../services/api';
import { authFetch } from '../../../services/authFetch';
import { TicketCard } from '../../../components/kitchen/TicketCard';
import type { KitchenTicket, KitchenStatus } from '@lomasrico/shared-types';

// ─── Tab configuration ──────────────────────────────
type WorkTab = 'WAITING' | 'PREPARING' | 'READY';
type TabKey = WorkTab | 'HISTORY';

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

const TAB_CFG: Record<WorkTab, TabConfig> = {
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
        <div className={`px-3 md:px-5 py-3 rounded-2xl border-2 w-full ${STAT_COLORS[color] || ''} flex flex-col min-w-0 md:min-w-[130px] transition-all`}>
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
    const [history, setHistory] = useState<any[]>([]);
    const [historyQ, setHistoryQ] = useState('');
    const [historyLoading, setHistoryLoading] = useState(false);
    const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(new Set());
    const prevTicketIds = useRef<Set<string>>(new Set());
    const tabBarRef = useRef<HTMLDivElement>(null);

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

    const hasLoaded = useRef(false);

    const loadTickets = useCallback(async () => {
        try {
            const res = await authFetch(`${API_URL}/kitchen/active`, { cache: 'no-store' });
            // #region agent log
            fetch('/api/debug-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({href:typeof window!=='undefined'?window.location.href:null,apiUrl:String(API_URL),ua:'kitchen-fetch:'+res.status})}).catch(()=>{});
            // #endregion
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const ids = new Set(data.map((t: any) => t.id));
            if (hasLoaded.current && data.some((t: any) => !prevTicketIds.current.has(t.id))) {
                playNotificationSound();
            }
            prevTicketIds.current = ids;
            hasLoaded.current = true;
            setTickets(data);
            setError('');
            // #region agent log
                fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'kitchen-flow',hypothesisId:'K5',location:'kitchen/page.tsx:loadTickets',message:'kitchen tickets loaded',data:{total:data.length,tableTickets:data.filter((t:any)=>t.label?.includes('MESA')||t.sale?.table).length,waiting:data.filter((t:any)=>t.status==='WAITING').length,preparing:data.filter((t:any)=>t.status==='PREPARING').length},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
        } catch (e: unknown) {
            // #region agent log
            fetch('/api/debug-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({href:typeof window!=='undefined'?window.location.href:null,apiUrl:String(API_URL),ua:'kitchen-error:'+(e instanceof Error?e.message:String(e))})}).catch(()=>{});
            // #endregion
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
    const openPrintHtml = async (path: string) => {
        const res = await authFetch(`${API_URL}${path}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const w = window.open('', '_blank', 'width=380,height=640');
        if (!w) return;
        w.document.write(html);
        w.document.close();
    };
    const printTicket = (id: string) => { void openPrintHtml(`/kitchen/${id}/print`); };
    const printAccount = async (ticket: any) => {
        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'kitchen-history',hypothesisId:'H-REPRINT',location:'kitchen/page.tsx:printAccount',message:'reprint boleta/account',data:{id:ticket.id,code:ticket.sale?.code,dteFolio:ticket.dteFolio||null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (ticket.dteTipo && ticket.dteFolio) {
            const res = await fetch(`${API_URL}/billing/pdf/${ticket.dteTipo}/${ticket.dteFolio}`);
            const data = await res.json().catch(() => null);
            if (data?.url) {
                window.open(data.url, '_blank');
                return;
            }
        }
        await openPrintHtml(`/kitchen/${ticket.id}/print-account`);
    };
    const toggleRecipe = (key: string) => setExpandedRecipes(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

    const loadHistory = useCallback(async (q = '') => {
        setHistoryLoading(true);
        try {
            const url = `${API_URL}/kitchen/history${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`;
            const res = await authFetch(url, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setHistory(Array.isArray(data) ? data : []);
            // #region agent log
            fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'kitchen-history',hypothesisId:'H-HIST',location:'kitchen/page.tsx:loadHistory',message:'history loaded',data:{count:Array.isArray(data)?data.length:0,q:q||null},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Error de historial');
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'HISTORY') void loadHistory('');
    }, [activeTab, loadHistory]);

    useEffect(() => {
        const measure = () => {
            const el = tabBarRef.current;
            if (!el) return;
            // #region agent log
            fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'kitchen-tabs',hypothesisId:'H-OVERFLOW',location:'kitchen/page.tsx:measure',message:'kitchen tab bar overflow',data:{innerW:window.innerWidth,scrollW:el.scrollWidth,clientW:el.clientWidth,overflows:el.scrollWidth>el.clientWidth+1,tab:activeTab},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [activeTab]);

    const waitingTickets = tickets.filter(t => t.status === 'WAITING');
    const preparingTickets = tickets.filter(t => t.status === 'PREPARING');
    const readyTickets = tickets.filter(t => t.status === 'READY');
    const byTab: Record<WorkTab, KitchenTicket[]> = { WAITING: waitingTickets, PREPARING: preparingTickets, READY: readyTickets };
    const current = activeTab === 'HISTORY' ? [] : byTab[activeTab];
    const cfg = activeTab === 'HISTORY' ? null : TAB_CFG[activeTab];

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
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
            {/* Header */}
            <div className="shrink-0 px-4 md:px-6 pt-4 md:pt-6 pb-0">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-3">
                    <div className="w-full pl-14 lg:pl-0 text-right lg:text-left">
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">
                            Cocina
                        </h1>
                    </div>
                    <div className="grid grid-cols-3 gap-2 w-full lg:w-auto lg:flex">
                        <StatCard label="En Espera" value={waitingTickets.length} color="orange" />
                        <StatCard label="En Proceso" value={preparingTickets.length} color="blue" />
                        <StatCard label="Listos" value={readyTickets.length} color="green" />
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                    <div ref={tabBarRef} className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-2xl flex-1 min-w-0">
                        {([
                            { key: 'WAITING' as TabKey, short: 'Entrada', full: TAB_CFG.WAITING.label, Icon: TAB_CFG.WAITING.icon, count: waitingTickets.length, on: 'bg-orange-500 text-white', off: TAB_CFG.WAITING.badge },
                            { key: 'PREPARING' as TabKey, short: 'Prep', full: TAB_CFG.PREPARING.label, Icon: TAB_CFG.PREPARING.icon, count: preparingTickets.length, on: 'bg-blue-500 text-white', off: TAB_CFG.PREPARING.badge },
                            { key: 'READY' as TabKey, short: 'Listos', full: TAB_CFG.READY.label, Icon: TAB_CFG.READY.icon, count: readyTickets.length, on: 'bg-green-500 text-white', off: TAB_CFG.READY.badge },
                            { key: 'HISTORY' as TabKey, short: 'Hist', full: 'Historial', Icon: History, count: null, on: 'bg-slate-900 text-white', off: 'bg-white text-slate-500' },
                        ]).map((t) => {
                            const active = activeTab === t.key;
                            const Icon = t.Icon;
                            return (
                                <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => {
                                        setActiveTab(t.key);
                                        // #region agent log
                                        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'kitchen-tabs',hypothesisId:'H-MOBILE-TABS',location:'kitchen/page.tsx:tab',message:'kitchen tab tap',data:{tab:t.key,innerW:window.innerWidth},timestamp:Date.now()})}).catch(()=>{});
                                        // #endregion
                                    }}
                                    className={`min-w-0 flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-1.5 py-2 px-1 rounded-xl font-black uppercase italic tracking-tight transition-all ${active ? t.on : 'text-slate-400'}`}
                                >
                                    <Icon size={15} />
                                    <span className="text-[9px] leading-none md:hidden">{t.short}</span>
                                    <span className="hidden md:inline text-xs">{t.full}</span>
                                    {t.count != null && (
                                        <span className={`min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[9px] font-black ${active ? 'bg-white/25 text-white' : t.off}`}>
                                            {t.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <button onClick={() => activeTab === 'HISTORY' ? loadHistory() : loadTickets()} className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-700 shrink-0" title="Actualizar">
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Orders Grid */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 md:px-6 py-4 md:py-6">
                {activeTab === 'HISTORY' ? (
                    <div className="space-y-4">
                        <form
                            onSubmit={(e) => { e.preventDefault(); void loadHistory(historyQ); }}
                            className="flex flex-col sm:flex-row gap-2"
                        >
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                <input
                                    value={historyQ}
                                    onChange={(e) => setHistoryQ(e.target.value)}
                                    placeholder="Buscar por código, mesa o nombre..."
                                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-100 font-bold text-sm outline-none focus:border-orange-500"
                                />
                            </div>
                            <button type="submit" className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest">
                                Buscar
                            </button>
                        </form>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Pedidos entregados de las últimas 48 horas · reimprimir comanda o boleta
                        </p>
                        {historyLoading ? (
                            <p className="text-center py-16 font-black uppercase italic text-slate-400">Cargando historial...</p>
                        ) : history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center min-h-[30vh] bg-white rounded-3xl border-2 border-dashed border-slate-200 p-8 text-center">
                                <History size={52} className="text-slate-200 mb-4" />
                                <p className="text-lg font-black text-slate-400 uppercase italic">Sin pedidos entregados</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {history.map((ticket) => {
                                    const sale = ticket.sale || {};
                                    const when = new Date(ticket.createdAt).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                                    const items = sale.items || [];
                                    return (
                                        <div key={ticket.id} className="bg-white rounded-3xl border border-slate-100 p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-xl font-black italic uppercase text-slate-900">{sale.code || ticket.id.slice(0, 6)}</h3>
                                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-500">{ticket.label || sale.channel}</span>
                                                    {sale.status === 'CANCELLED' && <span className="px-2 py-0.5 rounded-full bg-red-50 text-[9px] font-black uppercase text-red-500">Cancelado</span>}
                                                    {ticket.dteFolio && <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[9px] font-black uppercase text-emerald-700">DTE {ticket.dteFolio}</span>}
                                                </div>
                                                <p className="text-[11px] font-bold text-slate-400 mt-1">{when} · {items.length} ítem{items.length === 1 ? '' : 's'}{sale.total != null ? ` · $${Number(sale.total).toLocaleString('es-CL')}` : ''}</p>
                                                <p className="text-[11px] font-bold text-slate-500 truncate mt-1">
                                                    {items.map((item: any) => `${item.quantity}x ${item.sellingProduct?.name || 'Producto'}`).join(' · ')}
                                                </p>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => printTicket(ticket.id)}
                                                    className="h-12 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 font-black uppercase text-[10px] tracking-widest flex items-center gap-2"
                                                >
                                                    <Printer size={15} /> Comanda
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void printAccount(ticket)}
                                                    className="h-12 px-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-[10px] tracking-widest flex items-center gap-2"
                                                >
                                                    <Receipt size={15} /> Boleta
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : current.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[40vh] bg-white rounded-3xl md:rounded-[40px] border-2 border-dashed border-slate-200 p-8 text-center">
                        <Package size={60} className="text-slate-200 mb-4" />
                        <p className="text-lg font-black text-slate-400 uppercase italic">Sin pedidos en {cfg?.label.toLowerCase()}</p>
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">Nuevos pedidos aparecerán aquí</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-5 auto-rows-min">
                        {current.map(ticket => (
                            <TicketCard key={ticket.id} ticket={ticket} cfg={cfg!} expandedRecipes={expandedRecipes} toggleRecipe={toggleRecipe}
                                onAction={() => updateStatus(ticket.id, cfg!.nextStatus)} onCancel={() => cancelTicket(ticket.id)} onPrint={() => printTicket(ticket.id)} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
