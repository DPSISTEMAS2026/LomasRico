'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    ArrowLeft, Check, ChefHat, Layers, Loader2, Pencil, Plus, Search, Sparkles, Trash2, UtensilsCrossed,
} from 'lucide-react';
import { authFetch } from '../../../../services/authFetch';
import { API_URL } from '../../../../services/api';
import {
    MODIFIER_ROLE_LABEL,
    displayCategoryName,
    drinkOptionSizeMismatch,
    isAgrandarModifier,
    isEspecialRole,
    isProductOptionRole,
    isSuggestionRole,
    suggestModifierRole,
    resolveModifierRole,
    sizeUpgradePairs,
    canEnlargeBySize,
    type ModifierRole,
} from '@lomasrico/shared-types';

type View = 'home' | 'create' | 'review' | 'suggestions' | 'especiales';

type ProductRow = {
    id: string;
    name: string;
    category: string;
    isActive?: boolean;
    modifiers?: ModifierGroup[];
};

type ModifierOption = {
    id: string;
    name: string;
    priceAdjustment: number;
    sortOrder?: number;
};

type AssignedProduct = {
    sellingProduct?: { id: string; name: string; category: string; isActive?: boolean };
};

type ModifierGroup = {
    id?: string;
    groupId?: string;
    name?: string;
    groupName?: string;
    displayName: string;
    role?: ModifierRole;
    type: 'SINGLE_SELECT' | 'MULTI_SELECT';
    minSelections?: number;
    maxSelections?: number;
    showOnWeb?: boolean;
    showOnPos?: boolean;
    showOnSalon?: boolean;
    sortOrder?: number;
    options: ModifierOption[];
    assignedProductsCount?: number;
    productModifiers?: AssignedProduct[];
};

const CREATE_KINDS: { role: ModifierRole; title: string; multi?: boolean }[] = [
    { role: 'SIZE', title: 'Formato o Tamaño' },
    { role: 'PROTEIN', title: 'Receta', multi: true },
    { role: 'PORTION', title: 'Cantidad' },
    { role: 'SAUCE', title: 'Salsa del plato' },
    { role: 'FLAVOR', title: 'Sabor' },
];

function groupRole(group: ModifierGroup): ModifierRole {
    return resolveModifierRole(group.groupName || group.name, group.displayName, group.role);
}

function groupKey(group: ModifierGroup) {
    return group.groupId || group.id || group.displayName;
}

function overlayProductRoles(products: ProductRow[], groups: ModifierGroup[]): ProductRow[] {
    const byId = new Map(groups.map((g) => [g.id, groupRole(g)]));
    return products.map((p) => ({
        ...p,
        modifiers: (p.modifiers || []).map((m) => ({
            ...m,
            role: (m.groupId && byId.get(m.groupId)) || groupRole(m),
        })),
    }));
}

function isOptionOfProduct(group: ModifierGroup) {
    const role = groupRole(group);
    const labelA = group.groupName || group.name;
    const labelB = group.displayName;
    if (isEspecialRole(role, labelA, labelB)) return false;
    if (isSuggestionRole(role, labelA, labelB)) return false;
    return isProductOptionRole(role);
}

export default function ModifiersPage() {
    const [view, setView] = useState<View>('home');
    const [loading, setLoading] = useState(true);
    const [groups, setGroups] = useState<ModifierGroup[]>([]);
    const [products, setProducts] = useState<ProductRow[]>([]);

    const load = async () => {
        const [gRes, pRes] = await Promise.all([
            authFetch(`${API_URL}/modifiers/groups`),
            authFetch(`${API_URL}/products`),
        ]);
        const parsedG = gRes.ok ? await gRes.json() : [];
        const parsedP = pRes.ok ? await pRes.json() : [];
        const groupsData = Array.isArray(parsedG) ? parsedG : [];
        const productsData = Array.isArray(parsedP) ? parsedP : [];
        let groupsNext = groupsData;
        let productsNext = overlayProductRoles(productsData, groupsData);
        const unclassified = groupsData.filter((g: ModifierGroup) => (g.role || 'OTHER') === 'OTHER').length;
        let applyOk = false;
        let applyUpdated = 0;
        if (unclassified > 0) {
            const classified = await authFetch(`${API_URL}/modifiers/apply-suggestions`, { method: 'POST' });
            applyOk = classified.ok;
            if (classified.ok) {
                const payload = await classified.json().catch(() => ({}));
                applyUpdated = Number(payload?.updated || 0);
                const [g2, p2] = await Promise.all([
                    authFetch(`${API_URL}/modifiers/groups`),
                    authFetch(`${API_URL}/products`),
                ]);
                const parsedG2 = g2.ok ? await g2.json() : groupsData;
                const parsedP2 = p2.ok ? await p2.json() : productsData;
                groupsNext = Array.isArray(parsedG2) ? parsedG2 : groupsData;
                const productsReloaded = Array.isArray(parsedP2) ? parsedP2 : productsData;
                productsNext = overlayProductRoles(productsReloaded, groupsNext);
            }
        }
        setGroups(groupsNext);
        setProducts(productsNext);
        const leftoverStored = groupsNext.filter((g: ModifierGroup) => (g.role || 'OTHER') === 'OTHER').length;
        const leftoverShown = groupsNext.filter((g: ModifierGroup) => groupRole(g) === 'OTHER').map((g) => g.displayName);
        const leftoverProd = productsNext.flatMap((p) => (p.modifiers || []).filter((m) => groupRole(m) === 'OTHER').map((m) => m.displayName));
        const withMods = productsNext.filter((p: ProductRow) => (p.modifiers || []).some(isOptionOfProduct));
        setLoading(false);
    };

    useEffect(() => {
        void (async () => {
            await load();
        })();
    }, []);

    const categories = useMemo(() => {
        const map = new Map<string, ProductRow[]>();
        for (const p of products.filter((x) => x.isActive !== false)) {
            const key = p.category || 'Otros';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(p);
        }
        return [...map.entries()].sort((a, b) => displayCategoryName(a[0]).localeCompare(displayCategoryName(b[0])));
    }, [products]);

    const optionGroups = groups.filter((g) => isProductOptionRole(groupRole(g)) && !isEspecialRole(groupRole(g), g.name, g.displayName) && !isSuggestionRole(groupRole(g), g.name, g.displayName));
    const suggestionGroups = groups.filter((g) => isSuggestionRole(groupRole(g), g.name, g.displayName) && !isAgrandarModifier(g.name, g.displayName));
    const especialGroups = groups.filter((g) => isEspecialRole(groupRole(g), g.name, g.displayName));
    const sizeGroups = groups.filter((g) => {
        if (groupRole(g) !== 'SIZE' || sizeUpgradePairs(g).length === 0) return false;
        const assigned = (g.productModifiers || []).map((pm) => pm.sellingProduct).filter(Boolean) as { category?: string; name?: string }[];
        if (assigned.length === 0) {
            const label = `${g.name || ''} ${g.displayName || ''}`;
            return /formato|tama[ñn]o/i.test(label);
        }
        return assigned.some((p) => canEnlargeBySize(p.category, p.name));
    });

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-24">
                <Loader2 className="animate-spin text-orange-500 mb-4" size={40} />
                <p className="font-black uppercase text-xs tracking-widest text-slate-800">Cargando…</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 min-w-0">
            {view !== 'home' && (
                <button
                    type="button"
                    onClick={() => setView('home')}
                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-800 hover:text-orange-500"
                >
                    <ArrowLeft size={14} /> Volver
                </button>
            )}

            {view === 'home' && (
                <Home
                    optionCount={optionGroups.length}
                    suggestionCount={suggestionGroups.length}
                    especialCount={especialGroups.length + sizeGroups.length}
                    onOpen={setView}
                />
            )}
            {view === 'create' && (
                <CreateWizard
                    categories={categories}
                    onCancel={() => setView('home')}
                    onSaved={async () => {
                        await load();
                        setView('review');
                    }}
                />
            )}
            {view === 'review' && (
                <ReviewView categories={categories} groups={optionGroups} onReload={load} />
            )}
            {view === 'suggestions' && (
                <SuggestionsView
                    categories={categories}
                    groups={suggestionGroups}
                    onReload={load}
                />
            )}
            {view === 'especiales' && (
                <EspecialesView groups={especialGroups} sizeGroups={sizeGroups} onReload={load} />
            )}
        </div>
    );
}

function Home({
    optionCount, suggestionCount, especialCount, onOpen,
}: {
    optionCount: number;
    suggestionCount: number;
    especialCount: number;
    onOpen: (view: View) => void;
}) {
    const cards: { view: View; title: string; count?: string; icon: typeof Plus; accent: string }[] = [
        { view: 'create', title: 'Crear nuevo', icon: Plus, accent: 'bg-orange-500' },
        { view: 'review', title: 'Revisar', count: `${optionCount}`, icon: Layers, accent: 'bg-slate-900' },
        { view: 'suggestions', title: 'Sugerencias', count: `${suggestionCount}`, icon: Sparkles, accent: 'bg-amber-500' },
        { view: 'especiales', title: 'Especiales', count: `${especialCount}`, icon: ChefHat, accent: 'bg-emerald-600' },
    ];
    return (
        <>
            <header className="w-full pl-14 lg:pl-0 text-right lg:text-left">
                <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                    Opciones del <span className="text-orange-500">menú</span>
                </h1>
            </header>
            <div className="grid sm:grid-cols-2 gap-4">
                {cards.map((card) => (
                    <button
                        key={card.view}
                        type="button"
                        onClick={() => {
                            onOpen(card.view);
                        }}
                        className="text-left bg-white rounded-3xl border border-slate-100 p-6 hover:border-orange-300 hover:shadow-md transition-all"
                    >
                        <span className={`${card.accent} text-white w-10 h-10 rounded-2xl inline-flex items-center justify-center mb-4`}>
                            <card.icon size={18} />
                        </span>
                        <h2 className="font-black italic uppercase text-xl text-slate-900">{card.title}</h2>
                        {card.count && <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-orange-500">{card.count}</p>}
                    </button>
                ))}
            </div>
        </>
    );
}

function CreateWizard({
    categories, onCancel, onSaved,
}: {
    categories: [string, ProductRow[]][];
    onCancel: () => void;
    onSaved: () => void;
}) {
    const [step, setStep] = useState(0);
    const [role, setRole] = useState<ModifierRole | null>(null);
    const [openCategory, setOpenCategory] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [displayName, setDisplayName] = useState('');
    const [options, setOptions] = useState<{ name: string; price: number }[]>([{ name: '', price: 0 }]);
    const [showOnWeb, setShowOnWeb] = useState(true);
    const [showOnPos, setShowOnPos] = useState(true);
    const [showOnSalon, setShowOnSalon] = useState(true);
    const [saving, setSaving] = useState(false);
    const kind = CREATE_KINDS.find((k) => k.role === role);

    const toggleProduct = (id: string) => {
        setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    };

    const save = async () => {
        if (!role || !displayName.trim() || selectedIds.length === 0) return;
        const cleanOpts = options.filter((o) => o.name.trim());
        if (cleanOpts.length === 0) return;
        setSaving(true);
        try {
            const payload = {
                displayName: displayName.trim(),
                role,
                type: kind?.multi ? 'MULTI_SELECT' : 'SINGLE_SELECT',
                minSelections: kind?.multi ? 1 : 1,
                maxSelections: kind?.multi ? 3 : 1,
                showOnWeb,
                showOnPos,
                showOnSalon,
                productIds: selectedIds,
                options: cleanOpts.map((o) => ({ name: o.name.trim(), priceAdjustment: Number(o.price) || 0 })),
            };
            const res = await authFetch(`${API_URL}/modifiers/create-with-products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                const created = await res.json().catch(() => ({}));
                await onSaved();
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err?.message || 'No se pudo crear.');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">Crear nuevo</h1>
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mt-2">
                    Paso {step + 1} de 3
                </p>
            </header>

            {step === 0 && (
                <div className="grid gap-3">
                    {CREATE_KINDS.map((k) => (
                        <button
                            key={k.role}
                            type="button"
                            onClick={() => { setRole(k.role); setDisplayName(k.title); setStep(1); }}
                            className="text-left bg-white rounded-2xl border-2 border-slate-100 p-5 hover:border-orange-400"
                        >
                            <p className="font-black italic uppercase text-slate-900">{k.title}</p>
                        </button>
                    ))}
                </div>
            )}

            {step === 1 && (
                <div className="space-y-4">
                    <p className="font-black uppercase text-sm text-slate-700">{kind?.title}</p>
                    {categories.map(([cat, items]) => (
                        <div key={cat} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setOpenCategory(openCategory === cat ? null : cat)}
                                className="w-full flex items-center justify-between p-4 font-black uppercase italic text-sm"
                            >
                                <span>{displayCategoryName(cat)}</span>
                                <span className="text-[10px] text-slate-800">{items.length} platos</span>
                            </button>
                            {openCategory === cat && (
                                <div className="border-t border-slate-100 p-3 space-y-1">
                                    {items.map((p) => {
                                        const on = selectedIds.includes(p.id);
                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => toggleProduct(p.id)}
                                                className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold ${on ? 'bg-orange-50 text-orange-700' : 'hover:bg-slate-50 text-slate-700'}`}
                                            >
                                                {p.name}
                                                {on && <Check size={16} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setStep(0)} className="flex-1 py-3 rounded-xl bg-slate-100 font-black uppercase text-[10px]">Atrás</button>
                        <button
                            type="button"
                            disabled={selectedIds.length === 0}
                            onClick={() => setStep(2)}
                            className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] ${selectedIds.length ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-800'}`}
                        >
                            Siguiente · {selectedIds.length} platos
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-5 bg-white rounded-3xl border border-slate-100 p-6">
                    <label className="block">
                        <span className="text-xs font-black text-slate-800 block mb-1">Pregunta</span>
                        <input
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none"
                        />
                    </label>
                    <div className="space-y-2">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-800">Opciones</p>
                        {options.map((opt, i) => (
                            <div key={i} className="flex gap-2">
                                <input
                                    value={opt.name}
                                    onChange={(e) => setOptions((prev) => prev.map((o, idx) => idx === i ? { ...o, name: e.target.value } : o))}
                                    className="flex-1 p-3 bg-slate-50 rounded-xl font-bold outline-none"
                                />
                                <div className="w-28 relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-800">+$</span>
                                    <input
                                        type="number"
                                        value={opt.price}
                                        onChange={(e) => setOptions((prev) => prev.map((o, idx) => idx === i ? { ...o, price: Number(e.target.value) } : o))}
                                        className="w-full pl-7 p-3 bg-slate-50 rounded-xl font-bold text-center outline-none"
                                    />
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={() => setOptions((prev) => [...prev, { name: '', price: 0 }])} className="text-[10px] font-black uppercase tracking-widest text-orange-500">
                            Agregar
                        </button>
                    </div>
                    <div>
                        <span className="text-xs font-black text-slate-800 block mb-2">Dónde se muestra</span>
                        <div className="flex flex-wrap gap-2">
                            {([['web', showOnWeb, setShowOnWeb, 'Web'], ['pos', showOnPos, setShowOnPos, 'Caja'], ['salon', showOnSalon, setShowOnSalon, 'Salón']] as const).map(([key, on, set, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => set(!on)}
                                    className={`px-4 py-2 rounded-xl font-black uppercase text-[10px] border-2 ${on ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl bg-slate-100 font-black uppercase text-[10px]">Atrás</button>
                        <button type="button" onClick={onCancel} className="px-4 py-3 rounded-xl font-black uppercase text-[10px] text-slate-800">Cancelar</button>
                        <button
                            type="button"
                            onClick={save}
                            disabled={saving || !displayName.trim()}
                            className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-black uppercase text-[10px] flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                            Crear
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function ReviewGroupEditor({
    group, onCancel, onSaved,
}: {
    group: ModifierGroup;
    onCancel: () => void;
    onSaved: () => Promise<void>;
}) {
    const groupId = group.groupId || group.id || '';
    const [displayName, setDisplayName] = useState(group.displayName || '');
    const [options, setOptions] = useState<{ id?: string; name: string; price: number }[]>(
        (group.options || []).map((o) => ({ id: o.id, name: o.name, price: Number(o.priceAdjustment) || 0 })),
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const save = async () => {
        if (!groupId || !displayName.trim()) return;
        const clean = options.filter((o) => o.name.trim());
        if (clean.length === 0) {
            setError('Deja al menos una respuesta.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const nameRes = await authFetch(`${API_URL}/modifiers/groups/${groupId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ displayName: displayName.trim() }),
            });
            if (!nameRes.ok) throw new Error('group');
            for (const opt of clean) {
                if (!opt.id) {
                    const created = await authFetch(`${API_URL}/modifiers/groups/${groupId}/options`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: opt.name.trim(), priceAdjustment: Number(opt.price) || 0 }),
                    });
                    if (!created.ok) throw new Error('add');
                    continue;
                }
                const prev = (group.options || []).find((o) => o.id === opt.id);
                if (prev && prev.name === opt.name.trim() && Number(prev.priceAdjustment) === Number(opt.price)) continue;
                const patched = await authFetch(`${API_URL}/modifiers/options/${opt.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: opt.name.trim(), priceAdjustment: Number(opt.price) || 0 }),
                });
                if (!patched.ok) throw new Error('patch');
            }
            for (const prev of group.options || []) {
                if (!clean.some((o) => o.id === prev.id)) {
                    const removed = await authFetch(`${API_URL}/modifiers/options/${prev.id}`, { method: 'DELETE' });
                    if (!removed.ok) throw new Error('delete');
                }
            }
            await onSaved();
        } catch {
            setError('No se pudo guardar.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mt-3 space-y-3">
            <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-800">Pregunta</span>
                <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1 w-full p-2 bg-white rounded-lg font-bold text-sm outline-none border border-slate-200"
                />
            </label>
            <div className="space-y-2">
                <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest text-slate-800">
                    <span className="flex-1">Opción</span>
                    <span className="w-28 text-center">Recargo $</span>
                    <span className="w-6" />
                </div>
                {options.map((opt, i) => (
                    <div key={opt.id || `new-${i}`} className="flex gap-2">
                        <input
                            value={opt.name}
                            onChange={(e) => setOptions((prev) => prev.map((o, idx) => idx === i ? { ...o, name: e.target.value } : o))}
                            className="flex-1 p-2 bg-white rounded-lg font-bold text-sm outline-none border border-slate-200"
                        />
                        <div className="w-28 relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-800">+$</span>
                            <input
                                type="number"
                                value={opt.price}
                                onChange={(e) => setOptions((prev) => prev.map((o, idx) => idx === i ? { ...o, price: Number(e.target.value) } : o))}
                                className="w-full pl-7 p-2 bg-white rounded-lg font-bold text-sm text-center outline-none border border-slate-200"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                            className="text-slate-300 hover:text-red-500 p-1"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={() => setOptions((prev) => [...prev, { name: '', price: 0 }])}
                    className="text-[10px] font-black uppercase tracking-widest text-orange-500"
                >
                    Agregar
                </button>
            </div>
            {error && <p className="text-xs font-bold text-red-500">{error}</p>}
            <div className="flex gap-2">
                <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-lg bg-white border border-slate-200 font-black uppercase text-[10px] text-slate-800">Cancelar</button>
                <button
                    type="button"
                    onClick={() => void save()}
                    disabled={saving}
                    className="flex-1 py-2 rounded-lg bg-slate-900 text-white font-black uppercase text-[10px] flex items-center justify-center gap-2"
                >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                    Guardar
                </button>
            </div>
        </div>
    );
}

function ReviewView({
    categories, groups, onReload,
}: {
    categories: [string, ProductRow[]][];
    groups: ModifierGroup[];
    onReload: () => Promise<void>;
}) {
    const [openCategory, setOpenCategory] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [editingKey, setEditingKey] = useState<string | null>(null);

    const hydrateGroup = (g: ModifierGroup): ModifierGroup => {
        const id = g.groupId || g.id;
        const catalog = groups.find((x) => x.id === id);
        const options = (g.options && g.options.length > 0 ? g.options : catalog?.options) || [];
        return {
            ...catalog,
            ...g,
            id,
            groupId: id,
            options,
            productModifiers: catalog?.productModifiers || g.productModifiers,
            assignedProductsCount: catalog?.assignedProductsCount || g.assignedProductsCount,
        };
    };

    const groupsByProduct = (product: ProductRow) => {
        const fromProduct = (product.modifiers || []).filter(isOptionOfProduct);
        const base = fromProduct.length > 0
            ? fromProduct
            : groups.filter((g) =>
                (g.productModifiers || []).some((pm) => pm.sellingProduct?.id === product.id),
            );
        return base.map(hydrateGroup).sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
    };

    const unassign = async (productId: string, groupId: string) => {
        setBusyId(groupId);
        await authFetch(`${API_URL}/modifiers/product/${productId}/remove/${groupId}`, { method: 'DELETE' });
        await onReload();
        setBusyId(null);
    };

    return (
        <div className="space-y-5">
            <header>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">Revisar</h1>
            </header>
            <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-800" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar plato…" className="w-full pl-11 py-3 bg-white rounded-2xl border-2 border-slate-100 font-bold text-sm outline-none" />
            </div>
            {categories
                .map(([cat, items]) => {
                const filtered = items
                    .filter((p) => !query.trim() || p.name.toLowerCase().includes(query.toLowerCase()))
                    .sort((a, b) => {
                        const aHas = groupsByProduct(a).length > 0 ? 0 : 1;
                        const bHas = groupsByProduct(b).length > 0 ? 0 : 1;
                        if (aHas !== bHas) return aHas - bHas;
                        return a.name.localeCompare(b.name, 'es');
                    });
                return [cat, items, filtered] as const;
            })
            .filter(([, , filtered]) => filtered.length > 0)
            .sort((a, b) => {
                const aHas = a[2].some((p) => groupsByProduct(p).length > 0) ? 0 : 1;
                const bHas = b[2].some((p) => groupsByProduct(p).length > 0) ? 0 : 1;
                if (aHas !== bHas) return aHas - bHas;
                return displayCategoryName(a[0]).localeCompare(displayCategoryName(b[0]), 'es');
            })
            .map(([cat, , filtered]) => (
                    <div key={cat} className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
                        <button type="button" onClick={() => {
                            const next = openCategory === cat ? null : cat;
                            setOpenCategory(next);
                            if (next) {
                                const withOpts = filtered.filter((p) => groupsByProduct(p).length > 0);
                            }
                        }} className="w-full flex justify-between p-5 font-black italic uppercase">
                            {displayCategoryName(cat)}
                            <span className="text-[10px] text-slate-800 font-black tracking-widest">
                                {filtered.filter((p) => groupsByProduct(p).length > 0).length}/{filtered.length} con opciones
                            </span>
                        </button>
                        {openCategory === cat && (
                            <div className="border-t border-slate-100 divide-y divide-slate-50">
                                {filtered.map((p) => {
                                    const assigned = groupsByProduct(p);
                                    return (
                                        <div key={p.id} className="p-5">
                                            <p className="font-black text-slate-900">{p.name}</p>
                                            {assigned.length === 0 && <p className="text-xs font-bold text-slate-800 mt-1">Sin opciones de producto</p>}
                                            <div className="mt-2 space-y-2">
                                                {assigned.map((g) => {
                                                    const key = `${p.id}:${groupKey(g)}`;
                                                    const open = editingKey === key;
                                                    const shared = (g.productModifiers || []).length || g.assignedProductsCount || 0;
                                                    return (
                                                        <div key={key} className="bg-slate-50 rounded-xl px-3 py-2">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">{MODIFIER_ROLE_LABEL[groupRole(g)]}</p>
                                                                    <p className="text-sm font-bold text-slate-800">{g.displayName}</p>
                                                                    {!open && (
                                                                        <p className="text-xs text-slate-800">
                                                                            {(g.options || []).map((o) => {
                                                                                const extra = Number(o.priceAdjustment) || 0;
                                                                                return extra ? `${o.name} +$${extra}` : o.name;
                                                                            }).join(' · ') || '—'}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const next = open ? null : key;
                                                                            setEditingKey(next);
                                                                        }}
                                                                        className="text-slate-800 hover:text-orange-500 p-1"
                                                                        title="Editar respuestas"
                                                                    >
                                                                        <Pencil size={14} />
                                                                    </button>
                                                                    <button type="button" disabled={busyId === groupKey(g)} onClick={() => unassign(p.id, groupKey(g))} className="text-slate-300 hover:text-red-500 p-1" title="Quitar de este producto">
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            {open && (
                                                                <ReviewGroupEditor
                                                                    group={g}
                                                                    onCancel={() => setEditingKey(null)}
                                                                    onSaved={async () => {
                                                                        setEditingKey(null);
                                                                        await onReload();
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
            ))}
        </div>
    );
}

function SuggestionsView({
    categories, groups, onReload,
}: {
    categories: [string, ProductRow[]][];
    groups: ModifierGroup[];
    onReload: () => Promise<void>;
}) {
    const [openId, setOpenId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const saveProducts = async (group: ModifierGroup, productIds: string[]) => {
        setSaving(true);
        await authFetch(`${API_URL}/modifiers/groups/${group.id}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productIds, isRequired: false }),
        });
        await onReload();
        setSaving(false);
    };

    return (
        <div className="space-y-5">
            <header>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">Sugerencias</h1>
            </header>
            {groups.length === 0 && (
                <div className="bg-white rounded-3xl border border-slate-100 p-8 text-slate-800 font-bold">Sin sugerencias.</div>
            )}
            {groups.map((group) => {
                const assigned = new Set((group.productModifiers || []).map((pm) => pm.sellingProduct?.id).filter(Boolean) as string[]);
                const optionSummary = (group.options || []).map((o) => {
                    const extra = Number(o.priceAdjustment) || 0;
                    return extra ? `${o.name} +$${extra}` : o.name;
                }).join(' · ');
                return (
                    <div key={group.id} className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => {
                                const next = openId === group.id ? null : group.id || null;
                                setOpenId(next);
                            }}
                            className="w-full text-left p-5"
                        >
                            <p className="font-black italic uppercase text-lg text-slate-900">{group.displayName}</p>
                            <p className="text-xs font-bold text-slate-800 mt-1">En {assigned.size} platos · {optionSummary || '—'}</p>
                        </button>
                        {openId === group.id && (
                            <div className="border-t border-slate-100 p-4 space-y-5">
                                <ReviewGroupEditor
                                    key={`${group.id}:${(group.options || []).map((o) => `${o.id}:${o.name}:${o.priceAdjustment}`).join('|')}`}
                                    group={group}
                                    onCancel={() => setOpenId(null)}
                                    onSaved={async () => {
                                        await onReload();
                                    }}
                                />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">En qué platos se ofrece</p>
                                {categories.map(([cat, items]) => (
                                    <CategoryProductToggles
                                        key={cat}
                                        category={cat}
                                        items={items}
                                        selected={assigned}
                                        disabled={saving}
                                        onToggle={(id) => {
                                            const next = new Set(assigned);
                                            if (next.has(id)) next.delete(id);
                                            else next.add(id);
                                            void saveProducts(group, [...next]);
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function CategoryProductToggles({
    category, items, selected, disabled, onToggle,
}: {
    category: string;
    items: ProductRow[];
    selected: Set<string>;
    disabled: boolean;
    onToggle: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const count = items.filter((p) => selected.has(p.id)).length;
    return (
        <div className="rounded-2xl border border-slate-100">
            <button type="button" onClick={() => setOpen(!open)} className="w-full flex justify-between p-3 font-black uppercase text-[11px] tracking-widest">
                {displayCategoryName(category)}
                <span className="text-orange-500">{count} activos</span>
            </button>
            {open && (
                <div className="border-t border-slate-100 p-2 space-y-1">
                    {items.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => onToggle(p.id)}
                            className={`w-full text-left rounded-xl px-3 py-2 text-sm font-bold ${selected.has(p.id) ? 'bg-orange-50 text-orange-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function EspecialesView({
    groups, sizeGroups, onReload,
}: {
    groups: ModifierGroup[];
    sizeGroups: ModifierGroup[];
    onReload: () => Promise<void>;
}) {
    const [saving, setSaving] = useState<string | null>(null);

    const savePrice = async (optionId: string, priceAdjustment: number, meta?: Record<string, unknown>) => {
        setSaving(optionId);
        await authFetch(`${API_URL}/modifiers/options/${optionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priceAdjustment }),
        });
        await onReload();
        setSaving(null);
    };

    useEffect(() => {
    }, [groups, sizeGroups]);

    const empty = groups.length === 0 && sizeGroups.length === 0;

    return (
        <div className="space-y-5">
            <header>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">Especiales</h1>
            </header>
            {empty && (
                <div className="bg-white rounded-3xl border border-slate-100 p-8 text-slate-800 font-bold">Sin especiales.</div>
            )}
            {sizeGroups.map((group) => {
                const pairs = sizeUpgradePairs(group);
                return (
                    <div key={group.id || group.groupId} className="bg-white rounded-3xl border border-slate-100 p-6 space-y-5">
                        <div className="flex items-start gap-3">
                            <span className="bg-emerald-600 text-white w-10 h-10 rounded-2xl inline-flex items-center justify-center shrink-0">
                                <ChefHat size={18} />
                            </span>
                            <div>
                                <p className="font-black italic uppercase text-lg">Agrandar</p>
                                <p className="text-xs font-bold text-slate-800 mt-1">
                                    {(group.productModifiers || []).map((pm) => pm.sellingProduct?.name).filter(Boolean).join(', ')}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">Recargo $</p>
                            {pairs.map((pair) => (
                                <label key={`${pair.current.id}-${pair.next.id}`} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2">
                                    <span className="flex-1 font-black text-sm text-slate-800">{pair.current.name} → {pair.next.name}</span>
                                    <span className="text-[10px] font-black text-slate-800">+$</span>
                                    <input
                                        type="number"
                                        defaultValue={pair.extra}
                                        disabled={saving === pair.next.id}
                                        onBlur={(e) => {
                                            const extra = Number(e.target.value) || 0;
                                            if (extra === Number(pair.extra)) return;
                                            const nextAdj = Number(pair.current.priceAdjustment || 0) + extra;
                                            void savePrice(pair.next.id, nextAdj, {
                                                kind: 'size-upgrade',
                                                from: pair.current.name,
                                                to: pair.next.name,
                                                extra,
                                                currentAdj: pair.current.priceAdjustment,
                                                nextAdj,
                                            });
                                        }}
                                        className="w-24 p-2 bg-white rounded-xl font-black text-sm text-center outline-none"
                                    />
                                </label>
                            ))}
                        </div>
                    </div>
                );
            })}
            {groups.map((group) => (
                <div key={group.id} className="bg-white rounded-3xl border border-slate-100 p-6 space-y-5">
                    <div className="flex items-start gap-3">
                        <span className="bg-emerald-600 text-white w-10 h-10 rounded-2xl inline-flex items-center justify-center shrink-0">
                            <UtensilsCrossed size={18} />
                        </span>
                        <div>
                            <p className="font-black italic uppercase text-lg">{group.displayName}</p>
                            <p className="text-xs font-bold text-slate-800 mt-1">
                                {(group.productModifiers || []).map((pm) => pm.sellingProduct?.name).filter(Boolean).join(', ')}
                            </p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">Recargo $</p>
                        {group.options.map((opt) => (
                            <label key={opt.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2">
                                <span className="flex-1 font-black text-sm text-slate-800">{opt.name}</span>
                                <span className="text-[10px] font-black text-slate-800">+$</span>
                                <input
                                    type="number"
                                    defaultValue={opt.priceAdjustment}
                                    disabled={saving === opt.id}
                                    onBlur={(e) => {
                                        const price = Number(e.target.value) || 0;
                                        if (price !== Number(opt.priceAdjustment)) void savePrice(opt.id, price, { kind: 'remove', name: opt.name });
                                    }}
                                    className="w-24 p-2 bg-white rounded-xl font-black text-sm text-center outline-none"
                                />
                            </label>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
