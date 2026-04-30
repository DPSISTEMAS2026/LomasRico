'use client';

import { useState, useEffect } from 'react';
import {
    Plus, X, Save, Trash2, ChevronDown, ChevronUp,
    ToggleLeft, ToggleRight, Layers, Settings2,
    Loader2, CheckCircle2, DollarSign, GripVertical,
    Package, ArrowUp, ArrowDown, Search
} from 'lucide-react';
import { authFetch } from '../../../../services/authFetch';
import { API_URL } from '../../../../services/api';

interface ModifierOption {
    id: string;
    name: string;
    priceAdjustment: number;
    isDefault: boolean;
    isActive?: boolean;
    sortOrder: number;
    recipeId?: string | null;
    inventoryItemId?: string | null;
    inventoryItemName?: string | null;
}

interface InventoryItem {
    id: string;
    name: string;
    type: string;
    currentStock: number;
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

export default function ModifiersPage() {
    const [groups, setGroups] = useState<ModifierGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
    const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDisplayName, setNewGroupDisplayName] = useState('');
    const [newGroupType, setNewGroupType] = useState<'SINGLE_SELECT' | 'MULTI_SELECT'>('SINGLE_SELECT');
    // New option form
    const [newOptionName, setNewOptionName] = useState('');
    const [newOptionPrice, setNewOptionPrice] = useState(0);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

    const filteredGroups = groups.filter(g =>
        !searchQuery.trim() ||
        g.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.options.some(o => o.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    useEffect(() => {
        loadGroups();
        loadInventoryItems();
    }, []);



    const loadGroups = async () => {
        try {
            const res = await authFetch(`${API_URL}/modifiers/groups`);
            if (res.ok) {
                const data = await res.json();
                setGroups(data);
            }
        } catch (e) {
            console.error('Error loading modifier groups:', e);
        } finally {
            setLoading(false);
        }
    };

    const loadInventoryItems = async () => {
        try {
            const res = await authFetch(`${API_URL}/inventory`);
            if (res.ok) {
                const data = await res.json();
                setInventoryItems(data.sort((a: any, b: any) => a.name.localeCompare(b.name)));
            }
        } catch (e) {
            console.error('Error loading inventory:', e);
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupDisplayName.trim()) return;
        const newGroup: any = {
            name: newGroupName.trim() || `mod-${Date.now()}`,
            displayName: newGroupDisplayName.trim(),
            type: newGroupType,
            minSelections: 0,
            maxSelections: newGroupType === 'SINGLE_SELECT' ? 1 : 5,
            sortOrder: groups.length,
            options: [],
        };

        try {
            const res = await authFetch(`${API_URL}/modifiers/groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newGroup),
            });
            if (res.ok) {
                const created = await res.json();
                setGroups((prev) => [...prev, { ...created, assignedProductsCount: 0 }]);
                setEditingGroup(created);
                setExpandedGroupId(created.id);
                setShowCreateModal(false);
                setNewGroupName('');
                setNewGroupDisplayName('');
                setNewGroupType('SINGLE_SELECT');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdateGroup = async (group: ModifierGroup) => {
        setSaving(true);
        try {
            const res = await authFetch(`${API_URL}/modifiers/groups/${group.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: group.name,
                    displayName: group.displayName,
                    type: group.type,
                    minSelections: group.minSelections,
                    maxSelections: group.maxSelections,
                    sortOrder: group.sortOrder,
                }),
            });
            if (res.ok) {
                setSaveSuccess(true);
                loadGroups();
                setTimeout(() => setSaveSuccess(false), 2000);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (!confirm('¿Eliminar este grupo de modificadores? Se eliminará de todos los productos asignados.')) return;
        try {
            await authFetch(`${API_URL}/modifiers/groups/${id}`, { method: 'DELETE' });
            setGroups((prev) => prev.filter((g) => g.id !== id));
            if (editingGroup?.id === id) setEditingGroup(null);
        } catch (e) {
            console.error(e);
        }
    };

    const handleAddOption = async (groupId: string) => {
        if (!newOptionName.trim()) return;
        try {
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
                loadGroups();
                // Refresh editing group
                const groupRes = await authFetch(`${API_URL}/modifiers/groups/${groupId}`);
                if (groupRes.ok) setEditingGroup(await groupRes.json());
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteOption = async (optionId: string, groupId: string) => {
        try {
            await authFetch(`${API_URL}/modifiers/options/${optionId}`, { method: 'DELETE' });
            loadGroups();
            const groupRes = await authFetch(`${API_URL}/modifiers/groups/${groupId}`);
            if (groupRes.ok) setEditingGroup(await groupRes.json());
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdateOption = async (optionId: string, groupId: string, data: any) => {
        try {
            await authFetch(`${API_URL}/modifiers/options/${optionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            loadGroups();
            const groupRes = await authFetch(`${API_URL}/modifiers/groups/${groupId}`);
            if (groupRes.ok) setEditingGroup(await groupRes.json());
        } catch (e) {
            console.error(e);
        }
    };

    const handleReorderOption = async (groupId: string, optionId: string, direction: 'up' | 'down') => {
        if (!editingGroup) return;
        const options = [...editingGroup.options];
        const idx = options.findIndex(o => o.id === optionId);
        if (idx === -1) return;
        if (direction === 'up' && idx === 0) return;
        if (direction === 'down' && idx === options.length - 1) return;

        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        [options[idx], options[swapIdx]] = [options[swapIdx], options[idx]];

        // Update local state immediately
        const reordered = options.map((o, i) => ({ ...o, sortOrder: i }));
        setEditingGroup({ ...editingGroup, options: reordered });

        // Persist
        try {
            await authFetch(`${API_URL}/modifiers/groups/${groupId}/reorder-options`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: reordered.map(o => ({ id: o.id, sortOrder: o.sortOrder }))
                })
            });
            loadGroups();
        } catch (e) {
            console.error('Error reordering options:', e);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-orange-500 mb-4" size={48} />
                <p className="font-black uppercase text-xs tracking-widest text-slate-400 italic">
                    Cargando Modificadores...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <header className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                            GESTIÓN DE <span className="text-orange-500">MODIFICADORES</span>
                        </h1>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="w-8 h-[2px] bg-orange-500"></span>
                            <p className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest px-1">
                                {groups.length} grupos · {groups.reduce((a, g) => a + g.options.length, 0)} opciones totales
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-slate-900 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-[2rem] font-black uppercase text-[10px] md:text-xs tracking-[0.2em] shadow-2xl shadow-orange-500/10 hover:bg-orange-600 hover:scale-105 transition-all flex items-center justify-center gap-3 active:scale-95 italic whitespace-nowrap"
                    >
                        <Plus size={18} />
                        Nuevo Grupo
                    </button>
                </div>
                {/* Search Bar */}
                <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar modificador o opción..."
                        className="w-full pl-12 pr-10 py-3.5 bg-white border-2 border-slate-100 focus:border-orange-500 rounded-2xl font-bold text-sm text-slate-700 outline-none transition-colors shadow-sm"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                            <X size={16} />
                        </button>
                    )}
                </div>
            </header>

            {/* Empty State */}
            {groups.length === 0 && (
                <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-16 text-center">
                    <Layers className="mx-auto text-slate-200 mb-6" size={64} />
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-300 mb-2">
                        Sin Modificadores
                    </h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8">
                        Crea tu primer grupo: Formato, Proteínas, Extras, etc.
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-orange-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-600 transition-all"
                    >
                        <Plus size={16} className="inline mr-2" />
                        Crear Primer Grupo
                    </button>
                </div>
            )}

            {/* Groups List */}
            <div className="space-y-4">
                {filteredGroups.length === 0 && groups.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                        <Search className="mx-auto text-slate-200 mb-4" size={40} />
                        <p className="font-black text-slate-300 uppercase text-xs tracking-widest italic">
                            No se encontraron modificadores para "{searchQuery}"
                        </p>
                    </div>
                )}
                {filteredGroups.map((group) => (
                    <div
                        key={group.id}
                        className="bg-white rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md"
                    >
                        {/* Group Header */}
                        <div
                            className="flex items-center justify-between p-5 md:p-6 cursor-pointer hover:bg-slate-50/50 transition-colors"
                            onClick={() => {
                                const isExpanding = expandedGroupId !== group.id;
                                setExpandedGroupId(isExpanding ? group.id : null);
                                if (isExpanding) setEditingGroup(group);
                            }}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
                                    <Layers size={22} />
                                </div>
                                <div>
                                    <h3 className="font-black uppercase text-base md:text-lg italic tracking-tighter text-slate-900">
                                        {group.displayName}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                            {group.type === 'SINGLE_SELECT' ? 'Selección Única' : 'Multi Selección'}
                                        </span>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                            {group.options.length} opciones
                                        </span>
                                        {group.assignedProductsCount && group.assignedProductsCount > 0 && (
                                            <span className="text-[9px] font-black uppercase tracking-widest text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                                                <Package size={10} className="inline mr-1" />
                                                {group.assignedProductsCount} productos
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteGroup(group.id);
                                    }}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                                {expandedGroupId === group.id ? (
                                    <ChevronUp size={20} className="text-slate-400" />
                                ) : (
                                    <ChevronDown size={20} className="text-slate-400" />
                                )}
                            </div>
                        </div>

                        {/* Expanded Editor */}
                        {expandedGroupId === group.id && editingGroup && (
                            <div className="border-t border-slate-100 p-6 md:p-8 space-y-6 bg-slate-50/30 animate-in slide-in-from-top-2 duration-300">
                                {/* Group Config */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <label className="block">
                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1 italic">
                                            Nombre Interno
                                        </span>
                                        <input
                                            value={editingGroup.name}
                                            onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                                            className="w-full p-3 bg-white border-2 border-transparent focus:border-orange-500 rounded-xl font-bold text-slate-700 outline-none text-sm"
                                            placeholder="formato"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1 italic">
                                            Nombre Visible
                                        </span>
                                        <input
                                            value={editingGroup.displayName}
                                            onChange={(e) => setEditingGroup({ ...editingGroup, displayName: e.target.value })}
                                            className="w-full p-3 bg-white border-2 border-transparent focus:border-orange-500 rounded-xl font-bold text-slate-700 outline-none text-sm"
                                            placeholder="Elige tu Formato"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1 italic">
                                            Tipo de Selección
                                        </span>
                                        <select
                                            value={editingGroup.type}
                                            onChange={(e) =>
                                                setEditingGroup({
                                                    ...editingGroup,
                                                    type: e.target.value as 'SINGLE_SELECT' | 'MULTI_SELECT',
                                                })
                                            }
                                            className="w-full p-3 bg-white border-2 border-transparent focus:border-orange-500 rounded-xl font-bold text-slate-700 outline-none text-sm appearance-none"
                                        >
                                            <option value="SINGLE_SELECT">Selección Única</option>
                                            <option value="MULTI_SELECT">Multi Selección</option>
                                        </select>
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <label className="block">
                                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1 italic">
                                                Mín.
                                            </span>
                                            <input
                                                type="number"
                                                min={0}
                                                value={editingGroup.minSelections}
                                                onChange={(e) =>
                                                    setEditingGroup({
                                                        ...editingGroup,
                                                        minSelections: Number(e.target.value),
                                                    })
                                                }
                                                className="w-full p-3 bg-white border-2 border-transparent focus:border-orange-500 rounded-xl font-bold text-slate-700 outline-none text-sm"
                                            />
                                        </label>
                                        <label className="block">
                                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1 italic">
                                                Máx.
                                            </span>
                                            <input
                                                type="number"
                                                min={1}
                                                value={editingGroup.maxSelections}
                                                onChange={(e) =>
                                                    setEditingGroup({
                                                        ...editingGroup,
                                                        maxSelections: Number(e.target.value),
                                                    })
                                                }
                                                className="w-full p-3 bg-white border-2 border-transparent focus:border-orange-500 rounded-xl font-bold text-slate-700 outline-none text-sm"
                                            />
                                        </label>
                                    </div>
                                </div>

                                {/* Save Group Button */}
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => handleUpdateGroup(editingGroup)}
                                        disabled={saving}
                                        className={`px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 ${
                                            saveSuccess
                                                ? 'bg-green-500 text-white'
                                                : 'bg-slate-900 text-white hover:bg-orange-600 active:scale-95'
                                        }`}
                                    >
                                        {saving ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : saveSuccess ? (
                                            <CheckCircle2 size={14} />
                                        ) : (
                                            <Save size={14} />
                                        )}
                                        {saveSuccess ? '¡Guardado!' : 'Guardar Grupo'}
                                    </button>
                                </div>

                                {/* Options List */}
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic flex items-center gap-2">
                                        <Settings2 size={14} />
                                        Opciones del Grupo
                                    </h4>

                                    {editingGroup.options.map((option, optIdx) => (
                                        <div
                                            key={option.id}
                                            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 group hover:border-orange-200 transition-all"
                                        >
                                            <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-400 text-[9px] font-black flex items-center justify-center shrink-0">
                                                {optIdx + 1}
                                            </span>
                                            <div className="flex flex-col gap-0.5 shrink-0">
                                                <button
                                                    disabled={optIdx === 0}
                                                    onClick={() => handleReorderOption(editingGroup.id, option.id, 'up')}
                                                    className="w-5 h-4 rounded flex items-center justify-center text-slate-300 hover:text-orange-500 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                                >
                                                    <ArrowUp size={10} />
                                                </button>
                                                <button
                                                    disabled={optIdx === editingGroup.options.length - 1}
                                                    onClick={() => handleReorderOption(editingGroup.id, option.id, 'down')}
                                                    className="w-5 h-4 rounded flex items-center justify-center text-slate-300 hover:text-orange-500 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                                >
                                                    <ArrowDown size={10} />
                                                </button>
                                            </div>
                                            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className="font-black text-sm italic text-slate-800 truncate">
                                                        {option.name}
                                                    </span>
                                                    {option.priceAdjustment !== 0 && (
                                                        <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full shrink-0">
                                                            <DollarSign size={10} className="inline" />
                                                            {option.priceAdjustment > 0 ? '+' : ''}
                                                            {option.priceAdjustment.toLocaleString()}
                                                        </span>
                                                    )}
                                                    {option.isDefault && (
                                                        <span className="text-[8px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full shrink-0 uppercase">
                                                            DEFAULT
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Inventory Link Selector */}
                                                <div className="flex items-center gap-2">
                                                    <Package size={11} className={option.inventoryItemId ? 'text-blue-500' : 'text-slate-300'} />
                                                    <select
                                                        value={option.inventoryItemId || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value || null;
                                                            handleUpdateOption(option.id, editingGroup.id, { inventoryItemId: val });
                                                        }}
                                                        className={`text-[10px] font-bold py-0.5 px-1.5 rounded-lg border outline-none cursor-pointer transition-colors ${
                                                            option.inventoryItemId
                                                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                                : 'bg-slate-50 border-slate-200 text-slate-400'
                                                        }`}
                                                    >
                                                        <option value="">Sin inventario</option>
                                                        {inventoryItems.map(inv => (
                                                            <option key={inv.id} value={inv.id}>
                                                                {inv.name} ({inv.currentStock} {inv.type})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    handleUpdateOption(option.id, editingGroup.id, {
                                                        isDefault: !option.isDefault,
                                                    })
                                                }
                                                className="p-1.5 text-slate-300 hover:text-orange-500 transition-colors"
                                                title="Toggle Default"
                                            >
                                                {option.isDefault ? (
                                                    <ToggleRight size={18} className="text-orange-500" />
                                                ) : (
                                                    <ToggleLeft size={18} />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteOption(option.id, editingGroup.id)}
                                                className="p-1.5 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}

                                    {/* Add New Option */}
                                    <div className="flex items-center gap-3 p-3 bg-orange-50/50 rounded-xl border-2 border-dashed border-orange-200">
                                        <Plus size={16} className="text-orange-400 shrink-0" />
                                        <input
                                            type="text"
                                            value={newOptionName}
                                            onChange={(e) => setNewOptionName(e.target.value)}
                                            placeholder="Nombre de la opción..."
                                            className="flex-1 bg-transparent font-bold text-sm text-slate-700 outline-none placeholder:text-orange-300"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleAddOption(editingGroup.id);
                                            }}
                                        />
                                        <div className="flex items-center gap-1 shrink-0">
                                            <DollarSign size={14} className="text-slate-400" />
                                            <input
                                                type="number"
                                                value={newOptionPrice}
                                                onChange={(e) => setNewOptionPrice(Number(e.target.value))}
                                                className="w-20 bg-white rounded-lg p-2 font-bold text-sm text-slate-700 outline-none border border-slate-200 text-center"
                                                placeholder="0"
                                            />
                                        </div>

                                        <button
                                            onClick={() => handleAddOption(editingGroup.id)}
                                            disabled={!newOptionName.trim()}
                                            className={`px-4 py-2 rounded-lg font-black uppercase text-[9px] tracking-widest transition-all ${
                                                newOptionName.trim()
                                                    ? 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95'
                                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                            }`}
                                        >
                                            Agregar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Create Button at Bottom */}
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full bg-white rounded-2xl md:rounded-[2rem] border-2 border-dashed border-slate-200 hover:border-orange-400 p-6 flex items-center justify-center gap-3 transition-all hover:bg-orange-50/50 group"
                >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-orange-500 flex items-center justify-center transition-colors">
                        <Plus size={20} className="text-slate-400 group-hover:text-white transition-colors" />
                    </div>
                    <span className="font-black uppercase text-xs tracking-widest text-slate-400 group-hover:text-orange-600 italic transition-colors">
                        Crear Nuevo Grupo
                    </span>
                </button>
            </div>

            {/* Create Group Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">
                                Nuevo <span className="text-orange-500">Modificador</span>
                            </h2>
                            <button
                                onClick={() => { setShowCreateModal(false); setNewGroupName(''); setNewGroupDisplayName(''); }}
                                className="p-2 text-slate-300 hover:text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <label className="block">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5 italic">Nombre Visible *</span>
                                <input
                                    value={newGroupDisplayName}
                                    onChange={(e) => setNewGroupDisplayName(e.target.value)}
                                    placeholder="Ej: Elige tu Proteína"
                                    className="w-full p-3.5 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-xl font-bold text-sm text-slate-700 outline-none transition-colors"
                                    autoFocus
                                />
                            </label>
                            <label className="block">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5 italic">Nombre Interno</span>
                                <input
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="Ej: proteinas (se genera automático)"
                                    className="w-full p-3.5 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-xl font-bold text-sm text-slate-700 outline-none transition-colors"
                                />
                            </label>
                            <label className="block">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5 italic">Tipo de Selección</span>
                                <select
                                    value={newGroupType}
                                    onChange={(e) => setNewGroupType(e.target.value as 'SINGLE_SELECT' | 'MULTI_SELECT')}
                                    className="w-full p-3.5 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-xl font-bold text-sm text-slate-700 outline-none appearance-none"
                                >
                                    <option value="SINGLE_SELECT">Selección Única</option>
                                    <option value="MULTI_SELECT">Multi Selección</option>
                                </select>
                            </label>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => { setShowCreateModal(false); setNewGroupName(''); setNewGroupDisplayName(''); }}
                                className="flex-1 px-6 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateGroup}
                                disabled={!newGroupDisplayName.trim()}
                                className={`flex-1 px-6 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 ${
                                    newGroupDisplayName.trim()
                                        ? 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                            >
                                <Plus size={14} />
                                Crear Grupo
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
