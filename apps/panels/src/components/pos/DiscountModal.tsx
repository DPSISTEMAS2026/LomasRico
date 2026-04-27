'use client';

import { useState } from 'react';
import { TrendingDown } from 'lucide-react';

interface Props {
    currentDiscount: number;
    currentType: 'PERCENT' | 'FIXED';
    onApply: (val: number, type: 'PERCENT' | 'FIXED') => void;
    onClose: () => void;
}

export function DiscountModal({ currentDiscount, currentType, onApply, onClose }: Props) {
    const [val, setVal] = useState(currentDiscount.toString());
    const [type, setType] = useState(currentType);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[3rem] p-8 md:p-10 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                        <TrendingDown size={32} className="text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Descuento Especial</h2>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Autorización del Administrador</p>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
                    <button
                        onClick={() => setType('PERCENT')}
                        className={`flex-1 py-3 rounded-xl font-black uppercase italic text-[10px] transition-all ${type === 'PERCENT' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'}`}
                    >
                        Porcentaje (%)
                    </button>
                    <button
                        onClick={() => setType('FIXED')}
                        className={`flex-1 py-3 rounded-xl font-black uppercase italic text-[10px] transition-all ${type === 'FIXED' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'}`}
                    >
                        Monto ($)
                    </button>
                </div>

                <div className="mb-8">
                    <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300 text-2xl">
                            {type === 'PERCENT' ? '%' : '$'}
                        </span>
                        <input
                            type="number"
                            value={val}
                            onChange={e => setVal(e.target.value)}
                            className="w-full bg-slate-50 pl-14 pr-6 py-6 rounded-3xl font-black text-4xl text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-red-100 transition-all text-center"
                            placeholder="0"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black uppercase italic text-xs hover:bg-slate-50 transition-all">
                        Cancelar
                    </button>
                    <button
                        onClick={() => onApply(parseFloat(val) || 0, type)}
                        className="flex-1 py-4 rounded-2xl bg-slate-900 text-white font-black uppercase italic text-xs hover:bg-red-600 transition-all shadow-xl shadow-red-100"
                    >
                        Aplicar
                    </button>
                </div>
            </div>
        </div>
    );
}
