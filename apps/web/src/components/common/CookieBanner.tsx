'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie, Settings, ShieldAlert, Check } from 'lucide-react';

interface ConsentPreferences {
    essential: boolean;
    analytics: boolean;
    marketing: boolean;
    date: string;
}

export default function CookieBanner() {
    const [isOpen, setIsOpen] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [analytics, setAnalytics] = useState(false);
    const [marketing, setMarketing] = useState(false);

    useEffect(() => {
        // Verificar si ya existe consentimiento
        const consent = localStorage.getItem('lomasrico-cookie-consent');
        if (!consent) {
            // Retardo de 1.2 segundos para una entrada más fluida y premium
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, []);

    const saveConsent = (prefs: ConsentPreferences) => {
        localStorage.setItem('lomasrico-cookie-consent', JSON.stringify(prefs));
        
        // Disparar evento personalizado por si scripts externos necesitan enterarse
        const event = new CustomEvent('lomasrico-cookie-consent-updated', { detail: prefs });
        window.dispatchEvent(event);
        
        setIsOpen(false);
    };

    const handleAcceptAll = () => {
        const prefs: ConsentPreferences = {
            essential: true,
            analytics: true,
            marketing: true,
            date: new Date().toISOString()
        };
        saveConsent(prefs);
    };

    const handleRejectAll = () => {
        const prefs: ConsentPreferences = {
            essential: true,
            analytics: false,
            marketing: false,
            date: new Date().toISOString()
        };
        saveConsent(prefs);
    };

    const handleSavePreferences = () => {
        const prefs: ConsentPreferences = {
            essential: true,
            analytics,
            marketing,
            date: new Date().toISOString()
        };
        saveConsent(prefs);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-fadeIn">
            <div className="bg-white/95 backdrop-blur-md border border-slate-100 shadow-2xl rounded-3xl p-6 md:p-8 flex flex-col gap-4 relative overflow-hidden transition-all duration-300">
                {/* Decoración sutil superior */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 to-[#f2642e]" />

                <div className="flex items-start gap-4">
                    <div className="bg-orange-50 text-[#f2642e] p-3 rounded-2xl border border-orange-100 flex-shrink-0">
                        <Cookie size={24} className="animate-pulse" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-[900] italic tracking-tight text-lg text-slate-900 uppercase">
                            Control de Cookies
                        </h3>
                        <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-1">
                            Utilizamos cookies para garantizar el funcionamiento del e-commerce y analizar el tráfico de forma segura conforme a la ley de datos de Chile.
                        </p>
                    </div>
                </div>

                {!showConfig ? (
                    <>
                        <div className="flex flex-col gap-2 mt-2">
                            <button
                                onClick={handleAcceptAll}
                                className="w-full bg-[#f2642e] hover:bg-[#d94e1b] text-white py-3 px-4 rounded-2xl font-black italic uppercase tracking-tighter transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-orange-700/10 text-xs text-center"
                            >
                                Aceptar Todo
                            </button>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={handleRejectAll}
                                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 py-2.5 px-4 rounded-xl font-bold transition-all text-xs text-center"
                                >
                                    Solo Necesarias
                                </button>
                                <button
                                    onClick={() => setShowConfig(true)}
                                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 py-2.5 px-4 rounded-xl font-bold transition-all text-xs text-center flex items-center justify-center gap-1.5"
                                >
                                    <Settings size={14} /> Configurar
                                </button>
                            </div>
                        </div>
                        <div className="text-[10px] text-center text-slate-400 font-semibold mt-1">
                            Revisa nuestra{' '}
                            <Link href="/legal/cookies" className="text-[#f2642e] hover:underline font-bold">
                                Política de Cookies
                            </Link>{' '}
                            y{' '}
                            <Link href="/legal/privacy" className="text-[#f2642e] hover:underline font-bold">
                                Privacidad
                            </Link>.
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col gap-4 mt-2">
                        <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            {/* Cookie Esencial */}
                            <div className="flex items-center justify-between gap-4">
                                <div className="text-left">
                                    <p className="text-xs font-black text-slate-900 uppercase">Necesarias / Técnicas</p>
                                    <p className="text-[10px] text-slate-400 font-semibold leading-tight">Sesión, Carro y Privacidad.</p>
                                </div>
                                <span className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center cursor-not-allowed">
                                    <Check size={14} strokeWidth={3} />
                                </span>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Cookie Analíticas */}
                            <div className="flex items-center justify-between gap-4">
                                <div className="text-left">
                                    <p className="text-xs font-black text-slate-900 uppercase">Estadísticas y Análisis</p>
                                    <p className="text-[10px] text-slate-400 font-semibold leading-tight">Medición de visitas de forma anónima.</p>
                                </div>
                                <button
                                    onClick={() => setAnalytics(!analytics)}
                                    className={`w-10 h-6 rounded-full transition-all duration-300 relative ${analytics ? 'bg-orange-500' : 'bg-slate-300'}`}
                                >
                                    <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-all duration-300 ${analytics ? 'transform translate-x-4' : ''}`} />
                                </button>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Cookie Publicidad */}
                            <div className="flex items-center justify-between gap-4">
                                <div className="text-left">
                                    <p className="text-xs font-black text-slate-900 uppercase">Marketing y Publicidad</p>
                                    <p className="text-[10px] text-slate-400 font-semibold leading-tight">Personalización y anuncios relevantes.</p>
                                </div>
                                <button
                                    onClick={() => setMarketing(!marketing)}
                                    className={`w-10 h-6 rounded-full transition-all duration-300 relative ${marketing ? 'bg-orange-500' : 'bg-slate-300'}`}
                                >
                                    <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-all duration-300 ${marketing ? 'transform translate-x-4' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowConfig(false)}
                                className="w-1/3 bg-slate-50 hover:bg-slate-100 text-slate-700 py-3 px-4 rounded-xl font-bold transition-all text-xs"
                            >
                                Atrás
                            </button>
                            <button
                                onClick={handleSavePreferences}
                                className="w-2/3 bg-[#f2642e] hover:bg-[#d94e1b] text-white py-3 px-4 rounded-xl font-black italic uppercase tracking-tighter transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-orange-700/10 text-xs text-center"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
