'use client';

import { Clock, Receipt } from 'lucide-react';

type TableState = 'cuenta' | 'ocupada' | 'libre';

const clp = (n: number) => `$${Math.round(Number(n || 0)).toLocaleString('es-CL')}`;

function tableState(t: any): TableState {
    if (t.billRequest) return 'cuenta';
    if (t.occupied) return 'ocupada';
    return 'libre';
}

function openedMinutes(t: any): number | null {
    const times = (t.guests || [])
        .map((g: any) => new Date(g.createdAt).getTime())
        .filter((n: number) => Number.isFinite(n));
    if (!times.length) return null;
    return Math.max(0, Math.floor((Date.now() - Math.min(...times)) / 60000));
}

function formatMinutes(m: number | null) {
    if (m === null) return '';
    if (m < 60) return `${m} min`;
    return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}

const STYLE: Record<TableState, { table: string; chairOn: string; chip: string }> = {
    libre: {
        table: 'bg-white border-slate-300 text-slate-900',
        chairOn: 'bg-slate-900 text-white',
        chip: 'bg-white text-slate-900 border border-slate-300',
    },
    ocupada: {
        table: 'bg-orange-500 border-orange-600 text-white shadow-lg shadow-orange-200',
        chairOn: 'bg-orange-600 text-white',
        chip: 'bg-orange-500 text-white',
    },
    cuenta: {
        table: 'bg-amber-400 border-amber-500 text-slate-900 shadow-lg shadow-amber-200',
        chairOn: 'bg-amber-500 text-slate-900',
        chip: 'bg-amber-400 text-slate-900',
    },
};

export function SalonFloorPlan({ tables, onOpen }: { tables: any[]; onOpen: (table: any) => void }) {
    return (
        <div
            className="rounded-[2rem] border border-slate-200 bg-white p-4 md:p-8"
            style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '18px 18px' }}
        >
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-4 gap-y-8">
                {tables.map((table) => {
                    const state = tableState(table);
                    const style = STYLE[state];
                    const guests = [...(table.guests || [])].sort((a: any, b: any) => a.seat - b.seat);
                    const chairs = Math.max(4, guests.length);
                    const chairSize = Math.min(20, 0.85 * 2 * 42 * Math.sin(Math.PI / chairs));
                    return (
                        <button
                            key={table.id}
                            type="button"
                            onClick={() => onOpen(table)}
                            className="group flex flex-col items-center gap-3 transition-transform active:scale-95"
                        >
                            <div className="relative w-full max-w-[190px] aspect-square">
                                {Array.from({ length: chairs }).map((_, i) => {
                                    const angle = (i / chairs) * Math.PI * 2 - Math.PI / 2;
                                    const guest = guests[i];
                                    return (
                                        <span
                                            key={i}
                                            className={`absolute flex items-center justify-center rounded-full font-black uppercase -translate-x-1/2 -translate-y-1/2 aspect-square ${
                                                chairSize < 16 ? 'text-[9px]' : 'text-[11px]'
                                            } ${guest ? style.chairOn : 'bg-slate-100 border-2 border-slate-200'}`}
                                            style={{ width: `${chairSize}%`, left: `${50 + 42 * Math.cos(angle)}%`, top: `${50 + 42 * Math.sin(angle)}%` }}
                                        >
                                            {guest ? (guest.name || '?').trim().charAt(0) : ''}
                                        </span>
                                    );
                                })}
                                {state === 'cuenta' && (
                                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[68%] aspect-square rounded-full bg-amber-300/60 animate-pulse" />
                                )}
                                <div
                                    className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[58%] aspect-square rounded-full border-4 flex flex-col items-center justify-center transition-colors group-hover:border-orange-400 ${style.table}`}
                                >
                                    <span className="text-4xl font-black italic tracking-tighter leading-none">{table.number}</span>
                                    {state !== 'libre' && (
                                        <span className="text-xs font-black mt-1">{clp(table.openTotal)}</span>
                                    )}
                                </div>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${style.chip}`}>
                                {state === 'cuenta' && <Receipt size={12} />}
                                {state === 'ocupada' && <Clock size={12} />}
                                {state === 'libre' ? 'Libre' : state === 'cuenta' ? 'Cuenta' : formatMinutes(openedMinutes(table))}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
