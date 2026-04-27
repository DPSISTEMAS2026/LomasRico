'use client';

import { useState } from 'react';
import { Coins, Loader2 } from 'lucide-react';
import { authFetch } from '../../services/authFetch';
import { API_URL } from '../../services/api';

interface Props {
    shiftId: string;
    onSuccess: () => void;
    onClose: () => void;
}

export function WithdrawalModal({ shiftId, onSuccess, onClose }: Props) {
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleWithdraw = async () => {
        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) { setError('Ingresa un monto válido'); return; }
        if (!note) { setError('Debes justificar el retiro'); return; }

        setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/shifts/${shiftId}/expense`, {
                method: 'POST',
                body: JSON.stringify({ amount: val, description: note, type: 'WITHDRAWAL' })
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Error al procesar retiro'); }
            onSuccess();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[3rem] p-8 md:p-10 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
                        <Coins size={32} className="text-orange-500" />
                    </div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Retiro de Caja</h2>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Registra la salida de efectivo</p>
                </div>

                <div className="mb-4">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Monto a retirar</label>
                    <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xl">$</span>
                        <input
                            type="number"
                            min="0"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="w-full pl-10 pr-5 py-4 border-2 border-slate-100 rounded-2xl font-black text-3xl text-slate-900 outline-none focus:border-orange-400 transition-all text-center"
                            placeholder="0"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Motivo / Justificación</label>
                    <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        className="w-full border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm text-slate-700 outline-none focus:border-orange-400 transition-all resize-none"
                        rows={2}
                        placeholder="Ej: Pago de proveedores, Compra insumos..."
                    />
                </div>

                {error && <p className="text-red-500 text-xs font-bold mb-4 text-center">{error}</p>}

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black uppercase italic text-xs hover:bg-slate-50 transition-all">
                        Cancelar
                    </button>
                    <button
                        onClick={handleWithdraw}
                        disabled={loading}
                        className="flex-1 py-4 rounded-2xl bg-slate-900 text-white font-black uppercase italic text-xs hover:bg-orange-500 transition-all shadow-xl shadow-orange-100 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Coins size={16} />}
                        Confirmar Retiro
                    </button>
                </div>
            </div>
        </div>
    );
}
