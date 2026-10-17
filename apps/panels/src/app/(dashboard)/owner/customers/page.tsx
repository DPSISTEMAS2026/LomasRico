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
    Star,
    KeyRound,
    Copy,
    X,
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
    const [tab, setTab] = useState<'list' | 'mail'>('list');
    const [resetBusyId, setResetBusyId] = useState('');
    const [tempCred, setTempCred] = useState<{ name: string; email?: string; phone?: string; tempPassword: string } | null>(null);

    useEffect(() => {
        loadCustomers();
        loadBrevo();
    }, []);

    useEffect(() => {
        const q = searchTerm.trim().toLowerCase();
        const digits = searchTerm.replace(/[^0-9]/g, '');
        let result = customers;

        if (activeFilter !== 'ALL') {
            result = result.filter(c => c.customerTag === activeFilter);
        }

        if (q) {
            result = result.filter(c => {
                const name = String(c.name || '').toLowerCase();
                const email = String(c.email || '').toLowerCase();
                const phone = String(c.phone || '');
                return name.includes(q) || email.includes(q) || (digits.length >= 3 && phone.replace(/[^0-9]/g, '').includes(digits));
            });
        } else {
            result = [...result].sort((a, b) =>
                Number(b.historicalSpent || 0) - Number(a.historicalSpent || 0)
                || Number(b.historicalOrders || 0) - Number(a.historicalOrders || 0)
                || Number(b.loyaltyPoints || 0) - Number(a.loyaltyPoints || 0)
            );
        }

        const visible = result.slice(0, 10);
        setFilteredCustomers(visible);
    }, [searchTerm, activeFilter, customers]);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/users/customers/list`, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                // #region agent log
                const withPhone = data.filter((c: any) => String(c.phone || '').replace(/\D/g, '').length >= 8).length;
                const withEmail = data.filter((c: any) => String(c.email || '').includes('@')).length;
                const phoneHiddenByEmailUi = data.filter((c: any) => c.email && c.phone).length;
                fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'customers-phones',hypothesisId:'A',location:'customers/page.tsx:loadCustomers',message:'customer phone vs email coverage',data:{total:data.length,withPhone,withEmail,phoneHiddenByEmailUi,sample:data.slice(0,3).map((c:any)=>({name:c.name,email:!!c.email,phone:c.phone||null}))},timestamp:Date.now()})}).catch(()=>{});
                // #endregion
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

    const resetPassword = async (customer: any) => {
        if (!customer?.id) return;
        if (!confirm(`¿Generar clave temporal para ${customer.name || 'esta clienta'}?\nLa anterior dejará de servir.`)) return;
        setResetBusyId(customer.id);
        try {
            const res = await authFetch(`${API_URL}/users/customers/${customer.id}/reset-password`, { method: 'POST' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                alert(data.message || `Error ${res.status}`);
                return;
            }
            setTempCred({
                name: data.name || customer.name,
                email: data.email || customer.email,
                phone: data.phone || customer.phone,
                tempPassword: data.tempPassword,
            });
        } catch (e: any) {
            alert(e?.message || 'No se pudo generar la clave');
        } finally {
            setResetBusyId('');
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
        <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 min-w-0 overflow-x-hidden">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 pl-14 lg:pl-0 text-right lg:text-left">
                    <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                        Clientes
                    </h1>
                </div>
                <button
                    onClick={loadCustomers}
                    className="shrink-0 bg-slate-900 text-white p-2.5 md:p-3 rounded-xl shadow-lg hover:bg-orange-600"
                    title="Refrescar"
                >
                    <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="grid grid-cols-3 gap-2 md:gap-4">
                <div className="bg-white p-3 md:p-5 rounded-2xl border border-slate-100 min-w-0">
                    <p className="text-[8px] md:text-[10px] font-black uppercase text-slate-800 tracking-widest">Total</p>
                    <p className="text-lg md:text-3xl font-black italic tracking-tighter text-slate-900 truncate">{customers.length}</p>
                </div>
                <div className="bg-white p-3 md:p-5 rounded-2xl border border-slate-100 min-w-0">
                    <p className="text-[8px] md:text-[10px] font-black uppercase text-slate-800 tracking-widest">Puntos</p>
                    <p className="text-lg md:text-3xl font-black italic tracking-tighter text-slate-900 truncate">
                        {customers.reduce((acc, c) => acc + (c.loyaltyPoints || 0), 0).toLocaleString('es-CL')}
                    </p>
                </div>
                <div className="bg-white p-3 md:p-5 rounded-2xl border border-slate-100 min-w-0">
                    <p className="text-[8px] md:text-[10px] font-black uppercase text-slate-800 tracking-widest">Riesgo</p>
                    <p className="text-lg md:text-3xl font-black italic tracking-tighter text-slate-900 truncate">
                        {customers.filter(c => c.customerTag === 'En Riesgo').length}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl">
                {([
                    { key: 'list' as const, label: 'Lista' },
                    { key: 'mail' as const, label: 'Correo' },
                ]).map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        onClick={() => {
                            setTab(t.key);
                        }}
                        className={`py-2 rounded-xl font-black uppercase italic text-[10px] md:text-xs tracking-tight ${tab === t.key ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-800'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'mail' && (
            <div className="bg-white p-5 md:p-7 rounded-2xl md:rounded-[28px] border border-slate-100 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-orange-500 italic">Brevo · correo</p>
                        <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase text-slate-900">
                            Aviso de reapertura
                        </h2>
                        <p className="text-slate-900 text-xs md:text-sm font-medium mt-1 max-w-2xl">
                            Canje de puntos queda apagado. Cuando quieras, sincronizamos la lista y mandamos el correo del nuevo sitio y los puntos.
                        </p>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest italic ${brevo?.readyToSend ? 'bg-emerald-50 text-emerald-600' : brevo?.configured ? 'bg-amber-50 text-amber-600' : 'bg-amber-50 text-amber-600'}`}>
                        {brevo?.readyToSend ? 'API conectada' : brevo?.configured ? 'Key lista, Brevo bloquea la IP' : 'Falta BREVO_API_KEY'}
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                    <div className="bg-slate-50 rounded-2xl p-3">
                        <p className="text-[8px] font-black uppercase text-slate-800 tracking-widest">Clientes locales</p>
                        <p className="text-lg font-black italic text-slate-900">{brevo?.localWithEmail ?? '—'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-3">
                        <p className="text-[8px] font-black uppercase text-slate-800 tracking-widest">Lista Brevo</p>
                        <p className="text-lg font-black italic text-slate-900">{brevo?.listCount ?? '—'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-3 col-span-2">
                        <p className="text-[8px] font-black uppercase text-slate-800 tracking-widest">Remitente</p>
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
            )}

            {tab === 'list' && (
            <>
            <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-800" />
                <input
                    type="text"
                    placeholder="Buscar por nombre, correo o teléfono"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-100 pl-11 pr-4 py-3 rounded-xl shadow-sm outline-none focus:border-orange-500 text-xs md:text-sm font-bold"
                />
            </div>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-800 italic px-1">
                {searchTerm.trim() ? `Hasta 10 coincidencias · ${filteredCustomers.length}` : 'Top 10 por consumo'}
            </p>
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-2xl">
                {tags.map(tag => (
                    <button
                        key={tag}
                        onClick={() => setActiveFilter(tag)}
                        className={`py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-tight italic min-w-0 truncate ${activeFilter === tag ? 'bg-orange-500 text-white shadow' : 'text-slate-800'}`}
                    >
                        {tag === 'ALL' ? 'Todos' : tag === 'En Riesgo' ? 'Riesgo' : tag}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                {filteredCustomers.length > 0 ? filteredCustomers.map((customer, i) => (
                    <div key={customer.id} className="flex items-center gap-3 px-3 md:px-5 py-3 border-b border-slate-50 last:border-0">
                        <span className="w-6 text-center font-black italic text-slate-900 text-sm shrink-0">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                            <p className="font-black uppercase italic tracking-tighter text-slate-900 text-sm truncate">{customer.name}</p>
                            <p className="text-[10px] font-bold text-slate-800 truncate">
                                {[customer.phone, customer.email].filter(Boolean).join(' · ') || '—'}
                            </p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-sm font-black italic text-slate-900">${Number(customer.historicalSpent || 0).toLocaleString('es-CL')}</p>
                            <p className="text-[9px] font-black uppercase text-slate-800">{customer.historicalOrders || 0} ped.</p>
                        </div>
                        <button
                            type="button"
                            title="Generar clave temporal"
                            disabled={resetBusyId === customer.id}
                            onClick={() => resetPassword(customer)}
                            className="shrink-0 w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 text-orange-500 flex items-center justify-center disabled:opacity-40"
                        >
                            {resetBusyId === customer.id ? <RefreshCcw size={14} className="animate-spin" /> : <KeyRound size={14} />}
                        </button>
                    </div>
                )) : (
                    <div className="py-14 flex flex-col items-center justify-center">
                        <Search size={28} className="text-slate-300 mb-3" />
                        <p className="text-slate-800 font-black uppercase tracking-widest italic text-[10px] text-center px-6">
                            {searchTerm.trim() ? 'Sin coincidencias' : 'Sin clientes'}
                        </p>
                    </div>
                )}
            </div>
            </>
            )}

            {tempCred && (
                <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4" onClick={() => setTempCred(null)}>
                    <div
                        className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Clave temporal</p>
                                <p className="font-black uppercase italic text-slate-900 text-lg tracking-tighter">{tempCred.name}</p>
                                <p className="text-xs font-bold text-slate-600">
                                    {[tempCred.phone, tempCred.email].filter(Boolean).join(' · ') || '—'}
                                </p>
                            </div>
                            <button type="button" onClick={() => setTempCred(null)} className="p-2 text-slate-400 hover:text-slate-800">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between gap-3">
                            <code className="text-2xl font-black tracking-[0.2em] text-slate-900">{tempCred.tempPassword}</code>
                            <button
                                type="button"
                                onClick={() => navigator.clipboard?.writeText(tempCred.tempPassword)}
                                className="shrink-0 w-10 h-10 rounded-xl bg-white border border-slate-100 text-slate-700 flex items-center justify-center"
                                title="Copiar"
                            >
                                <Copy size={16} />
                            </button>
                        </div>
                        <p className="text-[11px] font-medium text-slate-500">
                            Dásela a la clienta ahora. Entra en la web con su correo/celular y esta clave. No se puede volver a consultar; si se pierde, genera otra.
                        </p>
                        <button
                            type="button"
                            onClick={() => setTempCred(null)}
                            className="w-full py-3 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase italic tracking-widest"
                        >
                            Listo
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
