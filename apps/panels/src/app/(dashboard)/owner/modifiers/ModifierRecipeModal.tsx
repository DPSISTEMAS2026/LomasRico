'use client';

import { useEffect, useState } from 'react';
import { ChefHat, Loader2, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { authFetch } from '../../../../services/authFetch';
import { API_URL } from '../../../../services/api';

type RecipeItem = {
    ingredientId: string;
    name: string;
    quantity: string;
    unit: string;
    role: string;
};

type ProductLite = {
    id: string;
    name: string;
    recipe?: { id: string; items?: any[]; baseWeight?: number } | null;
};

type OptionLite = {
    id: string;
    name: string;
    recipeId?: string | null;
    recipeApplyMode?: 'OVERRIDE' | 'REPLACE' | null;
};

function displayQty(raw: number, ingredientUnit: string) {
    const unit = (ingredientUnit || 'UN').toUpperCase();
    if (unit === 'KG') return { quantity: String(Number((raw * 1000).toFixed(2))), unit: 'G' };
    if (unit === 'LT') return { quantity: String(Number((raw * 1000).toFixed(2))), unit: 'ML' };
    return { quantity: String(raw), unit };
}

export default function ModifierRecipeModal({
    option,
    groupName,
    onClose,
    onSaved,
}: {
    option: OptionLite;
    groupName: string;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [products, setProducts] = useState<ProductLite[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [sourceProductId, setSourceProductId] = useState('');
    const [items, setItems] = useState<RecipeItem[]>([]);
    const [baseWeight, setBaseWeight] = useState(0);
    const [applyMode, setApplyMode] = useState<'OVERRIDE' | 'REPLACE'>('OVERRIDE');
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [prodRes, invRes, recRes] = await Promise.all([
                    authFetch(`${API_URL}/products`),
                    authFetch(`${API_URL}/inventory`),
                    authFetch(`${API_URL}/modifiers/options/${option.id}/recipe`),
                ]);
                const prods = prodRes.ok ? await prodRes.json() : [];
                const inv = invRes.ok ? await invRes.json() : [];
                setProducts(Array.isArray(prods) ? prods.filter((p: ProductLite) => p.recipe?.id) : []);
                setInventory(Array.isArray(inv) ? inv : []);

                if (recRes.ok) {
                    const data = await recRes.json();
                    const recipe = data.recipe;
                    if (recipe?.items?.length) {
                        setItems(
                            recipe.items.map((i: any) => ({
                                ingredientId: i.ingredientId,
                                name: i.ingredient?.name || 'Ingrediente',
                                role: i.role || 'BASE',
                                ...displayQty(Number(i.quantity) || 0, i.ingredient?.unit || 'UN'),
                            })),
                        );
                        setBaseWeight(recipe.baseWeight || 0);
                        setApplyMode(data.recipeApplyMode === 'REPLACE' ? 'REPLACE' : 'OVERRIDE');
                    }
                }
            } catch (e) {
                console.error(e);
                setError('No se pudo cargar esta receta.');
            } finally {
                setLoading(false);
            }
        })();
    }, [option.id]);

    const loadFromProduct = (productId: string) => {
        setSourceProductId(productId);
        const product = products.find((p) => p.id === productId);
        if (!product?.recipe?.items) return;
        setItems(
            product.recipe.items.map((i: any) => ({
                ingredientId: i.ingredientId,
                name: i.ingredient?.name || 'Ingrediente',
                role: i.role || 'BASE',
                ...displayQty(Number(i.quantity) || 0, i.ingredient?.unit || 'UN'),
            })),
        );
        setBaseWeight(product.recipe.baseWeight || 0);
    };

    const addIngredient = (ing: any) => {
        if (items.some((i) => i.ingredientId === ing.id)) return;
        const unit = (ing.unit || 'UN').toUpperCase();
        setItems([
            ...items,
            {
                ingredientId: ing.id,
                name: ing.name,
                quantity: unit === 'KG' ? '500' : unit === 'LT' ? '100' : '1',
                unit: unit === 'KG' ? 'G' : unit === 'LT' ? 'ML' : 'UN',
                role: ing.role || 'BASE',
            },
        ]);
        setSearchTerm('');
    };

    const save = async () => {
        if (items.length === 0) {
            setError('Primero elige un plato para copiar su receta, o agrega un ingrediente.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const res = await authFetch(`${API_URL}/modifiers/options/${option.id}/recipe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `${option.name} · ${groupName}`,
                    baseWeight,
                    applyMode,
                    items: items.map((i) => ({
                        ingredientId: i.ingredientId,
                        quantity: Number(i.quantity) || 0,
                        unit: i.unit,
                        role: i.role,
                    })),
                }),
            });
            // #region agent log
            fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'mod-recipe',hypothesisId:'H-UI',location:'ModifierRecipeModal.tsx:save',message:'ui saved option recipe',data:{optionId:option.id,ok:res.ok,itemCount:items.length,applyMode},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            if (!res.ok) throw new Error('No se pudo guardar');
            onSaved();
        } catch {
            setError('No se pudo guardar. Revisa los gramos e inténtalo de nuevo.');
        } finally {
            setSaving(false);
        }
    };

    const clearRecipe = async () => {
        if (!option.recipeId) {
            onClose();
            return;
        }
        if (!confirm('¿Esta opción deja de cambiar los gramos? El nombre y el precio se mantienen.')) return;
        await authFetch(`${API_URL}/modifiers/options/${option.id}/recipe`, { method: 'DELETE' });
        onSaved();
    };

    const matches = inventory.filter(
        (i) => searchTerm.length > 1 && i.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">
                <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-orange-500 mb-1">
                            Cambia los gramos
                        </p>
                        <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">
                            {option.name}
                        </h2>
                        <p className="text-sm font-bold text-slate-500 mt-2 leading-relaxed">
                            Si el cliente elige esta opción, el plato no usa la receta normal: usa estos gramos.
                            Ejemplo: el ceviche trae 500 g de proteína y aquí lo dejas en 1000 g.
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-xl">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    {loading ? (
                        <div className="py-16 flex flex-col items-center text-slate-400">
                            <Loader2 className="animate-spin mb-3" size={32} />
                            <p className="text-xs font-bold">Cargando…</p>
                        </div>
                    ) : (
                        <>
                            <label className="block">
                                <span className="text-sm font-black text-slate-800 block mb-1">1. ¿De qué plato copiamos la receta?</span>
                                <p className="text-xs font-bold text-slate-400 mb-2">
                                    No es para vender ese plato. Solo sirve para no escribir la receta de cero. Después cambias los gramos.
                                </p>
                                <select
                                    value={sourceProductId}
                                    onChange={(e) => loadFromProduct(e.target.value)}
                                    className="w-full p-3.5 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-xl font-bold text-sm text-slate-700 outline-none"
                                >
                                    <option value="">Elegir un plato que ya tenga receta…</option>
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </label>

                            <div>
                                <span className="text-sm font-black text-slate-800 block mb-2">2. ¿Qué hace esta opción?</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setApplyMode('OVERRIDE')}
                                        className={`text-left p-3 rounded-xl border-2 ${applyMode === 'OVERRIDE' ? 'border-orange-500 bg-orange-50' : 'border-slate-100'}`}
                                    >
                                        <p className="font-black text-sm text-slate-800">Cambia gramos</p>
                                        <p className="text-xs font-bold text-slate-400 mt-1">El plato sigue igual, pero un ingrediente pesa más o menos. Ej: 500 g → 1000 g.</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setApplyMode('REPLACE')}
                                        className={`text-left p-3 rounded-xl border-2 ${applyMode === 'REPLACE' ? 'border-orange-500 bg-orange-50' : 'border-slate-100'}`}
                                    >
                                        <p className="font-black text-sm text-slate-800">Es otro tamaño</p>
                                        <p className="text-xs font-bold text-slate-400 mt-1">Reemplaza toda la receta. Ej: pasar de 350 g a 1 kg.</p>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-black text-slate-800">3. Ingredientes y gramos</span>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                        Peso del plato
                                        <input
                                            type="number"
                                            value={baseWeight || ''}
                                            onChange={(e) => setBaseWeight(Number(e.target.value) || 0)}
                                            className="w-20 p-1.5 bg-slate-50 rounded-lg font-black text-slate-700 outline-none text-center"
                                            placeholder="500"
                                        />
                                        g
                                    </label>
                                </div>

                                <div className="space-y-2">
                                    {items.map((item, idx) => (
                                        <div key={`${item.ingredientId}-${idx}`} className="flex items-center gap-2 bg-slate-50 rounded-xl p-2">
                                            <span className="flex-1 font-bold text-sm text-slate-800 truncate">{item.name}</span>
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => setItems((prev) => prev.map((row, i) => i === idx ? { ...row, quantity: e.target.value } : row))}
                                                className="w-24 p-2 bg-white rounded-lg font-black text-sm text-slate-800 outline-none border border-slate-200 text-center"
                                            />
                                            <span className="w-10 text-[10px] font-black uppercase text-slate-400">{item.unit}</span>
                                            <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="p-1.5 text-slate-300 hover:text-red-500">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {items.length === 0 && (
                                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400">
                                            <ChefHat className="mx-auto mb-2" size={28} />
                                            <p className="text-sm font-bold">Elige un plato arriba. Luego cambia los gramos que necesites.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="relative mt-3">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Agregar otro ingrediente…"
                                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-orange-500"
                                    />
                                    {matches.length > 0 && (
                                        <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                                            {matches.slice(0, 8).map((ing) => (
                                                <button
                                                    key={ing.id}
                                                    type="button"
                                                    onClick={() => addIngredient(ing)}
                                                    className="w-full text-left px-3 py-2 text-sm font-bold text-slate-700 hover:bg-orange-50 flex items-center gap-2"
                                                >
                                                    <Plus size={12} className="text-orange-500" />
                                                    {ing.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {error && <p className="text-sm font-bold text-red-500">{error}</p>}
                        </>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap gap-2">
                    {option.recipeId && (
                        <button type="button" onClick={clearRecipe} className="px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest bg-red-50 text-red-500">
                            Dejar de cambiar gramos
                        </button>
                    )}
                    <div className="flex-1" />
                    <button type="button" onClick={onClose} className="px-5 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest bg-slate-100 text-slate-500">
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={save}
                        disabled={saving || loading}
                        className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest bg-orange-500 text-white flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
}
