'use client';

import {
    ChefHat, ChevronRight, ChevronDown, MessageSquare, Timer,
    AlertCircle, XCircle, ArrowRight, CheckCircle2
} from 'lucide-react';
import type { KitchenTicket, SaleItem } from '@lomasrico/shared-types';

// ─── Tab config type ────────────────────────────────
interface TabConfig {
    label: string;
    action: string;
    nextStatus: string;
    btnColor: string;
}

// ─── Gram calculation for protein split ─────────────
interface GramTable { t: number; s2: number; s3: number }

const GRAM_MAP: Record<string, GramTable> = {
    '1000': { t: 360, s2: 120, s3: 80 },
    '750':  { t: 280, s2: 80,  s3: 60 },
    '500':  { t: 180, s2: 60,  s3: 40 },
    '350':  { t: 140, s2: 40,  s3: 30 },
    '250':  { t: 100, s2: 30,  s3: 20 },
};

function calcGrams(item: SaleItem, name: string, arr: string[]): number {
    const full = ((item.sellingProduct?.name || '') + ' ' + (item.productVariant?.name || '')).toLowerCase();
    let s = '500';
    if (full.match(/250\s*g/i)) s = '250'; else if (full.match(/350\s*g/i)) s = '350'; else if (full.match(/500\s*g/i)) s = '500';
    else if (full.match(/750\s*g/i)) s = '750'; else if (full.match(/1000\s*g|1\s*kg/i)) s = '1000';
    else if (full.includes('degustación') || full.includes('degustacion')) s = '750';
    const c = GRAM_MAP[s] || GRAM_MAP['500'];
    const n = arr.length;
    if (n <= 1) return c.t;
    let g = Math.round(c.t / n);
    const hasPulpo = arr.some(p => p.toLowerCase() === 'pulpo');
    const hasCam = arr.some(p => p.toLowerCase().includes('camarón') || p.toLowerCase().includes('camaron'));
    const sp = hasPulpo ? 'pulpo' : hasCam ? 'camarón' : '';
    if (sp) { const sw = n === 2 ? c.s2 : c.s3; g = name.toLowerCase().includes(sp) ? sw : Math.round((c.t - sw) / (n - 1)); }
    return g;
}

// ─── Modifier Badges ────────────────────────────────
function ModBadges({ item }: { item: SaleItem }) {
    const hasPN = (item.modifiers?.selectedProteinNames?.length ?? 0) > 0;
    const hasP = (item.modifiers?.selectedProteins?.length ?? 0) > 0;
    const hasR = (item.modifiers?.removedIngredients?.length ?? 0) > 0;
    if (!hasPN && !hasP && !hasR) return null;

    return (
        <div className="flex flex-wrap gap-1 mt-1">
            {item.modifiers?.selectedProteins?.map((n: string, i: number) => (
                <span key={`p${i}`} className="bg-slate-900 text-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase">+ {n}</span>
            ))}
            {item.modifiers?.selectedProteinNames?.map((name: string, i: number, arr: string[]) => {
                const g = calcGrams(item, name, arr);
                return <span key={`pn${i}`} className="bg-slate-900 text-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase">+ {name} <span className="text-orange-400">{g}G</span></span>;
            })}
            {item.modifiers?.removedIngredients?.map((n: string, i: number) => (
                <span key={`r${i}`} className="bg-red-500 text-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase line-through opacity-70">Sin {n}</span>
            ))}
        </div>
    );
}

// ─── Ticket Card Props ──────────────────────────────
interface TicketCardProps {
    ticket: KitchenTicket;
    cfg: TabConfig;
    expandedRecipes: Set<string>;
    toggleRecipe: (key: string) => void;
    onAction: () => void;
    onCancel: () => void;
}

// ─── Ticket Card Component ──────────────────────────
export function TicketCard({ ticket, cfg, expandedRecipes, toggleRecipe, onAction, onCancel }: TicketCardProps) {
    const sale = ticket.sale;
    const minutesAgo = Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / 60000);
    const isUber = sale.channel === 'UBER_EATS';
    const isPedidosYa = sale.channel === 'PEDIDOS_YA';
    const isExternal = isUber || isPedidosYa;
    const platformLabel = isUber ? '🟢 UBER EATS' : isPedidosYa ? '🔴 PEDIDOS YA' : sale.channel;

    return (
        <div className={`bg-white rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 border group relative overflow-hidden flex flex-col ${
            isUber ? 'border-green-200 ring-2 ring-green-100' : isPedidosYa ? 'border-red-200 ring-2 ring-red-100' : 'border-slate-100'
        }`}>
            {/* Urgency bar */}
            <div className={`absolute top-0 left-0 w-1.5 h-full ${ticket.status === 'READY' ? 'bg-green-500' : minutesAgo > 15 ? 'bg-red-500' : minutesAgo > 5 ? 'bg-orange-500' : 'bg-green-500'}`} />

            {/* Header */}
            <div className="flex justify-between items-start mb-4 pl-2">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-slate-900 italic tracking-tighter uppercase truncate">{sale.code || `#${ticket.id.slice(0, 4)}`}</h3>
                        {minutesAgo > 15 && ticket.status !== 'READY' && <AlertCircle size={18} className="text-red-500 shrink-0" />}
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-1">
                        <Timer size={12} className="shrink-0" /> Hace {minutesAgo}m
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider ${
                        isUber ? 'bg-green-100 text-green-800' : isPedidosYa ? 'bg-red-100 text-red-800' : sale.channel === 'POS' ? 'bg-slate-100 text-slate-700' : 'bg-purple-100 text-purple-700'
                    }`}>{platformLabel}</span>
                </div>
            </div>

            {/* External notes */}
            {sale.note && (
                <div className={`mb-4 pl-2 rounded-2xl overflow-hidden shadow-sm border ${isUber ? 'border-green-300' : isPedidosYa ? 'border-red-300' : 'border-amber-400'}`}>
                    <div className={`px-3 py-1.5 flex items-center gap-2 ${isUber ? 'bg-green-600' : isPedidosYa ? 'bg-red-600' : 'bg-amber-500'}`}>
                        <MessageSquare size={12} className="text-white shrink-0" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-white">{isExternal ? 'PEDIDO EXTERNO' : 'NOTA'}</p>
                    </div>
                    <div className={`p-2.5 space-y-1 ${isUber ? 'bg-green-50' : isPedidosYa ? 'bg-red-50' : 'bg-amber-50'}`}>
                        {sale.note.split('\n').filter(Boolean).slice(0, 3).map((line: string, i: number) => {
                            if (i === 0) { const m = line.match(/👤\s*(.+)/); return m ? <p key={i} className="text-[10px] font-black text-slate-700 uppercase">👤 {m[1]}</p> : <p key={i} className="text-[10px] font-bold text-slate-600">{line}</p>; }
                            if (line.startsWith('•')) { const [n, ...mp] = line.replace('•', '').trim().split('→'); return <div key={i} className="text-[10px]"><span className="font-black text-slate-800 uppercase">{n}</span>{mp.length > 0 && <span className="text-slate-500 italic"> → {mp.join('→')}</span>}</div>; }
                            return <p key={i} className="text-[9px] text-slate-500 italic">{line}</p>;
                        })}
                    </div>
                </div>
            )}

            {/* Items */}
            <div className="space-y-2 mb-4 pl-2 flex-1 overflow-y-auto max-h-[35vh]">
                {sale.items?.map((item: SaleItem, idx: number) => {
                    const rKey = `${ticket.id}-${idx}`;
                    const hasRecipe = (item.recipeSnapshot?.resolvedBoM?.length ?? 0) > 0;
                    const isExp = expandedRecipes.has(rKey);

                    return (
                        <div key={idx} className="border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                            <div className={`flex items-center justify-between ${hasRecipe ? 'cursor-pointer hover:bg-slate-50 rounded-xl px-1 py-0.5 -mx-1 transition-colors' : ''}`}
                                onClick={() => hasRecipe && toggleRecipe(rKey)}>
                                <div className="flex items-center gap-1.5 min-w-0">
                                    {hasRecipe && <ChevronDown size={14} className={`text-orange-500 shrink-0 transition-transform duration-200 ${isExp ? '' : '-rotate-90'}`} />}
                                    <p className="font-black text-slate-900 uppercase text-xs italic tracking-tight truncate">
                                        {item.sellingProduct?.name || item.productVariant?.name || 'Producto'}
                                    </p>
                                </div>
                                <span className="text-orange-500 font-black text-sm italic ml-2 shrink-0">x{item.quantity}</span>
                            </div>

                            {/* Modifier badges */}
                            <ModBadges item={item} />

                            {/* Collapsible Recipe */}
                            {hasRecipe && isExp && (
                                <div className="bg-slate-900 rounded-2xl p-3 border-l-4 border-[#f2642e] mt-2 shadow-sm">
                                    <p className="text-[9px] font-black uppercase text-orange-400 tracking-[0.15em] mb-1.5 flex items-center gap-1.5">
                                        <ChefHat size={10} /> RECETA {item.quantity > 1 ? `(TOTAL ${item.quantity} UN)` : ''}
                                    </p>
                                    {item.recipeSnapshot!.resolvedBoM.map((bom, i: number) => (
                                        <div key={i} className="flex justify-between items-center text-[11px] font-black text-white py-1 border-b border-white/5 last:border-0">
                                            <span className="uppercase italic tracking-tight flex items-center gap-1.5"><ChevronRight size={9} className="text-orange-500" />{bom.name}</span>
                                            <span className="text-orange-400 bg-black/30 px-2 py-0.5 rounded-md border border-white/10">
                                                {bom.quantity >= 1 ? `${Number(bom.quantity * (item.quantity || 1)).toLocaleString()} ${bom.unit || 'g'}` : `${Math.round(bom.quantity * 1000 * (item.quantity || 1))} gr`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Extras */}
                            {(item.modifiers?.extras?.length ?? 0) > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                    {item.modifiers!.extras!.map((e, i: number) => (
                                        <span key={i} className="bg-green-600 text-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tight">+ {e.name}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-auto">
                <button onClick={onCancel} className="h-12 px-4 rounded-2xl font-black uppercase italic tracking-tighter text-white transition-all active:scale-95 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 shadow-lg text-[10px] shrink-0">
                    <XCircle size={16} /><span className="hidden sm:inline">Cancelar</span>
                </button>
                <button onClick={onAction} className={`flex-1 h-12 rounded-2xl font-black uppercase italic tracking-tighter text-white transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg text-xs ${cfg.btnColor}`}>
                    {ticket.status === 'READY' ? <CheckCircle2 size={16} /> : <ArrowRight size={16} />} {cfg.action}
                </button>
            </div>
        </div>
    );
}
