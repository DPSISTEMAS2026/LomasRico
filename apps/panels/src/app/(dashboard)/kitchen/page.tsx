'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    ChefHat, Clock, AlertCircle, Package, Timer, ChevronRight, ChevronDown,
    MessageSquare, Truck, CheckCircle2, UtensilsCrossed, XCircle, Flame,
    ArrowRight, RefreshCw, Zap
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { API_URL } from '../../../services/api';
import { authFetch } from '../../../services/authFetch';

type TabKey = 'WAITING' | 'PREPARING' | 'READY';

const TAB_CONFIG: Record<TabKey, { label: string; icon: any; color: string; bg: string; border: string; glow: string; action: string; nextStatus: string }> = {
    WAITING: {
        label: 'Entrantes',
        icon: Zap,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        glow: 'shadow-amber-500/20',
        action: 'Preparar',
        nextStatus: 'PREPARING',
    },
    PREPARING: {
        label: 'Preparando',
        icon: Flame,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        glow: 'shadow-blue-500/20',
        action: 'Listo ✓',
        nextStatus: 'READY',
    },
    READY: {
        label: 'Entrega',
        icon: Truck,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        glow: 'shadow-emerald-500/20',
        action: 'Entregado ✓',
        nextStatus: 'DELIVERED',
    },
};

export default function KitchenPage() {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<TabKey>('WAITING');
    const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(new Set());

    const loadTickets = useCallback(async () => {
        try {
            const res = await authFetch(`${API_URL}/kitchen/active`, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setTickets(data);
            setError('');
        } catch (e: any) {
            console.error('Error loading tickets:', e);
            setError(e.message || 'Error de conexión');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTickets();
        const interval = setInterval(loadTickets, 8000);
        return () => clearInterval(interval);
    }, [loadTickets]);

    const updateTicketStatus = async (ticketId: string, newStatus: string) => {
        try {
            const res = await authFetch(`${API_URL}/kitchen/${ticketId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error('Failed to update status');
            await loadTickets();
        } catch (e) {
            alert('Error al actualizar el estado');
        }
    };

    const cancelTicket = async (ticketId: string) => {
        if (!confirm('¿Cancelar este pedido? Esta acción no se puede deshacer.')) return;
        await updateTicketStatus(ticketId, 'CANCELLED');
    };

    const toggleRecipe = (key: string) => {
        setExpandedRecipes(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    // Group tickets
    const waitingTickets = tickets.filter(t => t.status === 'WAITING');
    const preparingTickets = tickets.filter(t => t.status === 'PREPARING');
    const readyTickets = tickets.filter(t => t.status === 'READY');

    const ticketsByTab: Record<TabKey, any[]> = {
        WAITING: waitingTickets,
        PREPARING: preparingTickets,
        READY: readyTickets,
    };

    const currentTickets = ticketsByTab[activeTab];
    const tabConfig = TAB_CONFIG[activeTab];

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-full bg-slate-950">
                <ChefHat size={64} className="text-orange-500 mb-4 animate-bounce" />
                <p className="text-xl font-black uppercase tracking-tighter italic animate-pulse text-white">
                    Sincronizando Cocina...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-full bg-slate-950 text-center max-w-md mx-auto px-6">
                <div className="bg-red-950/50 p-8 rounded-3xl border-2 border-red-500/30">
                    <AlertCircle size={64} className="text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-black text-red-400 mb-2 uppercase">ERROR DE CONEXIÓN</h1>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <button
                        onClick={loadTickets}
                        className="w-full bg-red-500 text-white px-6 py-4 rounded-2xl font-black uppercase italic tracking-tighter hover:bg-red-600 transition-all shadow-lg"
                    >
                        Reintentar Conexión
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
            {/* ══════ TOP BAR ══════ */}
            <div className="shrink-0 border-b border-white/5 bg-slate-900/80 backdrop-blur-xl">
                <div className="flex items-center justify-between px-4 md:px-6 py-3">
                    {/* Title */}
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <h1 className="text-sm md:text-base font-black text-white uppercase tracking-tight italic">
                            KDS <span className="text-orange-500">COCINA</span>
                        </h1>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest hidden sm:block">
                            Tiempo Real
                        </span>
                    </div>

                    {/* Stats mini */}
                    <div className="flex items-center gap-2 md:gap-3">
                        <MiniStat label="Espera" count={waitingTickets.length} color="amber" />
                        <MiniStat label="Prep" count={preparingTickets.length} color="blue" />
                        <MiniStat label="Listo" count={readyTickets.length} color="emerald" />
                        <button
                            onClick={loadTickets}
                            className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-colors ml-1"
                            title="Actualizar"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>
                </div>

                {/* ══════ TABS ══════ */}
                <div className="flex px-3 md:px-5 gap-1">
                    {(Object.keys(TAB_CONFIG) as TabKey[]).map(key => {
                        const cfg = TAB_CONFIG[key];
                        const count = ticketsByTab[key].length;
                        const isActive = activeTab === key;
                        const TabIcon = cfg.icon;

                        return (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 md:py-3.5 rounded-t-2xl font-black uppercase italic tracking-tight text-xs md:text-sm transition-all duration-200 ${
                                    isActive
                                        ? `${cfg.bg} ${cfg.color} border-t-2 ${cfg.border}`
                                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                }`}
                            >
                                <TabIcon size={16} className={isActive ? 'animate-pulse' : ''} />
                                <span>{cfg.label}</span>
                                <span className={`min-w-[24px] h-6 flex items-center justify-center rounded-full text-[11px] font-black ${
                                    isActive
                                        ? 'bg-white/20 text-white'
                                        : 'bg-white/5 text-slate-500'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ══════ ORDERS GRID ══════ */}
            <div className="flex-1 overflow-y-auto p-3 md:p-5">
                {currentTickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <Package size={48} className="text-slate-700 mb-3" />
                        <p className="text-base font-black text-slate-600 uppercase italic">
                            Sin pedidos en {tabConfig.label.toLowerCase()}
                        </p>
                        <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest mt-1">
                            Los nuevos pedidos aparecerán aquí automáticamente
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 md:gap-4 auto-rows-min">
                        {currentTickets.map(ticket => (
                            <KDSCard
                                key={ticket.id}
                                ticket={ticket}
                                tabConfig={tabConfig}
                                expandedRecipes={expandedRecipes}
                                toggleRecipe={toggleRecipe}
                                onAction={() => updateTicketStatus(ticket.id, tabConfig.nextStatus)}
                                onCancel={() => cancelTicket(ticket.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════
   Mini stat badge in top bar
   ══════════════════════════════════════════════════════════════════ */
function MiniStat({ label, count, color }: { label: string; count: number; color: string }) {
    const colors: any = {
        amber: count > 0 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-white/5 text-slate-600 border-white/5',
        blue: count > 0 ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-white/5 text-slate-600 border-white/5',
        emerald: count > 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-slate-600 border-white/5',
    };

    return (
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider ${colors[color]}`}>
            <span className="hidden sm:inline">{label}</span>
            <span className="text-sm leading-none">{count}</span>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════
   KDS Order Card — compact, collapsible recipes
   ══════════════════════════════════════════════════════════════════ */
function KDSCard({ ticket, tabConfig, expandedRecipes, toggleRecipe, onAction, onCancel }: any) {
    const sale = ticket.sale;
    const createdAt = new Date(ticket.createdAt);
    const now = new Date();
    const minutesAgo = Math.floor((now.getTime() - createdAt.getTime()) / 60000);

    const isUber = sale.channel === 'UBER_EATS';
    const isPedidosYa = sale.channel === 'PEDIDOS_YA';
    const isExternal = isUber || isPedidosYa;

    // Urgency coloring
    const urgencyColor = ticket.status === 'READY' ? 'border-emerald-500'
        : minutesAgo > 15 ? 'border-red-500'
        : minutesAgo > 5 ? 'border-amber-500'
        : 'border-slate-700';

    const urgencyBg = minutesAgo > 15 && ticket.status !== 'READY' ? 'bg-red-950/30' : 'bg-slate-900/80';

    return (
        <div className={`${urgencyBg} rounded-2xl border-2 ${urgencyColor} overflow-hidden flex flex-col transition-all duration-300 hover:shadow-lg ${tabConfig.glow}`}>
            {/* ── Card Header ── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2.5 min-w-0">
                    <h3 className="text-lg md:text-xl font-black text-white italic tracking-tighter uppercase">
                        {sale.code || `#${ticket.id.slice(0, 4)}`}
                    </h3>
                    {minutesAgo > 15 && ticket.status !== 'READY' && (
                        <AlertCircle size={16} className="text-red-500 animate-pulse shrink-0" />
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Platform badge */}
                    {isExternal && (
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                            isUber ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                            {isUber ? 'UBER' : 'PEDYA'}
                        </span>
                    )}
                    {/* Time */}
                    <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${
                        minutesAgo > 15 ? 'text-red-400' : minutesAgo > 5 ? 'text-amber-400' : 'text-slate-500'
                    }`}>
                        <Timer size={11} />
                        {minutesAgo}m
                    </span>
                </div>
            </div>

            {/* ── External Notes (if any) ── */}
            {sale.note && isExternal && (
                <div className={`px-3 py-2 border-b border-white/5 ${
                    isUber ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}>
                    {sale.note.split('\n').map((line: string, i: number) => {
                        if (i === 0) {
                            const customerMatch = line.match(/👤\s*(.+)/);
                            return customerMatch ? (
                                <p key={i} className="text-[11px] font-black text-white/80 uppercase tracking-tight">
                                    👤 {customerMatch[1]}
                                </p>
                            ) : null;
                        }
                        if (line.startsWith('📍') || line.startsWith('🛵') || line.startsWith('🏪')) {
                            return (
                                <p key={i} className="text-[9px] font-bold text-white/40 mt-0.5">
                                    {line}
                                </p>
                            );
                        }
                        return null;
                    })}
                </div>
            )}

            {/* ── POS note ── */}
            {sale.note && !isExternal && (
                <div className="px-3 py-2 bg-amber-500/10 border-b border-white/5">
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                        <MessageSquare size={10} /> NOTA
                    </p>
                    <p className="text-[11px] font-bold text-white/70 mt-0.5">{sale.note}</p>
                </div>
            )}

            {/* ── Items List ── */}
            <div className="flex-1 px-3 py-2.5 space-y-1.5 overflow-y-auto max-h-[40vh]">
                {sale.items?.map((item: any, idx: number) => {
                    const recipeKey = `${ticket.id}-${idx}`;
                    const hasRecipe = item.recipeSnapshot?.resolvedBoM?.length > 0;
                    const isExpanded = expandedRecipes.has(recipeKey);

                    return (
                        <div key={idx} className="border-b border-white/5 last:border-0 pb-1.5 last:pb-0">
                            {/* Item header */}
                            <div
                                className={`flex items-center justify-between py-1 ${hasRecipe ? 'cursor-pointer' : ''}`}
                                onClick={() => hasRecipe && toggleRecipe(recipeKey)}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    {hasRecipe && (
                                        <ChevronDown size={14} className={`text-orange-500 shrink-0 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                                    )}
                                    <p className="font-black text-white uppercase text-xs italic tracking-tight leading-tight truncate">
                                        {item.sellingProduct?.name || item.productVariant?.name || 'Producto'}
                                    </p>
                                </div>
                                <span className="text-orange-500 font-black text-sm italic shrink-0 ml-2">
                                    x{item.quantity}
                                </span>
                            </div>

                            {/* Modifiers (always visible) */}
                            <ModifierBadges item={item} />

                            {/* Collapsible Recipe BoM */}
                            {hasRecipe && isExpanded && (
                                <div className="bg-slate-950 rounded-xl p-3 mt-1.5 mb-1 border-l-2 border-orange-500 animate-in slide-in-from-top-2 duration-200">
                                    <p className="text-[9px] font-black uppercase text-orange-400 tracking-[0.15em] mb-1.5 flex items-center gap-1.5">
                                        <ChefHat size={10} />
                                        RECETA {item.quantity > 1 ? `(TOTAL ${item.quantity} UN)` : ''}
                                    </p>
                                    <div className="space-y-1">
                                        {item.recipeSnapshot.resolvedBoM.map((bom: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-[11px] font-bold text-white/80 py-0.5">
                                                <span className="flex items-center gap-1.5 uppercase tracking-tight">
                                                    <ChevronRight size={9} className="text-orange-500" />
                                                    {bom.name}
                                                </span>
                                                <span className="font-black text-orange-400 bg-black/40 px-1.5 py-0.5 rounded text-[10px]">
                                                    {bom.quantity >= 1
                                                        ? `${Number(bom.quantity * (item.quantity || 1)).toLocaleString()} ${bom.unit || 'g'}`
                                                        : `${Math.round(bom.quantity * 1000 * (item.quantity || 1))} gr`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Action Buttons ── */}
            <div className="flex gap-1.5 p-2.5 border-t border-white/5 mt-auto">
                <button
                    onClick={onCancel}
                    className="h-11 px-3 rounded-xl font-black uppercase italic tracking-tighter text-white/70 transition-all active:scale-95 flex items-center justify-center bg-red-500/20 hover:bg-red-500/40 text-[10px]"
                    title="Cancelar pedido"
                >
                    <XCircle size={16} />
                </button>
                <button
                    onClick={onAction}
                    className={`flex-1 h-11 rounded-xl font-black uppercase italic tracking-tighter text-white transition-all active:scale-95 flex items-center justify-center gap-2 text-xs ${
                        activeTab === 'WAITING' ? 'bg-amber-500 hover:bg-amber-600' :
                        activeTab === 'PREPARING' ? 'bg-blue-500 hover:bg-blue-600' :
                        'bg-emerald-500 hover:bg-emerald-600'
                    }`}
                >
                    {activeTab === 'READY' ? <CheckCircle2 size={16} /> : <ArrowRight size={16} />}
                    {tabConfig.action}
                </button>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════
   Modifier badges — proteins, extras, removed
   ══════════════════════════════════════════════════════════════════ */
function ModifierBadges({ item }: { item: any }) {
    const hasProteinNames = item.modifiers?.selectedProteinNames?.length > 0;
    const hasProteins = item.modifiers?.selectedProteins?.length > 0;
    const hasRemoved = item.modifiers?.removedIngredients?.length > 0;
    const hasExtras = item.modifiers?.extras?.length > 0;

    if (!hasProteinNames && !hasProteins && !hasRemoved && !hasExtras) return null;

    return (
        <div className="flex flex-wrap gap-1 mt-1 ml-5">
            {item.modifiers?.selectedProteins?.map((name: string, i: number) => (
                <span key={`p-${i}`} className="bg-white/10 text-white/80 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight">
                    + {name}
                </span>
            ))}
            {item.modifiers?.selectedProteinNames?.map((name: string, i: number, arr: string[]) => {
                const grams = calculateProteinGrams(item, name, arr);
                return (
                    <span key={`pn-${i}`} className="bg-white/10 text-white/80 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight">
                        + {name} <span className="text-orange-400">{grams}G</span>
                    </span>
                );
            })}
            {item.modifiers?.removedIngredients?.map((name: string, i: number) => (
                <span key={`r-${i}`} className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight line-through">
                    Sin {name}
                </span>
            ))}
            {item.modifiers?.extras?.map((e: any, i: number) => (
                <span key={`e-${i}`} className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight">
                    + {e.name}
                </span>
            ))}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════
   Protein grams calculation (preserved from original)
   ══════════════════════════════════════════════════════════════════ */
function calculateProteinGrams(item: any, name: string, arr: string[]): number {
    const pName = (item.sellingProduct?.name || '').toLowerCase();
    const vName = (item.productVariant?.name || '').toLowerCase();
    const fullName = (pName + ' ' + vName).toLowerCase();

    let size = '500';
    if (fullName.match(/250\s*g/i)) size = '250';
    else if (fullName.match(/350\s*g/i)) size = '350';
    else if (fullName.match(/500\s*g/i)) size = '500';
    else if (fullName.match(/750\s*g/i)) size = '750';
    else if (fullName.match(/1000\s*g/i) || fullName.match(/1\s*kg/i)) size = '1000';
    else if (fullName.includes('degustación') || fullName.includes('degustacion')) size = '750';

    const GRAMS_DATA: any = {
        '1000': { total: 360, special2: 120, special3: 80 },
        '750': { total: 280, special2: 80, special3: 60 },
        '500': { total: 180, special2: 60, special3: 40 },
        '350': { total: 140, special2: 40, special3: 30 },
        '250': { total: 100, special2: 30, special3: 20 },
    };

    const config = GRAMS_DATA[size] || GRAMS_DATA['500'];
    const numProteins = arr.length;
    let grams = Math.round(config.total / numProteins);

    if (numProteins > 1) {
        const hasPulpo = arr.some(p => p.toLowerCase() === 'pulpo');
        const hasCamaron = arr.some(p => p.toLowerCase().includes('camarón') || p.toLowerCase().includes('camaron'));

        let specialProtein = '';
        if (hasPulpo) specialProtein = 'pulpo';
        else if (hasCamaron) specialProtein = 'camarón';

        if (specialProtein) {
            const specialWeight = numProteins === 2 ? config.special2 : config.special3;
            const normalWeight = Math.round((config.total - specialWeight) / (numProteins - 1));
            grams = name.toLowerCase().includes(specialProtein) ? specialWeight : normalWeight;
        }
    } else {
        grams = config.total;
    }

    return grams;
}
