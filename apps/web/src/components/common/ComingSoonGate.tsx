'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Instagram } from 'lucide-react';
import { LOCATION } from '@lomasrico/shared-types';
import { useTableSession } from '../../context/TableSessionContext';
import FloatingDishes from './FloatingDishes';
import AuthModal from '../modals/AuthModal';

const ENABLED = process.env.NEXT_PUBLIC_COMING_SOON === 'true';
const PREVIEW_KEY = 'lr_coming_soon_preview';
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(LOCATION.address)}`;
const WAZE_URL = `https://waze.com/ul?q=${encodeURIComponent(LOCATION.address)}&navigate=true`;

export default function ComingSoonGate({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { session, ready } = useTableSession();
    const [preview, setPreview] = useState(false);
    const [mesaQuery, setMesaQuery] = useState(false);
    const [checked, setChecked] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);
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
                        Abrimos mañana
                    </p>
                    <h1 className="text-3xl font-[900] italic uppercase tracking-tighter text-slate-900 leading-none">
                        Gran<br />reapertura
                    </h1>
                    <p className="mt-4 text-sm font-bold text-slate-900 leading-relaxed">
                        Delivery y retiro en nuestra nueva dirección. Regístrate hoy y suma puntos desde tu primer pedido.
                    </p>

                    <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#f2642e]">Horario</p>
                        <p className="text-xs font-bold text-slate-900">Lun–Mié · 14:30 a 21:00</p>
                        <p className="text-xs font-bold text-slate-900">Jue–Dom · 11:30 a 22:00</p>
                    </div>

                    <div className="mt-5 rounded-2xl border-2 border-[#f2642e]/25 bg-orange-50/60 px-4 py-3 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#f2642e]">Nueva dirección</p>
                        <p className="text-sm font-black text-slate-900 leading-snug">{LOCATION.address}</p>
                        <div className="flex items-center justify-center gap-4 pt-1">
                            <a
                                href={MAPS_URL}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                                aria-label="Abrir en Google Maps"
                            >
                                <img src="/assets/maps/google-maps.svg" alt="" className="h-9 w-9" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-900">Maps</span>
                            </a>
                            <a
                                href={WAZE_URL}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                                aria-label="Abrir en Waze"
                            >
                                <img src="/assets/maps/waze.svg" alt="" className="h-9 w-9" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-900">Waze</span>
                            </a>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setAuthOpen(true)}
                        className="mt-6 w-full inline-flex items-center justify-center bg-[#f2642e] text-white px-6 py-3.5 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-[#d9551f] transition-colors"
                    >
                        Crear cuenta
                    </button>
                    <p className="mt-2 text-[11px] font-bold text-slate-900 leading-snug">
                        En pocos pasos: guarda preferencias y acumula puntos.
                    </p>
                    <p className="mt-3 text-[10px] font-bold text-slate-900 leading-snug">
                        Si ya estás registrado, podrás ingresar con los 4 últimos dígitos del celular registrado en tu cuenta. Después puedes cambiar la contraseña.
                    </p>

                    <a
                        href="https://www.instagram.com/cevichelomasrico/"
                        target="_blank"
                        rel="noreferrer"
                        className="mt-5 inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-slate-800 transition-colors"
                    >
                        <Instagram size={16} />
                        @cevichelomasrico
                    </a>
                    <p className="mt-5 text-[10px] font-bold uppercase tracking-widest text-slate-900">
                        Cevichería · Concepción
                    </p>
                </div>
            </div>

            <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode="REGISTER" />
        </div>
    );
}
