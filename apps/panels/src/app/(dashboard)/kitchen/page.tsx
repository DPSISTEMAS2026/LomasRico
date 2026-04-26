'use client';

import { useState, useEffect } from 'react';
import { ChefHat, Clock, AlertCircle, Package, Timer, ChevronRight, MessageSquare, Truck, CheckCircle2, UtensilsCrossed, XCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

import { API_URL } from '../../../services/api';
import { authFetch } from '../../../services/authFetch';

export default function KitchenPage() {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadTickets();
        const interval = setInterval(loadTickets, 10000);
        return () => clearInterval(interval);
    }, []);

    const loadTickets = async () => {
        try {
            const res = await authFetch(`${API_URL}/kitchen/active`, {
                cache: 'no-store'
            });

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
    };

    const updateTicketStatus = async (ticketId: string, newStatus: string) => {
        try {
            const res = await authFetch(`${API_URL}/kitchen/${ticketId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus })
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

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
                <ChefHat size={64} className="text-orange-500 mb-4 animate-bounce" />
                <p className="text-xl font-black uppercase tracking-tighter italic animate-pulse">
                    Sincronizando Cocina...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto">
                <div className="bg-red-50 p-8 rounded-3xl border-2 border-red-100">
                    <AlertCircle size={64} className="text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-black text-red-900 mb-2 uppercase">ERROR DE CONEXIÓN</h1>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <button
                        onClick={loadTickets}
                        className="w-full bg-red-500 text-white px-6 py-4 rounded-2xl font-black uppercase italic tracking-tighter hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                    >
                        Reintentar Conexión
                    </button>
                </div>
            </div>
        );
    }

    const waitingTickets = tickets.filter(t => t.status === 'WAITING');
    const preparingTickets = tickets.filter(t => t.status === 'PREPARING');
    const readyTickets = tickets.filter(t => t.status === 'READY');

    return (
        <div className="flex-1 flex flex-col gap-6 md:gap-8 animate-in fade-in duration-700 pb-10">
            {/* Header Dashboard Style */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">
                        CENTRAL DE <span className="text-orange-500">PRODUCCIÓN</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest mt-2 flex items-center gap-2 px-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Monitoreo en Tiempo Real
                    </p>
                </div>

                <div className="flex gap-3 w-full sm:w-auto overflow-x-auto no-scrollbar pb-2 sm:pb-0">
                    <StatCard label="En Espera" value={waitingTickets.length} color="orange" />
                    <StatCard label="En Proceso" value={preparingTickets.length} color="blue" />
                    <StatCard label="Listos" value={readyTickets.length} color="green" />
                </div>
            </div>

            {tickets.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[40vh] bg-white rounded-3xl md:rounded-[40px] border-2 border-dashed border-slate-200 p-8 text-center">
                    <Package size={60} className="text-slate-200 mb-4 md:w-20 md:h-20" />
                    <p className="text-lg md:text-xl font-black text-slate-400 uppercase italic">Sin órdenes pendientes</p>
                    <p className="text-[10px] md:text-xs text-slate-300 font-bold uppercase tracking-widest mt-1">Nuevos pedidos aparecerán aquí</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    {/* Columna 1: Nuevas Órdenes */}
                    <div className="flex flex-col gap-4">
                        <h2 className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
                            <Clock size={16} className="text-orange-500" />
                            Entrantes ({waitingTickets.length})
                        </h2>
                        <div className="flex flex-col gap-4">
                            {waitingTickets.map(ticket => (
                                <TicketCard
                                    key={ticket.id}
                                    ticket={ticket}
                                    onAction={() => updateTicketStatus(ticket.id, 'PREPARING')}
                                    onCancel={() => cancelTicket(ticket.id)}
                                    actionLabel="Comenzar"
                                    actionColor="bg-orange-500 hover:bg-orange-600"
                                />
                            ))}
                            {waitingTickets.length === 0 && (
                                <p className="text-xs text-slate-300 text-center py-8 italic">Sin pedidos entrantes</p>
                            )}
                        </div>
                    </div>

                    {/* Columna 2: Preparación */}
                    <div className="flex flex-col gap-4">
                        <h2 className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2 border-t lg:border-t-0 pt-6 lg:pt-0 border-slate-100">
                            <ChefHat size={16} className="text-blue-500" />
                            Preparando ({preparingTickets.length})
                        </h2>
                        <div className="flex flex-col gap-4">
                            {preparingTickets.map(ticket => (
                                <TicketCard
                                    key={ticket.id}
                                    ticket={ticket}
                                    onAction={() => updateTicketStatus(ticket.id, 'READY')}
                                    onCancel={() => cancelTicket(ticket.id)}
                                    actionLabel="Listo ✓"
                                    actionColor="bg-blue-500 hover:bg-blue-600"
                                />
                            ))}
                            {preparingTickets.length === 0 && (
                                <p className="text-xs text-slate-300 text-center py-8 italic">Nada en preparación</p>
                            )}
                        </div>
                    </div>

                    {/* Columna 3: Listos para Entrega */}
                    <div className="flex flex-col gap-4">
                        <h2 className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2 border-t lg:border-t-0 pt-6 lg:pt-0 border-slate-100">
                            <Truck size={16} className="text-green-500" />
                            Entrega ({readyTickets.length})
                        </h2>
                        <div className="flex flex-col gap-4">
                            {readyTickets.map(ticket => (
                                <TicketCard
                                    key={ticket.id}
                                    ticket={ticket}
                                    onAction={() => updateTicketStatus(ticket.id, 'DELIVERED')}
                                    onCancel={() => cancelTicket(ticket.id)}
                                    actionLabel="Entregado ✓"
                                    actionColor="bg-green-500 hover:bg-green-600"
                                />
                            ))}
                            {readyTickets.length === 0 && (
                                <p className="text-xs text-slate-300 text-center py-8 italic">Sin pedidos listos</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, color }: { label: string, value: number, color: string }) {
    const colorClasses: any = {
        orange: 'bg-orange-50 border-orange-100 text-orange-600',
        blue: 'bg-blue-50 border-blue-100 text-blue-600',
        green: 'bg-green-50 border-green-100 text-green-600',
    };
    return (
        <div className={`px-5 py-3 md:px-6 md:py-4 rounded-2xl border-2 flex-1 sm:flex-none ${colorClasses[color]} flex flex-col min-w-[110px] md:min-w-[140px] transition-all`}>
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-70 mb-0.5 whitespace-nowrap">{label}</span>
            <span className="text-xl md:text-3xl font-black italic tracking-tighter leading-none">{value}</span>
        </div>
    );
}

function TicketCard({ ticket, onAction, onCancel, actionLabel, actionColor }: any) {
    const sale = ticket.sale;
    const createdAt = new Date(ticket.createdAt);
    const now = new Date();
    const minutesAgo = Math.floor((now.getTime() - createdAt.getTime()) / 60000);

    // Detect external platform
    const isUber = sale.channel === 'UBER_EATS';
    const isPedidosYa = sale.channel === 'PEDIDOS_YA';
    const isExternal = isUber || isPedidosYa;
    const platformLabel = isUber ? '🟢 UBER EATS' : isPedidosYa ? '🔴 PEDIDOS YA' : sale.channel;

    return (
        <div className={`bg-white rounded-3xl md:rounded-[32px] p-5 md:p-6 shadow-sm hover:shadow-xl transition-all duration-300 border group relative overflow-hidden ${
            isUber ? 'border-green-200 ring-2 ring-green-100' : 
            isPedidosYa ? 'border-red-200 ring-2 ring-red-100' : 
            'border-slate-100'
        }`}>
            {/* Urgency indicator */}
            <div className={`absolute top-0 left-0 w-1.5 h-full ${
                ticket.status === 'READY' ? 'bg-green-500' :
                minutesAgo > 15 ? 'bg-red-500' : minutesAgo > 5 ? 'bg-orange-500' : 'bg-green-500'
            }`} />

            <div className="flex justify-between items-start mb-5 pl-2">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xl md:text-2xl font-black text-slate-900 italic tracking-tighter uppercase truncate">
                            {sale.code || `#${ticket.id.slice(0, 4)}`}
                        </h3>
                        {minutesAgo > 15 && ticket.status !== 'READY' && <AlertCircle size={18} className="text-red-500 shrink-0" />}
                    </div>
                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-1">
                        <Timer size={12} className="shrink-0" />
                        <span className="truncate">Hace {minutesAgo}m</span>
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    {/* Platform badge */}
                    <span className={`px-2.5 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-tighter sm:tracking-widest ${
                        isUber ? 'bg-green-100 text-green-800' :
                        isPedidosYa ? 'bg-red-100 text-red-800' :
                        sale.channel === 'POS' ? 'bg-slate-100 text-slate-700' :
                        'bg-purple-100 text-purple-700'
                    }`}>
                        {platformLabel}
                    </span>
                    {/* Status badge */}
                    <span className={`px-2.5 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-tighter sm:tracking-widest ${
                        ticket.status === 'WAITING' ? 'bg-orange-100 text-orange-700' :
                        ticket.status === 'PREPARING' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                    }`}>
                        {ticket.status === 'WAITING' ? 'ESPERA' : ticket.status === 'PREPARING' ? 'PROCESO' : 'LISTO'}
                    </span>
                </div>
            </div>

            {/* Notas del Pedido (Prominente) */}
            {sale.note && (
                <div className="mb-5 pl-2">
                    <div className={`rounded-2xl overflow-hidden shadow-md ${
                        isUber ? 'border-2 border-green-300' :
                        isPedidosYa ? 'border-2 border-red-300' :
                        'border-2 border-amber-400 animate-pulse'
                    }`}>
                        {/* Header */}
                        <div className={`px-3 py-2 flex items-center gap-2 ${
                            isUber ? 'bg-green-600' : isPedidosYa ? 'bg-red-600' : 'bg-amber-500'
                        }`}>
                            <MessageSquare size={14} className="text-white shrink-0" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-white leading-none">
                                {isExternal ? 'PEDIDO EXTERNO' : 'NOTA ESPECIAL'}
                            </p>
                        </div>
                        {/* Content - Parse multi-line notes */}
                        <div className={`p-3 space-y-1.5 ${
                            isUber ? 'bg-green-50' : isPedidosYa ? 'bg-red-50' : 'bg-amber-50'
                        }`}>
                            {sale.note.split('\n').map((line: string, i: number) => {
                                // First line = header (platform, ID, customer)
                                if (i === 0) {
                                    // Parse: [UBER_EATS] #UE-2DD98 | 👤 Catalina M.
                                    const customerMatch = line.match(/👤\s*(.+)/);
                                    const idMatch = line.match(/#([\w-]+)/);
                                    return (
                                        <div key={i} className="flex items-center justify-between gap-2">
                                            {idMatch && (
                                                <span className="text-xs font-black text-slate-700 uppercase tracking-tight">
                                                    #{idMatch[1]}
                                                </span>
                                            )}
                                            {customerMatch && (
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-tight">
                                                    👤 {customerMatch[1]}
                                                </span>
                                            )}
                                        </div>
                                    );
                                }
                                // Item lines: • 1x Ceviche Veg → Salsa Merquén
                                if (line.startsWith('•')) {
                                    const itemText = line.replace('•', '').trim();
                                    const [itemName, ...modParts] = itemText.split('→');
                                    const mods = modParts.join('→').trim();
                                    return (
                                        <div key={i} className={`rounded-lg px-2.5 py-1.5 ${
                                            isUber ? 'bg-green-100/80' : isPedidosYa ? 'bg-red-100/80' : 'bg-amber-100/80'
                                        }`}>
                                            <p className="text-[11px] md:text-xs font-black text-slate-800 uppercase tracking-tight">
                                                {itemName.trim()}
                                            </p>
                                            {mods && (
                                                <p className="text-[9px] md:text-[10px] font-bold text-slate-500 mt-0.5 italic">
                                                    ↳ {mods}
                                                </p>
                                            )}
                                        </div>
                                    );
                                }
                                // Address or other lines
                                if (line.trim()) {
                                    return (
                                        <p key={i} className="text-[10px] font-bold text-slate-500 italic">
                                            {line}
                                        </p>
                                    );
                                }
                                return null;
                            })}
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4 mb-6 pl-2">
                {sale.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-2 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <p className="font-black text-slate-900 uppercase text-xs md:text-sm italic tracking-tight leading-tight">
                                    {item.sellingProduct?.name || item.productVariant?.name || 'Producto'}
                                    <span className="ml-2 text-orange-500">x{item.quantity}</span>
                                </p>
                            </div>
                        </div>

                        {/* Recipe Breakdown (BoM) - DETALLE PARA EL COCINERO */}
                        {item.recipeSnapshot?.resolvedBoM && Array.isArray(item.recipeSnapshot.resolvedBoM) && item.recipeSnapshot.resolvedBoM.length > 0 ? (
                            <div className="bg-slate-900 rounded-2xl p-4 border-l-4 border-[#f2642e] flex flex-col gap-1.5 mt-2 shadow-sm">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-[10px] font-black uppercase text-orange-400 tracking-[0.2em] leading-none flex items-center gap-2">
                                        <ChefHat size={12} />
                                        TICKET DE PRODUCCIÓN
                                    </p>
                                    <span className="text-[10px] font-black text-white/50">{item.quantity > 1 ? `TOTAL PARA ${item.quantity} UN` : 'PORCIÓN INDIVIDUAL'}</span>
                                </div>
                                <div className="space-y-1.5 mt-1">
                                    {item.recipeSnapshot.resolvedBoM.map((bom: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center text-[11px] md:text-sm font-black text-white py-1 border-b border-white/5 last:border-0">
                                            <span className="uppercase italic tracking-tight flex items-center gap-2">
                                                <ChevronRight size={10} className="text-orange-500" />
                                                {bom.name}
                                            </span>
                                            <span className="font-black text-orange-400 bg-black/30 px-2 py-0.5 rounded-md border border-white/10">
                                                {bom.quantity >= 1
                                                    ? `${Number(bom.quantity * (item.quantity || 1)).toLocaleString()} ${bom.unit || 'g'}`
                                                    : `${Math.round(bom.quantity * 1000 * (item.quantity || 1))} gr`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1.5 mt-1">
                                {/* Modificadores de Venta (Solo si no hay BoM) */}
                                <div className="flex flex-wrap gap-1.5">
                                    {item.modifiers?.selectedProteins?.map((name: string, i: number) => (
                                        <span key={`p-${i}`} className="bg-slate-900 text-white px-2 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-tight">
                                            + {name}
                                        </span>
                                    ))}
                                    {item.modifiers?.selectedProteinNames?.map((name: string, i: number, arr: string[]) => {
                                        const pName = (item.sellingProduct?.name || '').toLowerCase();
                                        const vName = (item.productVariant?.name || '').toLowerCase();
                                        const fullName = (pName + ' ' + vName).toLowerCase();

                                        // Determine base size
                                        let size = '500'; // Default
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

                                            // Identify which protein gets the "special" (lower) weight
                                            // Priority: Pulpo > Camaron
                                            let specialProtein = '';
                                            if (hasPulpo) specialProtein = 'pulpo';
                                            else if (hasCamaron) specialProtein = 'camarón';

                                            if (specialProtein) {
                                                const specialWeight = numProteins === 2 ? config.special2 : config.special3;
                                                const normalWeight = Math.round((config.total - specialWeight) / (numProteins - 1));

                                                const isSpecial = name.toLowerCase().includes(specialProtein);
                                                grams = isSpecial ? specialWeight : normalWeight;
                                            }
                                        } else {
                                            grams = config.total;
                                        }

                                        return (
                                            <span key={`p-${i}`} className="bg-slate-900 text-white px-2 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-tight">
                                                + {name} <span className="text-orange-400 ml-1">{grams}G</span>
                                            </span>
                                        );
                                    })}
                                    {item.modifiers?.removedIngredients?.map((name: string, i: number) => (
                                        <span key={`v-${i}`} className="bg-red-500 text-white px-2 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-tight line-through opacity-70">
                                            Sin {name}
                                        </span>
                                    ))}
                                </div>
                                {item.productVariant && !item.modifiers?.selectedProteins?.length && !item.modifiers?.selectedProteinNames?.length && (
                                    <p className="text-[10px] font-bold text-slate-400 italic">No hay receta detallada para esta variante</p>
                                )}
                            </div>
                        )}

                        {item.modifiers?.extras && item.modifiers.extras.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {item.modifiers.extras.map((e: any, i: number) => (
                                    <span key={`e-${i}`} className="bg-green-600 text-white px-2 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-tight border border-green-700 shadow-sm">
                                        + {e.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <button
                    onClick={onCancel}
                    className="h-14 md:h-16 px-4 rounded-2xl md:rounded-[20px] font-black uppercase italic tracking-tighter text-white transition-all transform active:scale-95 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 shadow-lg text-[10px] md:text-xs shrink-0"
                    title="Cancelar pedido"
                >
                    <XCircle size={18} />
                    <span className="hidden sm:inline">Cancelar</span>
                </button>
                <button
                    onClick={onAction}
                    className={`flex-1 h-14 md:h-16 rounded-2xl md:rounded-[20px] font-black uppercase italic tracking-tighter text-white transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-black/5 group-hover:shadow-orange-500/10 text-xs md:text-sm ${actionColor}`}
                >
                    {ticket.status === 'READY' && <CheckCircle2 size={18} />}
                    {actionLabel}
                    {ticket.status !== 'READY' && <ChevronRight size={18} className="md:w-5 md:h-5" />}
                </button>
            </div>
        </div>
    );
}
