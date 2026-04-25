'use client';

import { useState, useEffect } from 'react';
import {
    Plus, X, Save, Trash2, ChevronDown, ChevronUp,
    ToggleLeft, ToggleRight, Layers, Settings2,
    Loader2, CheckCircle2, DollarSign, GripVertical,
    Package, ChefHat, Search, Beaker
} from 'lucide-react';
import { authFetch } from '../../../../services/authFetch';

// ============================================================================
// COMPONENTE CREADOR DE RECETA RÁPIDO PARA MODIFICADORES
// ============================================================================
function ModifierRecipeModal({
    isOpen,
    onClose,
    option,
    inventoryItems,
    onRecipeCreated
}: {
    isOpen: boolean;
    onClose: () => void;
    option: any;
    inventoryItems: any[];
    onRecipeCreated: (recipeId: string) => void;
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItems, setSelectedItems] = useState<{ id: string, name: string, quantity: number, unit: string }[]>([]);
    const [loading, setLoading] = useState(false);

    if (!isOpen || !option) return null;

    const filteredItems = inventoryItems.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleAddItem = (item: any) => {
        if (!selectedItems.find(i => i.id === item.id)) {
            setSelectedItems([...selectedItems, { id: item.id, name: item.name, quantity: 1, unit: item.unit || 'unidad' }]);
        }
    };

    const handleUpdateQuantity = (id: string, qty: number) => {
        if (qty <= 0) return;
        setSelectedItems(items => items.map(i => i.id === id ? { ...i, quantity: qty } : i));
    };

    const handleRemoveItem = (id: string) => {
        setSelectedItems(items => items.filter(i => i.id !== id));
    };

    const handleSave = async () => {
        if (selectedItems.length === 0) return;
        setLoading(true);
        try {
            // Crear la receta y enlazarla a un MODIFIER_OPTION (el backend ya lo soporta)
            const recipeData = {
                targetId: option.id,
                type: 'MODIFIER_OPTION',
                name: `Receta para: ${option.name}`,
                items: selectedItems.map(item => ({
                    inventoryItemId: item.id,
                    quantity: item.quantity
                }))
            };

            const response = await authFetch(`${API_URL}/recipes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recipeData)
            });

            if (!response.ok) throw new Error('Error al guardar receta');
            
            const r = await response.json();
            onRecipeCreated(r.id);
            onClose();
        } catch (error) {
            console.error(error);
            alert("No se pudo crear la receta");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[80vh]">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-orange-50 shrink-0">
                    <div>
                        <h3 className="text-xl font-black italic tracking-tighter uppercase text-slate-900">
                            Inventario / Receta: <span className="text-orange-600">{option.name}</span>
                        </h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                            Elige los insumos que se usarán / descontarán
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* BODEGA (Buscador) */}
                    <div className="w-1/2 border-r border-slate-100 bg-slate-50 flex flex-col">
                        <div className="p-4 shrink-0">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar Insumos..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-orange-500 transition-colors"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {filteredItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                                    <div>
                                        <p className="text-sm font-black uppercase text-slate-700">{item.name}</p>
                                        <p className="text-[10px] uppercase font-bold text-slate-400">Bodega: {item.stock} {item.unit}</p>
                                    </div>
                                    <button
                                        onClick={() => handleAddItem(item)}
                                        className="p-2 hover:bg-orange-100 text-orange-500 rounded-lg transition-colors"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            ))}
                            {filteredItems.length === 0 && (
                                <p className="text-center text-xs font-bold text-slate-400 uppercase italic p-4">No hay insumos</p>
                            )}
                        </div>
                    </div>

                    {/* RECETA (Bom) */}
                    <div className="w-1/2 bg-white flex flex-col">
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Insumos para esta opción</h4>
                            {selectedItems.map(item => (
                                <div key={item.id} className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex items-center gap-3">
                                    <div className="flex-1">
                                        <p className="text-sm font-black uppercase text-slate-800">{item.name}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="0.1"
                                            step="0.1"
                                            value={item.quantity}
                                            onChange={(e) => handleUpdateQuantity(item.id, parseFloat(e.target.value))}
                                            className="w-20 px-2 py-1 text-center font-bold text-sm bg-white border-2 border-orange-200 rounded-lg outline-none focus:border-orange-500"
                                        />
                                        <span className="text-xs font-bold text-slate-400 uppercase w-12">{item.unit}</span>
                                        <button onClick={() => handleRemoveItem(item.id)} className="p-1 hover:bg-red-100 text-red-500 rounded-lg">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {selectedItems.length === 0 && (
                                <div className="h-full flex items-center justify-center">
                                    <p className="text-xs font-bold text-slate-400 uppercase italic">No has agregado insumos</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-white shrink-0">
                            <button
                                onClick={handleSave}
                                disabled={selectedItems.length === 0 || loading}
                                className="w-full bg-slate-900 text-white font-black italic uppercase tracking-widest py-3 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Guardar Receta
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
import { API_URL } from '../../../../services/api';

interface ModifierOption {
    id: string;
    name: string;
    priceAdjustment: number;
    isDefault: boolean;
    isActive?: boolean;
    sortOrder: number;
    recipeId?: string | null;
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
    const [recipes, setRecipes] = useState<any[]>([]);
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [recipeModalOption, setRecipeModalOption] = useState<any | null>(null);

    // New option form
    const [newOptionName, setNewOptionName] = useState('');
    const [newOptionPrice, setNewOptionPrice] = useState(0);
    const [newOptionRecipeId, setNewOptionRecipeId] = useState('');

    useEffect(() => {
        loadGroups();
        loadRecipes();
        loadInventory();
    }, []);

    const loadRecipes = async () => {
        try {
            const res = await authFetch(`${API_URL}/recipes`);
            if (res.ok) setRecipes(await res.json());
        } catch (e) {
            console.error('Error loading recipes:', e);
        }
    };

    const loadInventory = async () => {
        try {
            const res = await authFetch(`${API_URL}/inventory`);
            if (res.ok) setInventoryItems(await res.json());
        } catch (e) {
            console.error('Error loading inventory:', e);
        }
    };

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

    const handleCreateGroup = async () => {
        const newGroup: any = {
            name: `modificador-${Date.now()}`,
            displayName: 'Nuevo Modificador',
            type: 'SINGLE_SELECT',
            minSelections: 0,
            maxSelections: 1,
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
                    recipeId: newOptionRecipeId || null,
                }),
            });
            if (res.ok) {
                setNewOptionName('');
                setNewOptionPrice(0);
                setNewOptionRecipeId('');
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
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                        GESTIÓN DE <span className="text-orange-500">MODIFICADORES</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="w-8 h-[2px] bg-orange-500"></span>
                        <p className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest px-1">
                            Formato · Proteínas · Extras · Salsas · y más
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleCreateGroup}
                    className="bg-slate-900 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-[2rem] font-black uppercase text-[10px] md:text-xs tracking-[0.2em] shadow-2xl shadow-orange-500/10 hover:bg-orange-600 hover:scale-105 transition-all flex items-center justify-center gap-3 active:scale-95 italic whitespace-nowrap"
                >
                    <Plus size={18} />
                    Nuevo Grupo
                </button>
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
                        onClick={handleCreateGroup}
                        className="bg-orange-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-600 transition-all"
                    >
                        <Plus size={16} className="inline mr-2" />
                        Crear Primer Grupo
                    </button>
                </div>
            )}

            {/* Groups List */}
            <div className="space-y-4">
                {groups.map((group) => (
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

                                    {editingGroup.options.map((option) => (
                                        <div
                                            key={option.id}
                                            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 group hover:border-orange-200 transition-all"
                                        >
                                            <GripVertical size={16} className="text-slate-200 shrink-0" />
                                            <div className="flex-1 flex flex-col md:flex-row md:items-center gap-2 md:gap-3 min-w-0">
                                                <div className="flex items-center gap-3">
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
                                                </div>

                                                {/* Recipe Badge or Selector in list */}
                                                <div className="flex items-center gap-1">
                                                    <select
                                                        value={option.recipeId || ''}
                                                        onChange={(e) => handleUpdateOption(option.id, editingGroup.id, { recipeId: e.target.value || null })}
                                                        className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg border outline-none transition-all ${
                                                            option.recipeId 
                                                                ? 'bg-blue-50 border-blue-200 text-blue-600' 
                                                                : 'bg-slate-50 border-slate-100 text-slate-400'
                                                        }`}
                                                    >
                                                        <option value="">Sin Filtro Guardado</option>
                                                        {recipes.map(r => (
                                                            <option key={r.id} value={r.id}>{r.name}</option>
                                                        ))}
                                                    </select>
                                                    <button 
                                                        title="Armar Receta para esta Opción"
                                                        onClick={() => setRecipeModalOption(option)}
                                                        className="p-1 rounded-md hover:bg-orange-100 text-orange-500 transition-colors"
                                                    >
                                                        <Beaker size={14} />
                                                    </button>
                                                </div>

                                                {option.isDefault && (
                                                    <span className="text-[8px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full shrink-0 uppercase">
                                                        DEFAULT
                                                    </span>
                                                )}
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
                                        <select
                                            value={newOptionRecipeId}
                                            onChange={(e) => setNewOptionRecipeId(e.target.value)}
                                            className="w-32 md:w-48 bg-white rounded-lg p-2 font-bold text-[10px] text-slate-700 outline-none border border-slate-200 uppercase"
                                        >
                                            <option value="">Receta Estándar</option>
                                            {recipes.map(r => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
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
            </div>

            {/* Modal para crear receta a la opción */}
            <ModifierRecipeModal 
                isOpen={!!recipeModalOption}
                option={recipeModalOption}
                inventoryItems={inventoryItems}
                onClose={() => setRecipeModalOption(null)}
                onRecipeCreated={(recipeId) => {
                    handleUpdateOption(recipeModalOption.id, editingGroup!.id, { recipeId });
                    loadGroups();
                }}
            />
        </div>
    );
}
