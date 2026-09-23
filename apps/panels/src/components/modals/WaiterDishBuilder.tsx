'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, X, Search } from 'lucide-react';
import { Product, ModifierGroup } from '../../types';
import { isDishCoreModifier } from '@lomasrico/shared-types';

function isWaiterCoreGroup(group: ModifierGroup) {
    if (isDishCoreModifier(group.groupName, group.displayName)) return true;
    const label = `${group.groupName || ''} ${group.displayName || ''}`.toLowerCase();
    if (/extras?\s*lomasrico|extras?\s+lo\s*m[aá]s\s*rico|upsell|limonada\s+lomasrico/.test(label)) return false;
    return !!(group.isRequired || (group.minSelections || 0) > 0);
}

interface Props {
    isOpen: boolean;
    product: Product;
    guestName?: string;
    onClose: () => void;
    onConfirm: (item: any) => void;
}

export function WaiterDishBuilder({ isOpen, product, guestName, onClose, onConfirm }: Props) {
    const [selections, setSelections] = useState<Record<string, string[]>>({});
    const [search, setSearch] = useState('');

    const groups = useMemo(
        () => (product.modifiers || []).filter(isWaiterCoreGroup),
        [product.modifiers],
    );

    useEffect(() => {
        if (!isOpen) return;
        setSearch('');
        const initial: Record<string, string[]> = {};
        groups.forEach((group) => {
            initial[group.groupId] = group.options
                .filter((opt) => opt.isDefault && (opt as any).available !== false)
                .map((opt) => opt.id);
        });
        setSelections(initial);
        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'waiter-builder',hypothesisId:'H7',location:'WaiterDishBuilder.tsx:open',message:'waiter builder groups',data:{shown:groups.map((g)=>g.displayName||g.groupName),skipped:(product.modifiers||[]).filter((g)=>!isWaiterCoreGroup(g)).map((g)=>g.displayName||g.groupName)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
    }, [isOpen, product.id, groups]);

    if (!isOpen) return null;

    const toggle = (group: ModifierGroup, optionId: string) => {
        setSelections((prev) => {
            const current = prev[group.groupId] || [];
            if (group.type === 'SINGLE_SELECT') return { ...prev, [group.groupId]: [optionId] };
            if (current.includes(optionId)) return { ...prev, [group.groupId]: current.filter((id) => id !== optionId) };
            if (current.length >= (group.maxSelections || 99)) return prev;
            return { ...prev, [group.groupId]: [...current, optionId] };
        });
    };

    const missing = groups.find((group) => (selections[group.groupId] || []).length < (group.minSelections || 0));

    const confirm = () => {
        if (missing) {
            alert(`Falta ${missing.displayName || missing.groupName}`);
            return;
        }
        const dynamicSelections = groups.map((group) => ({
            groupId: group.groupId,
            groupName: group.groupName,
            selectedOptions: (selections[group.groupId] || []).map((optId) => {
                const opt = group.options.find((o) => o.id === optId);
                return { id: optId, name: opt?.name || optId, price: Number(opt?.priceAdjustment || 0) };
            }),
        }));
        const proteinGroup = dynamicSelections.find((g) => /protein/i.test(g.groupName || ''));
        const extraPrice = dynamicSelections.reduce(
            (sum, g) => sum + g.selectedOptions.reduce((s, o) => s + Number(o.price || 0), 0),
            0,
        );
        onConfirm({
            productId: product.id,
            variantId: 'custom',
            name: product.name,
            price: Number(product.price) + extraPrice,
            quantity: 1,
            modifiers: {
                selectedProteins: proteinGroup?.selectedOptions.map((o) => o.id) || [],
                selectedProteinNames: proteinGroup?.selectedOptions.map((o) => o.name) || [],
                removedIngredients: [],
                dynamicSelections,
            },
        });
    };

    const q = search.trim().toLowerCase();

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-end md:items-center justify-center p-3">
            <div className="w-full max-w-2xl bg-white rounded-[2rem] max-h-[92vh] flex flex-col overflow-hidden">
                <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Armar para {guestName || 'comensal'}</p>
                        <h2 className="text-xl font-black italic uppercase tracking-tighter">{product.name}</h2>
                    </div>
                    <button type="button" onClick={onClose} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                        <X size={18} />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {groups.length === 0 && (
                        <p className="text-sm font-bold text-slate-500">Este plato no necesita más datos. Anótalo y sigue.</p>
                    )}
                    {groups.map((group) => {
                        const options = q
                            ? group.options.filter((o) => o.name.toLowerCase().includes(q))
                            : group.options;
                        return (
                            <section key={group.groupId}>
                                <div className="flex items-end justify-between mb-2">
                                    <h3 className="font-black italic uppercase">{group.displayName || group.groupName}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                                        {group.type === 'SINGLE_SELECT' ? 'Elige 1' : `${group.minSelections || 0}–${group.maxSelections || group.options.length}`}
                                    </p>
                                </div>
                                {group.options.length > 6 && (
                                    <div className="relative mb-2">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                        <input
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Buscar..."
                                            className="w-full bg-slate-50 pl-9 pr-3 py-2 rounded-xl text-sm font-bold"
                                        />
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                    {options.map((option) => {
                                        const selected = (selections[group.groupId] || []).includes(option.id);
                                        return (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() => toggle(group, option.id)}
                                                className={`p-3 rounded-2xl border-2 text-left active:scale-95 ${
                                                    selected ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-transparent'
                                                }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    {selected && <Check size={14} className="text-orange-400 shrink-0" />}
                                                    <span className="text-xs font-black uppercase italic leading-tight">{option.name}</span>
                                                </span>
                                                {!!option.priceAdjustment && (
                                                    <span className={`block text-[10px] font-bold mt-1 ${selected ? 'text-orange-300' : 'text-orange-500'}`}>
                                                        {option.priceAdjustment > 0 ? '+' : ''}${Number(option.priceAdjustment).toLocaleString()}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>

                <footer className="p-4 border-t border-slate-100 grid grid-cols-[1fr_2fr] gap-2">
                    <button type="button" onClick={onClose} className="py-4 rounded-2xl bg-slate-100 font-black uppercase italic text-sm">
                        Cancelar
                    </button>
                    <button type="button" onClick={confirm} className="py-4 rounded-2xl bg-slate-900 text-white font-black uppercase italic text-sm">
                        Anotar{guestName ? ` a ${guestName}` : ''}
                    </button>
                </footer>
            </div>
        </div>
    );
}
