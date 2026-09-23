'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { canEnlargeBySize } from '@lomasrico/shared-types';
import { authFetch } from '../../../../services/authFetch';
import { API_URL } from '../../../../services/api';

type ProductLite = {
    id: string;
    name: string;
    category?: string;
    isActive?: boolean;
    recipe?: { baseWeight?: number } | null;
    productModifiers?: { modifierGroup?: { id: string; displayName?: string; name?: string; options?: { id: string; name: string }[] } }[];
};

function gramsFromProduct(product?: ProductLite | null) {
    if (!product) return 250;
    const named = `${product.name || ''}`.match(/(\d+)\s*(g|kg)/i);
    if (named) {
        const value = Number(named[1]) || 0;
        return named[2].toLowerCase() === 'kg' ? value * 1000 : value;
    }
    const raw = Number(product.recipe?.baseWeight) || 0;
    if (raw <= 0) return 250;
    return raw < 20 ? Math.round(raw * 1000) : Math.round(raw);
}

function isSizeGroup(name?: string) {
    return /tama[nñ]o|agranda|formato/i.test(name || '');
}

export default function EnlargeSizeModal({
    onClose,
    onSaved,
}: {
    onClose: () => void;
    onSaved: () => void;
}) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [products, setProducts] = useState<ProductLite[]>([]);
    const [productId, setProductId] = useState('');
    const [fromGrams, setFromGrams] = useState(250);
    const [toGrams, setToGrams] = useState(350);
    const [extra, setExtra] = useState(2000);
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const res = await authFetch(`${API_URL}/products`);
                const data = res.ok ? await res.json() : [];
                const all = (Array.isArray(data) ? data : []).filter((p: ProductLite) => p.isActive !== false);
                const excluded = all.filter((p: ProductLite) => !canEnlargeBySize(p.category, p.name));
                const list = all.filter((p: ProductLite) => canEnlargeBySize(p.category, p.name));
                setProducts(list);
                // #region agent log
                fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'mod-slim',hypothesisId:'H-CAT',location:'EnlargeSizeModal.tsx:open',message:'enlarge size modal opened',data:{productCount:list.length,excludedCount:excluded.length,shown:list.map((p:ProductLite)=>p.name),excluded:excluded.map((p:ProductLite)=>({name:p.name,category:p.category}))},timestamp:Date.now()})}).catch(()=>{});
                // #endregion
            } catch {
                setError('No se pudieron cargar los platos.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const pickProduct = (id: string) => {
        setProductId(id);
        const product = products.find((p) => p.id === id);
        const from = gramsFromProduct(product);
        setFromGrams(from);
        if (toGrams <= from) setToGrams(from + 100);
    };

    const save = async () => {
        const product = products.find((p) => p.id === productId);
        if (!product) {
            setError('Elige un plato.');
            return;
        }
        if (toGrams <= fromGrams) {
            setError('El tamaño nuevo tiene que ser más grande.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const fromName = `${fromGrams} g`;
            const toName = `${toGrams} g`;
            const existing = (product.productModifiers || []).find((m) =>
                isSizeGroup(m.modifierGroup?.displayName) || isSizeGroup(m.modifierGroup?.name),
            )?.modifierGroup;

            let groupId = existing?.id || '';
            if (existing?.id) {
                const names = (existing.options || []).map((o) => o.name.toLowerCase());
                if (!names.includes(fromName.toLowerCase())) {
                    await authFetch(`${API_URL}/modifiers/groups/${existing.id}/options`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: fromName, priceAdjustment: 0, isDefault: true, sortOrder: 0 }),
                    });
                }
                if (!names.includes(toName.toLowerCase())) {
                    await authFetch(`${API_URL}/modifiers/groups/${existing.id}/options`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: toName, priceAdjustment: extra, isDefault: false, sortOrder: 1 }),
                    });
                }
            } else {
                const created = await authFetch(`${API_URL}/modifiers/groups`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: `size-up-${product.id.slice(0, 8)}-${Date.now()}`,
                        displayName: 'Elige el tamaño',
                        type: 'SINGLE_SELECT',
                        minSelections: 1,
                        maxSelections: 1,
                        options: [
                            { name: fromName, priceAdjustment: 0, isDefault: true, sortOrder: 0 },
                            { name: toName, priceAdjustment: extra, isDefault: false, sortOrder: 1 },
                        ],
                    }),
                });
                if (!created.ok) throw new Error('create');
                const group = await created.json();
                groupId = group.id;
                const assign = await authFetch(`${API_URL}/modifiers/product/${product.id}/assign`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ modifierGroupId: groupId, isRequired: true, sortOrder: 0 }),
                });
                if (!assign.ok) throw new Error('assign');
            }

            // #region agent log
            fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'mod-slim',hypothesisId:'H-FLOW',location:'EnlargeSizeModal.tsx:save',message:'enlarge size saved',data:{ok:true,productId:product.id,fromGrams,toGrams,extra,reusedGroup:!!existing?.id,groupId},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            onSaved();
        } catch {
            // #region agent log
            fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'mod-slim',hypothesisId:'H-FLOW',location:'EnlargeSizeModal.tsx:save',message:'enlarge size save failed',data:{productId,fromGrams,toGrams,extra},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            setError('No se pudo guardar.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black italic uppercase">Agrandar</h2>
                    <button type="button" onClick={onClose} className="p-2 text-slate-300"><X size={20} /></button>
                </div>

                {loading ? (
                    <div className="py-10 flex justify-center text-slate-400">
                        <Loader2 className="animate-spin" size={28} />
                    </div>
                ) : (
                    <>
                        <label className="block">
                            <span className="text-xs font-black text-slate-500 block mb-1">Plato</span>
                            <select
                                value={productId}
                                onChange={(e) => pickProduct(e.target.value)}
                                className="w-full p-3.5 bg-slate-50 rounded-xl font-bold outline-none"
                            >
                                <option value="">Elegir…</option>
                                {products.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </label>

                        <div className="grid grid-cols-2 gap-3">
                            <label className="block">
                                <span className="text-xs font-black text-slate-500 block mb-1">De</span>
                                <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3">
                                    <input
                                        type="number"
                                        value={fromGrams}
                                        onChange={(e) => setFromGrams(Number(e.target.value) || 0)}
                                        className="w-full py-3 bg-transparent font-black outline-none"
                                    />
                                    <span className="text-xs font-black text-slate-400">g</span>
                                </div>
                            </label>
                            <label className="block">
                                <span className="text-xs font-black text-slate-500 block mb-1">A</span>
                                <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3">
                                    <input
                                        type="number"
                                        value={toGrams}
                                        onChange={(e) => setToGrams(Number(e.target.value) || 0)}
                                        className="w-full py-3 bg-transparent font-black outline-none"
                                    />
                                    <span className="text-xs font-black text-slate-400">g</span>
                                </div>
                            </label>
                        </div>

                        <label className="block">
                            <span className="text-xs font-black text-slate-500 block mb-1">Extra</span>
                            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3">
                                <span className="text-sm font-black text-slate-400">$</span>
                                <input
                                    type="number"
                                    value={extra}
                                    onChange={(e) => setExtra(Number(e.target.value) || 0)}
                                    className="w-full py-3 bg-transparent font-black outline-none"
                                />
                            </div>
                        </label>

                        {error && <p className="text-sm font-bold text-red-500">{error}</p>}

                        <div className="flex gap-2 pt-1">
                            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-100 font-black uppercase text-[10px]">Cancelar</button>
                            <button
                                type="button"
                                onClick={save}
                                disabled={saving || !productId}
                                className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 ${productId ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-400'}`}
                            >
                                {saving && <Loader2 size={14} className="animate-spin" />}
                                Listo
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
