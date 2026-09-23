'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowDown, Instagram } from 'lucide-react';
import { useTableSession } from '../../context/TableSessionContext';
import FloatingDishes from './FloatingDishes';

const ENABLED = process.env.NEXT_PUBLIC_COMING_SOON === 'true';
const PREVIEW_KEY = 'lr_coming_soon_preview';

export default function ComingSoonGate({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { session, ready } = useTableSession();
    const [preview, setPreview] = useState(false);
    const [mesaQuery, setMesaQuery] = useState(false);
    const [checked, setChecked] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('preview') === '1' || pathname.startsWith('/admin')) {
            localStorage.setItem(PREVIEW_KEY, '1');
            sessionStorage.setItem(PREVIEW_KEY, '1');
        }
        setMesaQuery(Boolean(params.get('mesa')));
        setPreview(
            localStorage.getItem(PREVIEW_KEY) === '1' ||
            sessionStorage.getItem(PREVIEW_KEY) === '1',
        );
        setChecked(true);
        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'coming-soon',hypothesisId:'H-SOON',location:'ComingSoonGate.tsx:check',message:'coming soon gate resolved',data:{enabled:ENABLED,preview:localStorage.getItem(PREVIEW_KEY)==='1',path:pathname},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
    }, [pathname]);

    const tableBypass = pathname.startsWith('/mesa') || pathname.startsWith('/admin') || Boolean(session) || mesaQuery;
    const hidden = !ENABLED || preview || tableBypass;

    if (!ready || !checked) {
        return ENABLED ? <div className="min-h-screen bg-slate-100" /> : <>{children}</>;
    }

    if (hidden) {
        return (
            <>
                {children}
                {ENABLED && preview && (
                    <div className="fixed bottom-4 left-4 z-[90] flex items-center gap-2 bg-slate-900 text-white px-3 py-2 rounded-full shadow-lg">
                        <span className="text-[10px] font-black uppercase tracking-widest">Vista admin</span>
                        <button
                            type="button"
                            onClick={() => {
                                localStorage.removeItem(PREVIEW_KEY);
                                sessionStorage.removeItem(PREVIEW_KEY);
                                window.location.href = '/';
                            }}
                            className="text-[10px] font-black uppercase tracking-widest text-orange-400 hover:text-orange-300"
                        >
                            Salir
                        </button>
                    </div>
                )}
            </>
        );
    }

    return (
        <div className="relative min-h-screen min-h-dvh overflow-hidden bg-[#fff6ea]">
            <FloatingDishes cardRef={cardRef} />

            <div className="relative z-10 min-h-screen min-h-dvh flex items-center justify-center p-5">
                <div ref={cardRef} className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl px-8 py-10 text-center border border-white/70">
                    <img
                        src="/assets/Logo Restaurante.png"
                        alt="Lo Más Rico"
                        className="h-20 w-20 mx-auto object-contain mb-5"
                    />
                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#f2642e] mb-3">
                        Pronto
                    </p>
                    <h1 className="text-3xl font-[900] italic uppercase tracking-tighter text-slate-900 leading-none">
                        Atento a nuestra<br />reapertura
                    </h1>
                    <p className="mt-4 text-sm font-bold text-slate-500 leading-relaxed">
                        Nueva dirección. Síguenos y enterate primero.
                    </p>
                    <ArrowDown className="mx-auto mt-5 mb-2 text-[#f2642e] animate-bounce" size={28} strokeWidth={2.5} />
                    <a
                        href="https://www.instagram.com/cevichelomasrico/"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-[#f2642e] transition-colors"
                    >
                        <Instagram size={16} />
                        @cevichelomasrico
                    </a>
                    <p className="mt-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Cevichería · Concepción
                    </p>
                </div>
            </div>
        </div>
    );
}
