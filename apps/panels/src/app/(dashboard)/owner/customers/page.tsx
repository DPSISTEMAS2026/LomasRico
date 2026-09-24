'use client';

import { useState, useEffect } from 'react';
import { API_URL } from '../../../../services/api';
import { authFetch } from '../../../../services/authFetch';
import {
    Users,
    Search,
    Smartphone,
    Mail,
    Trophy,
    TrendingUp,
    AlertCircle,
    RefreshCcw,
    Filter,
    ArrowUpRight,
    Star
} from 'lucide-react';

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [brevo, setBrevo] = useState<any>(null);
    const [brevoBusy, setBrevoBusy] = useState('');
    const [brevoMsg, setBrevoMsg] = useState('');
    const [testEmail, setTestEmail] = useState('d.diazaraya19@gmail.com');

    useEffect(() => {
        loadCustomers();
        loadBrevo();
    }, []);

    useEffect(() => {
        let result = customers;

        // Filter by search
        if (searchTerm) {
            result = result.filter(c =>
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (c.phone && c.phone.includes(searchTerm))
            );
        }

        // Filter by Tag
        if (activeFilter !== 'ALL') {
            result = result.filter(c => c.customerTag === activeFilter);
        }

        setFilteredCustomers(result);
    }, [searchTerm, activeFilter, customers]);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/users/customers/list`, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setCustomers(data);
            } else {
                console.error('Error loading customers:', res.status);
            }
        } catch (e) {
            console.error('Error loading customers:', e);
        } finally {
            setLoading(false);
        }
    };

    const loadBrevo = async () => {
        try {
            const res = await authFetch(`${API_URL}/mail/status`, { cache: 'no-store' });
            if (res.ok) setBrevo(await res.json());
        } catch {
            setBrevo(null);
        }
    };

    const runBrevo = async (path: string, body?: any) => {
        setBrevoBusy(path);
        setBrevoMsg('');
        try {
            const res = await authFetch(`${API_URL}/mail/${path}`, {
                method: 'POST',
                body: body ? JSON.stringify(body) : undefined,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setBrevoMsg(data.message || `Error ${res.status}`);
                return;
            }
            setBrevoMsg(path === 'sync'
                ? `Listos ${data.imported} contactos en Brevo`
                : path === 'test'
                    ? 'Correo de prueba enviado'
                    : `Aviso enviado a ${data.sent} clientes`);
            await loadBrevo();
        } catch (e: any) {
            setBrevoMsg(e?.message || 'No se pudo hablar con Brevo');
        } finally {
            setBrevoBusy('');
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
                <RefreshCcw size={48} className="text-orange-500 mb-4 animate-spin" />
                <p className="text-xl font-black uppercase tracking-tighter italic animate-pulse">
                    Sincronizando Base de Datos...
                </p>
            </div>
        );
    }

    const tags = ['ALL', 'Regular', 'En Riesgo', 'Nuevo'];

    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 px-1">
                <div className="w-full text-center lg:text-left">
                    <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none text-slate-900 flex flex-wrap justify-center lg:justify-start gap-x-3">
                        GESTIÓN DE <span className="text-orange-500">CLIENTES</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase text-[8px] md:text-[10px] tracking-widest mt-2 px-1">
                        Base Estratégica y Perfiles de Lealtad
                    </p>
                </div>

                <div className="flex flex-row gap-2 md:gap-3 w-full lg:w-auto">
                    <div className="relative group flex-1 lg:flex-none">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white border border-slate-100 pl-11 pr-4 py-3 md:py-4 rounded-xl md:rounded-[20px] shadow-sm focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-xs md:text-sm font-bold w-full md:w-80"
                        />
                    </div>
                    <button
                        onClick={loadCustomers}
                        className="bg-slate-900 text-white p-3 md:p-4 rounded-xl md:rounded-[20px] shadow-lg hover:bg-orange-600 transition-all active:scale-95 flex items-center justify-center shrink-0"
                    >
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="bg-white p-5 md:p-7 rounded-2xl md:rounded-[28px] border border-slate-100 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-orange-500 italic">Brevo · correo</p>
                        <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase text-slate-900">
                            Aviso de reapertura
                        </h2>
                        <p className="text-slate-500 text-xs md:text-sm font-medium mt-1 max-w-2xl">
                            Canje de puntos queda apagado. Cuando quieras, sincronizamos la lista y mandamos el correo del nuevo sitio y los puntos.
                        </p>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest italic ${brevo?.readyToSend ? 'bg-emerald-50 text-emerald-600' : brevo?.configured ? 'bg-amber-50 text-amber-600' : 'bg-amber-50 text-amber-600'}`}>
                        {brevo?.readyToSend ? 'API conectada' : brevo?.configured ? 'Key lista, Brevo bloquea la IP' : 'Falta BREVO_API_KEY'}
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                    <div className="bg-slate-50 rounded-2xl p-3">
                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Clientes locales</p>
                        <p className="text-lg font-black italic text-slate-900">{brevo?.localWithEmail ?? '—'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-3">
                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Lista Brevo</p>
                        <p className="text-lg font-black italic text-slate-900">{brevo?.listCount ?? '—'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-3 col-span-2">
                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Remitente</p>
                        <p className="text-sm font-bold text-slate-700 truncate">{brevo?.senderEmail || 'Sin remitente verificado'}</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 mt-5">
                    <button
                        disabled={!brevo?.configured || !!brevoBusy}
                        onClick={() => runBrevo('sync')}
                        className="bg-slate-900 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest italic disabled:opacity-40"
                    >
                        {brevoBusy === 'sync' ? 'Sincronizando…' : 'Sincronizar contactos'}
                    </button>
                    <div className="flex flex-1 gap-2">
                        <input
                            type="email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="Tu correo para una prueba"
                            className="flex-1 bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-xs font-bold"
                        />
                        <button
                            disabled={!brevo?.readyToSend || !testEmail || !!brevoBusy}
                            onClick={() => runBrevo('test', { to: testEmail })}
                            className="bg-orange-500 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest italic disabled:opacity-40"
                        >
                            {brevoBusy === 'test' ? 'Enviando…' : 'Probar'}
                        </button>
                    </div>
                </div>
                {brevoMsg && <p className="mt-3 text-xs font-bold text-slate-600">{brevoMsg}</p>}
                {!!brevo?.missing?.length && (
                    <p className="mt-2 text-[11px] font-medium text-amber-600">Falta: {brevo.missing.join(', ')}</p>
                )}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
                <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:border-orange-200">
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-orange-50 rounded-xl md:rounded-2xl flex items-center justify-center text-orange-500 shrink-0">
                        <Users size={18} className="md:w-6 md:h-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Total</p>
                        <p className="text-xl md:text-3xl font-black italic tracking-tighter text-slate-900 leading-tight truncate">{customers.length}</p>
                    </div>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:border-blue-200">
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-blue-50 rounded-xl md:rounded-2xl flex items-center justify-center text-blue-500 shrink-0">
                        <Trophy size={18} className="md:w-6 md:h-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Club Puntos</p>
                        <p className="text-xl md:text-3xl font-black italic tracking-tighter text-slate-900 leading-tight truncate">
                            {customers.reduce((acc, c) => acc + (c.loyaltyPoints || 0), 0).toLocaleString()}
                        </p>
                    </div>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:border-red-200">
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-red-50 rounded-xl md:rounded-2xl flex items-center justify-center text-red-500 shrink-0">
                        <AlertCircle size={18} className="md:w-6 md:h-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">En Riesgo</p>
                        <p className="text-xl md:text-3xl font-black italic tracking-tighter text-slate-900 leading-tight truncate">
                            {customers.filter(c => c.customerTag === 'En Riesgo').length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-slate-200 overflow-x-auto scroll-smooth sticky top-0 md:relative bg-slate-50 md:bg-transparent z-40 py-1">
                {tags.map(tag => (
                    <button
                        key={tag}
                        onClick={() => setActiveFilter(tag)}
                        className={`px-4 md:px-8 py-3 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all relative shrink-0 italic ${activeFilter === tag ? 'text-orange-500' : 'text-slate-400 hover:text-slate-900'
                            }`}
                    >
                        {tag === 'ALL' ? 'Todos' : tag}
                        {activeFilter === tag && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-t-full shadow-[0_-4px_10px_rgba(249,115,22,0.3)]" />
                        )}
                    </button>
                ))}
            </div>

            {/* Customers Table / Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {filteredCustomers.length > 0 ? filteredCustomers.map((customer) => (
                    <div
                        key={customer.id}
                        className="bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-orange-500/50 transition-all duration-500 group relative overflow-hidden"
                    >
                        {/* Status Badge */}
                        <div className={`absolute top-0 right-0 px-4 md:px-8 py-2 md:py-2.5 rounded-bl-xl md:rounded-bl-3xl text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white z-10 shadow-sm italic ${customer.customerTag === 'Regular' ? 'bg-green-500' :
                            customer.customerTag === 'En Riesgo' ? 'bg-red-500' : 'bg-blue-600'
                            }`}>
                            {customer.customerTag || 'Nuevo'}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 md:gap-8">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 text-slate-300 rounded-2xl md:rounded-[30px] flex items-center justify-center text-3xl md:text-4xl font-black italic border border-slate-100 group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500 transition-all duration-500 shrink-0 uppercase">
                                {customer.name?.[0] || 'U'}
                            </div>

                            <div className="flex-1 space-y-5 w-full text-center sm:text-left">
                                <div className="space-y-2">
                                    <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-slate-900 leading-tight group-hover:text-orange-500 transition-colors">{customer.name}</h3>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-500 text-[10px] md:text-xs font-bold truncate">
                                            <Mail size={14} className="text-orange-500 shrink-0" />
                                            <span className="truncate">{customer.email}</span>
                                        </div>
                                        {customer.phone && (
                                            <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-500 text-[10px] md:text-xs font-bold">
                                                <Smartphone size={14} className="text-orange-500 shrink-0" />
                                                <span className="tracking-widest">{customer.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 md:gap-4 py-4 md:py-5 border-t border-slate-50">
                                    <div className="flex flex-col items-center sm:items-start">
                                        <span className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-2 italic">Consumo</span>
                                        <span className="text-sm md:text-lg font-black italic text-slate-900 leading-none">${Number(customer.historicalSpent || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-col items-center sm:items-start">
                                        <span className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-2 italic">Pedidos</span>
                                        <span className="text-sm md:text-lg font-black italic text-slate-900 leading-none">{customer.historicalOrders || 0}</span>
                                    </div>
                                    <div className="flex flex-col items-center sm:items-start">
                                        <span className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-2 italic">Puntos</span>
                                        <span className="text-sm md:text-lg font-black italic text-orange-500 flex items-center gap-1.5 leading-none">
                                            {customer.loyaltyPoints || 0}
                                            <Star size={12} fill="currentColor" className="shadow-sm" />
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap justify-center sm:justify-start gap-2.5 pt-1">
                                    {customer.phone && (
                                        <a
                                            href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`}
                                            target="_blank"
                                            className="bg-green-600 text-white px-4 md:px-5 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-md active:scale-95 italic"
                                        >
                                            WA Business
                                        </a>
                                    )}
                                    <button
                                        onClick={() => alert(`Cargando historial de compras y preferencias de ${customer.name}...`)}
                                        className="bg-slate-100 text-slate-500 px-4 md:px-5 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-95 italic"
                                    >
                                        Ver Historial
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Background Decoration */}
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-orange-500/5 group-hover:bg-orange-500/10 rounded-full blur-3xl transition-all duration-700 pointer-events-none" />
                    </div>
                )) : (
                    <div className="col-span-full min-h-[400px] flex flex-col items-center justify-center border-4 border-dashed border-slate-200 rounded-[3rem] md:rounded-[5rem] p-10 bg-white/50 animate-pulse">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                            <Search size={40} className="text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-black uppercase tracking-[0.4em] italic text-center text-xs md:text-sm">Sin coincidencias estratégicas</p>
                    </div>
                )}
            </div>
        </div>
    );
}
