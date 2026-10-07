'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Users } from 'lucide-react';
import { API_URL } from '../../../services/api';
import { useTableSession } from '../../../context/TableSessionContext';

type Step = 'load' | 'party' | 'pick';

export default function MesaQrPage() {
    const { number } = useParams<{ number: string }>();
    const router = useRouter();
    const { session, ready, save, clear } = useTableSession();
    const [step, setStep] = useState<Step>('load');
    const [table, setTable] = useState<any>(null);
    const [attempt, setAttempt] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const goToWeb = (guest: { id: string; name: string; claimToken: string }) => {
        save({ tableNumber: String(number), ...guest });
        router.replace(`/?mesa=${number}`);
    };

    useEffect(() => {
        if (!ready) return;
        (async () => {
            try {
                const res = await fetch(`${API_URL}/public/tables/${number}`);
                if (!res.ok) throw new Error('Mesa no encontrada');
                const data = await res.json();
                setTable(data);
                if (session?.tableNumber === String(number) && data.guests?.some((g: any) => g.id === session.id)) {
                    const keep = await fetch(`${API_URL}/public/tables/guests/${session.id}/session`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ claimToken: session.claimToken }),
                    });
                    const keepData = await keep.json().catch(() => ({ valid: false }));
                    if (keepData.valid) {
                        goToWeb(session);
                        return;
                    }
                    clear();
                }
                setStep(data.occupied ? 'pick' : 'party');
            } catch (e: any) {
                setError(e.message || 'No se pudo abrir la mesa');
            }
        })();
    }, [number, ready, attempt]);

    const claim = async (guestId: string, force = false) => {
        setBusy(true);
        try {
            const res = await fetch(`${API_URL}/public/tables/${number}/claim`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guestId,
                    currentToken: session?.id === guestId ? session.claimToken : undefined,
                    force,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'No se pudo elegir ese nombre');
            if (data.alreadyClaimed) {
                const ok = confirm(`${data.name} ya está pidiendo en otro celular. ¿Entrar de todos modos? El otro celular dejará de pedir.`);
                if (!ok) return;
                return claim(guestId, true);
            }
            goToWeb(data);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setBusy(false);
        }
    };

    if (error) {
        return <div className="min-h-screen flex items-center justify-center p-6 font-black italic uppercase">{error}</div>;
    }
    if (step === 'load' || !table) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;
    }

    return (
        <div className="min-h-screen min-w-0 overflow-x-hidden bg-slate-50 flex flex-col">
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3">
                <div className="max-w-lg mx-auto flex items-center gap-3">
                    <img src="/assets/Logo Restaurante.png" alt="Lo Más Rico" className="h-12 w-12 object-contain" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#f2642e]">Mesa {table.number}</p>
                        <h1 className="text-xl font-[900] italic tracking-[-0.05em] uppercase leading-none">Lo Más Rico</h1>
                    </div>
                </div>
            </header>

            {step === 'party' && (
                <div className="p-5 space-y-4 max-w-lg mx-auto w-full">
                    <div className="flex items-center gap-2 text-slate-900">
                        <Users size={18} />
                        <p className="text-sm font-bold">Pídele al garzón que abra la mesa para pedir desde el celular.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => { setStep('load'); setAttempt((a) => a + 1); }}
                        className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black uppercase italic"
                    >
                        Ya la abrió
                    </button>
                </div>
            )}

            {step === 'pick' && (
                <div className="p-5 space-y-3 max-w-lg mx-auto w-full">
                    <p className="text-sm font-bold text-slate-900">¿Quién eres en esta mesa?</p>
                    {table.guests.map((g: any) => (
                        <button
                            key={g.id}
                            type="button"
                            onClick={() => claim(g.id)}
                            className="w-full text-left px-4 py-4 rounded-2xl bg-white border border-slate-100 font-black italic uppercase"
                        >
                            {g.name}{g.claimed ? ' · en un celular' : ''}
                        </button>
                    ))}
                    <button
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                            const name = prompt('Tu nombre');
                            if (!name?.trim()) return;
                            setBusy(true);
                            try {
                                const res = await fetch(`${API_URL}/public/tables/${number}/join`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ name: name.trim() }),
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.message || 'No se pudo agregar');
                                goToWeb(data);
                            } catch (e: any) {
                                alert(e.message);
                            } finally {
                                setBusy(false);
                            }
                        }}
                        className="w-full py-3 font-black uppercase italic text-orange-500"
                    >
                        No estoy en la lista
                    </button>
                </div>
            )}
        </div>
    );
}
