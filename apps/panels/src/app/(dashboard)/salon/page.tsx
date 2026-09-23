'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Armchair, ShoppingBag, Users, RefreshCw } from 'lucide-react';
import { API_URL } from '../../../services/api';
import { authFetch } from '../../../services/authFetch';

export default function SalonPage() {
    const router = useRouter();
    const [tables, setTables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            const res = await authFetch(`${API_URL}/tables`);
            if (res.ok) {
                const data = await res.json();
                setTables(data);
                // #region agent log
                fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'qr-mesa',hypothesisId:'H5',location:'salon/page.tsx:load',message:'salon floor loaded',data:{count:data.length,occupied:data.filter((t:any)=>t.occupied).length,billRequests:data.filter((t:any)=>t.billRequest).length},timestamp:Date.now()})}).catch(()=>{});
                // #endregion
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const id = setInterval(load, 8000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 min-h-0">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 italic">Atención del local</p>
                        <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase text-slate-900">
                            Salón
                        </h1>
                        <p className="text-sm font-bold text-slate-500 mt-1">
                            Toca una mesa para sentar comensales. Cada persona puede tener su propia cuenta.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={load}
                        className="p-3 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-slate-900"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => router.push('/salon')}
                        className="text-left p-5 rounded-3xl bg-slate-900 text-white shadow-xl"
                    >
                        <Armchair className="mb-3 text-orange-400" size={28} />
                        <p className="font-black uppercase italic text-lg leading-none">Salón · 5 mesas</p>
                        <p className="text-xs font-bold text-slate-300 mt-2">Garzón o tablet: sentar, anotar y mandar a cocina.</p>
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/pos')}
                        className="text-left p-5 rounded-3xl bg-white border-2 border-slate-100 shadow-sm hover:border-orange-400"
                    >
                        <ShoppingBag className="mb-3 text-orange-500" size={28} />
                        <p className="font-black uppercase italic text-lg leading-none text-slate-900">Caja · Para llevar</p>
                        <p className="text-xs font-bold text-slate-500 mt-2">Atención de retiro en el mostrador. Se cobra al tiro.</p>
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {tables.map((table) => {
                        const occupied = table.occupied;
                        const bill = table.billRequest;
                        const billText = bill?.guestName
                            ? (bill.mode === 'GUEST' ? `${bill.guestName} pidió su cuenta` : `${bill.guestName} pidió la cuenta`)
                            : bill ? 'Pidieron cuenta' : occupied ? 'Ocupada' : 'Libre';
                        const names = (table.guests || []).map((g: any) => g.name).filter(Boolean).join(' · ');
                        return (
                            <button
                                key={table.id}
                                type="button"
                                onClick={() => router.push(`/salon/${table.id}?cuenta=${bill ? '1' : '0'}`)}
                                className={`relative aspect-square rounded-[2rem] p-5 text-left transition-all active:scale-95 border-4 ${
                                    bill
                                        ? 'bg-amber-400 text-slate-900 border-amber-500 shadow-xl shadow-amber-200'
                                        : occupied
                                        ? 'bg-orange-500 text-white border-orange-600 shadow-xl shadow-orange-200'
                                        : 'bg-white text-slate-900 border-dashed border-slate-200 hover:border-orange-300'
                                }`}
                            >
                                <div className={`absolute inset-6 rounded-[1.6rem] border-2 ${bill || occupied ? 'border-white/30' : 'border-slate-100'}`} />
                                <div className="relative h-full flex flex-col justify-between">
                                    <div>
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${occupied && !bill ? 'text-white/70' : bill ? 'text-slate-800' : 'text-slate-400'}`}>
                                            {billText}
                                        </p>
                                        <p className="text-4xl md:text-5xl font-black italic tracking-tighter leading-none mt-1">
                                            {table.number}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="flex items-center gap-2 text-sm font-black uppercase italic">
                                            <Users size={16} />
                                            {table.guestCount ? `${table.guestCount} comensal${table.guestCount === 1 ? '' : 'es'}` : 'Sin comensales'}
                                        </p>
                                        {names && <p className="text-[11px] font-bold mt-1 truncate">{names}</p>}
                                        {occupied && (
                                            <p className="text-lg font-black mt-1">${Number(table.openTotal || 0).toLocaleString()}</p>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
