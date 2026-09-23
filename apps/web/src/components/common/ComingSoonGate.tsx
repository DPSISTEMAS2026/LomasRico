'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Instagram } from 'lucide-react';
import { useTableSession } from '../../context/TableSessionContext';

const ENABLED = process.env.NEXT_PUBLIC_COMING_SOON === 'true';
const PREVIEW_KEY = 'lr_coming_soon_preview';

export default function ComingSoonGate({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { session, ready } = useTableSession();
    const [preview, setPreview] = useState(false);
    const [mesaQuery, setMesaQuery] = useState(false);
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('preview') === '1') {
            sessionStorage.setItem(PREVIEW_KEY, '1');
        }
        setMesaQuery(Boolean(params.get('mesa')));
        setPreview(sessionStorage.getItem(PREVIEW_KEY) === '1');
        setChecked(true);
    }, [pathname]);

    const tableBypass = pathname.startsWith('/mesa') || Boolean(session) || mesaQuery;
    const hidden = !ENABLED || preview || tableBypass;

    if (!ready || !checked) {
        return ENABLED ? <div className="min-h-screen bg-slate-100" /> : <>{children}</>;
    }

    if (hidden) {
        return <>{children}</>;
    }

    return (
        <div className="relative min-h-screen">
            <div
                aria-hidden
                className="pointer-events-none select-none blur-[18px] brightness-75 saturate-50"
            >
                {children}
            </div>

            <div className="fixed inset-0 z-[80] flex items-center justify-center p-5 bg-slate-950/45">
                <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-[2rem] shadow-2xl px-8 py-10 text-center border border-white/60">
                    <img
                        src="/assets/Logo Restaurante.png"
                        alt="Lo Más Rico"
                        className="h-20 w-20 mx-auto object-contain mb-5"
                    />
                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#f2642e] mb-3">
                        Pronto
                    </p>
                    <h1 className="text-3xl font-[900] italic uppercase tracking-tighter text-slate-900 leading-none">
                        Estamos<br />trabajando
                    </h1>
                    <p className="mt-4 text-sm font-bold text-slate-500 leading-relaxed">
                        La nueva web de Lo Más Rico se lanza pronto.
                        Mientras tanto, síguenos en redes y pide por los canales de siempre.
                    </p>
                    <a
                        href="https://www.instagram.com/cevichelomasrico/"
                        target="_blank"
                        rel="noreferrer"
                        className="mt-7 inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-[#f2642e] transition-colors"
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
