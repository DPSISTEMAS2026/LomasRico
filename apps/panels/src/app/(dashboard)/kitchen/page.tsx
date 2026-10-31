'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    ChefHat, AlertCircle, Package, Truck, Flame, RefreshCw, Zap, History, Search, Printer, Receipt, ShieldAlert, X
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { API_URL } from '../../../services/api';
import { authFetch } from '../../../services/authFetch';
import { TicketCard } from '../../../components/kitchen/TicketCard';
import { ApprovalModal, type Approval } from '../../../components/common/ApprovalModal';
import type { KitchenTicket, KitchenStatus } from '@lomasrico/shared-types';
import { saleLineTitle } from '@lomasrico/shared-types';

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
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-0.5 whitespace-nowrap">{label}</span>
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
    const [approval, setApproval] = useState<
        | { kind: 'cancel'; ticketId: string; summary: string }
        | { kind: 'item'; saleId: string; item: any; summary: string }
        | null
    >(null);
    const [fixTicket, setFixTicket] = useState<any | null>(null);
    const prevTicketIds = useRef<Set<string>>(new Set());
    const tabBarRef = useRef<HTMLDivElement>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const keepAliveRef = useRef<OscillatorNode | null>(null);
    const alarmArmed = useRef(false);
    const alarmGen = useRef(0);
    const chimeNodes = useRef<OscillatorNode[]>([]);
    const alarmTimer = useRef<number | null>(null);
    const alarmOnRef = useRef(false);
    const [alarmOn, setAlarmOn] = useState(false);

    const haltNotes = useCallback(() => {
        if (alarmTimer.current != null) {
            window.clearTimeout(alarmTimer.current);
            alarmTimer.current = null;
        }
        const live = chimeNodes.current;
        chimeNodes.current = [];
        for (const osc of live) {
            try { osc.stop(); } catch { /* ya terminó */ }
        }
    }, []);

    const stopAlarm = useCallback(() => {
        alarmOnRef.current = false;
        alarmArmed.current = false;
        alarmGen.current += 1;
        setAlarmOn(false);
        haltNotes();
    }, [haltNotes]);

    const armAlarm = useCallback((restart = false) => {
        if (!alarmOnRef.current) return;
        if (alarmArmed.current && !restart) return;
        if (restart) {
            alarmGen.current += 1;
            alarmArmed.current = false;
            haltNotes();
        }
        const ctx = audioCtxRef.current;
        if (!ctx || ctx.state !== 'running') return;
        alarmArmed.current = true;
        const gen = ++alarmGen.current;
        let step = 0;
        const notes = [784, 988, 1175];
        const chime = () => {
            if (!alarmOnRef.current || gen !== alarmGen.current) return;
            if (ctx.state !== 'running') {
                alarmArmed.current = false;
                return;
            }
            const lift = Math.min(step, 8) * 28;
            step += 1;
            try {
                const t0 = ctx.currentTime + 0.02;
                notes.forEach((freq, i) => {
                    if (gen !== alarmGen.current) return;
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq + lift;
                    const start = t0 + i * 0.14;
                    gain.gain.setValueAtTime(0.0001, start);
                    gain.gain.exponentialRampToValueAtTime(0.42, start + 0.015);
                    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(start);
                    osc.stop(start + 0.26);
                    chimeNodes.current.push(osc);
                    osc.onended = () => {
                        chimeNodes.current = chimeNodes.current.filter((n) => n !== osc);
                    };
                });
            } catch {
                if (gen === alarmGen.current) alarmArmed.current = false;
                return;
            }
            if (!alarmOnRef.current || gen !== alarmGen.current) return;
            alarmTimer.current = window.setTimeout(chime, 1100);
        };
        chime();
    }, [haltNotes]);

    const ensureAudio = useCallback(async (restart = false) => {
        try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            if (!Ctx) return false;
            if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
            const ctx = audioCtxRef.current;
            if (ctx.state === 'suspended') await ctx.resume();
            if (ctx.state === 'running' && !keepAliveRef.current) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                gain.gain.value = 0.00001;
                osc.frequency.value = 1;
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                keepAliveRef.current = osc;
            }
            const ok = ctx.state === 'running';
            if (ok && alarmOnRef.current) armAlarm(restart);
            return ok;
        } catch {
            return false;
        }
    }, [armAlarm]);

    const playNotificationSound = useCallback(() => {
        alarmOnRef.current = true;
        setAlarmOn(true);
        void ensureAudio(true);
    }, [ensureAudio]);

    useEffect(() => {
        void ensureAudio();
        const unlock = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest('[data-silence-alarm]')) return;
            void ensureAudio();
        };
        window.addEventListener('pointerdown', unlock, true);
        window.addEventListener('keydown', unlock, true);
        const onVisible = () => {
            if (document.visibilityState === 'visible') void ensureAudio();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            window.removeEventListener('pointerdown', unlock, true);
            window.removeEventListener('keydown', unlock, true);
            document.removeEventListener('visibilitychange', onVisible);
            stopAlarm();
        };
    }, [ensureAudio, stopAlarm]);

    const hasLoaded = useRef(false);
    const inFlight = useRef(false);
    const [offline, setOffline] = useState(false);

    const lastVersion = useRef<string | null>(null);

    const printQueue = useRef<Promise<void>>(Promise.resolve());
    const printedIds = useRef<Set<string>>(new Set());

    const openPrintHtml = useCallback(async (path: string, opts?: { silent?: boolean }) => {
        const res = await authFetch(`${API_URL}${path}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const hasOnloadPrint = /onload\s*=\s*["']?\s*window\.print/i.test(html);
        const paperMeta = html.match(/x-comanda-paper"\s+content="([^"]+)"/i)?.[1] || 'unknown';
        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'comanda-print',hypothesisId:'H1',location:'kitchen/page.tsx:openPrintHtml',message:'print job queued once',data:{path,silent:!!opts?.silent,hasOnloadPrint,paperMeta,htmlLen:html.length},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        // iframe: evita bloqueo de popups al auto-imprimir pedidos web
        const iframe = document.createElement('iframe');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none';
        document.body.appendChild(iframe);
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) {
            iframe.remove();
            if (!opts?.silent) {
                const w = window.open('', '_blank', 'width=380,height=640');
                if (!w) return;
                w.document.write(html);
                w.document.close();
            }
            return;
        }
        doc.open();
        doc.write(html);
        doc.close();
        const runPrint = () => {
            try {
                iframe.contentWindow?.focus();
                // Una sola impresión: el HTML ya no trae onload=window.print()
                iframe.contentWindow?.print();
            } catch {
                /* ignore */
            }
            setTimeout(() => iframe.remove(), 60_000);
        };
        // Esperar a que el HTML de la comanda cargue tipografías/imágenes
        if (iframe.contentWindow?.document.readyState === 'complete') {
            setTimeout(runPrint, 400);
        } else {
            iframe.onload = () => setTimeout(runPrint, 400);
        }
    }, []);

    const printTicket = useCallback((id: string) => {
        void openPrintHtml(`/kitchen/${id}/print`);
    }, [openPrintHtml]);

    const printAccount = useCallback((ticket: any) => {
        void openPrintHtml(`/kitchen/${ticket.id}/print-account`);
    }, [openPrintHtml]);

    const enqueueAutoPrint = useCallback((ids: string[]) => {
        for (const id of ids) {
            if (printedIds.current.has(id)) continue;
            printedIds.current.add(id);
            printQueue.current = printQueue.current
                .then(async () => {
                    await openPrintHtml(`/kitchen/${id}/print`, { silent: true });
                    // Pausa para que el cutter de la térmica termine el trabajo anterior
                    await new Promise((r) => setTimeout(r, 2200));
                })
                .catch(() => { /* no bloquear la cola */ });
        }
    }, [openPrintHtml]);

    const loadTickets = useCallback(async (): Promise<boolean> => {
        if (inFlight.current) return false;
        inFlight.current = true;
        try {
            const res = await authFetch(`${API_URL}/kitchen/active`, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const ids = new Set<string>(data.map((t: any) => t.id));
            if (hasLoaded.current) {
                const fresh = data.filter((t: any) => !prevTicketIds.current.has(t.id));
                const freshIds = fresh.map((t: any) => t.id as string);
                if (freshIds.length > 0) {
                    playNotificationSound();
                    enqueueAutoPrint(fresh.filter((t: any) => t.status === 'WAITING').map((t: any) => t.id as string));
                }
            }
            prevTicketIds.current = ids;
            hasLoaded.current = true;
            setTickets(data);
            setError('');
            setOffline(false);
            return true;
        } catch (e: unknown) {
            if (hasLoaded.current) setOffline(true);
            else setError(e instanceof Error ? e.message : 'Error de conexión');
            return false;
        } finally {
            inFlight.current = false;
            setLoading(false);
        }
    }, [playNotificationSound, enqueueAutoPrint]);

    const loadIfChanged = useCallback(async () => {
        try {
            const res = await authFetch(`${API_URL}/kitchen/version`, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { v } = await res.json();
            if (v === lastVersion.current) {
                setOffline(false);
                return;
            }
            if (await loadTickets()) lastVersion.current = v;
        } catch {
            lastVersion.current = null;
            await loadTickets();
        }
    }, [loadTickets]);

    const [, setClock] = useState(0);
    useEffect(() => {
        const tick = setInterval(() => setClock(Date.now()), 30_000);
        return () => clearInterval(tick);
    }, []);

    // Desbloquear audio con el primer toque (política del navegador)
    useEffect(() => {
        const unlock = () => { void ensureAudio(); };
        window.addEventListener('pointerdown', unlock);
        window.addEventListener('keydown', unlock);
        return () => {
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('keydown', unlock);
        };
    }, [ensureAudio]);

    useEffect(() => {
        loadIfChanged();
        // Poll cada 3s (version DB) + full cada 60s por si acaso
        const check = setInterval(() => {
            if (document.hidden) return;
            if (alarmOnRef.current) void ensureAudio();
            loadIfChanged();
        }, 3000);
        const full = setInterval(() => { if (!document.hidden) loadTickets(); }, 60_000);
        const onVisible = () => { if (!document.hidden) loadIfChanged(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearInterval(check);
            clearInterval(full);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [loadIfChanged, loadTickets, ensureAudio]);

    const updateStatus = async (id: string, status: string) => {
        try {
            const res = await authFetch(`${API_URL}/kitchen/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
            if (!res.ok) throw new Error('Failed'); await loadTickets();
        } catch { alert('Error al actualizar'); }
    };

    const cancelTicket = (ticket: any) => {
        const sale = ticket.sale || {};
        setApproval({
            kind: 'cancel',
            ticketId: ticket.id,
            summary: `${ticket.label || sale.channel || 'Pedido'} ${sale.code || ''}: se anula y queda registrado.`,
        });
    };

    const confirmApproval = async (body: Approval, quantity: number) => {
        if (!approval) return;
        const res = approval.kind === 'cancel'
            ? await authFetch(`${API_URL}/kitchen/${approval.ticketId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'CANCELLED', ...body }),
            })
            : await authFetch(`${API_URL}/sales/${approval.saleId}/void-items`, {
                method: 'POST',
                body: JSON.stringify({ items: [{ saleItemId: approval.item.id, quantity }], ...body }),
            });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
            throw new Error(msg || 'No se pudo completar');
        }
        setApproval(null);
        setFixTicket(null);
        await loadTickets();
        if (activeTab === 'HISTORY') await loadHistory(historyQ);
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
        } catch {
            setHistory([]);
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
                <p className="text-slate-900 mb-6">{error}</p>
                <button onClick={loadTickets} className="w-full bg-red-500 text-white px-6 py-4 rounded-2xl font-black uppercase italic tracking-tighter hover:bg-red-600 transition-all shadow-lg shadow-red-500/20">Reintentar</button>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
            {offline && (
                <div className="shrink-0 bg-red-500 text-white text-xs font-black uppercase tracking-wide text-center py-1.5">
                    Sin conexión · reintentando
                </div>
            )}
            {alarmOn && (
                <button
                    type="button"
                    data-silence-alarm
                    onClick={stopAlarm}
                    className="shrink-0 bg-red-600 text-white text-sm font-black uppercase tracking-wide text-center py-3 animate-pulse hover:bg-red-700"
                >
                    Tocar para silenciar el tilín
                </button>
            )}
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
                            { key: 'HISTORY' as TabKey, short: 'Hist', full: 'Historial', Icon: History, count: null, on: 'bg-slate-900 text-white', off: 'bg-white text-slate-800' },
                        ]).map((t) => {
                            const active = activeTab === t.key;
                            const Icon = t.Icon;
                            return (
                                <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => {
                                        setActiveTab(t.key);
                                    }}
                                    className={`min-w-0 flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-1.5 py-2 px-1 rounded-xl font-black uppercase italic tracking-tight transition-all ${active ? t.on : 'text-slate-800'}`}
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
                    <button onClick={() => activeTab === 'HISTORY' ? loadHistory() : loadTickets()} className="p-2.5 rounded-xl bg-slate-100 text-slate-800 hover:text-slate-700 shrink-0" title="Actualizar">
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
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-800" size={16} />
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
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-800">
                            Pedidos entregados de las últimas 48 horas · reimprimir comanda o cuenta
                        </p>
                        {historyLoading ? (
                            <p className="text-center py-16 font-black uppercase italic text-slate-800">Cargando historial...</p>
                        ) : history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center min-h-[30vh] bg-white rounded-3xl border-2 border-dashed border-slate-200 p-8 text-center">
                                <History size={52} className="text-slate-200 mb-4" />
                                <p className="text-lg font-black text-slate-800 uppercase italic">Sin pedidos entregados</p>
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
                                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-800">{ticket.label || sale.channel}</span>
                                                    {sale.status === 'CANCELLED' && <span className="px-2 py-0.5 rounded-full bg-red-50 text-[9px] font-black uppercase text-red-500">Cancelado</span>}                                                </div>
                                                <p className="text-[11px] font-bold text-slate-800 mt-1">{when} · {items.length} ítem{items.length === 1 ? '' : 's'}{sale.total != null ? ` · $${Number(sale.total).toLocaleString('es-CL')}` : ''}</p>
                                                <p className="text-[11px] font-bold text-slate-800 truncate mt-1">
                                                    {items.map((item: any) => saleLineTitle(item.sellingProduct?.name || 'Producto', item.quantity, item.modifiers)).join(' · ')}
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
                                                    onClick={() => printAccount(ticket)}
                                                    className="h-12 px-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-[10px] tracking-widest flex items-center gap-2"
                                                >
                                                    <Receipt size={15} /> Cuenta
                                                </button>
                                                {sale.status !== 'CANCELLED' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setFixTicket(ticket)}
                                                        className="h-12 px-4 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-black uppercase text-[10px] tracking-widest flex items-center gap-2"
                                                    >
                                                        <ShieldAlert size={15} /> Corregir
                                                    </button>
                                                )}
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
                        <p className="text-lg font-black text-slate-800 uppercase italic">Sin pedidos en {cfg?.label.toLowerCase()}</p>
                        <p className="text-[10px] text-slate-800 font-bold uppercase tracking-widest mt-1">Nuevos pedidos aparecerán aquí</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-5 auto-rows-min">
                        {current.map(ticket => (
                            <TicketCard key={ticket.id} ticket={ticket} cfg={cfg!} expandedRecipes={expandedRecipes} toggleRecipe={toggleRecipe}
                                onAction={() => updateStatus(ticket.id, cfg!.nextStatus)} onCancel={() => cancelTicket(ticket)} onPrint={() => printTicket(ticket.id)} />
                        ))}
                    </div>
                )}
            </div>

            {fixTicket && !approval && (
                <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4" onClick={() => setFixTicket(null)}>
                    <div className="w-full max-w-md bg-white rounded-[2rem] p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">{fixTicket.label || fixTicket.sale?.channel}</p>
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Corregir {fixTicket.sale?.code}</h2>
                            </div>
                            <button type="button" onClick={() => setFixTicket(null)} className="p-2 rounded-full bg-slate-50" title="Cerrar"><X size={18} /></button>
                        </div>
                        {(fixTicket.sale?.items || []).map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-black uppercase italic text-slate-900 truncate">{saleLineTitle(item.sellingProduct?.name || 'Producto', item.quantity, item.modifiers)}</p>
                                    <p className="text-xs font-bold text-slate-900">${(Number(item.priceUnit || 0) * item.quantity).toLocaleString('es-CL')}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setApproval({
                                        kind: 'item',
                                        saleId: fixTicket.sale.id,
                                        item,
                                        summary: `Quitar ${item.sellingProduct?.name || 'producto'} de ${fixTicket.sale?.code}. Si ya estaba pagado, queda como devolución en caja.`,
                                    })}
                                    className="px-3 py-2 rounded-xl bg-red-50 text-red-600 font-black uppercase text-[10px] shrink-0"
                                >
                                    Quitar
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => cancelTicket(fixTicket)}
                            className="w-full py-3 rounded-2xl bg-red-500 text-white font-black uppercase italic text-xs"
                        >
                            Anular pedido completo
                        </button>
                    </div>
                </div>
            )}

            {approval && (
                <ApprovalModal
                    title={approval.kind === 'cancel' ? 'Anular pedido' : 'Quitar producto'}
                    summary={approval.summary}
                    confirmLabel={approval.kind === 'cancel' ? 'Anular' : 'Quitar'}
                    maxQuantity={approval.kind === 'item' ? approval.item.quantity : undefined}
                    onConfirm={confirmApproval}
                    onClose={() => setApproval(null)}
                />
            )}
        </div>
    );
}
