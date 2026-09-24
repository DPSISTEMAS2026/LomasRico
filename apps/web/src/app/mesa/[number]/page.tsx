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
    const [count, setCount] = useState(3);
    const [names, setNames] = useState<string[]>(['', '', '']);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const goToWeb = (guest: { id: string; name: string; claimToken: string }) => {
        save({ tableNumber: String(number), ...guest });
        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'qr-web',hypothesisId:'H1',location:'mesa/[number]/page.tsx:goToWeb',message:'diner redirected to web catalog',data:{tableNumber:number},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
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
                // #region agent log
                fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'qr-web',hypothesisId:'H2',location:'mesa/[number]/page.tsx:load',message:'diner table load failed',data:{error:String(e?.message||e)},timestamp:Date.now()})}).catch(()=>{});
                // #endregion
                setError(e.message || 'No se pudo abrir la mesa');
            }
        })();
    }, [number, ready]);

    useEffect(() => {
        setNames((prev) => {
            const next = [...prev];
            while (next.length < count) next.push('');
            return next.slice(0, count);
        });
    }, [count]);

    const startParty = async () => {
        const clean = names.map((n) => n.trim()).filter(Boolean);
        if (clean.length !== count) {
            alert('Escribe el nombre de cada comensal');
            return;
        }
        setBusy(true);
        try {
            const res = await fetch(`${API_URL}/public/tables/${number}/party`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ names: clean }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'No se pudo abrir la mesa');
            setTable(data.table);
            setStep('pick');
            // #region agent log
            fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'qr-web',hypothesisId:'H1',location:'mesa/[number]/page.tsx:startParty',message:'diner party started',data:{tableNumber:number,guestCount:clean.length},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
        } catch (e: any) {
            alert(e.message);
        } finally {
            setBusy(false);
        }
    };

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
                    <div className="flex items-center gap-2 text-slate-500">
                        <Users size={18} />
                        <p className="text-sm font-bold">Escaneaste la mesa. ¿Cuántos son y cómo se llaman?</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setCount((c) => Math.max(1, c - 1))} className="w-12 h-12 rounded-2xl bg-white font-black">−</button>
                        <span className="text-3xl font-black italic">{count}</span>
                        <button type="button" onClick={() => setCount((c) => Math.min(8, c + 1))} className="w-12 h-12 rounded-2xl bg-white font-black">+</button>
                    </div>
                    {names.map((name, i) => (
                        <input
                            key={i}
                            value={name}
                            onChange={(e) => setNames((prev) => prev.map((n, idx) => idx === i ? e.target.value : n))}
                            placeholder={`Comensal ${i + 1}`}
                            className="w-full bg-white px-4 py-4 rounded-2xl font-bold border border-slate-100"
                        />
                    ))}
                    <button type="button" onClick={startParty} disabled={busy} className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black uppercase italic">
                        {busy ? '...' : 'Entrar a la carta'}
                    </button>
                </div>
            )}

            {step === 'pick' && (
                <div className="p-5 space-y-3 max-w-lg mx-auto w-full">
                    <p className="text-sm font-bold text-slate-500">¿Quién eres en esta mesa?</p>
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
