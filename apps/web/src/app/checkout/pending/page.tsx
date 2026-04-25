'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function PendingContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');
    const paymentId = searchParams.get('payment_id');

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="max-w-lg w-full">
                {/* Pending Card */}
                <div className="bg-white rounded-[2rem] p-10 shadow-xl border border-amber-100 text-center">
                    {/* Animated Clock */}
                    <div className="relative mx-auto w-24 h-24 mb-8">
                        <div className="absolute inset-0 bg-amber-100 rounded-full animate-ping opacity-30"></div>
                        <div className="relative w-24 h-24 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-200">
                            <Clock size={48} className="text-white" strokeWidth={2.5} />
                        </div>
                    </div>

                    <h1 className="text-4xl font-[900] italic uppercase tracking-tighter text-slate-900 leading-[0.9] mb-3">
                        Pago en<br />Verificación
                    </h1>
                    <p className="text-slate-500 font-medium mb-8">
                        Tu pago está siendo procesado. Te notificaremos cuando sea confirmado.
                    </p>

                    {/* Order Details */}
                    <div className="bg-amber-50 rounded-2xl p-6 mb-8 text-left space-y-3">
                        {orderId && (
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Orden</span>
                                <span className="font-black text-xs text-slate-700 font-mono">{orderId.slice(-8).toUpperCase()}</span>
                            </div>
                        )}
                        {paymentId && (
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">ID Pago</span>
                                <span className="font-black text-xs text-slate-700 font-mono">{paymentId}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Estado</span>
                            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                ⏳ Pendiente
                            </span>
                        </div>
                        <div className="pt-2 border-t border-amber-100">
                            <p className="text-xs font-medium text-slate-500">
                                Esto puede ocurrir con pagos en efectivo (Rapipago, Pago Fácil) o transferencias bancarias que requieren procesamiento adicional.
                            </p>
                        </div>
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
                            href="/profile"
                            className="w-full bg-[#f2642e] text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-[#d9501d] transition-all shadow-lg shadow-orange-100 flex items-center justify-center gap-2"
                        >
                            Ver Mis Pedidos
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

                {/* Footer */}
                <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-6">
                    Te avisaremos por email cuando el pago sea confirmado
                </p>
            </div>
        </div>
    );
}

export default function CheckoutPendingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
            <PendingContent />
        </Suspense>
    );
}
