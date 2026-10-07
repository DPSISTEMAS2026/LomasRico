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
    const lastVersion = useRef<string | null>(null);

    const load = async (): Promise<boolean> => {
        if (inFlight.current) return false;
        inFlight.current = true;
        try {
            const res = await authFetch(`${API_URL}/tables`);
            if (!res.ok) return false;
            setTables(await res.json());
            return true;
        } catch {
            return false;
        } finally {
            inFlight.current = false;
            setLoading(false);
        }
    };

    const loadIfChanged = async () => {
        try {
            const res = await authFetch(`${API_URL}/tables/version`, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { v } = await res.json();
            if (v === lastVersion.current) return;
            if (await load()) lastVersion.current = v;
        } catch {
            lastVersion.current = null;
            await load();
        }
    };

    const [, setClock] = useState(0);
    useEffect(() => {
        const tick = setInterval(() => setClock(Date.now()), 30_000);
        return () => clearInterval(tick);
    }, []);

    useEffect(() => {
        loadIfChanged();
        const check = setInterval(() => { if (!document.hidden) loadIfChanged(); }, 5000);
        const full = setInterval(() => { if (!document.hidden) load(); }, 120_000);
        const onVisible = () => { if (!document.hidden) loadIfChanged(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearInterval(check);
            clearInterval(full);
            document.removeEventListener('visibilitychange', onVisible);
        };
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
