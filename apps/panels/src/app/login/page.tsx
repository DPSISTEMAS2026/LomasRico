'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import {
    Lock,
    Mail,
    Loader2,
    ChevronRight,
    AlertCircle
} from 'lucide-react';

export default function LoginPage() {
    const { loginWithEmail, loginWithPin, user } = useAuth();
    const router = useRouter();
    const [mode, setMode] = useState<'ADMIN' | 'STAFF'>('ADMIN');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [pin, setPin] = useState('');

    // Si ya está logueado, redirigir al dashboard adecuado
    useEffect(() => {
        if (user) {
            if (user.role === 'ADMIN' || user.role === 'OWNER') {
                router.push('/owner');
            } else if (user.role === 'KITCHEN') {
                router.push('/kitchen');
            } else if (user.role === 'CASHIER') {
                router.push('/pos');
            } else {
                router.push('/owner'); // Fallback
            }
        }
    }, [user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (mode === 'ADMIN') {
                await loginWithEmail(formData);
            } else {
                if (pin.length < 4) throw new Error('El PIN debe ser de 4 dígitos');
                await (loginWithPin as any)(pin);
            }
        } catch (err: any) {
            setError(err.message || 'Error de autenticación. Verifique sus datos.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-orange-500/5 blur-[80px] md:blur-[120px] rounded-full -z-0 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-slate-900/5 blur-[60px] md:blur-[100px] rounded-full -z-0 -translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="w-full max-w-[480px] z-10 animate-in fade-in zoom-in-95 duration-700">
                <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 border-b-8 border-b-orange-500">
                    <div className="p-8 md:p-14">
                        {/* Header */}
                        <div className="text-center mb-6 md:mb-8">
                            <div className="w-40 h-40 md:w-56 md:h-56 flex items-center justify-center mx-auto mb-2 transform hover:scale-105 transition-transform cursor-pointer">
                                <img
                                    src="/assets/Logo Restaurante.png"
                                    alt="Lo Más Rico Logo"
                                    className="w-full h-full object-contain drop-shadow-[0_15px_15px_rgba(0,0,0,0.1)] md:drop-shadow-[0_25px_25px_rgba(0,0,0,0.15)]"
                                />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
                                LOMASRICO <span className="text-orange-500 text-4xl md:text-5xl">PRO</span>
                            </h1>
                            <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] md:tracking-[0.4em] mt-3 italic">
                                Ecosistema de Gestión Unificada
                            </p>
                        </div>

                        {/* Mode Selector */}
                        <div className="grid grid-cols-2 gap-2 md:gap-3 mb-8 md:mb-10 bg-slate-50 p-2 rounded-2xl md:rounded-3xl">
                            <button
                                onClick={() => { setMode('ADMIN'); setError(''); }}
                                className={`py-2.5 md:py-3 rounded-xl md:rounded-[1.25rem] font-black uppercase italic text-[9px] md:text-[10px] tracking-wider md:tracking-widest transition-all ${mode === 'ADMIN' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Administrador
                            </button>
                            <button
                                onClick={() => { setMode('STAFF'); setError(''); }}
                                className={`py-2.5 md:py-3 rounded-xl md:rounded-[1.25rem] font-black uppercase italic text-[9px] md:text-[10px] tracking-wider md:tracking-widest transition-all ${mode === 'STAFF' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Personal
                            </button>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div className="mb-6 md:mb-8 p-3 md:p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-3 md:gap-4 text-red-600 animate-in slide-in-from-top-2">
                                <AlertCircle size={18} className="shrink-0 md:w-5 md:h-5" />
                                <p className="text-[10px] md:text-xs font-black uppercase italic leading-tight">{error}</p>
                            </div>
                        )}

                        {/* Login Form */}
                        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                            {mode === 'ADMIN' ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2 italic">Correo Institucional</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors md:w-5 md:h-5" size={18} />
                                            <input
                                                type="email"
                                                required
                                                placeholder="oscar@lomasrico.cl"
                                                className="w-full pl-14 md:pl-16 pr-6 py-4 md:py-5 bg-slate-50 border-2 border-transparent focus:border-slate-900 rounded-xl md:rounded-2xl font-bold text-slate-900 outline-none transition-all italic text-xs md:text-sm"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-end pr-2">
                                            <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2 italic">Clave de Acceso</label>
                                        </div>
                                        <div className="relative group">
                                            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors md:w-5 md:h-5" size={18} />
                                            <input
                                                type="password"
                                                required
                                                placeholder="••••••••"
                                                className="w-full pl-14 md:pl-16 pr-6 py-4 md:py-5 bg-slate-50 border-2 border-transparent focus:border-slate-900 rounded-xl md:rounded-2xl font-bold text-slate-900 outline-none transition-all italic text-xs md:text-sm"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-slate-900 p-8 md:p-10 rounded-2xl md:rounded-[2.5rem] text-center border-b-8 border-b-orange-500 shadow-2xl relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />

                                        <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] md:tracking-[0.3em] mb-4 md:mb-6 italic">PIN DE SEGURIDAD</p>
                                        <input
                                            type="password"
                                            maxLength={4}
                                            autoFocus
                                            className="bg-transparent w-full text-center text-5xl md:text-6xl font-black text-white outline-none tracking-[0.5em] md:tracking-[0.8em] placeholder:text-slate-800"
                                            placeholder="0000"
                                            value={pin}
                                            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                                        />
                                        <div className="mt-6 md:mt-8 flex justify-center gap-2 md:gap-3">
                                            {[...Array(4)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full transition-all duration-300 ${pin.length > i ? 'bg-orange-500 scale-125 shadow-[0_0_10px_rgba(249,115,22,0.8)]' : 'bg-slate-800'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-center text-[9px] md:text-[10px] font-bold text-slate-400 uppercase italic">
                                        PIN proporcionado por el administrador.
                                    </p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-slate-900 hover:bg-black text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-black uppercase italic tracking-tighter text-lg md:text-xl transition-all shadow-xl shadow-slate-200 active:scale-95 flex items-center justify-center gap-3 mt-6 md:mt-8"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin md:w-6 md:h-6" size={20} />
                                ) : (
                                    <>
                                        Entrar al Sistema
                                        <ChevronRight className="md:w-6 md:h-6" size={20} />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="bg-slate-50 p-4 md:p-6 text-center border-t border-slate-100">
                        <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-[0.15em] md:tracking-[0.2em] italic">
                            v2.2.0-unified • Gestión PRO
                        </p>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-8 md:mt-10 flex justify-between items-center px-4 md:px-6">
                    <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-300 tracking-widest italic leading-none">
                        © 2026 LO MÁS RICO
                    </p>
                    <div className="flex gap-3 md:gap-4">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 animate-pulse" />
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-blue-500" />
                    </div>
                </div>
            </div>
        </div>
    );
}
