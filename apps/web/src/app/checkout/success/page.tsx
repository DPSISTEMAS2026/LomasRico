'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, ShoppingBag, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { CART_STORAGE, useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { API_URL } from '../../../services/api';

function SuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderId = searchParams.get('orderId');
    const paymentId = searchParams.get('payment_id');
    const tuuResult = searchParams.get('x_result');
    const tuuCode = /^LMR(\d+)-/.exec(searchParams.get('x_reference') || '')?.[1];
    const status = tuuResult === 'completed' ? 'approved' : searchParams.get('status');
    const rejected = !!tuuResult && tuuResult !== 'completed';
    const [confirming, setConfirming] = useState(!!tuuResult && tuuResult === 'completed');
    const [confirmNote, setConfirmNote] = useState('');

    const { clearCart } = useCart();
    const { isLoggedIn } = useAuth();

    useEffect(() => {
        if (rejected) {
            router.replace(`/checkout/failure?${searchParams.toString()}`);
            return;
        }
        localStorage.removeItem(CART_STORAGE);
        try { sessionStorage.removeItem('lr_pending_web_order'); } catch { /* privado */ }
        clearCart();

        // TUU: reenviar campos firmados al API (el callback servidor a veces no llega).
        if (tuuResult === 'completed' && searchParams.get('x_signature')) {
            const body: Record<string, string> = {};
            searchParams.forEach((value, key) => {
                if (key.startsWith('x_')) body[key] = value;
            });
            // #region agent log
            fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'web-orders',hypothesisId:'E',location:'checkout/success:tuuComplete',message:'forwarding TUU return to API',data:{ref:body.x_reference,result:body.x_result,amount:body.x_amount},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            fetch(`${API_URL}/payments/tuu/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
                .then(async (res) => {
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) setConfirmNote(data.message || 'No pudimos avisar a cocina automáticamente. Si pagaste, avísanos en el local.');
                    else if (data.confirmed) setConfirmNote('Pedido enviado a cocina.');
                    else setConfirmNote('');
                })
                .catch(() => setConfirmNote('No pudimos avisar a cocina automáticamente. Si pagaste, avísanos en el local.'))
                .finally(() => setConfirming(false));
        } else {
            setConfirming(false);
        }
    }, []);

    if (rejected) return null;

    return (
        <div className="min-h-screen min-w-0 overflow-x-hidden bg-slate-50 flex items-center justify-center p-6">
            <div className="max-w-lg w-full">
                {/* Success Card */}
                <div className="bg-white rounded-[2rem] p-6 sm:p-10 shadow-xl border border-green-100 text-center">
                    {/* Animated Check */}
                    <div className="relative mx-auto w-24 h-24 mb-8">
                        <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-30"></div>
                        <div className="relative w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
                            <CheckCircle2 size={48} className="text-white" strokeWidth={2.5} />
                        </div>
                    </div>

                    <h1 className="text-4xl font-[900] italic uppercase tracking-tighter text-slate-900 leading-[0.9] mb-3">
                        ¡Pago<br />Exitoso!
                    </h1>
                    <p className="text-slate-900 font-medium mb-4">
                        {confirming ? 'Confirmando tu pedido en cocina…' : 'Tu pedido fue confirmado y está siendo preparado.'}
                    </p>
                    {confirming && (
                        <div className="flex justify-center mb-6">
                            <Loader2 className="animate-spin text-[#f2642e]" size={28} />
                        </div>
                    )}
                    {!!confirmNote && !confirming && (
                        <p className="text-xs font-bold text-slate-700 mb-6">{confirmNote}</p>
                    )}

                    {/* Order Details */}
                    <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left space-y-3">
                        {(orderId || tuuCode) && (
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Orden</span>
                                <span className="font-black text-xs text-slate-700 font-mono">{tuuCode ? `#${tuuCode}` : orderId!.slice(-8).toUpperCase()}</span>
                            </div>
                        )}
                        {paymentId && (
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">ID Pago</span>
                                <span className="font-black text-xs text-slate-700 font-mono">{paymentId}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Estado</span>
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                {status === 'approved' ? '✅ Aprobado' : status}
                            </span>
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
                            href="/"
                            className="w-full bg-[#f2642e] text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-[#d9501d] transition-all shadow-lg shadow-orange-100 flex items-center justify-center gap-2"
                        >
                            <ShoppingBag size={18} />
                            Seguir Comprando
                        </Link>
                        {isLoggedIn ? (
                            <Link
                                href="/profile"
                                className="w-full bg-slate-100 text-slate-900 py-4 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                            >
                                Ver Mis Pedidos
                            </Link>
                        ) : (
                            <Link
                                href="/?registro=1"
                                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
                            >
                                Crear cuenta y sumar puntos
                            </Link>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-[10px] font-bold text-slate-900 uppercase tracking-widest mt-6">
                    Recibirás un email de confirmación pronto
                </p>
            </div>
        </div>
    );
}

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
            <SuccessContent />
        </Suspense>
    );
}
