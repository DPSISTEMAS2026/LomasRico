'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

function FailureContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="max-w-lg w-full">
                {/* Failure Card */}
                <div className="bg-white rounded-[2rem] p-10 shadow-xl border border-red-100 text-center">
                    {/* Animated X */}
                    <div className="relative mx-auto w-24 h-24 mb-8">
                        <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-30"></div>
                        <div className="relative w-24 h-24 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-200">
                            <XCircle size={48} className="text-white" strokeWidth={2.5} />
                        </div>
                    </div>

                    <h1 className="text-4xl font-[900] italic uppercase tracking-tighter text-slate-900 leading-[0.9] mb-3">
                        Pago<br />Rechazado
                    </h1>
                    <p className="text-slate-500 font-medium mb-8">
                        No pudimos procesar tu pago. El pedido no fue confirmado.
                    </p>

                    {/* Tips */}
                    <div className="bg-red-50 rounded-2xl p-6 mb-8 text-left space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-3">Posibles causas</p>
                        <p className="text-sm font-medium text-slate-600">• Fondos insuficientes en la tarjeta</p>
                        <p className="text-sm font-medium text-slate-600">• Datos de la tarjeta incorrectos</p>
                        <p className="text-sm font-medium text-slate-600">• Pago cancelado por el banco</p>
                        <p className="text-sm font-medium text-slate-600">• Límite de crédito alcanzado</p>
                    </div>

                    {/* Brand */}
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <img src="/assets/Logo Restaurante.png" alt="Lo Más Rico" className="h-10 w-10 object-contain" />
                        <div>
                            <p className="text-sm font-[900] italic tracking-tighter uppercase leading-none text-slate-900">LO MÁS RICO</p>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#f2642e]">Premium Cevichería</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        <Link
                            href="/"
                            className="w-full bg-[#f2642e] text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-[#d9501d] transition-all shadow-lg shadow-orange-100 flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={18} />
                            Intentar Nuevamente
                        </Link>
                        <Link
                            href="/"
                            className="w-full bg-slate-100 text-slate-700 py-4 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={18} />
                            Volver al Inicio
                        </Link>
                    </div>
                </div>

                {/* Support */}
                <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-6">
                    ¿Problemas? Contáctanos por Whatsapp
                </p>
            </div>
        </div>
    );
}

export default function CheckoutFailurePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
            <FailureContent />
        </Suspense>
    );
}
