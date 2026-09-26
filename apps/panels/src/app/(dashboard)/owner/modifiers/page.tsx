'use client';

import { useState, useEffect } from 'react';
import {
    Plus, X, Save, Trash2, ChevronDown, ChevronUp,
    Layers, Loader2, CheckCircle2, DollarSign,
    ArrowUp, ArrowDown, Search,
} from 'lucide-react';
import { authFetch } from '../../../../services/authFetch';
import { API_URL } from '../../../../services/api';
import ModifierRecipeModal from './ModifierRecipeModal';
import EnlargeSizeModal from './EnlargeSizeModal';

interface ModifierOption {
    id: string;
    name: string;
    priceAdjustment: number;
    isDefault: boolean;
    sortOrder: number;
    recipeId?: string | null;
    recipeItemCount?: number;
    recipeApplyMode?: 'OVERRIDE' | 'REPLACE' | null;
    inventoryItemId?: string | null;
    inventoryItemName?: string | null;
}

interface ExtraItem {
    id: string;
    name: string;
}

interface ModifierGroup {
    id: string;
    name: string;
    displayName: string;
    type: 'SINGLE_SELECT' | 'MULTI_SELECT';
    minSelections: number;
    maxSelections: number;
    sortOrder: number;
    options: ModifierOption[];
    assignedProductsCount?: number;
}

function optionEffect(option: ModifierOption): 'price' | 'extra' | 'recipe' {
    if (option.recipeId) return 'recipe';
    if (option.inventoryItemId) return 'extra';
    return 'price';
}

export default function ModifiersPage() {
    const [groups, setGroups] = useState<ModifierGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
    const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEnlargeModal, setShowEnlargeModal] = useState(false);
    const [newGroupDisplayName, setNewGroupDisplayName] = useState('');
    const [newGroupType, setNewGroupType] = useState<'SINGLE_SELECT' | 'MULTI_SELECT'>('SINGLE_SELECT');
    const [newOptionName, setNewOptionName] = useState('');
    const [newOptionPrice, setNewOptionPrice] = useState(0);
    const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);
    const [recipeOption, setRecipeOption] = useState<ModifierOption | null>(null);
    const [pickingExtraFor, setPickingExtraFor] = useState<string | null>(null);

    const filteredGroups = groups.filter((g) =>
        !searchQuery.trim() ||
        g.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.options.some((o) => o.name.toLowerCase().includes(searchQuery.toLowerCase())),
    );

    useEffect(() => {
        loadGroups();
        loadExtras();
    }, []);

    const loadGroups = async () => {
        try {
            const res = await authFetch(`${API_URL}/modifiers/groups`);
            if (res.ok) {
                const data = await res.json();
                setGroups(data);
                // #region agent log
                const prueba = (Array.isArray(data) ? data : []).find((g: ModifierGroup) => /prueba/i.test(`${g.displayName} ${g.name}`));
                fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'mod-slim',hypothesisId:'H-COPY',location:'modifiers/page.tsx:loadGroups',message:'slim modifiers ui loaded',data:{copyMode:'slim',groupCount:Array.isArray(data)?data.length:0,pruebaFound:!!prueba,pruebaName:prueba?.displayName||null,pruebaOptions:(prueba?.options||[]).map((o:ModifierOption)=>({id:o.id,name:o.name,price:o.priceAdjustment,hasRecipe:!!o.recipeId,hasExtra:!!o.inventoryItemId}))},timestamp:Date.now()})}).catch(()=>{});
                // #endregion
            }
        } finally {
            setLoading(false);
        }
    };

    const loadExtras = async () => {
        try {
            const res = await authFetch(`${API_URL}/inventory`);
            if (res.ok) {
                const data = await res.json();
                setExtraItems(
                    (Array.isArray(data) ? data : [])
                        .map((i: any) => ({ id: i.id, name: i.name }))
                        .sort((a: ExtraItem, b: ExtraItem) => a.name.localeCompare(b.name)),
                );
            }
        } catch {
            setExtraItems([]);
        }
    };

    const refreshGroup = async (groupId: string) => {
        await loadGroups();
        const groupRes = await authFetch(`${API_URL}/modifiers/groups/${groupId}`);
        if (groupRes.ok) setEditingGroup(await groupRes.json());
    };

    const handleCreateGroup = async () => {
        if (!newGroupDisplayName.trim()) return;
        const res = await authFetch(`${API_URL}/modifiers/groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: `mod-${Date.now()}`,
                displayName: newGroupDisplayName.trim(),
                type: newGroupType,
                minSelections: 0,
                maxSelections: newGroupType === 'SINGLE_SELECT' ? 1 : 5,
                sortOrder: groups.length,
                options: [],
            }),
        });
        if (res.ok) {
            const created = await res.json();
            setGroups((prev) => [{ ...created, assignedProductsCount: 0 }, ...prev]);
            setEditingGroup(created);
            setExpandedGroupId(created.id);
            setShowCreateModal(false);
            setNewGroupDisplayName('');
            setNewGroupType('SINGLE_SELECT');
        }
    };

    const handleUpdateGroup = async (group: ModifierGroup) => {
        setSaving(true);
        try {
            const res = await authFetch(`${API_URL}/modifiers/groups/${group.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    displayName: group.displayName,
                    type: group.type,
                    minSelections: group.minSelections,
                    maxSelections: group.maxSelections,
                }),
            });
            if (res.ok) {
                setSaveSuccess(true);
                loadGroups();
                setTimeout(() => setSaveSuccess(false), 2000);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (!confirm('¿Borrar esta pregunta? Se quita de todos los platos donde esté asignada.')) return;
        await authFetch(`${API_URL}/modifiers/groups/${id}`, { method: 'DELETE' });
        setGroups((prev) => prev.filter((g) => g.id !== id));
        if (editingGroup?.id === id) setEditingGroup(null);
    };

    const handleAddOption = async (groupId: string) => {
        if (!newOptionName.trim()) return;
        const res = await authFetch(`${API_URL}/modifiers/groups/${groupId}/options`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: newOptionName.trim(),
                priceAdjustment: newOptionPrice,
                sortOrder: editingGroup?.options?.length || 0,
            }),
        });
        if (res.ok) {
            setNewOptionName('');
            setNewOptionPrice(0);
            await refreshGroup(groupId);
        }
    };

    const handleDeleteOption = async (optionId: string, groupId: string) => {
        await authFetch(`${API_URL}/modifiers/options/${optionId}`, { method: 'DELETE' });
        await refreshGroup(groupId);
    };

    const handleUpdateOption = async (optionId: string, groupId: string, data: any) => {
        await authFetch(`${API_URL}/modifiers/options/${optionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        await refreshGroup(groupId);
    };

    const handleReorderOption = async (groupId: string, optionId: string, direction: 'up' | 'down') => {
        if (!editingGroup) return;
        const options = [...editingGroup.options];
        const idx = options.findIndex((o) => o.id === optionId);
        if (idx === -1) return;
        if (direction === 'up' && idx === 0) return;
        if (direction === 'down' && idx === options.length - 1) return;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        [options[idx], options[swapIdx]] = [options[swapIdx], options[idx]];
        const reordered = options.map((o, i) => ({ ...o, sortOrder: i }));
        setEditingGroup({ ...editingGroup, options: reordered });
        await authFetch(`${API_URL}/modifiers/groups/${groupId}/reorder-options`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: reordered.map((o) => ({ id: o.id, sortOrder: o.sortOrder })) }),
        });
        loadGroups();
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-orange-500 mb-4" size={48} />
                <p className="font-black uppercase text-xs tracking-widest text-slate-400 italic">Cargando…</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20 min-w-0 overflow-x-hidden">
            <header className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="w-full pl-14 lg:pl-0 text-right lg:text-left">
                        <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                            Extras y <span className="text-orange-500">Opciones</span>
                        </h1>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setShowEnlargeModal(true)}
                            className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-orange-600 flex items-center gap-2"
                        >
                            Agrandar tamaño
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(true)}
                            className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-700 flex items-center gap-2"
                        >
                            <Plus size={16} /> Otra pregunta
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar una pregunta o una respuesta…"
                        className="w-full pl-12 pr-10 py-3.5 bg-white border-2 border-slate-100 focus:border-orange-500 rounded-2xl font-bold text-sm outline-none"
                    />
                </div>
            </header>

            <div className="space-y-4">
                {filteredGroups.map((group) => (
                    <div key={group.id} className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
                        <div
                            className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50/70"
                            onClick={() => {
                                const open = expandedGroupId !== group.id;
                                setExpandedGroupId(open ? group.id : null);
                                if (open) setEditingGroup(group);
                                // #region agent log
                                fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'mod-slim',hypothesisId:'H-COPY',location:'modifiers/page.tsx:toggleGroup',message:'toggled modifier group',data:{copyMode:'slim',open,name:group.displayName,optionCount:group.options.length},timestamp:Date.now()})}).catch(()=>{});
                                // #endregion
                            }}
                        >
                            <div>
                                <h3 className="font-black uppercase italic text-lg text-slate-900">{group.displayName}</h3>
                                <p className="text-xs font-bold text-slate-400 mt-1">
                                    {group.type === 'SINGLE_SELECT' ? 'Una' : 'Varias'}
                                    {' · '}
                                    {group.options.length} respuesta{group.options.length === 1 ? '' : 's'}
                                    {group.assignedProductsCount ? ` · en ${group.assignedProductsCount} platos` : ''}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                                    className="p-2 text-slate-300 hover:text-red-500"
                                >
                                    <Trash2 size={16} />
                                </button>
                                {expandedGroupId === group.id ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                            </div>
                        </div>

                        {expandedGroupId === group.id && editingGroup && (
                            <div className="border-t border-slate-100 p-5 md:p-6 space-y-5 bg-slate-50/40">
                                <div className="grid md:grid-cols-3 gap-3">
                                    <label className="block md:col-span-2">
                                        <span className="text-xs font-black text-slate-500 block mb-1">Pregunta</span>
                                        <input
                                            value={editingGroup.displayName}
                                            onChange={(e) => setEditingGroup({ ...editingGroup, displayName: e.target.value })}
                                            className="w-full p-3 bg-white rounded-xl font-bold outline-none border-2 border-transparent focus:border-orange-500"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-xs font-black text-slate-500 block mb-1">Cuántas</span>
                                        <select
                                            value={editingGroup.type}
                                            onChange={(e) => setEditingGroup({
                                                ...editingGroup,
                                                type: e.target.value as 'SINGLE_SELECT' | 'MULTI_SELECT',
                                                maxSelections: e.target.value === 'SINGLE_SELECT' ? 1 : Math.max(editingGroup.maxSelections, 2),
                                            })}
                                            className="w-full p-3 bg-white rounded-xl font-bold outline-none"
                                        >
                                            <option value="SINGLE_SELECT">Solo una</option>
                                            <option value="MULTI_SELECT">Varias</option>
                                        </select>
                                    </label>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => handleUpdateGroup(editingGroup)}
                                        className={`px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 ${saveSuccess ? 'bg-green-500 text-white' : 'bg-slate-900 text-white'}`}
                                    >
                                        {saving ? <Loader2 size={14} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={14} /> : <Save size={14} />}
                                        {saveSuccess ? 'Guardado' : 'Guardar pregunta'}
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Respuestas</p>
                                    {editingGroup.options.map((option, optIdx) => {
                                        const effect = optionEffect(option);
                                        return (
                                            <div key={option.id} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex flex-col">
                                                        <button type="button" disabled={optIdx === 0} onClick={() => handleReorderOption(editingGroup.id, option.id, 'up')} className="text-slate-300 hover:text-orange-500 disabled:opacity-20"><ArrowUp size={12} /></button>
                                                        <button type="button" disabled={optIdx === editingGroup.options.length - 1} onClick={() => handleReorderOption(editingGroup.id, option.id, 'down')} className="text-slate-300 hover:text-orange-500 disabled:opacity-20"><ArrowDown size={12} /></button>
                                                    </div>
                                                    <input
                                                        key={`${option.id}-name-${option.name}`}
                                                        defaultValue={option.name}
                                                        onBlur={(e) => {
                                                            const name = e.target.value.trim();
                                                            if (name && name !== option.name) handleUpdateOption(option.id, editingGroup.id, { name });
                                                        }}
                                                        className="flex-1 bg-slate-50 rounded-xl px-3 py-2 font-black text-sm outline-none focus:border-orange-400 border border-transparent"
                                                    />
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[10px] font-black text-slate-400">+$</span>
                                                        <input
                                                            type="number"
                                                            key={`${option.id}-price-${option.priceAdjustment}`}
                                                            defaultValue={option.priceAdjustment}
                                                            onBlur={(e) => {
                                                                const priceAdjustment = Number(e.target.value) || 0;
                                                                if (priceAdjustment !== option.priceAdjustment) handleUpdateOption(option.id, editingGroup.id, { priceAdjustment });
                                                            }}
                                                            className="w-24 bg-slate-50 rounded-xl px-2 py-2 font-black text-sm text-center outline-none"
                                                        />
                                                    </div>
                                                    <button type="button" onClick={() => handleDeleteOption(option.id, editingGroup.id)} className="p-2 text-slate-300 hover:text-red-500">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>

                                                {(effect === 'extra' || pickingExtraFor === option.id) && (
                                                    <select
                                                        value={option.inventoryItemId || ''}
                                                        onChange={(e) => {
                                                            handleUpdateOption(option.id, editingGroup.id, { inventoryItemId: e.target.value || null });
                                                            setPickingExtraFor(null);
                                                        }}
                                                        className="w-full p-3 bg-blue-50 rounded-xl font-bold text-sm outline-none"
                                                    >
                                                        <option value="">Extra…</option>
                                                        {extraItems.map((item) => (
                                                            <option key={item.id} value={item.id}>{item.name}</option>
                                                        ))}
                                                    </select>
                                                )}
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPickingExtraFor(pickingExtraFor === option.id ? null : option.id)}
                                                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700"
                                                    >
                                                        Extra
                                                    </button>
                                                    {option.recipeId && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                // #region agent log
                                                                fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'mod-recipe',hypothesisId:'H-UI',location:'modifiers/page.tsx:openRecipe',message:'opened recipe modal',data:{optionId:option.id,hasRecipe:!!option.recipeId},timestamp:Date.now()})}).catch(()=>{});
                                                                // #endregion
                                                                setRecipeOption(option);
                                                            }}
                                                            className="text-[10px] font-black uppercase tracking-widest text-orange-500"
                                                        >
                                                            Receta
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 bg-orange-50/70 rounded-2xl border-2 border-dashed border-orange-200">
                                        <input
                                            value={newOptionName}
                                            onChange={(e) => setNewOptionName(e.target.value)}
                                            placeholder="Nueva respuesta"
                                            className="flex-1 bg-transparent font-bold outline-none placeholder:text-orange-300"
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddOption(editingGroup.id); }}
                                        />
                                        <div className="flex items-center gap-2">
                                            <DollarSign size={14} className="text-slate-400" />
                                            <input
                                                type="number"
                                                value={newOptionPrice}
                                                onChange={(e) => setNewOptionPrice(Number(e.target.value))}
                                                className="w-24 bg-white rounded-xl p-2 font-black text-sm text-center outline-none"
                                                placeholder="0"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleAddOption(editingGroup.id)}
                                                disabled={!newOptionName.trim()}
                                                className={`px-4 py-2 rounded-xl font-black uppercase text-[10px] ${newOptionName.trim() ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-400'}`}
                                            >
                                                Agregar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {groups.length === 0 && (
                    <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
                        <Layers className="mx-auto text-slate-200 mb-4" size={48} />
                        <p className="font-black italic uppercase text-slate-400 mb-6">Sin preguntas</p>
                        <button type="button" onClick={() => setShowEnlargeModal(true)} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs">
                            Agrandar tamaño
                        </button>
                    </div>
                )}
            </div>

            {showEnlargeModal && (
                <EnlargeSizeModal
                    onClose={() => setShowEnlargeModal(false)}
                    onSaved={async () => {
                        setShowEnlargeModal(false);
                        await loadGroups();
                    }}
                />
            )}

            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-7 space-y-5">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-black italic uppercase">Nueva pregunta</h2>
                            </div>
                            <button type="button" onClick={() => setShowCreateModal(false)} className="p-2 text-slate-300"><X size={20} /></button>
                        </div>
                        <label className="block">
                            <span className="text-xs font-black text-slate-500 block mb-1">Pregunta</span>
                            <input
                                value={newGroupDisplayName}
                                onChange={(e) => setNewGroupDisplayName(e.target.value)}
                                placeholder="Elige el tamaño"
                                className="w-full p-3.5 bg-slate-50 rounded-xl font-bold outline-none focus:border-orange-500 border-2 border-transparent"
                                autoFocus
                            />
                        </label>
                        <label className="block">
                            <span className="text-xs font-black text-slate-500 block mb-1">Cuántas</span>
                            <select
                                value={newGroupType}
                                onChange={(e) => setNewGroupType(e.target.value as 'SINGLE_SELECT' | 'MULTI_SELECT')}
                                className="w-full p-3.5 bg-slate-50 rounded-xl font-bold outline-none"
                            >
                                <option value="SINGLE_SELECT">Una</option>
                                <option value="MULTI_SELECT">Varias</option>
                            </select>
                        </label>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 rounded-xl bg-slate-100 font-black uppercase text-[10px]">Cancelar</button>
                            <button
                                type="button"
                                onClick={handleCreateGroup}
                                disabled={!newGroupDisplayName.trim()}
                                className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] ${newGroupDisplayName.trim() ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-400'}`}
                            >
                                Crear
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {recipeOption && editingGroup && (
                <ModifierRecipeModal
                    option={recipeOption}
                    groupName={editingGroup.displayName}
                    onClose={() => setRecipeOption(null)}
                    onSaved={async () => {
                        setRecipeOption(null);
                        await refreshGroup(editingGroup.id);
                    }}
                />
            )}
        </div>
    );
}
