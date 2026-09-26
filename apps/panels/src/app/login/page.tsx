'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../services/api';
import { Delete, Loader2, AlertCircle } from 'lucide-react';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

export default function LoginPage() {
    const { loginWithPin, user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pin, setPin] = useState('');

    useEffect(() => {
        // #region agent log
        fetch('/api/debug-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({href:typeof window!=='undefined'?window.location.href:null,ua:typeof navigator!=='undefined'?navigator.userAgent:null,apiUrl:String(API_URL)})}).catch(()=>{});
        // #endregion
        if (!user) return;
        if (user.role === 'KITCHEN') {
            router.push('/kitchen');
        } else if (user.role === 'CASHIER') {
            router.push('/salon');
        } else {
            router.push('/owner');
        }
    }, [user, router]);

    const submitPin = async (value: string) => {
        if (loading || value.length !== 4) return;
        setLoading(true);
        setError('');
        try {
            await loginWithPin(value);
        } catch (err: any) {
            setError(err.message || 'PIN incorrecto');
            setPin('');
            setLoading(false);
        }
    };

    const press = (key: string) => {
        if (loading) return;
        if (key === 'del') {
            setPin((prev) => prev.slice(0, -1));
            return;
        }
        if (!key || pin.length >= 4) return;
        const next = `${pin}${key}`;
        setPin(next);
        if (next.length === 4) {
            void submitPin(next);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-orange-500/5 blur-[80px] md:blur-[120px] rounded-full -z-0 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-slate-900/5 blur-[60px] md:blur-[100px] rounded-full -z-0 -translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="w-full max-w-[440px] z-10">
                <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 border-b-8 border-b-orange-500">
                    <div className="p-8 md:p-10">
                        <div className="text-center mb-6">
                            <div className="w-32 h-32 md:w-40 md:h-40 flex items-center justify-center mx-auto mb-2">
                                <img
                                    src="/assets/Logo Restaurante.png"
                                    alt="Lo Más Rico Logo"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <h1 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
                                LOMASRICO <span className="text-orange-500">PRO</span>
                            </h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3 italic">
                                Ingreso con PIN
                            </p>
                        </div>

                        {error && (
                            <div className="mb-5 p-3 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                                <AlertCircle size={18} className="shrink-0" />
                                <p className="text-[10px] font-black uppercase italic leading-tight">{error}</p>
                            </div>
                        )}

                        <div className="bg-slate-900 p-6 rounded-[2rem] text-center border-b-8 border-b-orange-500 mb-6">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-4 italic">
                                PIN de 4 dígitos
                            </p>
                            <div className="flex justify-center gap-3 min-h-[3rem] items-center">
                                {[0, 1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className={`w-4 h-4 rounded-full transition-all ${pin.length > i ? 'bg-orange-500 scale-125 shadow-[0_0_10px_rgba(249,115,22,0.8)]' : 'bg-slate-700'}`}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {KEYS.map((key, i) => {
                                if (key === '') {
                                    return <div key={`empty-${i}`} />;
                                }
                                if (key === 'del') {
                                    return (
                                        <button
                                            key="del"
                                            type="button"
                                            onClick={() => press('del')}
                                            disabled={loading}
                                            className="h-16 md:h-20 rounded-2xl bg-slate-100 text-slate-700 font-black active:scale-95 disabled:opacity-50 flex items-center justify-center"
                                        >
                                            <Delete size={28} />
                                        </button>
                                    );
                                }
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => press(key)}
                                        disabled={loading}
                                        className="h-16 md:h-20 rounded-2xl bg-slate-900 text-white text-3xl font-black active:scale-95 disabled:opacity-50"
                                    >
                                        {key}
                                    </button>
                                );
                            })}
                        </div>

                        {loading && (
                            <div className="mt-6 flex items-center justify-center gap-2 text-slate-400">
                                <Loader2 className="animate-spin" size={20} />
                                <span className="text-xs font-black uppercase italic">Entrando...</span>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] italic">
                            Panel táctil • 4 dígitos
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
