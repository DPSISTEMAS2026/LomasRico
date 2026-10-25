'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Check, ChefHat, Minus, ShoppingBag, Plus, ChevronRight, ChevronLeft, Loader2, Info, Search } from 'lucide-react';
import { Product, ModifierGroup, ModifierOption } from '../../types';
import { cleanModifierLabel, canEnlargeBySize, channelOffersSizeUpgrade, filterModifiersForChannel, findSizeModifierGroup, nextSizeUpgrade, normalizeDrinkModifiers, resolveModifierRole } from '@lomasrico/shared-types';

/** MULTI con cupo ≥2: se puede repetir. Proteínas reales no. */
function allowsOptionQuantities(group: {
    type?: string;
    maxSelections?: number;
    groupName?: string;
    displayName?: string;
}) {
    if (group.type !== 'MULTI_SELECT') return false;
    if (Number(group.maxSelections) < 2) return false;
    const label = `${group.groupName || ''} ${group.displayName || ''}`.toLowerCase();
    if (/prote[ií]n/.test(label)) return false;
    return true;
}

function countOption(ids: string[], optionId: string) {
    return ids.reduce((n, id) => n + (id === optionId ? 1 : 0), 0);
}

function summarizeSelectedIds(ids: string[]) {
    const order: string[] = [];
    const counts = new Map<string, number>();
    for (const id of ids) {
        if (!counts.has(id)) order.push(id);
        counts.set(id, (counts.get(id) || 0) + 1);
    }
    return order.map((id) => ({ id, qty: counts.get(id) || 0 }));
}

interface CevicheBuilderModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
    availableProteins?: { id: string; name: string }[];
    availableVeggies?: { id: string; name: string }[];
    onConfirm?: (item: any) => void;
}

export const CevicheBuilderModal = ({
    isOpen,
    onClose,
    product,
    availableProteins = [],
    availableVeggies = [],
    onConfirm,
}: CevicheBuilderModalProps) => {
    
    // UI State
    const [step, setStep] = useState(0); // 0 = start, 1...n = modifiers, last = summary
    const [isAdding, setIsAdding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [quantity, setQuantity] = useState(1);

    // Selections State (Map: groupId -> selected Option IDs)
    const [selections, setSelections] = useState<Record<string, string[]>>({});
    const [originalSizeId, setOriginalSizeId] = useState<string | null>(null);

    const modifiers = useMemo(() => {
        const scoped = { ...product, modifiers: filterModifiersForChannel(product.modifiers, 'pos') };
        return normalizeDrinkModifiers(scoped) as ModifierGroup[];
    }, [product]);
    const hasDynamicModifiers = modifiers.length > 0;
    
    // Setup initial selections based on defaults
    useEffect(() => {
        if (isOpen) {
            setStep(0);
            setSearchQuery('');
            setOriginalSizeId(null);
            setQuantity(1);
            
            if (hasDynamicModifiers) {
                const initial: Record<string, string[]> = {};
                modifiers.forEach(group => {
                    const max = Number(group.maxSelections) || 0;
                    const limit = group.type === 'SINGLE_SELECT' ? 1 : max > 0 ? max : Infinity;
                    const defaults = group.options
                        .filter(opt => opt.isDefault && opt.available !== false)
                        .map(opt => opt.id)
                        .slice(0, limit);
                    initial[group.groupId] = defaults;
                });
                setSelections(initial);
            }
        }
    }, [product, isOpen, hasDynamicModifiers, modifiers]);

    // Reset search when step changes
    useEffect(() => {
        setSearchQuery('');
    }, [step]);

    // Logic helpers
    const currentModifier = hasDynamicModifiers && step < modifiers.length
        ? modifiers[step] 
        : null;

    const filteredOptions = useMemo(() => {
        if (!currentModifier) return [];
        if (!searchQuery.trim()) return currentModifier.options;
        
        const query = searchQuery.toLowerCase().trim();
        return currentModifier.options.filter((opt: any) => 
            opt.name.toLowerCase().includes(query)
        );
    }, [currentModifier, searchQuery]);

    if (!isOpen) return null;

    const modifierStepsCount = hasDynamicModifiers ? modifiers.length : 0;
    const isLastStep = hasDynamicModifiers ? step === modifierStepsCount : true;

    // Price Calculation
    const basePrice = Number(product.price);
    
    const modifiersTotal = hasDynamicModifiers 
        ? Object.entries(selections).reduce((groupSum, [groupId, selectedIds]) => {
            const group = modifiers.find(m => m.groupId === groupId);
            if (!group) return groupSum;
            
            const groupModifierPrice = selectedIds.reduce((optSum, optId) => {
                const opt = group.options.find(o => o.id === optId);
                return optSum + Number(opt?.priceAdjustment || 0);
            }, 0);
            
            return groupSum + groupModifierPrice;
        }, 0)
        : 0;

    const finalPrice = basePrice + modifiersTotal;

    // Navigation Logic
    const handleNext = () => {
        if (hasDynamicModifiers && step < modifierStepsCount) {
            // Validation: check minSelections
            const group = modifiers[step];
            const currentCount = (selections[group.groupId] || []).length;
            if (currentCount < (group.minSelections || 0)) {
                alert(`Por favor selecciona al menos ${group.minSelections} opción(es) de ${group.displayName}`);
                return;
            }
            if (resolveModifierRole(group.groupName, group.displayName, group.role) === 'SIZE') {
                setOriginalSizeId(selections[group.groupId]?.[0] || null);
            }
            setStep(step + 1);
        } else {
            // Summary or process
            handleAddToCart();
        }
    };

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
    };

    const toggleOption = (groupId: string, optionId: string, type: 'SINGLE_SELECT' | 'MULTI_SELECT', max: number) => {
        setSelections(prev => {
            const current = prev[groupId] || [];
            if (type === 'SINGLE_SELECT') {
                return { ...prev, [groupId]: [optionId] };
            } else {
                if (current.includes(optionId)) {
                    return { ...prev, [groupId]: current.filter(id => id !== optionId) };
                } else {
                    if (current.length < (max || 99)) {
                        return { ...prev, [groupId]: [...current, optionId] };
                    }
                    return prev;
                }
            }
        });
    };

    const setOptionQuantity = (groupId: string, optionId: string, nextQty: number, max: number) => {
        setSelections((prev) => {
            const current = prev[groupId] || [];
            const others = current.filter((id) => id !== optionId);
            const capped = Math.max(0, Math.min(Math.floor(nextQty), max - others.length));
            const next = [...others, ...Array.from({ length: capped }, () => optionId)];
            // #region agent log
            fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'pos-qty-multi',hypothesisId:'P1',location:'panels/CevicheBuilderModal.tsx:setOptionQuantity',message:'POS option qty change',data:{groupId,optionId,nextQty,capped,total:next.length,max,product:product.name},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            return { ...prev, [groupId]: next };
        });
    };

    const handleAddToCart = () => {
        setIsAdding(true);
        
        // Transform dynamic selections into CartItem format
        const dynamicSelections = hasDynamicModifiers 
            ? modifiers.map(group => ({
                groupId: group.groupId,
                groupName: cleanModifierLabel(group.displayName || group.groupName),
                selectedOptions: (selections[group.groupId] || []).map(optId => {
                    const opt = group.options.find(o => o.id === optId);
                    return { id: optId, name: opt?.name || optId, price: Number(opt?.priceAdjustment || 0) };
                })
            }))
            : [];

        // Backward compatibility for legacy system
        // We find the "proteinas" group if it exists and extract its names
        const proteinGroup = dynamicSelections.find(g => g.groupName.toLowerCase().includes('proteina'));
        const selectedProteins = proteinGroup ? proteinGroup.selectedOptions.map(o => o.id) : [];
        const selectedProteinNames = proteinGroup ? proteinGroup.selectedOptions.map(o => o.name) : [];

        const itemData = {
            productId: product.id,
            variantId: 'custom',
            name: product.name,
            price: finalPrice,
            quantity,
            modifiers: {
                selectedProteins,
                selectedProteinNames,
                removedIngredients: [],
                dynamicSelections
            },
            totalModifierPrice: modifiersTotal,
            imageUrl: product.imageUrl
        };

        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'pos-qty-multi',hypothesisId:'P2',location:'panels/CevicheBuilderModal.tsx:handleAddToCart',message:'POS add with dynamicSelections',data:{product:product.name,groups:dynamicSelections.map(g=>({name:g.groupName,opts:g.selectedOptions.map(o=>o.name)}))},timestamp:Date.now()})}).catch(()=>{});
        // #endregion

        if (onConfirm) {
            onConfirm(itemData);
        }
        onClose();
        setIsAdding(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            {/* Modal Content */}
            <div className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                
                {/* Header */}
                <header className="p-6 md:p-8 shrink-0 flex items-center justify-between border-b border-slate-50">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black italic shadow-lg rotate-3">
                            R
                        </div>
                        <div>
                            <h2 className="text-xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                                {product.name}
                            </h2>
                            <p className="text-orange-500 font-bold uppercase text-[9px] tracking-widest mt-1">
                                Personaliza tu Pedido
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center text-slate-800 hover:bg-slate-50 transition-all">
                        <X size={18} />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto px-6 md:px-8 py-8">
                    <div className="space-y-8">
                        
                        {/* Step Indicator */}
                        {modifierStepsCount > 0 && (
                            <div className="flex items-center gap-2">
                                {Array.from({ length: modifierStepsCount + 1 }).map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={`h-1.5 rounded-full transition-all duration-500 ${
                                            i < step ? 'bg-orange-500 w-6' : 
                                            i === step ? 'bg-orange-500 w-10' : 'bg-slate-100 w-3'
                                        }`} 
                                    />
                                ))}
                            </div>
                        )}

                        {/* Dynamic Content */}
                        {currentModifier ? (
                            <div className="space-y-6">
                                <div className="relative">
                                    <h3 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900">
                                        {currentModifier.displayName}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Info size={12} className="text-orange-400" />
                                        <p className="text-slate-800 font-bold uppercase text-[9px] tracking-[0.2em] italic">
                                            {currentModifier.type === 'SINGLE_SELECT'
                                                ? 'Elige 1 de la lista'
                                                : allowsOptionQuantities(currentModifier)
                                                    ? `Cupos ${(selections[currentModifier.groupId] || []).length}/${currentModifier.maxSelections}${currentModifier.minSelections > 0 ? ` · mínimo ${currentModifier.minSelections}` : ''} · puedes repetir`
                                                    : `Selecciona de ${currentModifier.minSelections} a ${currentModifier.maxSelections}`}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {/* Search Input */}
                                    {currentModifier.options.length > 5 && (
                                        <div className="relative mb-2">
                                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-800">
                                                <Search size={14} />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder={`Buscar en ${currentModifier.displayName.toLowerCase()}...`}
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold text-slate-700 outline-none focus:border-orange-200 transition-all placeholder:text-slate-300"
                                            />
                                            {searchQuery && (
                                                <button 
                                                    onClick={() => setSearchQuery('')}
                                                    className="absolute inset-y-0 right-4 flex items-center text-slate-800 hover:text-orange-500"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {filteredOptions.length > 0 ? (
                                        filteredOptions.map((option) => {
                                            const selectedIds = selections[currentModifier.groupId] || [];
                                            const qty = countOption(selectedIds, option.id);
                                            const isSelected = qty > 0;
                                            const isUnavailable = option.available === false;
                                            const useQty = allowsOptionQuantities(currentModifier);
                                            const canAdd = !isUnavailable && selectedIds.length < currentModifier.maxSelections;

                                            if (useQty) {
                                                return (
                                                    <div
                                                        key={option.id}
                                                        className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                                                            isUnavailable
                                                                ? 'bg-slate-50 border-slate-100 text-slate-300 opacity-50'
                                                                : isSelected
                                                                    ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                                                                    : 'bg-white border-slate-50 text-slate-700'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <span className={`font-bold uppercase text-xs tracking-tight truncate ${isUnavailable ? 'line-through' : ''}`}>
                                                                {option.name}
                                                            </span>
                                                            {isUnavailable && (
                                                                <span className="text-[8px] font-black uppercase bg-red-50 text-red-400 px-2 py-0.5 rounded-full tracking-widest shrink-0">
                                                                    Sin stock
                                                                </span>
                                                            )}
                                                            {option.priceAdjustment !== 0 && (
                                                                <span className={`text-[9px] font-black px-2 py-1 rounded-lg shrink-0 ${
                                                                    isUnavailable ? 'bg-slate-100 text-slate-300' :
                                                                    isSelected ? 'bg-white/10 text-orange-400' : 'bg-orange-50 text-orange-500'
                                                                }`}>
                                                                    {option.priceAdjustment > 0 ? '+' : ''}
                                                                    ${Number(option.priceAdjustment).toLocaleString('es-CL')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <button
                                                                type="button"
                                                                aria-label={`Quitar ${option.name}`}
                                                                disabled={isUnavailable || qty <= 0}
                                                                onClick={() => setOptionQuantity(currentModifier.groupId, option.id, qty - 1, currentModifier.maxSelections)}
                                                                className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center font-black transition-all active:scale-90 ${
                                                                    qty <= 0 || isUnavailable
                                                                        ? 'border-slate-200/40 text-slate-400 cursor-not-allowed'
                                                                        : isSelected
                                                                            ? 'border-white/30 text-white hover:bg-white/10'
                                                                            : 'border-slate-200 text-slate-900'
                                                                }`}
                                                            >
                                                                <Minus size={14} strokeWidth={3} />
                                                            </button>
                                                            <span className={`w-7 text-center text-base font-black italic tabular-nums ${isSelected ? 'text-orange-400' : 'text-slate-900'}`}>
                                                                {qty}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                aria-label={`Agregar ${option.name}`}
                                                                disabled={!canAdd}
                                                                onClick={() => setOptionQuantity(currentModifier.groupId, option.id, qty + 1, currentModifier.maxSelections)}
                                                                className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center font-black transition-all active:scale-90 ${
                                                                    !canAdd
                                                                        ? 'border-slate-200/40 text-slate-400 cursor-not-allowed'
                                                                        : isSelected
                                                                            ? 'border-orange-400 text-orange-400 hover:bg-orange-500/20'
                                                                            : 'border-slate-200 text-slate-900 hover:border-orange-300 hover:text-orange-500'
                                                                }`}
                                                            >
                                                                <Plus size={14} strokeWidth={3} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <button
                                                    key={option.id}
                                                    onClick={() => !isUnavailable && toggleOption(
                                                        currentModifier.groupId, 
                                                        option.id, 
                                                        currentModifier.type,
                                                        currentModifier.maxSelections
                                                    )}
                                                    disabled={isUnavailable}
                                                    className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between group active:scale-[0.98] ${
                                                        isUnavailable
                                                        ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                                                        : isSelected 
                                                        ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                                                        : 'bg-white border-slate-50 text-slate-500 hover:border-orange-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                                            isUnavailable ? 'border-slate-200 bg-slate-100' :
                                                            isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-200 group-hover:border-orange-300'
                                                        }`}>
                                                            {isSelected && !isUnavailable && <Check size={12} className="text-white" strokeWidth={4} />}
                                                            {isUnavailable && <X size={10} className="text-slate-300" strokeWidth={3} />}
                                                        </div>
                                                        <span className={`font-bold uppercase text-xs tracking-tight ${isUnavailable ? 'line-through' : ''}`}>
                                                            {option.name}
                                                        </span>
                                                        {isUnavailable && (
                                                            <span className="text-[8px] font-black uppercase bg-red-50 text-red-400 px-2 py-0.5 rounded-full tracking-widest">
                                                                Sin stock
                                                            </span>
                                                        )}
                                                    </div>
                                                    {option.priceAdjustment !== 0 && (
                                                        <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${
                                                            isUnavailable ? 'bg-slate-100 text-slate-300' :
                                                            isSelected ? 'bg-white/10 text-orange-400' : 'bg-orange-50 text-orange-500'
                                                        }`}>
                                                            {option.priceAdjustment > 0 ? '+' : ''}
                                                            ${Number(option.priceAdjustment).toLocaleString('es-CL')}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-800">
                                                <Search size={20} />
                                            </div>
                                            <div>
                                                <p className="font-black italic uppercase text-xs text-slate-700 tracking-tight">No hay resultados</p>
                                                <p className="text-[10px] font-bold text-slate-800 uppercase tracking-widest mt-1">Intenta con otra palabra</p>
                                            </div>
                                            <button 
                                                onClick={() => setSearchQuery('')}
                                                className="text-[9px] font-black uppercase text-orange-500 hover:underline"
                                            >
                                                Limpiar búsqueda
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Summary View */}
                                <div className="relative">
                                    <h3 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900">
                                        REVISA TU PEDIDO
                                    </h3>
                                    <p className="text-slate-800 font-bold uppercase text-[9px] tracking-widest mt-1">
                                        Todo listo para sumarlo al carrito
                                    </p>
                                </div>

                                <div className="bg-slate-50 rounded-2xl p-6 space-y-4 border border-slate-100">
                                    {Object.entries(selections).map(([groupId, selectedIds]) => {
                                        const group = modifiers.find(m => m.groupId === groupId);
                                        if (!group || selectedIds.length === 0) return null;
                                        const summarized = summarizeSelectedIds(selectedIds);
                                        
                                        return (
                                            <div key={groupId} className="flex flex-col gap-1 border-b border-slate-200/50 pb-3 last:border-0 last:pb-0">
                                                <p className="text-[9px] font-black uppercase text-orange-500 tracking-widest italic">{group.displayName}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {summarized.map(({ id: optId, qty }) => {
                                                        const opt = group.options.find(o => o.id === optId);
                                                        return (
                                                            <span key={optId} className="bg-white px-3 py-1 rounded-full text-[10px] font-bold text-slate-700 shadow-sm border border-slate-100">
                                                                {opt?.name}{qty > 1 ? ` ×${qty}` : ''}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    
                                    <div className="pt-4 mt-4 border-t-2 border-dashed border-slate-200 flex items-center justify-between gap-3">
                                        <span className="font-black italic uppercase text-sm text-slate-900 tracking-tighter">Cantidad</span>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                                disabled={quantity <= 1}
                                                className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center font-black transition-all active:scale-90 ${
                                                    quantity <= 1 ? 'border-slate-100 text-slate-200 cursor-not-allowed' : 'border-slate-200 text-slate-900 hover:border-orange-300 hover:text-orange-500'
                                                }`}
                                            >
                                                <Minus size={16} strokeWidth={3} />
                                            </button>
                                            <span className="w-8 text-center text-xl font-black italic text-slate-900 tabular-nums">{quantity}</span>
                                            <button
                                                type="button"
                                                onClick={() => setQuantity((q) => Math.min(q + 1, product.maxQuantity ?? 99))}
                                                disabled={product.maxQuantity != null && quantity >= product.maxQuantity}
                                                className="w-10 h-10 rounded-xl border-2 border-slate-200 text-slate-900 flex items-center justify-center font-black transition-all active:scale-90 hover:border-orange-300 hover:text-orange-500 disabled:border-slate-100 disabled:text-slate-200"
                                            >
                                                <Plus size={16} strokeWidth={3} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="pt-3 flex justify-between items-center">
                                        <span className="font-black italic uppercase text-xs text-slate-800 tracking-tighter">Total</span>
                                        <span className="text-xl font-black italic text-slate-900 tracking-tighter">
                                            ${(finalPrice * quantity).toLocaleString('es-CL')}
                                        </span>
                                    </div>
                                </div>

                                {(() => {
                                    const canEnlarge = channelOffersSizeUpgrade('pos') && canEnlargeBySize(product.category, product.name);
                                    const sizeGroup = findSizeModifierGroup(modifiers);
                                    const selectedId = sizeGroup ? (selections[sizeGroup.groupId] || [])[0] : null;
                                    const upgrade = nextSizeUpgrade(sizeGroup, selectedId);
                                    const isUpsold = !!(originalSizeId && selectedId && selectedId !== originalSizeId);
                                    if (!canEnlarge || !sizeGroup || (!upgrade && !isUpsold)) return null;
                                    return (
                                        <div className="space-y-2">
                                            {upgrade && !isUpsold && (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleOption(sizeGroup.groupId, upgrade.next.id, 'SINGLE_SELECT', 1)}
                                                    className="w-full p-4 rounded-2xl border-2 border-orange-200 bg-orange-50 flex items-center justify-between"
                                                >
                                                    <span className="font-black italic uppercase text-sm text-orange-700">Agrandar a {upgrade.next.name}</span>
                                                    <span className="text-xs font-black text-orange-600">+${upgrade.extra.toLocaleString('es-CL')}</span>
                                                </button>
                                            )}
                                            {isUpsold && originalSizeId && (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleOption(sizeGroup.groupId, originalSizeId, 'SINGLE_SELECT', 1)}
                                                    className="w-full p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 font-black italic uppercase text-sm text-slate-600"
                                                >
                                                    Volver al tamaño anterior
                                                </button>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <footer className="p-6 md:p-8 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
                    {step > 0 && (
                        <button 
                            onClick={handleBack}
                            className="w-14 h-14 rounded-2xl border-2 border-slate-200 flex items-center justify-center text-slate-800 hover:text-slate-900 transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    <button 
                        onClick={handleNext}
                        disabled={isAdding}
                        className="flex-1 bg-slate-900 text-white h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-orange-500 transition-all active:scale-95 flex items-center justify-center gap-2 italic"
                    >
                        {isAdding ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : (
                            <>
                                <span>{step === modifierStepsCount ? 'Agregar al Pedido' : 'Continuar'}</span>
                                <ChevronRight size={18} />
                            </>
                        )}
                    </button>
                </footer>
            </div>
        </div>
    );
};
