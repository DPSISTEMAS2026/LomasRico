'use client';

import { useEffect, useRef, useState } from 'react';
import { CreditCard, Loader2, XCircle } from 'lucide-react';
import { getTerminalCharge, startTerminalCharge } from '../../services/api';
import type { TerminalCardMethod } from './PaymentMethodPicker';

const POLL_MS = 2500;
const WAIT_LIMIT_MS = 3 * 60_000;

interface Props {
    amount: number;
    method: TerminalCardMethod;
    reference: string;
    onPaid: (key: string) => void;
    onClose: () => void;
}

type Phase = 'sending' | 'waiting' | 'failed' | 'timeout';

const METHOD_LABEL: Record<TerminalCardMethod, string> = {
    DEBIT: 'Débito',
    CREDIT: 'Crédito',
};

export function TerminalChargeModal({ amount, method, reference, onPaid, onClose }: Props) {
    const [phase, setPhase] = useState<Phase>('sending');
    const [status, setStatus] = useState('PENDING');
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    const charge = useRef<{ attempt: number; request: Promise<{ key: string }> } | null>(null);
    const onPaidRef = useRef(onPaid);
    onPaidRef.current = onPaid;

    useEffect(() => {
        if (charge.current?.attempt !== attempt) {
            charge.current = { attempt, request: startTerminalCharge(amount, method, reference) };
        }
        let stopped = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const startedAt = Date.now();

        const poll = async (key: string) => {
            if (stopped) return;
            try {
                const res = await getTerminalCharge(key);
                if (stopped) return;
                setStatus(res.status);
                if (res.status === 'COMPLETED') { onPaidRef.current(key); return; }
                if (res.status === 'FAILED' || res.status === 'CANCELED') {
                    setError(res.status === 'CANCELED' ? 'Se canceló el cobro en la máquina' : 'El cobro fue rechazado en la máquina');
                    setPhase('failed');
                    return;
                }
            } catch {
                /* corte de red momentáneo: se sigue consultando */
            }
            if (Date.now() - startedAt > WAIT_LIMIT_MS) { setPhase('timeout'); return; }
            timer = setTimeout(() => void poll(key), POLL_MS);
        };

        setPhase('sending');
        setError('');
        charge.current.request
            .then(({ key }) => {
                if (stopped) return;
                setPhase('waiting');
                void poll(key);
            })
            .catch((e: any) => {
                if (stopped) return;
                setError(e?.message || 'No se pudo enviar el cobro a la máquina');
                setPhase('failed');
            });

        return () => { stopped = true; if (timer) clearTimeout(timer); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attempt]);

    const busy = phase === 'sending' || phase === 'waiting';
    const waitingText = status === 'SENT' || status === 'PENDING'
        ? 'Pasa o acerca la tarjeta en la máquina'
        : status === 'PROCESSING'
            ? 'Procesando en la máquina…'
            : 'Esperando a la máquina…';

    return (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-5 text-center shadow-2xl">
                <div className="flex justify-center">
                    {busy
                        ? <Loader2 size={48} className="animate-spin text-orange-500" />
                        : phase === 'failed'
                            ? <XCircle size={48} className="text-red-600" />
                            : <CreditCard size={48} className="text-slate-900" />}
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                        {METHOD_LABEL[method]} · Máquina TUU / Haulmer
                    </p>
                    <p className="text-3xl font-black italic text-slate-900">${Math.round(amount).toLocaleString('es-CL')}</p>
                </div>
                <p className="text-sm font-bold text-slate-900">
                    {phase === 'sending' && 'Enviando el cobro a la máquina…'}
                    {phase === 'waiting' && waitingText}
                    {phase === 'failed' && error}
                    {phase === 'timeout' && 'La máquina no respondió. Revisa la máquina antes de reintentar.'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="py-3 rounded-2xl border-2 border-slate-900 text-slate-900 font-black uppercase italic text-xs"
                    >
                        {busy ? 'Cerrar' : 'Volver'}
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => setAttempt((n) => n + 1)}
                        className="py-3 rounded-2xl bg-slate-900 text-white font-black uppercase italic text-xs disabled:opacity-40"
                    >
                        Reintentar
                    </button>
                </div>
                {busy && (
                    <p className="text-[11px] font-bold text-slate-900">
                        Si cierras, cancela el cobro también en la máquina.
                    </p>
                )}
            </div>
        </div>
    );
}
