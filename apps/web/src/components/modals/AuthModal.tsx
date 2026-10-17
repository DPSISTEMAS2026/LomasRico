'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { forgotPassword } from '../../services/api';
import { X, Mail, Lock, User, Phone, ArrowRight, Loader2 } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'LOGIN' | 'REGISTER';
}

export const CHECKOUT_CONTACT = 'lr_checkout_contact';

export default function AuthModal({ isOpen, onClose, initialMode = 'LOGIN' }: Props) {
    const { loginWithEmail, register, loginWithGoogle, verifyEmail } = useAuth();
    const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'VERIFY' | 'WELCOME' | 'FORGOT' | 'FORGOT_OK'>('LOGIN');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [recoverId, setRecoverId] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setMode(initialMode);
        setError('');
        setInfo('');
        try {
            const saved = JSON.parse(localStorage.getItem(CHECKOUT_CONTACT) || 'null');
            if (saved) {
                setName((v) => v || saved.name || '');
                setPhone((v) => v || saved.phone || '');
                setEmail((v) => v || saved.email || '');
                setRecoverId((v) => v || saved.email || saved.phone || '');
            }
        } catch { /* sin datos previos */ }
    }, [isOpen, initialMode]);

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
                    document.getElementById('google-login-modal-btn'),
                    { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with' },
                );
            }
        }
    }, [isOpen, mode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setInfo('');
        setLoading(true);

        try {
            if (mode === 'LOGIN') {
                await loginWithEmail({ email, password });
                onClose();
            } else if (mode === 'REGISTER') {
                const res = await register({ email, password, name, phone });
                if (res?.warning) setError(res.warning);
                setMode(res?.requiresVerification !== false ? 'VERIFY' : 'WELCOME');
            } else if (mode === 'VERIFY') {
                await verifyEmail(email, verificationCode);
                await loginWithEmail({ email, password });
                setMode('WELCOME');
            } else if (mode === 'FORGOT') {
                const res = await forgotPassword(recoverId.trim());
                setInfo(res?.message || 'Si la cuenta existe, enviamos una contraseña temporal a tu correo.');
                setMode('FORGOT_OK');
            }
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const title =
        mode === 'LOGIN' ? 'Bienvenido'
            : mode === 'REGISTER' ? 'Únete al Club'
                : mode === 'VERIFY' ? 'Verificación'
                    : mode === 'FORGOT' || mode === 'FORGOT_OK' ? 'Recuperar acceso'
                        : 'Bienvenido';

    const subtitle =
        mode === 'LOGIN' ? 'Correo + los 4 últimos dígitos de tu celular'
            : mode === 'REGISTER' ? 'Crea tu cuenta en segundos'
                : mode === 'VERIFY' ? 'Ingresa el código enviado a tu correo'
                    : mode === 'FORGOT' ? 'Correo o celular de tu cuenta'
                        : mode === 'FORGOT_OK' ? 'Revisa tu correo'
                            : '';

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] w-full max-w-md p-6 md:p-10 relative overflow-hidden animate-in zoom-in-95 duration-300 shadow-2xl">
                <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors">
                    <X size={20} className="text-slate-900" />
                </button>

                {mode === 'WELCOME' ? (
                    <div className="text-center space-y-6 py-4">
                        <img src="/assets/Logo Restaurante.png" alt="Lo Más Rico" className="h-20 w-20 object-contain mx-auto" />
                        <h2 className="text-3xl font-[900] italic tracking-tighter uppercase text-slate-900 leading-none">
                            ¡Bienvenido al Club!
                        </h2>
                        <p className="text-sm font-bold text-slate-900">
                            Tu cuenta está lista. Desde ahora acumulas puntos con tus compras y accedes a descuentos y promociones exclusivas.
                        </p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full bg-[#f2642e] text-white p-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-[#d9501d] transition-colors shadow-lg flex items-center justify-center gap-2"
                        >
                            Empezar <ArrowRight size={16} />
                        </button>
                    </div>
                ) : mode === 'FORGOT_OK' ? (
                    <div className="text-center space-y-5 py-4">
                        <h2 className="text-3xl font-[900] italic tracking-tighter uppercase text-slate-900 leading-none">Listo</h2>
                        <p className="text-sm font-bold text-slate-900 leading-relaxed">
                            {info || 'Si la cuenta existe, enviamos una contraseña temporal a tu correo.'}
                        </p>
                        <p className="text-xs font-bold text-slate-900 leading-relaxed">
                            Entra con tu correo y la clave del mail. Después cámbiala en tu perfil.
                        </p>
                        <button
                            type="button"
                            onClick={() => { setMode('LOGIN'); setError(''); setInfo(''); }}
                            className="w-full bg-slate-900 text-white p-4 rounded-xl font-black uppercase tracking-widest text-xs"
                        >
                            Ir a ingresar
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-[900] italic tracking-tighter uppercase text-slate-900 leading-none">
                                {title}
                            </h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 mt-2">
                                {subtitle}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {mode === 'REGISTER' && (
                                <>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-3.5 text-slate-900" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Nombre Completo"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full bg-slate-50 border-2 border-transparent p-3 pl-12 rounded-xl font-bold text-sm outline-none focus:border-slate-900 transition-all placeholder:text-slate-700 text-slate-900"
                                        />
                                    </div>
                                    <div className="relative group">
                                        <Phone className="absolute left-4 top-3.5 text-slate-900" size={18} />
                                        <input
                                            type="tel"
                                            placeholder="Teléfono (WhatsApp)"
                                            required
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full bg-slate-50 border-2 border-transparent p-3 pl-12 rounded-xl font-bold text-sm outline-none focus:border-slate-900 transition-all placeholder:text-slate-700 text-slate-900"
                                        />
                                    </div>
                                </>
                            )}

                            {mode === 'VERIFY' && (
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-3.5 text-slate-900" size={18} />
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        placeholder="Código de 6 dígitos"
                                        required
                                        minLength={6}
                                        maxLength={6}
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                        className="w-full bg-slate-50 border-2 border-transparent p-3 pl-12 rounded-xl font-bold text-center text-xl tracking-[0.5em] outline-none focus:border-slate-900 transition-all placeholder:text-slate-700 text-slate-900"
                                    />
                                </div>
                            )}

                            {mode === 'FORGOT' && (
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-3.5 text-slate-900" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Correo o celular"
                                        required
                                        value={recoverId}
                                        onChange={(e) => setRecoverId(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-transparent p-3 pl-12 rounded-xl font-bold text-sm outline-none focus:border-slate-900 transition-all placeholder:text-slate-700 text-slate-900"
                                    />
                                </div>
                            )}

                            {(mode === 'LOGIN' || mode === 'REGISTER') && (
                                <>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-3.5 text-slate-900" size={18} />
                                        <input
                                            type="text"
                                            inputMode="email"
                                            autoComplete="username"
                                            placeholder={mode === 'LOGIN' ? 'Correo o celular' : 'Correo Electrónico'}
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-slate-50 border-2 border-transparent p-3 pl-12 rounded-xl font-bold text-sm outline-none focus:border-slate-900 transition-all placeholder:text-slate-700 text-slate-900"
                                        />
                                    </div>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-3.5 text-slate-900" size={18} />
                                        <input
                                            type="password"
                                            placeholder={mode === 'LOGIN' ? 'Contraseña o 4 dígitos del celular' : 'Contraseña'}
                                            required
                                            minLength={4}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-slate-50 border-2 border-transparent p-3 pl-12 rounded-xl font-bold text-sm outline-none focus:border-slate-900 transition-all placeholder:text-slate-700 text-slate-900"
                                        />
                                    </div>
                                </>
                            )}

                            {mode === 'LOGIN' && (
                                <div className="text-right -mt-1">
                                    <button
                                        type="button"
                                        onClick={() => { setMode('FORGOT'); setError(''); setRecoverId(email || phone || ''); }}
                                        className="text-[10px] font-black uppercase tracking-widest text-[#f2642e] hover:underline"
                                    >
                                        Olvidé mi contraseña
                                    </button>
                                </div>
                            )}

                            {error && (
                                <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-lg text-center">
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
                                        {mode === 'LOGIN' ? 'Ingresar' : mode === 'REGISTER' ? 'Registrarme' : mode === 'FORGOT' ? 'Enviar clave temporal' : 'Verificar'}
                                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        {mode === 'FORGOT' && (
                            <button
                                type="button"
                                onClick={() => { setMode('LOGIN'); setError(''); }}
                                className="mt-4 w-full text-xs font-bold text-slate-900 uppercase tracking-wide hover:underline"
                            >
                                Volver a ingresar
                            </button>
                        )}

                        {(mode === 'LOGIN' || mode === 'REGISTER') && (
                            <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                                <p className="text-slate-900 text-xs font-bold uppercase tracking-wide mb-4">O continúa con</p>
                                <div id="google-login-modal-btn" className="flex justify-center h-[40px]" />
                                <div className="mt-6 flex justify-center gap-1 text-xs font-bold">
                                    <span className="text-slate-900">{mode === 'LOGIN' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}</span>
                                    <button
                                        type="button"
                                        onClick={() => { setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN'); setError(''); }}
                                        className="text-[#f2642e] uppercase hover:underline"
                                    >
                                        {mode === 'LOGIN' ? 'Regístrate' : 'Ingresa'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
