'use client';

import { useState, useEffect } from 'react';
import {
    User,
    Trash2,
    Users,
    Loader2,
    PlusCircle,
    CheckSquare,
    Square,
    ChevronUp,
    Save,
    RefreshCw,
    ShieldCheck,
    Lock,
    Unlock,
    Banknote,
    Clock,
    FileText,
    TrendingUp,
    TrendingDown,
    Activity,
    DollarSign
} from 'lucide-react';
import { API_URL } from '../../../../services/api';
import { authFetch } from '../../../../services/authFetch';

// ------------------------------------------------------------------
// Definición de TODOS los módulos disponibles en el panel
// ------------------------------------------------------------------
const ALL_MODULES = [
    { id: 'pos', label: 'Punto de Venta (POS)', desc: 'Atender clientes, cobrar y procesar pedidos.' },
    { id: 'kitchen', label: 'Cocina (KDS)', desc: 'Ver y gestionar tickets en pantalla de cocina.' },
    { id: 'catalog', label: 'Catálogo', desc: 'Ver y editar el catálogo de productos.' },
    { id: 'inventory', label: 'Inventario', desc: 'Ver y gestionar el stock de ingredientes.' },
    { id: 'recipes', label: 'Recetas', desc: 'Crear y editar recetas de producción.' },
    { id: 'reports', label: 'Reportes', desc: 'Ver reportes de ventas y estadísticas.' },
    { id: 'banners', label: 'Marketing', desc: 'Gestionar banners, promociones y códigos de descuento.' },
    { id: 'whatsapp', label: 'WhatsApp Bot', desc: 'Gestionar conversaciones de WhatsApp.' },
    { id: 'cashiers', label: 'Personal (Equipo)', desc: 'Crear y gestionar usuarios del equipo.' },
];

const ROLES = [
    { value: 'CASHIER', label: 'Cajero/a', color: 'bg-blue-500' },
    { value: 'KITCHEN', label: 'Cocina', color: 'bg-orange-500' },
    { value: 'ADMIN', label: 'Administrador/a', color: 'bg-purple-500' },
];

function getRoleInfo(role: string) {
    return ROLES.find(r => r.value === role) || { value: role, label: role, color: 'bg-slate-400' };
}

function parseModules(raw: any): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw); } catch { return []; }
}

// ------------------------------------------------------------------
// Sub-componente tarjeta de miembro del equipo
// ------------------------------------------------------------------
function TeamMemberCard({
    member, onDelete, onSaveModules, onSaveRole,
}: {
    member: any; onDelete: (id: string) => void; onSaveModules: (id: string, modules: string[]) => void; onSaveRole: (id: string, role: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [modules, setModules] = useState<string[]>(() => parseModules(member.modules));
    const [role, setRole] = useState(member.role);
    const [saving, setSaving] = useState(false);
    const roleInfo = getRoleInfo(role);

    const toggleModule = (id: string) => setModules(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);

    const handleSave = async () => {
        setSaving(true);
        await onSaveModules(member.id, modules);
        if (role !== member.role) await onSaveRole(member.id, role);
        setSaving(false);
        setExpanded(false);
    };

    const isInShift = member.shifts?.some((s: any) => s.status === 'OPEN');

    return (
        <div className={`bg-white rounded-3xl md:rounded-[2.5rem] border transition-all duration-300 overflow-hidden ${expanded ? 'border-orange-300 shadow-lg shadow-orange-500/10' : 'border-slate-100 shadow-sm hover:border-slate-900'}`}>
            <div className="p-4 md:p-8 flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative shrink-0">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-50 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-400 border-2 border-white shadow-sm">
                            <User size={24} className="md:w-7 md:h-7" />
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-white flex items-center justify-center text-[7px] md:text-[8px] font-black text-white ${roleInfo.color}`}>
                            {roleInfo.label[0]}
                        </div>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-black italic text-lg md:text-xl uppercase tracking-tighter text-slate-900 truncate">{member.name}</h3>
                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{roleInfo.label} · {member.email}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${isInShift ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                                <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 whitespace-nowrap">{isInShift ? 'En Turno' : 'Sin turno'}</span>
                            </div>
                            <span className="text-[9px] font-black text-slate-200">·</span>
                            <span className="text-[9px] md:text-[10px] font-black text-orange-500 whitespace-nowrap">{modules.length} módulos</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button onClick={() => setExpanded(!expanded)} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 md:py-2 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase italic transition-all ${expanded ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white'}`}>
                        {expanded ? <><ChevronUp size={14} /> Cerrar</> : <><ShieldCheck size={14} /> Permisos</>}
                    </button>
                    <button onClick={() => onDelete(member.id)} className="p-2.5 text-slate-200 hover:text-red-500 transition-colors shrink-0"><Trash2 size={18} /></button>
                </div>
            </div>

            {expanded && (
                <div className="border-t border-slate-100 p-5 md:p-8 space-y-6 md:space-y-8 bg-slate-50/50">
                    <div>
                        <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3 ml-1">Rol base</p>
                        <div className="flex flex-wrap gap-2 md:gap-3">
                            {ROLES.map(r => (
                                <button key={r.value} onClick={() => setRole(r.value)} className={`flex-1 sm:flex-none px-4 md:px-5 py-2 rounded-full text-[10px] md:text-xs font-black uppercase italic transition-all border-2 ${role === r.value ? `${r.color} text-white border-transparent shadow-lg` : 'border-slate-200 text-slate-400 hover:border-slate-900 hover:text-slate-900'}`}>
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3 ml-1">
                            <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Acceso a módulos</p>
                            <div className="flex gap-2">
                                <button onClick={() => setModules(ALL_MODULES.map(m => m.id))} className="text-[8px] md:text-[9px] font-black uppercase text-orange-500 hover:text-orange-700">Todo</button>
                                <span className="text-slate-300">·</span>
                                <button onClick={() => setModules([])} className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 hover:text-slate-600">Ninguno</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                            {ALL_MODULES.map(mod => {
                                const checked = modules.includes(mod.id);
                                return (
                                    <button key={mod.id} onClick={() => toggleModule(mod.id)} className={`flex items-start gap-3 p-3 md:p-4 rounded-xl md:rounded-2xl text-left transition-all border-2 ${checked ? 'border-orange-300 bg-orange-50' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                                        <div className={`mt-0.5 shrink-0 transition-colors ${checked ? 'text-orange-500' : 'text-slate-300'}`}>
                                            {checked ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </div>
                                        <div>
                                            <p className={`text-[11px] md:text-xs font-black uppercase italic tracking-tighter transition-colors ${checked ? 'text-slate-900' : 'text-slate-500'}`}>{mod.label}</p>
                                            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 leading-tight mt-0.5">{mod.desc}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-[2rem] p-6 md:p-8 text-white">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${member.canDiscount ? 'bg-orange-500' : 'bg-slate-800'}`}>
                                    <DollarSign size={20} />
                                </div>
                                <div>
                                    <p className="font-black uppercase italic tracking-tighter text-sm md:text-base">Permiso de Descuento</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Habilita botón de descuento en el POS</p>
                                </div>
                            </div>
                            <button
                                onClick={async () => {
                                    const next = !member.canDiscount;
                                    await authFetch(`${API_URL}/cashiers/${member.id}/permissions`, {
                                        method: 'PATCH',
                                        body: JSON.stringify({ canDiscount: next })
                                    });
                                    onSaveModules(member.id, modules); // Trigger reload
                                }}
                                className={`w-14 h-8 rounded-full p-1 transition-all ${member.canDiscount ? 'bg-orange-500' : 'bg-slate-700'}`}
                            >
                                <div className={`w-6 h-6 rounded-full bg-white transition-transform ${member.canDiscount ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-2 md:gap-3 pt-2">
                        <button onClick={() => setExpanded(false)} className="order-2 sm:order-1 px-6 py-3 rounded-xl md:rounded-2xl border border-slate-200 text-[10px] md:text-xs font-black uppercase italic text-slate-400 hover:text-slate-900 hover:border-slate-900">Cancelar</button>
                        <button onClick={handleSave} disabled={saving} className="order-1 sm:order-2 flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-3.5 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase italic hover:bg-orange-600 shadow-lg active:scale-95 transition-all">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar Cambios
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ------------------------------------------------------------------
// Página principal
// ------------------------------------------------------------------
export default function CashiersManagementPage() {
    const [tab, setTab] = useState<'TEAM' | 'SHIFTS'>('TEAM');
    const [members, setMembers] = useState<any[]>([]);
    const [shifts, setShifts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewForm, setShowNewForm] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const [newMember, setNewMember] = useState({
        name: '', email: '', pin: '', role: 'CASHIER', modules: [] as string[]
    });
    const [creating, setCreating] = useState(false);

    useEffect(() => { loadData(); }, [tab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (tab === 'TEAM') {
                const res = await authFetch(`${API_URL}/cashiers`);
                const data = await res.json();
                setMembers(Array.isArray(data) ? data : []);
            } else {
                const res = await authFetch(`${API_URL}/shifts`);
                const data = await res.json();
                setShifts(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newMember.name || !newMember.email || !newMember.pin) return alert('Completa nombre, email y PIN');
        if (newMember.pin.length !== 4 || isNaN(Number(newMember.pin))) return alert('El PIN debe ser numérico de 4 dígitos');

        setCreating(true);
        try {
            const res = await authFetch(`${API_URL}/cashiers`, {
                method: 'POST', body: JSON.stringify(newMember)
            });
            if (res.ok) {
                setNewMember({ name: '', email: '', pin: '', role: 'CASHIER', modules: [] });
                setShowNewForm(false);
                showSuccess('Usuario creado correctamente');
                loadData();
            } else {
                const err = await res.json(); alert(err.message || 'Error al crear usuario');
            }
        } catch { alert('Error de conexión'); }
        finally { setCreating(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar este usuario del equipo?')) return;
        await authFetch(`${API_URL}/cashiers/${id}`, { method: 'DELETE' });
        showSuccess('Usuario eliminado');
        loadData();
    };

    const handleSaveModules = async (id: string, modules: string[]) => {
        await authFetch(`${API_URL}/cashiers/${id}/modules`, {
            method: 'PATCH', body: JSON.stringify({ modules })
        });
        showSuccess('Permisos actualizados');
        loadData();
    };

    const handleSaveRole = async (id: string, role: string) => {
        await authFetch(`${API_URL}/cashiers/${id}/role`, {
            method: 'PATCH', body: JSON.stringify({ role })
        });
        showSuccess('Rol actualizado');
        loadData();
    };

    const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };
    const toggleNewModule = (id: string) => setNewMember(p => ({ ...p, modules: p.modules.includes(id) ? p.modules.filter(m => m !== id) : [...p.modules, id] }));

    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-20">
            {successMsg && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-6 z-[100] bg-slate-900 border border-slate-800 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] md:text-xs italic tracking-[0.2em] shadow-2xl animate-in slide-in-from-top-4 flex items-center gap-3 w-[90%] md:w-auto">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                    ✓ {successMsg}
                </div>
            )}

            {/* Header */}
            <header className="flex flex-col lg:flex-row justify-between items-center md:items-start lg:items-end gap-6 px-1">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                        ADMIN <span className="text-orange-500">PRO</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase text-[8px] md:text-[10px] tracking-widest mt-2 px-1">
                        Control de Equipo · Arqueos de Caja
                    </p>
                </div>
                <div className="flex bg-slate-100 rounded-2xl md:rounded-[2rem] p-1.5 w-full md:w-auto overflow-x-auto no-scrollbar scroll-smooth">
                    <button
                        onClick={() => setTab('TEAM')}
                        className={`flex-1 md:flex-none px-6 md:px-10 py-3 md:py-4 rounded-xl md:rounded-full font-black uppercase text-[10px] md:text-xs tracking-widest transition-all whitespace-nowrap italic ${tab === 'TEAM' ? 'bg-white shadow-xl text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Lista de Personal
                    </button>
                    <button
                        onClick={() => setTab('SHIFTS')}
                        className={`flex-1 md:flex-none px-6 md:px-10 py-3 md:py-4 rounded-xl md:rounded-full font-black uppercase text-[10px] md:text-xs tracking-widest transition-all whitespace-nowrap italic ${tab === 'SHIFTS' ? 'bg-white shadow-xl text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Cajas/Turnos
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                    <Loader2 className="animate-spin text-orange-500 mb-6" size={48} />
                    <p className="font-black uppercase text-[9px] md:text-[10px] tracking-[0.3em] text-slate-400 italic animate-pulse">Sincronizando equipo...</p>
                </div>
            ) : tab === 'TEAM' ? (
                <>
                    {/* Sección Equipo Dashboard */}
                    <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center bg-white p-4 md:p-6 rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 shadow-sm gap-6 md:gap-4 transition-all hover:shadow-xl">
                        <div className="grid grid-cols-3 md:flex justify-around md:justify-start gap-4 md:gap-10 px-2">
                            {ROLES.map(r => (
                                <div key={r.value} className="text-center md:text-left">
                                    <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-300 tracking-[0.2em] mb-1">{r.label}s</p>
                                    <p className="text-xl md:text-3xl font-black italic tracking-tighter text-slate-900 leading-none">{members.filter(m => m.role === r.value).length}</p>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowNewForm(true)}
                            className="bg-slate-900 text-white px-8 md:px-10 py-4 md:py-5 rounded-2xl md:rounded-3xl font-black uppercase text-[10px] md:text-xs tracking-[0.2em] shadow-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-3 active:scale-95 italic"
                        >
                            <PlusCircle size={20} className="shrink-0" /> ALTA DE PERSONAL
                        </button>
                    </div>

                    {showNewForm && (
                        <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] border-2 border-orange-400 shadow-2xl p-6 md:p-12 space-y-8 md:space-y-10 animate-in slide-in-from-top-6 flex flex-col relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
                                <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-slate-900">Configurar Nuevo Acceso</h2>
                                <button onClick={() => setShowNewForm(false)} className="px-4 py-2 bg-slate-50 text-slate-400 hover:text-red-500 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest italic group">
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">✕ </span>CANCELAR
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 md:gap-8 relative z-10">
                                <div className="sm:col-span-2 md:col-span-1">
                                    <label className="block text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1 italic">Nombre Completo</label>
                                    <input value={newMember.name} onChange={e => setNewMember(p => ({ ...p, name: e.target.value }))} className="w-full bg-slate-50 border-2 border-transparent focus:bg-white rounded-2xl px-5 py-4 font-bold text-xs md:text-sm outline-none focus:border-orange-500 transition-all shadow-sm" placeholder="Juan Pérez" />
                                </div>
                                <div>
                                    <label className="block text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1 italic">Email Corporativo</label>
                                    <input type="email" value={newMember.email} onChange={e => setNewMember(p => ({ ...p, email: e.target.value }))} className="w-full bg-slate-50 border-2 border-transparent focus:bg-white rounded-2xl px-5 py-4 font-bold text-xs md:text-sm outline-none focus:border-orange-500 transition-all shadow-sm" placeholder="juan@lomasrico.cl" />
                                </div>
                                <div>
                                    <label className="block text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1 italic">PIN Acceso (4 dígitos)</label>
                                    <input type="password" maxLength={4} value={newMember.pin} onChange={e => setNewMember(p => ({ ...p, pin: e.target.value }))} className="w-full bg-slate-50 border-2 border-transparent focus:bg-white rounded-2xl px-5 py-4 font-black text-lg md:text-xl outline-none focus:border-orange-500 tracking-[0.8em] text-center shadow-sm" placeholder="••••" />
                                </div>
                            </div>

                            <div className="relative z-10">
                                <label className="block text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1 italic">Asignar Perfil de Usuario</label>
                                <div className="flex flex-wrap gap-2 md:gap-4">
                                    {ROLES.map(r => (
                                        <button key={r.value} onClick={() => setNewMember(p => ({ ...p, role: r.value }))} className={`px-6 py-3 md:py-4 rounded-2xl text-[10px] md:text-xs font-black uppercase italic transition-all border-2 flex-1 md:flex-none ${newMember.role === r.value ? `${r.color} text-white border-transparent shadow-xl scale-105` : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-900 shadow-sm'}`}>{r.label}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4 ml-1">
                                    <label className="block text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Privilegios de Sistema</label>
                                    <div className="flex gap-4">
                                        <button onClick={() => setNewMember(p => ({ ...p, modules: ALL_MODULES.map(m => m.id) }))} className="text-[8px] md:text-[9px] font-black uppercase text-orange-600 hover:underline tracking-tighter">HABILITAR TODO</button>
                                        <button onClick={() => setNewMember(p => ({ ...p, modules: [] }))} className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 hover:underline tracking-tighter">REINICIAR</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {ALL_MODULES.map(mod => {
                                        const checked = newMember.modules.includes(mod.id);
                                        return (
                                            <button key={mod.id} onClick={() => toggleNewModule(mod.id)} className={`flex items-start gap-3 p-4 rounded-2xl border-2 transition-all text-left ${checked ? 'border-orange-400 bg-orange-50' : 'border-slate-50 bg-slate-50 hover:border-slate-200'}`}>
                                                <div className={`mt-0.5 shrink-0 transition-colors ${checked ? 'text-orange-500' : 'text-slate-300'}`}>{checked ? <CheckSquare size={18} /> : <Square size={18} />}</div>
                                                <span className={`text-[10px] md:text-xs font-black uppercase italic tracking-tighter leading-tight ${checked ? 'text-slate-900' : 'text-slate-500'}`}>{mod.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex justify-end pt-6 relative z-10">
                                <button onClick={handleCreate} disabled={creating} className="w-full md:w-auto flex items-center justify-center gap-4 bg-orange-500 text-white px-12 py-5 rounded-2xl font-black uppercase italic text-sm tracking-[0.2em] shadow-2xl shadow-orange-200 hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-50">
                                    {creating ? <Loader2 size={24} className="animate-spin" /> : <ShieldCheck size={24} />} CONFIRMAR Y CREAR ACCESO
                                </button>
                            </div>
                        </div>
                    )}

                    <section className="space-y-4">
                        {members.length === 0 ? (
                            <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-16 md:p-24 text-center">
                                <Users size={48} className="text-slate-100 mx-auto mb-6" />
                                <p className="text-slate-400 font-black uppercase italic text-[11px] md:text-sm tracking-[0.4em]">Sin dotación asignada</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {members.map(member => (
                                    <TeamMemberCard key={member.id} member={member} onDelete={handleDelete} onSaveModules={handleSaveModules} onSaveRole={handleSaveRole} />
                                ))}
                            </div>
                        )}
                    </section>
                </>
            ) : (
                <>
                    {/* Sección Turnos de Caja (Dashboard) */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 md:px-6 md:py-4 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="flex gap-3 md:gap-4 w-full md:w-auto">
                            <div className="flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-green-50 text-green-700 rounded-xl md:rounded-full font-black uppercase text-[8px] md:text-[10px] italic flex items-center justify-center md:justify-start gap-2 border border-green-100">
                                <Unlock size={14} className="animate-pulse" /> {shifts.filter(s => s.status === 'OPEN').length} <span className="hidden sm:inline">ACTIVOS</span>
                            </div>
                            <div className="flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-slate-50 text-slate-400 rounded-xl md:rounded-full font-black uppercase text-[8px] md:text-[10px] italic flex items-center justify-center md:justify-start gap-2 border border-slate-100">
                                <Lock size={14} /> {shifts.filter(s => s.status === 'CLOSED').length} <span className="hidden sm:inline">CERRADOS</span>
                            </div>
                        </div>
                        <button
                            onClick={loadData}
                            disabled={loading}
                            className="w-full md:w-auto p-3 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-widest italic"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> <span className="md:hidden">Sincronizar</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                        {shifts.map(shift => {
                            const isOpen = shift.status === 'OPEN';
                            const openTime = new Date(shift.openingTime).toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
                            const closeTime = shift.closingTime ? new Date(shift.closingTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '--:--';

                            const salesInPos = (shift.transactions || []).filter((t: any) => t.type === 'SALE_INCOME');
                            const totalSalesValue = salesInPos.reduce((acc: number, t: any) => acc + Number(t.amount), 0);
                            const systemValue = shift.systemAmount ? Number(shift.systemAmount) : (Number(shift.startAmount) + totalSalesValue);
                            let diff = 0;
                            if (!isOpen && shift.endAmount !== null) {
                                diff = Number(shift.endAmount) - systemValue;
                            }

                            return (
                                <div key={shift.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden group flex flex-col relative">
                                    <div className={`h-2 w-full transition-colors duration-500 ${isOpen ? 'bg-green-500 shadow-[0_2px_10px_rgba(34,197,94,0.3)]' : 'bg-slate-200'}`} />
                                    <div className="p-6 md:p-8 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm ${isOpen ? 'bg-orange-500 text-white' : 'bg-slate-50 text-slate-400'}`}>
                                                    <User size={20} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-black uppercase italic tracking-tighter text-slate-900 group-hover:text-orange-500 transition-colors leading-none truncate">{shift.cashier?.name?.split(' ')[0]}</h4>
                                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1 italic">{isOpen ? 'Turno en curso' : 'Turno cerrado'}</p>
                                                </div>
                                            </div>
                                            <div className={`p-2.5 rounded-xl border ${isOpen ? 'bg-green-50 border-green-100 text-green-600' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                                                {isOpen ? <Activity size={18} className="animate-pulse" /> : <Lock size={18} />}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                                            <div>
                                                <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 flex items-center gap-1.5 mb-1.5 italic"><Clock size={10} className="text-orange-500" /> Iniciado</p>
                                                <p className="text-[11px] md:text-sm font-black text-slate-700 italic">{openTime}</p>
                                            </div>
                                            <div className="border-l border-slate-200 pl-4">
                                                <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 flex items-center gap-1.5 mb-1.5 italic"><Lock size={10} className="text-orange-500" /> Finalizado</p>
                                                <p className="text-[11px] md:text-sm font-black text-slate-700 italic">{isOpen ? '---' : closeTime}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3 py-6 border-y border-slate-50">
                                            <div className="flex justify-between items-center text-[10px] md:text-xs">
                                                <span className="font-black text-slate-400 uppercase tracking-widest italic">Capital Inicial</span>
                                                <span className="font-black text-slate-900">${Number(shift.startAmount).toLocaleString()}</span>
                                            </div>

                                            {/* === DESGLOSE POR CANAL === */}
                                            {(() => {
                                                // Build channel breakdown from sales
                                                const channelData: Record<string, { count: number; total: number }> = {};
                                                const sales = shift.sales || [];
                                                for (const sale of sales) {
                                                    const ch = sale.channel || 'OTHER';
                                                    if (!channelData[ch]) channelData[ch] = { count: 0, total: 0 };
                                                    channelData[ch].count++;
                                                    channelData[ch].total += Number(sale.total);
                                                }

                                                const CHANNEL_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
                                                    POS: { label: 'POS (Local)', icon: '🏪', color: 'text-blue-600' },
                                                    UBER_EATS: { label: 'Uber Eats', icon: '🟢', color: 'text-green-600' },
                                                    PEDIDOS_YA: { label: 'PedidosYa', icon: '🔴', color: 'text-red-600' },
                                                    WEB: { label: 'Web', icon: '🌐', color: 'text-purple-600' },
                                                    WHATSAPP: { label: 'WhatsApp', icon: '💬', color: 'text-emerald-600' },
                                                };

                                                const channels = Object.entries(channelData);
                                                const totalAllChannels = channels.reduce((s, [, v]) => s + v.total, 0);

                                                if (channels.length === 0) {
                                                    return (
                                                        <div className="flex justify-between items-center text-[10px] md:text-xs">
                                                            <span className="font-black text-slate-400 uppercase tracking-widest italic">Ventas</span>
                                                            <span className="font-black text-slate-300 italic">Sin ventas</span>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <>
                                                        {channels.map(([ch, data]) => {
                                                            const cfg = CHANNEL_CONFIG[ch] || { label: ch, icon: '📦', color: 'text-slate-600' };
                                                            return (
                                                                <div key={ch} className="flex justify-between items-center text-[10px] md:text-xs">
                                                                    <span className="font-black text-slate-400 uppercase tracking-widest italic">
                                                                        {cfg.icon} {cfg.label} ({data.count})
                                                                    </span>
                                                                    <span className={`font-black ${cfg.color}`}>+${data.total.toLocaleString()}</span>
                                                                </div>
                                                            );
                                                        })}
                                                        <div className="flex justify-between items-center text-[11px] md:text-sm pt-4 mt-2 border-t border-slate-100">
                                                            <span className="font-black text-slate-800 uppercase tracking-widest italic">Total Ingresos</span>
                                                            <span className="font-black text-slate-950 text-lg md:text-xl italic tracking-tighter">${totalAllChannels.toLocaleString()}</span>
                                                        </div>
                                                    </>
                                                );
                                            })()}

                                            <div className="flex justify-between items-center text-[11px] md:text-sm pt-4 mt-2 border-t border-slate-50">
                                                <span className="font-black text-slate-800 uppercase tracking-widest italic">Total Esperado</span>
                                                <span className="font-black text-slate-950 text-lg md:text-xl italic tracking-tighter">$ {systemValue.toLocaleString()}</span>
                                            </div>

                                            {!isOpen && (
                                                <div className="flex justify-between items-center text-[10px] md:text-xs pt-3 bg-slate-50/50 p-3 rounded-xl border border-dashed border-slate-200">
                                                    <span className="font-black text-slate-400 uppercase tracking-widest italic">Total Contado</span>
                                                    <span className="font-black text-slate-900 italic">$ {Number(shift.endAmount || 0).toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>

                                        {!isOpen && (
                                            <div className={`mt-auto pt-6 flex items-center justify-between`}>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 italic">Balance Final</span>
                                                <div className={`flex items-center gap-2 font-black italic text-lg md:text-2xl tracking-tighter ${diff > 0 ? 'text-blue-600' : diff < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                    {diff > 0 ? <TrendingUp size={24} /> : diff < 0 ? <TrendingDown size={24} /> : <ShieldCheck size={24} />}
                                                    {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                                                </div>
                                            </div>
                                        )}
                                        {shift.note && (
                                            <div className="mt-4 bg-orange-50/30 p-4 rounded-2xl border border-orange-100 group-hover:bg-white transition-colors duration-500">
                                                <p className="text-[8px] font-black text-orange-400 uppercase mb-2 flex items-center gap-1.5 italic"><FileText size={12} /> Observación</p>
                                                <p className="text-[11px] font-bold text-slate-600 italic leading-snug">"{shift.note}"</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl translate-x-12 -translate-y-12 transition-all group-hover:bg-orange-500/10" />
                                </div>
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
