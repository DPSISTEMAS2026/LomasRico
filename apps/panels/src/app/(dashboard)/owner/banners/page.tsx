'use client';

import { useState, useEffect } from 'react';
import {
    Image as ImageIcon, Upload, Trash2, PlusCircle, Loader2, Clock, Check, AlertCircle,
    ExternalLink, Tag, Percent, DollarSign, Truck, Package, Calendar, Hash, ToggleLeft,
    ToggleRight, Edit, X, Save, Megaphone
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { API_URL } from '../../../../services/api';
import { authFetch } from '../../../../services/authFetch';

const BUCKET = 'assets';
const BANNER_PREFIX = 'banner-';

const DISCOUNT_TYPES = [
    { value: 'PERCENT', label: '% Descuento', icon: Percent, color: 'text-blue-500' },
    { value: 'FIXED', label: '$ Fijo', icon: DollarSign, color: 'text-green-500' },
    { value: 'FREE_SHIPPING', label: 'Envío Gratis', icon: Truck, color: 'text-purple-500' },
    { value: 'ITEM_DISCOUNT', label: 'Dcto Producto', icon: Package, color: 'text-orange-500' },
];

function getDiscountInfo(type: string) {
    return DISCOUNT_TYPES.find(d => d.value === type) || DISCOUNT_TYPES[0];
}

const DAYS = [
    { id: 'MONDAY', label: 'Lunes' },
    { id: 'TUESDAY', label: 'Martes' },
    { id: 'WEDNESDAY', label: 'Miércoles' },
    { id: 'THURSDAY', label: 'Jueves' },
    { id: 'FRIDAY', label: 'Viernes' },
    { id: 'SATURDAY', label: 'Sábado' },
    { id: 'SUNDAY', label: 'Domingo' }
];

export default function MarketingPage() {
    const [promos, setPromos] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [saving, setSaving] = useState(false);

    // Image Upload State inside modal
    const [uploadingImage, setUploadingImage] = useState(false);

    const emptyForm: any = {
        code: '', title: '', description: '',
        discountType: 'PERCENT', discountValue: 0,
        isActive: true, startDate: '', endDate: '',
        activeDays: [], startTime: '', endTime: '',
        minOrderAmount: 0, maxUses: 0,
        targetProductId: '',
        bannerImageKey: '', bannerImageUrl: ''
    };
    const [form, setForm] = useState(emptyForm);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [promosRes, prodsRes] = await Promise.all([
                authFetch(`${API_URL}/promotions`),
                authFetch(`${API_URL}/products`),
            ]);
            if (promosRes.ok) setPromos(await promosRes.json());
            if (prodsRes.ok) setProducts(await prodsRes.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingImage(true);
        try {
            const ext = file.name.split('.').pop();
            const fileName = `${BANNER_PREFIX}${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage.from(BUCKET).upload(fileName, file);
            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
            setForm(prev => ({ ...prev, bannerImageKey: fileName, bannerImageUrl: urlData.publicUrl }));
            showSuccess('Imagen subida correctamente');
        } catch(e: any) {
            alert('Error al subir: ' + e.message);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async () => {
        // Validation minimum: title required
        if (!form.title.trim()) return alert('Se requiere un título para identificar este registro.');
        
        setSaving(true);
        try {
            const payload = {
                ...form,
                discountValue: Number(form.discountValue) || 0,
                minOrderAmount: Number(form.minOrderAmount) || 0,
                maxUses: Number(form.maxUses) || null,
                targetProductId: form.targetProductId || null,
                startDate: form.startDate || null,
                endDate: form.endDate || null,
                activeDays: form.activeDays.length > 0 ? JSON.stringify(form.activeDays) : null,
                startTime: form.startTime || null,
                endTime: form.endTime || null,
                code: form.code.trim() || undefined // If empty, backend will auto-generate
            };

            const url = editing ? `${API_URL}/promotions/${editing.id}` : `${API_URL}/promotions`;
            const method = editing ? 'PATCH' : 'POST';

            const res = await authFetch(url, { method, body: JSON.stringify(payload) });
            if (res.ok) {
                showSuccess(editing ? 'Banner Promocional actualizado' : 'Banner Promocional creado');
                setShowForm(false);
                setEditing(null);
                loadData();
            } else {
                const err = await res.json();
                alert(err.message || 'Error al guardar');
            }
        } catch { alert('Error de conexión'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar este estamento?')) return;
        await authFetch(`${API_URL}/promotions/${id}`, { method: 'DELETE' });
        showSuccess('Eliminado correctamente');
        loadData();
    };

    const toggleActive = async (promo: any) => {
        await authFetch(`${API_URL}/promotions/${promo.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ isActive: !promo.isActive }),
        });
        showSuccess(promo.isActive ? 'Desactivado' : 'Activado');
        loadData();
    };

    const openEdit = (promo: any) => {
        let parsedDays = [];
        try { if(promo.activeDays) parsedDays = JSON.parse(promo.activeDays); } catch(e){}

        setForm({
            code: promo.code || '',
            title: promo.title || '',
            description: promo.description || '',
            discountType: promo.discountType || 'PERCENT',
            discountValue: Number(promo.discountValue) || 0,
            isActive: promo.isActive,
            startDate: promo.startDate ? promo.startDate.split('T')[0] : '',
            endDate: promo.endDate ? promo.endDate.split('T')[0] : '',
            activeDays: parsedDays,
            startTime: promo.startTime || '',
            endTime: promo.endTime || '',
            minOrderAmount: Number(promo.minOrderAmount) || 0,
            maxUses: promo.maxUses || 0,
            targetProductId: promo.targetProductId || '',
            bannerImageKey: promo.bannerImageKey || '',
            bannerImageUrl: promo.bannerImageUrl || ''
        });
        setEditing(promo);
        setShowForm(true);
    };

    const toggleDay = (dayId: string) => {
        setForm(p => ({
            ...p,
            activeDays: p.activeDays.includes(dayId) 
                ? p.activeDays.filter(d => d !== dayId) 
                : [...p.activeDays, dayId]
        }));
    };

    if (loading && promos.length === 0) return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <Loader2 className="animate-spin text-orange-500 mb-4" size={48} />
            <p className="font-black uppercase text-[10px] tracking-widest text-slate-400 italic">Cargando marketing...</p>
        </div>
    );

    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-10">
            {successMsg && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-6 z-[100] bg-slate-900 border border-slate-800 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] md:text-xs italic tracking-[0.2em] shadow-2xl flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                    ✓ {successMsg}
                </div>
            )}

            {/* Header Unified */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2 lg:mb-1">
                        <span className="bg-orange-500 text-white text-[7px] md:text-[8px] font-black px-2 py-0.5 rounded-sm uppercase tracking-tighter italic">Ventas e Impulso</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl xl:text-6xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                        MARKETING <span className="text-orange-500">PRO</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase text-[8px] md:text-[10px] tracking-widest mt-2 px-1">
                        Banners Publicitarios y Códigos de Descuento
                    </p>
                </div>
                <button
                    onClick={() => { setForm(emptyForm); setEditing(null); setShowForm(true); }}
                    className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-[0.2em] shadow-xl hover:bg-orange-600 transition-all flex items-center gap-3 italic mt-4 lg:mt-0"
                >
                    <PlusCircle size={20} /> CREAR BANNER / PROMO
                </button>
            </header>

            {/* Form Modal (Overlay so it doesn't shift the whole page down awkwardly) */}
            {showForm && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden flex flex-col relative">
                        <div className="sticky top-0 bg-white/90 backdrop-blur-md p-6 border-b border-slate-100 flex items-center justify-between z-20">
                            <div>
                                <h3 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
                                    {editing ? 'Editar Elemento' : 'Nuevo Banner / Promoción'}
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    Configura visual, horarios y código de descuento
                                </p>
                            </div>
                            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                <X size={24} className="text-slate-400" />
                            </button>
                        </div>
                        
                        <div className="p-6 md:p-8 space-y-8">
                            
                            {/* SECTION 1: VISUAL & IDENTITY */}
                            <section>
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 bg-slate-100 px-3 py-1.5 inline-block rounded-md">1. Identidad Visual</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1 italic">Título (Int / Ext)</label>
                                            <input
                                                value={form.title} placeholder="Ej: 20% dscto Martes Loco"
                                                onChange={e => setForm(p => ({...p, title: e.target.value}))}
                                                className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-black text-sm outline-none focus:border-orange-500 border-2 border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1 italic">Descripción / BasesLegales</label>
                                            <input
                                                value={form.description} placeholder="Válido solo en locales..."
                                                onChange={e => setForm(p => ({...p, description: e.target.value}))}
                                                className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm outline-none focus:border-orange-500 border-2 border-transparent transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1 italic">Imagen de Banner (Opcional)</label>
                                        <div className="relative aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden flex flex-col items-center justify-center hover:bg-slate-100 transition-colors">
                                            {form.bannerImageUrl ? (
                                                <>
                                                 <img src={form.bannerImageUrl} className="w-full h-full object-cover" />
                                                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                    <label className="bg-white text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase cursor-pointer italic hover:bg-orange-500 hover:text-white transition-colors">
                                                        <input type="file" className="hidden" accept="image/*" onChange={handleUploadImage} disabled={uploadingImage} />
                                                        {uploadingImage ? 'SUBIENDO...' : 'CAMBIAR IMAGEN'}
                                                    </label>
                                                 </div>
                                                </>
                                            ) : (
                                                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-orange-500">
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleUploadImage} disabled={uploadingImage} />
                                                    {uploadingImage ? <Loader2 className="animate-spin mb-2" /> : <ImageIcon size={32} className="mb-2" />}
                                                    <span className="text-[10px] font-black uppercase tracking-widest italic">{uploadingImage ? 'SUBIENDO...' : 'SUBIR BANNER'}</span>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <hr className="border-slate-100" />

                            {/* SECTION 2: SCHEDULE */}
                            <section>
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 bg-slate-100 px-3 py-1.5 inline-block rounded-md">2. Condiciones de Tiempo (Hora Chilena)</h4>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1 italic flex items-center gap-1"><Calendar size={10}/> Fecha Inicio Promoción</label>
                                            <input type="date" value={form.startDate} onChange={e => setForm(p => ({...p, startDate: e.target.value}))} className="w-full bg-slate-50 border-2 border-transparent focus:bg-white rounded-2xl px-5 py-3 font-bold text-sm outline-none focus:border-orange-500 transition-all"/>
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1 italic flex items-center gap-1"><Calendar size={10}/> Fecha Fin Promoción</label>
                                            <input type="date" value={form.endDate} onChange={e => setForm(p => ({...p, endDate: e.target.value}))} className="w-full bg-slate-50 border-2 border-transparent focus:bg-white rounded-2xl px-5 py-3 font-bold text-sm outline-none focus:border-orange-500 transition-all"/>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-slate-600 italic">Días y Horarios Específicos (<span className="text-orange-500">America/Santiago</span>)</p>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {DAYS.map(day => (
                                                <button key={day.id} onClick={() => toggleDay(day.id)}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${form.activeDays.includes(day.id) ? 'bg-orange-500 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400'}`}>
                                                    {day.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                                <span>Desde HR:</span>
                                                <input type="time" value={form.startTime} onChange={e => setForm(p => ({...p, startTime: e.target.value}))} className="bg-white border rounded-lg px-3 py-1 outline-none"/>
                                            </label>
                                            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                                <span>Hasta HR:</span>
                                                <input type="time" value={form.endTime} onChange={e => setForm(p => ({...p, endTime: e.target.value}))} className="bg-white border rounded-lg px-3 py-1 outline-none"/>
                                            </label>
                                        </div>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-2 italic">* Si dejas días/horas en blanco, estará activo 24/7 en el rango de fechas elegido.</p>
                                    </div>
                                </div>
                            </section>

                            <hr className="border-slate-100" />

                            {/* SECTION 3: REWARD / DISCOUNT CODE */}
                            <section>
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 bg-slate-100 px-3 py-1.5 inline-block rounded-md">3. Recompensa y Código (Opcional)</h4>
                                <div className="p-5 border-2 border-orange-100 bg-orange-50/50 rounded-2xl relative">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                        <div>
                                            <label className="block text-[8px] font-black uppercase text-orange-500 tracking-widest mb-2 ml-1 italic">Código Cupón</label>
                                            <input value={form.code} onChange={e => setForm(p => ({...p, code: e.target.value.toUpperCase()}))} placeholder="En blanco = Auto Generado" className="w-full bg-white border border-orange-100 rounded-xl px-4 py-3 font-black outline-none focus:border-orange-400 transition-all uppercase tracking-widest text-orange-600"/>
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1 italic">Tipo de Descuento</label>
                                            <select value={form.discountType} onChange={e => setForm(p => ({...p, discountType: e.target.value}))} className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 font-bold text-sm outline-none">
                                                {DISCOUNT_TYPES.map(dt => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1 italic">Valor Recompensa</label>
                                            <input type="number" value={form.discountValue} onChange={e => setForm(p => ({...p, discountValue: Number(e.target.value)}))} className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 font-black text-center outline-none"/>
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1 italic">Monto Mín. Compra ($)</label>
                                            <input type="number" value={form.minOrderAmount} onChange={e => setForm(p => ({...p, minOrderAmount: Number(e.target.value)}))} placeholder="0" className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 font-bold text-center outline-none"/>
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1 italic">Usos Máx Globales</label>
                                            <input type="number" value={form.maxUses} onChange={e => setForm(p => ({...p, maxUses: Number(e.target.value)}))} placeholder="Ilimitado" className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 font-bold text-center outline-none"/>
                                        </div>
                                    </div>
                                    {form.discountType === 'ITEM_DISCOUNT' && (
                                        <div className="mt-4">
                                            <label className="block text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1 italic">Producto Específico</label>
                                            <select value={form.targetProductId} onChange={e => setForm(p => ({...p, targetProductId: e.target.value}))} className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 font-bold outline-none">
                                                <option value="">Selecciona Producto...</option>
                                                {products.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </section>

                        </div>

                        {/* Footer Buttons */}
                        <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-6 border-t border-slate-100 shrink-0 flex justify-end gap-4 z-20">
                            <button onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl border border-slate-200 font-black uppercase text-[10px] text-slate-400 hover:text-slate-900 transition-colors">Cancelar</button>
                            <button onClick={handleSubmit} disabled={saving} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-colors flex items-center gap-2">
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16}/>} GUARDAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* List */}
            {promos.length === 0 ? (
                <div className="bg-white border-4 border-dashed border-slate-100 rounded-3xl p-20 text-center">
                    <Megaphone size={48} className="text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-black uppercase italic text-sm tracking-widest">Sin Marketing Activo</p>
                    <p className="text-slate-300 text-[10px] font-bold mt-2 uppercase tracking-widest">Crea un banner o código para potenciar ventas</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {promos.map(promo => {
                        const isExpired = promo.endDate && new Date(promo.endDate) < new Date();
                        const isExhausted = promo.maxUses && promo.currentUses >= promo.maxUses;
                        
                        let parsedDays = [];
                        try { if(promo.activeDays) parsedDays = JSON.parse(promo.activeDays); } catch(e){}

                        return (
                            <div key={promo.id} className={`bg-white rounded-[2rem] border shadow-sm overflow-hidden flex flex-col sm:flex-row
                                ${!promo.isActive || isExpired || isExhausted ? 'opacity-60 border-slate-200' : 'border-slate-100 hover:border-orange-300 hover:shadow-2xl'} transition-all duration-500`}>
                                
                                {/* Banner Visual Side */}
                                <div className="sm:w-1/3 min-h-[160px] bg-slate-50 relative border-b sm:border-b-0 sm:border-r border-slate-100 flex flex-col justify-center items-center overflow-hidden">
                                    {promo.bannerImageUrl ? (
                                        <img src={promo.bannerImageUrl} className="w-full h-full object-cover absolute inset-0 mix-blend-multiply" />
                                    ) : (
                                        <div className="text-slate-300">
                                            <ImageIcon size={32} />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent flex items-end p-4">
                                        <div className="w-full">
                                            <p className="text-white text-[10px] font-black uppercase px-2 py-1 bg-black/50 rounded-md inline-block backdrop-blur-md mb-1">{promo.code}</p>
                                        </div>
                                    </div>
                                    {/* Edit / Trash Actions Layer */}
                                    <div className="absolute top-3 right-3 flex gap-2">
                                        <button onClick={() => openEdit(promo)} className="bg-white/80 backdrop-blur-sm p-1.5 rounded-md hover:text-orange-500"><Edit size={14}/></button>
                                        <button onClick={() => handleDelete(promo.id)} className="bg-white/80 backdrop-blur-sm p-1.5 rounded-md hover:text-red-500"><Trash2 size={14}/></button>
                                    </div>
                                </div>

                                {/* Info Side */}
                                <div className="sm:w-2/3 p-5 md:p-6 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-black italic text-lg uppercase tracking-tighter text-slate-900 leading-tight">{promo.title}</h3>
                                            <button onClick={() => toggleActive(promo)} title={promo.isActive ? 'Desactivar' : 'Activar'}>
                                                {promo.isActive ? <ToggleRight size={24} className="text-green-500" /> : <ToggleLeft size={24} className="text-slate-300" />}
                                            </button>
                                        </div>
                                        {promo.description && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest line-clamp-2 leading-relaxed">{promo.description}</p>}
                                        
                                        {/* Value Badges */}
                                        <div className="flex flex-wrap gap-2 mt-4">
                                            {promo.discountValue > 0 && (
                                                <span className="px-2.5 py-1 bg-orange-100 text-orange-600 rounded-md text-[9px] font-black uppercase">
                                                    Dcto: {promo.discountType === 'PERCENT' ? `${Number(promo.discountValue)}%` : `$${Number(promo.discountValue).toLocaleString()}`}
                                                </span>
                                            )}
                                            {parsedDays.length > 0 && (
                                                <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-md text-[9px] font-black uppercase">
                                                    {parsedDays.length} Días / sem
                                                </span>
                                            )}
                                            {(promo.startTime || promo.endTime) && (
                                                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-md text-[9px] font-black uppercase flex items-center gap-1">
                                                    <Clock size={10}/> {promo.startTime || '00:00'} a {promo.endTime || '23:59'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Stats */}
                                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100">
                                        <div>
                                            <p className="text-[8px] font-black uppercase text-slate-400">Usos</p>
                                            <p className="text-xs font-black italic">{promo.currentUses} <span className="text-slate-300">/ {promo.maxUses || '∞'}</span></p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black uppercase text-slate-400">Estado</p>
                                            <p className={`text-[10px] font-black uppercase tracking-widest italic ${promo.isActive && !isExpired && !isExhausted ? 'text-green-500' : 'text-red-500'}`}>
                                                {isExpired ? 'Expiró' : isExhausted ? 'Agotado' : promo.isActive ? 'Activo' : 'Pausado'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
