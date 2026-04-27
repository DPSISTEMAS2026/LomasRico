'use client';

import { useState } from 'react';
import { Unlock, Loader2 } from 'lucide-react';
import { authFetch } from '../../services/authFetch';
import { API_URL } from '../../services/api';

interface Props {
    userId: string;
    onSuccess: (shift: any) => void;
    onClose: () => void;
}

export function OpenShiftModal({ userId, onSuccess, onClose }: Props) {
    const [startAmount, setStartAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleOpen = async () => {
        const amount = parseFloat(startAmount);
        if (isNaN(amount) || amount < 0) { setError('Ingresa un monto válido (puede ser 0)'); return; }
        setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/shifts/open`, {
                method: 'POST',
                body: JSON.stringify({ cashierId: userId, startAmount: amount })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Error al abrir turno');
            onSuccess(data);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 rounded-[2rem] bg-green-50 flex items-center justify-center mx-auto mb-4">
                        <Unlock size={36} className="text-green-500" />
                    </div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">Apertura de Caja</h2>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Ingresa el efectivo inicial en caja</p>
                </div>

                <div className="mb-6">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Monto Inicial en Efectivo</label>
                    <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xl">$</span>
                        <input
                            type="number"
                            min="0"
                            value={startAmount}
                            onChange={e => setStartAmount(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleOpen()}
                            className="w-full pl-10 pr-5 py-5 border-2 border-slate-100 rounded-2xl font-black text-3xl text-slate-900 focus:outline-none focus:border-green-400 transition-all text-center"
                            placeholder="0"
                            autoFocus
                        />
                    </div>
                    {error && <p className="text-red-500 text-xs font-bold mt-2 text-center">{error}</p>}
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black uppercase italic text-sm hover:border-slate-300 transition-all">
                        Cancelar
                    </button>
                    <button
                        onClick={handleOpen}
                        disabled={loading}
                        className="flex-1 py-4 rounded-2xl bg-green-500 text-white font-black uppercase italic text-sm hover:bg-green-600 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Unlock size={18} />}
                        Abrir Turno
                    </button>
                </div>
            </div>
        </div>
    );
}
