'use client';

import { useState, useEffect } from 'react';
import {
    ChefHat,
    Search,
    Plus,
    Save,
    ArrowRight,
    Trash2,
    Calculator,
    Zap,
    Scale,
    Layers,
    ChevronRight,
    Loader2,
    CheckCircle2,
    AlertCircle,
    PlusCircle
} from 'lucide-react';
import { API_URL } from '../../../../services/api';
import { authFetch } from '../../../../services/authFetch';

export default function RecipesMasterPage() {
    const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'BASES'>('PRODUCTS');
    const [products, setProducts] = useState<any[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [editingTarget, setEditingTarget] = useState<any>(null);
    const [recipeItems, setRecipeItems] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [baseWeight, setBaseWeight] = useState(0);

    const [isCreatingBase, setIsCreatingBase] = useState(false);
    const [newBase, setNewBase] = useState({ name: '', unit: 'KG' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [prodRes, invRes] = await Promise.all([
                authFetch(`${API_URL}/products`),
                authFetch(`${API_URL}/inventory`)
            ]);
            setProducts(await prodRes.json());
            setInventory(await invRes.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleEditRecipe = async (target: any, type: 'PRODUCT' | 'BASE') => {
        setEditingTarget({ ...target, type });
        if (target.recipe && target.recipe.items) {
            setRecipeItems(target.recipe.items.map((i: any) => ({
                ingredientId: i.ingredientId,
                quantity: i.quantity,
                unit: i.ingredient?.unit || 'UN',
                name: i.ingredient?.name,
                role: i.role || 'BASE'
            })));
            setBaseWeight(target.recipe.baseWeight || 0);
        } else {
            setRecipeItems([]);
            setBaseWeight(0);
        }
    };

    const addIngredient = (ingredient: any) => {
        setRecipeItems([...recipeItems, {
            ingredientId: ingredient.id,
            name: ingredient.name,
            quantity: '',
            unit: ingredient.unit,
            role: ingredient.role || 'BASE'
        }]);
        setSearchTerm('');
    };

    const removeIng = (idx: number) => {
        const n = [...recipeItems];
        n.splice(idx, 1);
        setRecipeItems(n);
    };

    const updateItem = (idx: number, field: string, val: any) => {
        const n = [...recipeItems];
        n[idx] = { ...n[idx], [field]: val };
        setRecipeItems(n);
    };

    const saveRecipe = async () => {
        try {
            const payload = {
                targetId: editingTarget.id,
                type: editingTarget.type === 'BASE' ? 'PREPARATION' : 'PRODUCT',
                baseWeight: baseWeight,
                items: recipeItems.map(i => ({
                    ingredientId: i.ingredientId,
                    quantity: Number(i.quantity),
                    unit: i.unit,
                    role: i.role || 'BASE'
                }))
            };

            const res = await authFetch(`${API_URL}/recipes`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('✓ Receta guardada satisfactoriamente.');
                setEditingTarget(null);
                loadData();
            } else {
                alert('No se pudo guardar la receta. Verifique los datos.');
            }
        } catch (e) {
            alert('Error de conexión');
        }
    };

    const createBase = async () => {
        try {
            const res = await authFetch(`${API_URL}/inventory`, {
                method: 'POST',
                body: JSON.stringify({ ...newBase, type: 'PREPARATION', category: 'PREPARACIONES' })
            });
            if (res.ok) {
                const created = await res.json();
                setIsCreatingBase(false);
                setNewBase({ name: '', unit: 'KG' });
                await loadData();
                handleEditRecipe({ ...created, type: 'PREPARATION' }, 'BASE');
            }
        } catch (e) { alert('Error creando base'); }
    };

    const bases = inventory.filter(i => i.type === 'PREPARATION' || i.category === 'PREPARACIONES');

    const ingredientOptions = inventory.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        searchTerm.length > 1
    );

    const totalCost = recipeItems.reduce((sum, item) => {
        const ing = inventory.find(i => i.id === item.ingredientId);
        if (!ing) return sum;
        let qty = Number(item.quantity) || 0;
        if (item.unit === 'G' || item.unit === 'ML') qty /= 1000;
        return sum + (qty * (Number(ing.costPerUnit) || 0));
    }, 0);

    const margin = editingTarget?.price ? ((editingTarget.price - totalCost) / editingTarget.price * 100) : 0;

    if (loading) return (
        <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-orange-500 mb-4" size={48} />
            <p className="font-black uppercase text-xs tracking-widest text-slate-400 italic">Procesando Ingeniería Gastronómica...</p>
        </div>
    );

    return (
        <>
            <div className="space-y-12 animate-in fade-in duration-700 pb-20">
                {/* Header */}
                <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                            RECETAS <span className="text-orange-500">MAESTRAS</span>
                        </h1>
                        <p className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest mt-2 px-1">
                            Control de Escandallo y Margen de Utilidad
                        </p>
                    </div>

                    <div className="flex bg-white p-1 md:p-1.5 rounded-2xl md:rounded-full border border-slate-100 shadow-sm w-full xl:w-auto">
                        <button
                            onClick={() => setActiveTab('PRODUCTS')}
                            className={`flex-1 xl:flex-none px-4 md:px-8 py-2.5 md:py-3 rounded-xl md:rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all italic
                            ${activeTab === 'PRODUCTS' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            Platos Finales
                        </button>
                        <button
                            onClick={() => setActiveTab('BASES')}
                            className={`flex-1 xl:flex-none px-4 md:px-8 py-2.5 md:py-3 rounded-xl md:rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all italic
                            ${activeTab === 'BASES' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            Bases & Preps
                        </button>
                    </div>
                </header>

                {/* Quick Filter Search */}
                <div className="relative group">
                    <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors md:w-6 md:h-6" size={20} />
                    <input
                        placeholder="Filtrar por nombre..."
                        className="w-full bg-white pl-12 md:pl-16 pr-6 md:pr-8 py-5 md:py-8 rounded-2xl md:rounded-[2.5rem] font-black text-base md:text-xl italic uppercase tracking-tighter outline-none border border-slate-100 focus:border-slate-900 transition-all shadow-sm"
                        value={productSearchTerm}
                        onChange={e => setProductSearchTerm(e.target.value)}
                    />
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {activeTab === 'BASES' && (
                        <button
                            onClick={() => setIsCreatingBase(true)}
                            className="bg-slate-900 rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 text-white flex flex-col items-center justify-center gap-3 md:gap-4 hover:bg-orange-600 transition-all shadow-xl shadow-slate-200 group active:scale-95 min-h-[180px] md:h-56"
                        >
                            <PlusCircle size={40} className="md:w-12 md:h-12 group-hover:rotate-90 transition-transform" />
                            <span className="font-black uppercase italic tracking-widest text-[10px] md:text-xs">Nueva Base Maestro</span>
                        </button>
                    )}

                    {(activeTab === 'PRODUCTS' ? products : bases)
                        .filter(p => !productSearchTerm || p.name.toLowerCase().includes(productSearchTerm.toLowerCase()))
                        .map(p => (
                            <div
                                key={p.id}
                                onClick={() => handleEditRecipe(p, activeTab === 'PRODUCTS' ? 'PRODUCT' : 'BASE')}
                                className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-slate-900 cursor-pointer transition-all group relative overflow-hidden flex flex-col justify-between min-h-[180px] md:h-56"
                            >
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-3 md:mb-4">
                                        <span className="text-[8px] md:text-[9px] font-black uppercase px-2 md:px-3 py-1 bg-slate-100 text-slate-500 rounded-full tracking-widest italic group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                            {p.category || 'Base'}
                                        </span>
                                        {p.recipe ? (
                                            <div className="text-green-500 bg-green-50 p-1.5 md:p-2 rounded-lg md:rounded-xl border border-green-100">
                                                <CheckCircle2 size={14} className="md:w-4 md:h-4" />
                                            </div>
                                        ) : (
                                            <div className="text-orange-400 bg-orange-50 p-1.5 md:p-2 rounded-lg md:rounded-xl border border-orange-100">
                                                <AlertCircle size={14} className="md:w-4 md:h-4" />
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="font-black text-lg md:text-2xl text-slate-900 leading-none uppercase italic tracking-tighter group-hover:text-orange-500 transition-colors">
                                        {p.name}
                                    </h3>
                                </div>

                                <div className="flex items-center justify-between relative z-10 border-t border-slate-50 pt-3 md:pt-4">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5 md:mb-1 italic">Setup</span>
                                        <span className={`text-[9px] md:text-[10px] font-black uppercase italic ${p.recipe ? 'text-green-600' : 'text-orange-500'}`}>
                                            {p.recipe ? 'Configurada' : 'Sin Receta'}
                                        </span>
                                    </div>
                                    <div className="p-2 md:p-3 bg-slate-50 rounded-lg md:rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-all">
                                        <ChevronRight size={16} className="md:w-[18px] md:h-[18px]" />
                                    </div>
                                </div>

                                {/* Decoration */}
                                <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-slate-50 rounded-full translate-x-1/3 -translate-y-1/3 -z-0 group-hover:bg-orange-50 transition-colors" />
                            </div>
                        ))}
                </div>
            </div>

            {/* Editor Modal */}
            {editingTarget && (
                <div className="fixed inset-0 bg-slate-900/40 z-[9999] flex items-center justify-center p-2 md:p-4 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl md:rounded-[3rem] w-full max-w-5xl h-[95vh] md:h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 relative">
                        {/* Modal Header */}
                        <div className="p-6 md:p-10 border-b border-slate-50 bg-white flex justify-between items-center sticky top-0 z-20">
                            <div>
                                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-orange-500 mb-1 md:mb-2 italic flex items-center gap-2">
                                    <ChefHat size={12} /> Ingeniería de Producto
                                </p>
                                <h3 className="font-black uppercase text-xl md:text-2xl lg:text-4xl italic tracking-tighter text-slate-900">
                                    {editingTarget.name}
                                </h3>
                            </div>
                            <button onClick={() => setEditingTarget(null)} className="p-3 md:p-5 bg-slate-50 hover:bg-slate-100 rounded-full transition-all">
                                <Plus size={20} className="rotate-45 md:w-6 md:h-6" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 md:space-y-12 no-scrollbar">
                            {/* Layout Rules */}
                            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
                                <div className="bg-slate-50 rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 border border-slate-100 flex flex-col gap-4 md:gap-6">
                                    <h4 className="font-black italic uppercase text-base md:text-lg tracking-tighter text-slate-900 flex items-center gap-3">
                                        <Zap className="text-orange-500" size={18} /> Parámetros Globales
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                        <label className="block">
                                            <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1 mb-1 md:mb-2 block italic">Peso Objetivo (KG)</span>
                                            <div className="relative">
                                                <Scale className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    value={baseWeight}
                                                    onChange={e => setBaseWeight(Number(e.target.value))}
                                                    className="w-full pl-12 p-3 md:p-4 bg-white border-2 border-transparent focus:border-orange-500 rounded-xl md:rounded-2xl font-black italic outline-none transition-all text-sm md:text-base"
                                                />
                                            </div>
                                        </label>
                                        {editingTarget.type === 'PRODUCT' && (
                                            <label className="block">
                                                <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1 mb-1 md:mb-2 block italic">Proteínas Permitidas</span>
                                                <div className="relative">
                                                    <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                                    <input
                                                        type="number"
                                                        defaultValue={editingTarget.recipe?.maxProteins || 0}
                                                        className="w-full pl-12 p-3 md:p-4 bg-white border-2 border-transparent focus:border-orange-500 rounded-xl md:rounded-2xl font-black italic outline-none transition-all text-sm md:text-base"
                                                    />
                                                </div>
                                            </label>
                                        )}
                                    </div>
                                </div>

                                {/* Ingredient Search Integrated */}
                                <div className="flex flex-col gap-3 md:gap-4">
                                    <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1 italic">Componentes y Materias Primas</label>
                                    <div className="relative">
                                        <div className="bg-slate-900 rounded-2xl md:rounded-[2rem] p-4 md:p-6 shadow-xl flex items-center gap-3 md:gap-4">
                                            <Search className="text-orange-500" size={20} />
                                            <input
                                                placeholder="Agregar Salmon, Base, Cebolla..."
                                                className="bg-transparent text-white font-black italic outline-none w-full border-b border-slate-800 focus:border-orange-500 transition-all py-1.5 md:py-2 text-sm md:text-base"
                                                value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                        {searchTerm.length > 1 && (
                                            <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-2xl md:rounded-[2rem] mt-3 md:mt-4 border border-slate-100 overflow-hidden z-30 animate-in slide-in-from-top-4 max-h-60 overflow-y-auto">
                                                {ingredientOptions.map(opt => (
                                                    <button
                                                        key={opt.id}
                                                        onClick={() => addIngredient(opt)}
                                                        className="w-full flex justify-between items-center p-4 md:p-5 hover:bg-slate-50 transition-colors border-b border-slate-50 active:bg-orange-50"
                                                    >
                                                        <div className="text-left">
                                                            <p className="font-black italic uppercase text-xs md:text-sm tracking-tighter text-slate-900">{opt.name}</p>
                                                            <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">{opt.category}</p>
                                                        </div>
                                                        <span className="text-[8px] md:text-[9px] font-black bg-slate-100 text-slate-500 px-2 md:px-3 py-1 rounded-full uppercase italic tracking-widest">
                                                            {opt.unit}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* Recipe Items Table */}
                            <section className="bg-white border border-slate-100 rounded-2xl md:rounded-[3rem] overflow-hidden shadow-sm border-b-8 border-b-slate-900">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left min-w-[700px] md:min-w-0">
                                        <thead className="bg-slate-50/50">
                                            <tr className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                                                <th className="px-6 md:px-10 py-5 md:py-8">Rol Componente</th>
                                                <th className="px-5 py-5 md:py-8">Insumo</th>
                                                <th className="px-5 py-5 md:py-8 text-center">Cantidad</th>
                                                <th className="px-5 py-5 md:py-8">Unidad</th>
                                                <th className="px-6 md:px-10 py-5 md:py-8 text-right">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {recipeItems.map((item, idx) => (
                                                <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 md:px-10 py-3 md:py-4">
                                                        <select
                                                            value={item.role || 'BASE'}
                                                            onChange={e => updateItem(idx, 'role', e.target.value)}
                                                            className={`text-[8px] md:text-[9px] font-black uppercase px-3 md:px-4 py-1.5 md:py-2 rounded-full italic tracking-widest transition-all outline-none border-2 border-transparent focus:border-slate-900
                                                                ${item.role === 'BASE' ? 'bg-orange-100 text-orange-600' :
                                                                    item.role?.includes('PROTEIN') ? 'bg-blue-100 text-blue-600' :
                                                                        'bg-slate-100 text-slate-500'}`}
                                                        >
                                                            <option value="PROTEIN_MAIN">PROTEIN_MAIN</option>
                                                            <option value="PROTEIN_SPECIAL">PROTEIN_SPECIAL</option>
                                                            <option value="BASE">BASE</option>
                                                            <option value="VEGGIE">VEGGIE</option>
                                                            <option value="RETAIL">RETAIL</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-5 py-3 md:py-4">
                                                        <p className="font-black italic uppercase text-xs md:text-sm tracking-tighter text-slate-900">{item.name}</p>
                                                    </td>
                                                    <td className="px-5 py-3 md:py-4">
                                                        <div className="flex justify-center">
                                                            <input
                                                                type="number"
                                                                value={item.quantity}
                                                                onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                                                className="w-20 md:w-24 p-2 md:p-3 bg-slate-50 rounded-xl font-black text-center outline-none border-2 border-transparent focus:border-slate-900 transition-all italic text-orange-500 text-sm md:text-base"
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 md:py-4">
                                                        <select
                                                            value={item.unit}
                                                            onChange={e => updateItem(idx, 'unit', e.target.value)}
                                                            className="bg-transparent font-black italic text-[9px] md:text-[10px] uppercase text-slate-400 outline-none"
                                                        >
                                                            {['KG', 'G', 'LT', 'ML', 'UN'].map(u => <option key={u} value={u}>{u}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="px-6 md:px-10 py-3 md:py-4 text-right">
                                                        <button onClick={() => removeIng(idx)} className="p-2 md:p-3 text-slate-200 hover:text-red-500 transition-colors">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* Advanced Economics */}
                            <section className="bg-slate-900 rounded-3xl md:rounded-[3rem] p-6 md:p-12 text-white shadow-2xl relative overflow-hidden group">
                                <h4 className="font-black italic uppercase text-[10px] md:text-xs tracking-widest text-slate-500 mb-6 md:mb-10 flex items-center gap-2 relative z-10">
                                    <Calculator className="text-orange-500" size={14} /> Análisis Maestro
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative z-10">
                                    <div className="space-y-2 md:space-y-4">
                                        <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Costo Producción</p>
                                        <div className="flex items-end gap-2">
                                            <span className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none">${Math.round(totalCost)}</span>
                                            <span className="text-slate-500 font-bold mb-1 uppercase text-[9px] md:text-[10px] italic">Neto</span>
                                        </div>
                                    </div>

                                    {editingTarget.type === 'PRODUCT' && (
                                        <>
                                            <div className="space-y-2 md:space-y-4 md:border-l border-slate-800 md:pl-12">
                                                <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Punto de Venta</p>
                                                <div className="flex items-end gap-2">
                                                    <span className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none text-orange-500">${editingTarget.price}</span>
                                                    <span className="text-slate-500 font-bold mb-1 uppercase text-[9px] md:text-[10px] italic">Canal</span>
                                                </div>
                                            </div>

                                            <div className={`space-y-2 md:space-y-4 md:border-l border-slate-800 md:pl-12 transition-all ${margin > 50 ? 'border-green-500/30' : 'border-red-500/30'}`}>
                                                <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Margen Utilidad</p>
                                                <div className="flex items-end gap-2">
                                                    <span className={`text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none ${margin > 50 ? 'text-green-500' : 'text-red-500'}`}>{Math.round(margin)}%</span>
                                                    <div className="flex flex-col mb-1">
                                                        <span className="text-slate-500 font-bold uppercase text-[9px] md:text-[10px] italic">Bruto</span>
                                                        <span className={`text-[9px] md:text-[10px] font-black uppercase italic ${margin > 50 ? 'text-green-500' : 'text-red-500'}`}>${Math.round(editingTarget.price - totalCost)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                {/* Micro Details */}
                                <div className="mt-8 md:mt-12 flex flex-wrap gap-2 md:gap-4 relative z-10 pt-6 md:pt-10 border-t border-slate-800">
                                    {recipeItems.map((item, id) => {
                                        const ing = inventory.find(i => i.id === item.ingredientId);
                                        if (!ing) return null;
                                        let qty = Number(item.quantity) || 0;
                                        if (item.unit === 'G' || item.unit === 'ML') qty /= 1000;
                                        const cost = qty * (Number(ing.costPerUnit) || 0);
                                        return (
                                            <div key={id} className="bg-white/5 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-black uppercase italic tracking-widest border border-white/5 hover:bg-white/10 transition-colors">
                                                {item.name}: <span className="text-orange-500">${Math.round(cost)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-[100px] group-hover:bg-orange-500/20 transition-all duration-1000" />
                            </section>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 md:p-10 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-4 md:gap-6 px-6 md:px-12">
                            <button onClick={() => setEditingTarget(null)} className="px-6 md:px-10 py-3 md:py-5 font-black uppercase text-[9px] md:text-[10px] tracking-widest text-slate-400 hover:text-slate-900 transition-colors text-center">Descartar Cambios</button>
                            <button
                                onClick={saveRecipe}
                                className="bg-slate-900 text-white px-8 md:px-12 py-3 md:py-5 rounded-2xl md:rounded-3xl font-black uppercase italic text-xs md:text-sm tracking-widest shadow-2xl hover:bg-orange-600 transition-all active:scale-95 flex items-center justify-center gap-2 md:gap-3"
                            >
                                <Save size={18} className="md:w-5 md:h-5" /> Deploy Receta Maestra
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Base Modal */}
            {isCreatingBase && (
                <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white rounded-3xl md:rounded-[3rem] p-6 md:p-10 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl md:text-3xl font-black italic uppercase text-slate-900 mb-6 md:mb-8 border-b border-slate-50 pb-4">Nueva Base</h3>
                        <div className="space-y-4 md:space-y-6">
                            <input
                                className="w-full bg-slate-50 p-4 md:p-5 rounded-xl md:rounded-2xl font-black italic outline-none border-2 border-transparent focus:border-slate-900 text-sm md:text-base"
                                placeholder="Nombre base (ej: Base Ceviche 5kg)..."
                                value={newBase.name}
                                onChange={e => setNewBase({ ...newBase, name: e.target.value })}
                            />
                            <select
                                className="w-full bg-slate-50 p-4 md:p-5 rounded-xl md:rounded-2xl font-black italic outline-none appearance-none text-sm md:text-base"
                                value={newBase.unit}
                                onChange={e => setNewBase({ ...newBase, unit: e.target.value })}
                            >
                                <option value="KG">KILOGRAMO (KG)</option><option value="LT">LITRO (LT)</option><option value="UN">UNIDAD (UN)</option>
                            </select>
                            <div className="flex gap-4 mt-8 md:mt-10">
                                <button onClick={() => setIsCreatingBase(false)} className="flex-1 font-black uppercase text-slate-400 text-[10px] md:text-xs">Descartar</button>
                                <button onClick={createBase} className="flex-1 bg-slate-900 text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase italic tracking-widest text-[10px] md:text-xs">Crear Base</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
