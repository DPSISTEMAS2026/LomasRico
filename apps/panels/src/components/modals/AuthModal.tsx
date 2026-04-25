'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Mail, Lock, User, Phone, LogIn, ArrowRight, Loader2 } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: Props) {
    const { loginWithEmail, register, loginWithGoogle, verifyEmail } = useAuth();
    const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'VERIFY'>('LOGIN');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [verificationCode, setVerificationCode] = useState('');

    useEffect(() => {
        if (isOpen && (window as any).google) {
            const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
            if (clientId) {
                (window as any).google.accounts.id.initialize({
                    client_id: clientId,
                    callback: (response: any) => {
                        loginWithGoogle(response.credential).then(() => onClose());
                    },
                });
                (window as any).google.accounts.id.renderButton(
                    document.getElementById("google-login-modal-btn"),
                    { theme: "outline", size: "large", shape: "pill", text: "continue_with" } // 'signin' or 'continue_with'
                );
            }
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'LOGIN') {
                await loginWithEmail({ email, password });
                onClose();
            } else if (mode === 'REGISTER') {
                const res = await register({ email, password, name, phone });
                if (res?.requiresVerification) {
                    setMode('VERIFY');
                } else {
                    onClose();
                }
            } else if (mode === 'VERIFY') {
                await verifyEmail(email, verificationCode);
                // Assume verifyEmail logs in or we just ask user to login
                // For better UX, let's just assume success means Verified. 
                // We might need to auto-login.
                await loginWithEmail({ email, password }); // Auto-login after verify
                onClose();
            }
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 relative overflow-hidden animate-in zoom-in-95 duration-300 shadow-2xl">
                <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors">
                    <X size={20} className="text-slate-400" />
                </button>

                <div className="text-center mb-8">
                    <h2 className="text-3xl font-[900] italic tracking-tighter uppercase text-slate-900 leading-none">
                        {mode === 'LOGIN' ? 'Bienvenido' : mode === 'REGISTER' ? 'Únete al Club' : 'Verificación'}
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">
                        {mode === 'LOGIN' ? 'Ingresa para gestionar tus pedidos' : mode === 'REGISTER' ? 'Crea tu cuenta en segundos' : 'Ingresa el código enviado a tu correo'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'REGISTER' && (
                        <>
                            <div className="relative group">
                                <User className="absolute left-4 top-3.5 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="Nombre Completo"
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-transparent p-3 pl-12 rounded-xl font-bold text-sm outline-none focus:border-slate-900 transition-all placeholder:text-slate-300 text-slate-900"
                                />
                            </div>
                            <div className="relative group">
                                <Phone className="absolute left-4 top-3.5 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={18} />
                                <input
                                    type="tel"
                                    placeholder="Teléfono (WhatsApp)"
                                    required
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-transparent p-3 pl-12 rounded-xl font-bold text-sm outline-none focus:border-slate-900 transition-all placeholder:text-slate-300 text-slate-900"
                                />
                            </div>
                        </>
                    )}

                    {mode === 'VERIFY' && (
                        <div className="relative group">
                            <Lock className="absolute left-4 top-3.5 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Código de 6 dígitos"
                                required
                                maxLength={6}
                                value={verificationCode}
                                onChange={e => setVerificationCode(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-transparent p-3 pl-12 rounded-xl font-bold text-center text-xl tracking-[0.5em] outline-none focus:border-slate-900 transition-all placeholder:text-slate-300 text-slate-900"
                            />
                        </div>
                    )}

                    {(mode !== 'VERIFY') && (
                        <>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-3.5 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={18} />
                                <input
                                    type="email"
                                    placeholder="Correo Electrónico"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-transparent p-3 pl-12 rounded-xl font-bold text-sm outline-none focus:border-slate-900 transition-all placeholder:text-slate-300 text-slate-900"
                                />
                            </div>

                            <div className="relative group">
                                <Lock className="absolute left-4 top-3.5 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={18} />
                                <input
                                    type="password"
                                    placeholder="Contraseña"
                                    required
                                    minLength={6}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-transparent p-3 pl-12 rounded-xl font-bold text-sm outline-none focus:border-slate-900 transition-all placeholder:text-slate-300 text-slate-900"
                                />
                            </div>
                        </>
                    )}

                    {error && (
                        <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-lg text-center animate-pulse">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-slate-900 text-white p-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-black transition-colors shadow-lg flex items-center justify-center gap-2 group"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (
                            <>
                                {mode === 'LOGIN' ? 'Ingresar' : mode === 'REGISTER' ? 'Registrarme' : 'Verificar'}
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                {mode !== 'VERIFY' && (
                    <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wide mb-4">O continúa con</p>
                        {/* Google Button Container */}
                        <div id="google-login-modal-btn" className="flex justify-center h-[40px]"></div>

                        <div className="mt-6 flex justify-center gap-1 text-xs font-bold">
                            <span className="text-slate-400">{mode === 'LOGIN' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}</span>
                            <button
                                onClick={() => { setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN'); setError(''); }}
                                className="text-[#f2642e] uppercase hover:underline"
                            >
                                {mode === 'LOGIN' ? 'Regístrate' : 'Ingresa'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
