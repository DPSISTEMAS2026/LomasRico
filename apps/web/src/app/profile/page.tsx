'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { User, Phone, Mail, Loader2, ArrowLeft, Copy, BarChart3, Save, MapPin, Trash2, Home, Plus } from 'lucide-react';
import { getUserAddresses, addUserAddress } from '../../services/api';
import AddressAutocomplete from '../../components/common/AddressAutocomplete';

export default function ProfilePage() {
    const { user, isLoggedIn, loading: authLoading, updateProfile, changePassword, logout } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');

    // Edit States
    const [phone, setPhone] = useState('');

    // Address States
    const [addresses, setAddresses] = useState<any[]>([]);
    const [showAddrForm, setShowAddrForm] = useState(false);
    const [newAddrText, setNewAddrText] = useState('');
    const [newCoords, setNewCoords] = useState<{ lat?: number; lng?: number }>({});

    // Password States
    const [showPassForm, setShowPassForm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        if (!authLoading && !isLoggedIn) {
            router.push('/');
        } else if (user) {
            setPhone(user.phone || '');
            loadAddresses();
        }
    }, [isLoggedIn, user, authLoading]);

    const loadAddresses = async () => {
        if (!user) return;
        try {
            const data = await getUserAddresses(user.id);
            setAddresses(data);
        } catch (e) {
            console.error('Error loading addresses');
        }
    };

    const handleAddAddress = async () => {
        if (!newAddrText || !user) return;
        setLoading(true);
        try {
            await addUserAddress(user.id, {
                addressText: newAddrText,
                isDefault: addresses.length === 0,
                latitude: newCoords.lat,
                longitude: newCoords.lng
            });
            setShowAddrForm(false);
            setNewAddrText('');
            loadAddresses();
            setMsg('Dirección agregada');
            setTimeout(() => setMsg(''), 3000);
        } catch (e) {
            setError('Error al guardar dirección');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        setLoading(true);
        setMsg('');
        setError('');
        try {
            await updateProfile({ phone });
            setMsg('Perfil actualizado correctamente');
            setTimeout(() => setMsg(''), 3000);
        } catch (e) {
            setError('Error al actualizar perfil');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword) {
            setError('Completa ambos campos de contraseña');
            return;
        }
        setLoading(true);
        setMsg('');
        setError('');
        try {
            await changePassword({ currentPassword, newPassword });
            setMsg('Contraseña cambiada con éxito');
            setShowPassForm(false);
            setCurrentPassword('');
            setNewPassword('');
            setTimeout(() => setMsg(''), 3000);
        } catch (e: any) {
            setError(e.message || 'Error al cambiar contraseña');
        } finally {
            setLoading(false);
        }
    };

    const copyId = () => {
        if (user?.id) {
            navigator.clipboard.writeText(user.id);
            setMsg('ID copiado al portapapeles');
            setTimeout(() => setMsg(''), 2000);
        }
    };

    if (authLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="animate-spin text-slate-400" size={40} />
        </div>
    );

    if (!isLoggedIn) return null;
    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6 flex items-start md:items-center justify-center pt-10 md:pt-6">
            <div className="max-w-md w-full animate-in fade-in zoom-in-95 duration-500">
                <button onClick={() => router.push('/')} className="mb-6 md:mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-black text-[10px] md:text-xs uppercase tracking-widest italic">
                    <ArrowLeft size={16} /> VOLVER AL INICIO
                </button>

                <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 mb-10 md:mb-20">
                    <div className="bg-slate-900 p-6 md:p-8 text-center text-white relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                        <div className="w-20 h-20 md:w-24 md:h-24 bg-white/10 backdrop-blur-sm rounded-full mx-auto mb-4 border-2 md:border-4 border-white/20 flex items-center justify-center overflow-hidden relative z-10 shadow-xl">
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} className="w-full h-full object-cover" />
                            ) : (
                                <User size={32} className="text-white md:w-10 md:h-10 opacity-50" />
                            )}
                        </div>
                        <h1 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter relative z-10 leading-tight">{user.name}</h1>
                        <p className="text-orange-500 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mt-1 relative z-10 italic">Rango: {user.role}</p>
                    </div>

                    <div className="p-6 md:p-8 space-y-6">
                        {/* ID Section for Automation */}
                        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 group relative shadow-sm">
                            <p className="text-[9px] font-black uppercase text-orange-500 tracking-widest mb-1 italic">Identificador Único</p>
                            <div className="flex items-center justify-between">
                                <code className="font-mono text-[11px] font-bold text-orange-950 truncate pr-4">{user.id}</code>
                                <button onClick={copyId} className="p-2 bg-white rounded-xl text-orange-500 shadow-md hover:scale-110 active:scale-95 transition-all">
                                    <Copy size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">
                                    <Mail size={12} className="text-orange-500" /> Correo Institucional
                                </label>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs md:text-sm font-bold text-slate-600 truncate">
                                    {user.email}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">
                                    <Phone size={12} className="text-orange-500" /> WhatsApp Directo
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="+569..."
                                    className="w-full p-4 bg-slate-50 md:bg-white border-2 border-transparent md:border-slate-100 rounded-2xl font-bold text-xs md:text-sm outline-none focus:border-slate-900 focus:bg-white transition-all text-slate-900 shadow-sm"
                                />
                            </div>
                        </div>

                        {msg && (
                            <div className="text-center p-3 bg-green-50 text-green-700 text-[10px] font-black uppercase italic rounded-xl border border-green-100 animate-in fade-in">
                                {msg}
                            </div>
                        )}
                        {error && (
                            <div className="text-center p-3 bg-red-50 text-red-700 text-[10px] font-black uppercase italic rounded-xl border border-red-100 animate-in fade-in">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleUpdate}
                            disabled={loading}
                            className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={16} /> : (
                                <>
                                    <Save size={16} /> GUARDAR CAMBIOS
                                </>
                            )}
                        </button>

                        {/* Addresses Section */}
                        <div className="pt-8 border-t border-slate-100">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-[10px] font-black uppercase text-slate-900 tracking-[0.2em] flex items-center gap-2 italic">
                                    <MapPin size={14} strokeWidth={3} className="text-orange-500" /> Direcciones
                                </h3>
                                {!showAddrForm && (
                                    <button
                                        onClick={() => setShowAddrForm(true)}
                                        className="px-3 py-1.5 bg-orange-500 text-white rounded-xl font-black text-[9px] uppercase italic tracking-tighter hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 active:scale-95"
                                    >
                                        + AÑADIR
                                    </button>
                                )}
                            </div>

                            <div className="space-y-3">
                                {showAddrForm ? (
                                    <div className="bg-slate-50 p-4 md:p-5 rounded-[2rem] border-2 border-slate-900 shadow-xl space-y-4 animate-in slide-in-from-top-4">
                                        <AddressAutocomplete
                                            onSelect={(d) => { setNewAddrText(d.address); setNewCoords({ lat: d.lat, lng: d.lng }); }}
                                            placeholder="Busca calle y número..."
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleAddAddress}
                                                disabled={loading || !newAddrText}
                                                className="flex-1 bg-slate-900 text-white p-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-slate-200"
                                            >
                                                CONFIRMAR
                                            </button>
                                            <button
                                                onClick={() => setShowAddrForm(false)}
                                                className="px-4 bg-white text-slate-400 rounded-xl font-black uppercase text-[10px] border border-slate-200"
                                            >
                                                X
                                            </button>
                                        </div>
                                    </div>
                                ) : addresses.length === 0 ? (
                                    <div className="p-10 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                                        <Home size={28} className="mx-auto text-slate-300 mb-3 opacity-20" />
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic leading-tight">Sin direcciones<br />registradas</p>
                                    </div>
                                ) : (
                                    addresses.map(addr => (
                                        <div key={addr.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 group shadow-sm hover:border-orange-200 transition-colors">
                                            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:text-orange-500 transition-colors">
                                                <Home size={16} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-xs text-slate-900 truncate uppercase tracking-tight">{addr.addressText}</p>
                                                {addr.isDefault && <p className="text-[8px] font-black uppercase text-orange-500 tracking-widest mt-0.5 italic">Dirección Principal</p>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Password Change Toggle */}
                        <div className="pt-6 border-t border-slate-100">
                            {!showPassForm ? (
                                <button
                                    onClick={() => setShowPassForm(true)}
                                    className="w-full py-3 text-[9px] md:text-[10px] font-black uppercase text-slate-400 hover:text-orange-500 transition-all tracking-widest italic"
                                >
                                    ¿NECESITAS CAMBIAR TU CONTRASEÑA?
                                </button>
                            ) : (
                                <div className="space-y-4 p-4 bg-slate-50 rounded-[2rem] border border-slate-100 animate-in slide-in-from-top-2 duration-300">
                                    <h3 className="text-[9px] md:text-[10px] font-black uppercase text-slate-900 tracking-widest italic text-center">Seguridad Avanzada</h3>
                                    <input
                                        type="password"
                                        placeholder="CONTRASEÑA ACTUAL"
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        className="w-full p-3.5 bg-white border-2 border-transparent rounded-xl font-bold text-xs md:text-sm outline-none focus:border-orange-500 transition-all shadow-sm"
                                    />
                                    <input
                                        type="password"
                                        placeholder="NUEVA CONTRASEÑA"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className="w-full p-3.5 bg-white border-2 border-transparent rounded-xl font-bold text-xs md:text-sm outline-none focus:border-orange-500 transition-all shadow-sm"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleChangePassword}
                                            disabled={loading}
                                            className="flex-1 bg-orange-500 text-white p-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-100"
                                        >
                                            ACTUALIZAR
                                        </button>
                                        <button
                                            onClick={() => setShowPassForm(false)}
                                            className="px-4 p-3.5 bg-white text-slate-400 rounded-xl font-black uppercase text-[10px] border border-slate-200"
                                        >
                                            X
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-8 border-t border-slate-100">
                            <button onClick={logout} className="w-full py-4 text-red-500 font-black uppercase text-[10px] md:text-xs tracking-[0.2em] hover:bg-red-50 rounded-2xl transition-all italic border-2 border-transparent hover:border-red-100 shadow-sm active:scale-95">
                                CERRAR SESIÓN SEGURA
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
