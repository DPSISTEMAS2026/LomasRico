'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { API_URL } from '../../../services/api';
import { authFetch } from '../../../services/authFetch';
import { SalonFloorPlan } from '../../../components/salon/SalonFloorPlan';

export default function SalonPage() {
    const router = useRouter();
    const [tables, setTables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const inFlight = useRef(false);

    const load = async () => {
        if (inFlight.current) return;
        inFlight.current = true;
        try {
            const res = await authFetch(`${API_URL}/tables`);
            if (res.ok) {
                const data = await res.json();
                setTables(data);
            }
        } catch {
            /* se reintenta en el siguiente ciclo */
        } finally {
            inFlight.current = false;
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const id = setInterval(() => { if (!document.hidden) load(); }, 8000);
        const onVisible = () => { if (!document.hidden) load(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
    }, []);

    return (
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 md:p-8 bg-slate-50">
            <div className="w-full max-w-none space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="w-full pl-14 lg:pl-0 text-right lg:text-left">
                        <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase text-slate-900">
                            Salón
                        </h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 italic mt-1">
                            Atención del local
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={load}
                        className="p-3 rounded-2xl bg-white border border-slate-100 text-slate-800 hover:text-slate-900"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                <SalonFloorPlan
                    tables={tables}
                    onOpen={(table) => router.push(`/salon/${table.id}?cuenta=${table.billRequest ? '1' : '0'}`)}
                />
            </div>
        </div>
    );
}
