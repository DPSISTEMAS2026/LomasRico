'use client';

import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { ManualContent } from './content';

const TOC = [
    { id: 'acceso', label: '1. Acceso al Sistema' },
    { id: 'web', label: '2. Web E-commerce' },
    { id: 'panel', label: '3. Panel de Administración' },
    { id: 'pos', label: '4. Punto de Venta (POS)' },
    { id: 'cocina', label: '5. Panel Cocina (KDS)' },
    { id: 'whatsapp', label: '6. WhatsApp Bot "Maxi"' },
    { id: 'integraciones', label: '7. Integraciones' },
    { id: 'health', label: '8. Monitoreo Automático' },
    { id: 'faq', label: '9. FAQ y Soporte' },
];

export default function ManualPage() {
    const [activeId, setActiveId] = useState('acceso');

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.find(e => e.isIntersecting);
                if (visible) setActiveId(visible.target.id);
            },
            { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
        );
        TOC.forEach(t => {
            const el = document.getElementById(t.id);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, []);

    return (
        <div className="flex gap-8 animate-in fade-in duration-500">
            {/* TOC sticky */}
            <nav className="hidden lg:block w-56 shrink-0">
                <div className="sticky top-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic mb-4 flex items-center gap-2">
                        <BookOpen size={12} className="text-orange-500" /> Índice
                    </p>
                    <div className="space-y-1">
                        {TOC.map(t => (
                            <a
                                key={t.id}
                                href={`#${t.id}`}
                                className={`block text-[11px] font-bold py-1.5 px-3 rounded-lg transition-all ${
                                    activeId === t.id
                                        ? 'bg-orange-50 text-orange-600 border-l-2 border-orange-500'
                                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                {t.label}
                            </a>
                        ))}
                    </div>
                </div>
            </nav>

            {/* Contenido del manual */}
            <div className="flex-1 max-w-3xl pb-20">
                <ManualContent />
            </div>
        </div>
    );
}
