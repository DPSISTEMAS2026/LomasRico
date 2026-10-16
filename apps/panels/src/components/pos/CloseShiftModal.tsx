'use client';

import { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { authFetch } from '../../services/authFetch';
import { API_URL } from '../../services/api';
import type { CashierShift, ShiftTransaction } from '@lomasrico/shared-types';

const METHOD_LABEL: Record<string, string> = {
    CASH: 'Efectivo',
    DEBIT: 'Débito',
    CREDIT: 'Crédito',
    TRANSFER: 'Transferencia',
    MERCADO_PAGO: 'MercadoPago',
    TUU: 'Web TUU',
    EDENRED: 'Edenred',
    PLUXEE: 'Pluxee',
    JUNAEB: 'Junaeb',
    FOOD_CARD: 'Tarjeta alimentación',
    OTHER: 'Otro',
};

interface Props {
    shift: CashierShift;
    onSuccess: () => void;
    onClose: () => void;
}

export function CloseShiftModal({ shift, onSuccess, onClose }: Props) {
    const [endAmount, setEndAmount] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const summary = (shift as any)?.cashSummary as
        | { expectedCash: number; byMethod: Record<string, number>; expenses: number; withdrawals: number; refunds: number }
        | undefined;
    const systemAmount = Number(summary?.expectedCash ?? shift?.startAmount ?? 0);
    const methodRows = Object.entries(summary?.byMethod || {}).filter(([, v]) => v !== 0);

    const countedAmount = parseFloat(endAmount) || 0;
    const diff = countedAmount - systemAmount;

    const handleClose = async () => {
        if (endAmount === '') { setError('Ingresa el efectivo contado'); return; }
        setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/shifts/${shift.id}/close`, {
                method: 'POST',
                body: JSON.stringify({ endAmount: countedAmount, note })
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Error al cerrar turno'); }
            onSuccess();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const openTime = shift?.openingTime ? new Date(shift.openingTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const salesCount = (shift?.transactions || []).filter((t: ShiftTransaction) => t.type === 'SALE_INCOME').length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 rounded-[2rem] bg-red-50 flex items-center justify-center mx-auto mb-4">
                        <Lock size={36} className="text-red-500" />
                    </div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">Cierre de Caja</h2>
                    <p className="text-slate-800 font-bold text-xs uppercase tracking-widest mt-1">Turno abierto desde las {openTime}</p>
                </div>

                {/* Resumen del turno */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                        <p className="text-[9px] font-black uppercase text-slate-800 tracking-widest">Efectivo Inicial</p>
                        <p className="text-lg font-black italic text-slate-900 mt-1">${Number(shift?.startAmount || 0).toLocaleString('es-CL')}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                        <p className="text-[9px] font-black uppercase text-slate-800 tracking-widest">Ventas</p>
                        <p className="text-lg font-black italic text-orange-500 mt-1">{salesCount}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                        <p className="text-[9px] font-black uppercase text-slate-800 tracking-widest">Efectivo esperado</p>
                        <p className="text-lg font-black italic text-green-600 mt-1">${systemAmount.toLocaleString('es-CL')}</p>
                    </div>
                </div>

                {(methodRows.length > 0 || summary?.withdrawals || summary?.expenses || summary?.refunds) ? (
                    <div className="bg-slate-50 rounded-2xl p-4 mb-6 space-y-1">
                        {methodRows.map(([method, total]) => (
                            <div key={method} className="flex justify-between text-xs font-black uppercase text-slate-900">
                                <span>{METHOD_LABEL[method] || method}</span>
                                <span>${total.toLocaleString('es-CL')}</span>
                            </div>
                        ))}
                        {!!summary?.withdrawals && (
                            <div className="flex justify-between text-xs font-black uppercase text-red-600">
                                <span>Retiros</span><span>-${summary.withdrawals.toLocaleString('es-CL')}</span>
                            </div>
                        )}
                        {!!summary?.expenses && (
                            <div className="flex justify-between text-xs font-black uppercase text-red-600">
                                <span>Gastos</span><span>-${summary.expenses.toLocaleString('es-CL')}</span>
                            </div>
                        )}
                        {!!summary?.refunds && (
                            <div className="flex justify-between text-xs font-black uppercase text-red-600">
                                <span>Devoluciones</span><span>-${summary.refunds.toLocaleString('es-CL')}</span>
                            </div>
                        )}
                    </div>
                ) : null}

                {/* Efectivo contado */}
                <div className="mb-4">
                    <label className="block text-[10px] font-black uppercase text-slate-800 tracking-widest mb-2">Efectivo Contado en Caja</label>
                    <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-800 text-xl">$</span>
                        <input
                            type="number"
                            min="0"
                            value={endAmount}
                            onChange={e => setEndAmount(e.target.value)}
                            className="w-full pl-10 pr-5 py-5 border-2 border-slate-100 rounded-2xl font-black text-3xl text-slate-900 focus:outline-none focus:border-red-400 transition-all text-center"
                            placeholder="0"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Diferencia */}
                {endAmount !== '' && (
                    <div className={`rounded-2xl p-4 mb-4 flex items-center justify-between ${Math.abs(diff) < 100 ? 'bg-green-50' : diff > 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                        <span className="text-xs font-black uppercase text-slate-500">Diferencia</span>
                        <span className={`text-xl font-black italic ${diff > 0 ? 'text-blue-600' : diff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {diff > 0 ? '+' : ''}{diff.toLocaleString('es-CL')}
                        </span>
                    </div>
                )}

                {/* Nota */}
                <div className="mb-6">
                    <label className="block text-[10px] font-black uppercase text-slate-800 tracking-widest mb-2">Nota (opcional)</label>
                    <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm text-slate-700 focus:outline-none focus:border-slate-300 transition-all resize-none"
                        rows={2}
                        placeholder="Observaciones del turno..."
                    />
                </div>

                {error && <p className="text-red-500 text-xs font-bold mb-4 text-center">{error}</p>}

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-4 rounded-2xl border-2 border-slate-100 text-slate-800 font-black uppercase italic text-sm hover:border-slate-300 transition-all">
                        Cancelar
                    </button>
                    <button
                        onClick={handleClose}
                        disabled={loading}
                        className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-black uppercase italic text-sm hover:bg-red-600 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                        Cerrar Turno
                    </button>
                </div>
            </div>
        </div>
    );
}
