'use client';

import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';

export type Approval = { approvalPin: string; reason: string };

interface Props {
    title: string;
    summary: string;
    confirmLabel: string;
    /** Si se indica, se pide cuántas unidades quitar (1..maxQuantity). */
    maxQuantity?: number;
    onConfirm: (approval: Approval, quantity: number) => Promise<void>;
    onClose: () => void;
}

/** Acción sensible: motivo + PIN de cajero, administrador o dueño. Queda en el registro interno. */
export function ApprovalModal({ title, summary, confirmLabel, maxQuantity, onConfirm, onClose }: Props) {
    const [reason, setReason] = useState('');
    const [pin, setPin] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async () => {
        if (reason.trim().length < 3) { setError('Indica el motivo'); return; }
        if (!/^\d{4}$/.test(pin)) { setError('PIN de 4 dígitos'); return; }
        setBusy(true);
        setError('');
        try {
            await onConfirm({ approvalPin: pin, reason: reason.trim() }, quantity);
        } catch (e: any) {
            setError(e?.message || 'No se pudo completar');
            setPin('');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
            <form
                className="w-full max-w-md bg-white rounded-[2rem] p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
                onSubmit={(e) => { e.preventDefault(); void submit(); }}
            >
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
                        <ShieldCheck size={22} className="text-red-500" />
                    </div>
                    <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">{title}</h2>
                </div>
                <p className="text-sm font-bold text-slate-900">{summary}</p>

                {maxQuantity && maxQuantity > 1 && (
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Cantidad</span>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-9 h-9 rounded-xl bg-slate-100 font-black">-</button>
                            <span className="w-8 text-center font-black text-lg">{quantity}</span>
                            <button type="button" onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))} className="w-9 h-9 rounded-xl bg-slate-100 font-black">+</button>
                        </div>
                    </div>
                )}

                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    maxLength={300}
                    placeholder="Motivo"
                    className="w-full border-2 border-slate-100 rounded-2xl p-3 font-bold text-sm text-slate-900 outline-none focus:border-red-400 resize-none"
                    autoFocus
                />
                <input
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    inputMode="numeric"
                    type="password"
                    autoComplete="off"
                    placeholder="PIN cajero o administrador"
                    className="w-full border-2 border-slate-100 rounded-2xl p-3 font-black text-center text-2xl tracking-[0.5em] text-slate-900 outline-none focus:border-red-400"
                />

                {error && <p className="text-red-600 text-xs font-black text-center">{error}</p>}

                <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={onClose} className="py-3 rounded-2xl border-2 border-slate-100 font-black uppercase italic text-xs text-slate-900">
                        Volver
                    </button>
                    <button type="submit" disabled={busy} className="py-3 rounded-2xl bg-red-500 text-white font-black uppercase italic text-xs flex items-center justify-center gap-2 disabled:opacity-50">
                        {busy && <Loader2 size={16} className="animate-spin" />} {confirmLabel}
                    </button>
                </div>
            </form>
        </div>
    );
}
