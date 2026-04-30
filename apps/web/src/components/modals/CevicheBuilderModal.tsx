'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Check, ChefHat, Minus, ShoppingBag, Plus, ChevronRight, ChevronLeft, Loader2, Info, Search } from 'lucide-react';
import { Product, ModifierGroup, ModifierOption } from '../../types';
import { useCart } from '../../context/CartContext';

interface CevicheBuilderModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
    availableProteins?: { id: string; name: string }[];
    availableVeggies?: { id: string; name: string }[];
    onConfirm?: (item: any) => void;
    onGoToCart?: () => void;
}

export const CevicheBuilderModal = ({
    isOpen,
    onClose,
    product,
    availableProteins = [],
    availableVeggies = [],
    onConfirm,
    onGoToCart,
}: CevicheBuilderModalProps) => {
    const cartContext = useCart();
    
    // UI State
    const [step, setStep] = useState(0);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [quantity, setQuantity] = useState(1);

    // Selections State (Map: groupId -> selected Option IDs)
    const [selections, setSelections] = useState<Record<string, string[]>>({});
    
    // Upsell state
    const [originalFormatoId, setOriginalFormatoId] = useState<string | null>(null);

    // Determine if we use dynamic modifiers or legacy builder
    const hasDynamicModifiers = product.modifiers && product.modifiers.length > 0;

    /**
     * Split modifiers into:
     *  - mainSteps: full-screen step (required OR multi-option groups)
     *  - quickToggles: optional single-option groups shown in summary (e.g. "Agrandar a 500g")
     */
    const { mainSteps, quickToggles } = useMemo(() => {
        if (!hasDynamicModifiers || !product.modifiers) return { mainSteps: [], quickToggles: [] };

        const main: ModifierGroup[] = [];
        const quick: ModifierGroup[] = [];

        product.modifiers.forEach(group => {
            const isOptional = group.minSelections === 0;
            const hasFewOptions = group.options.length <= 1;
            
            if (isOptional && hasFewOptions) {
                quick.push(group);
            } else {
                main.push(group);
            }
        });

        return { mainSteps: main, quickToggles: quick };
    }, [product.modifiers, hasDynamicModifiers]);

    const totalSteps = mainSteps.length; // summary is the step after all main steps
    
    // Setup initial selections based on defaults
    useEffect(() => {
        if (isOpen) {
            setIsSuccess(false);
            setSearchQuery('');
            setQuantity(1);
            
            if (hasDynamicModifiers) {
                setStep(0);
                const initial: Record<string, string[]> = {};
                product.modifiers!.forEach(group => {
                    const defaults = group.options
                        .filter(opt => opt.isDefault && opt.available !== false)
                        .map(opt => opt.id);
                    initial[group.groupId] = defaults;
                });
                setSelections(initial);
            }
        }
    }, [product, isOpen, hasDynamicModifiers]);

    // Reset search when step changes
    useEffect(() => {
        setSearchQuery('');
    }, [step]);

    // Logic helpers
    const currentModifier = hasDynamicModifiers && step < totalSteps
        ? mainSteps[step] 
        : null;

    const isLastStep = step === totalSteps; // summary step

    const filteredOptions = useMemo(() => {
        if (!currentModifier) return [];
        if (!searchQuery.trim()) return currentModifier.options;
        
        const query = searchQuery.toLowerCase().trim();
        return currentModifier.options.filter((opt: any) => 
            opt.name.toLowerCase().includes(query)
        );
    }, [currentModifier, searchQuery]);

    if (!isOpen) return null;

    // Base price
    const basePrice = Number(product.price);

    // Price Calculation
    const dynamicModifiersTotal = hasDynamicModifiers 
        ? [...(product.modifiers || [])].reduce((groupSum, group) => {
            const selectedIds = selections[group.groupId] || [];
            const groupModifierPrice = selectedIds.reduce((optSum, optId) => {
                const opt = group.options.find(o => o.id === optId);
                return optSum + Number(opt?.priceAdjustment || 0);
            }, 0);
            return groupSum + groupModifierPrice;
        }, 0)
        : 0;

    const finalPrice = basePrice + dynamicModifiersTotal;

    const toggleOption = (groupId: string, optionId: string, type: 'SINGLE_SELECT' | 'MULTI_SELECT', max: number) => {
        setSelections(prev => {
            const current = prev[groupId] || [];
            if (type === 'SINGLE_SELECT') {
                // For optional single-select, allow toggling off
                if (current.includes(optionId)) {
                    return { ...prev, [groupId]: [] };
                }
                return { ...prev, [groupId]: [optionId] };
            } else {
                if (current.includes(optionId)) {
                    return { ...prev, [groupId]: current.filter(id => id !== optionId) };
                } else {
                    if (current.length < max) {
                        return { ...prev, [groupId]: [...current, optionId] };
                    }
                    return prev;
                }
            }
        });
    };

    // Validation
    const canProceed = () => {
        if (!currentModifier) return true;
        const currentCount = (selections[currentModifier.groupId] || []).length;
        return currentCount >= currentModifier.minSelections;
    };

    // Navigation Logic
    const handleNext = () => {
        if (!hasDynamicModifiers) return;
        
        if (step < totalSteps) {
            if (!canProceed()) {
                alert(`Por favor selecciona al menos ${currentModifier!.minSelections} opción(es) de ${currentModifier!.displayName}`);
                return;
            }
            
            // If leaving step 0 and it's the Formato step, record the original choice
            if (step === 0 && currentModifier?.groupName?.toLowerCase().includes('formato')) {
                const choice = selections[currentModifier.groupId]?.[0] || null;
                setOriginalFormatoId(choice);
            }
            
            setStep(step + 1);
        } else {
            handleAddToCart();
        }
    };

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
    };

    const handleAddToCart = async () => {
        setIsAdding(true);
        
        // Transform dynamic selections into CartItem format
        const dynamicSelections = hasDynamicModifiers 
            ? product.modifiers!.map(group => ({
                groupId: group.groupId,
                groupName: group.groupName,
                selectedOptions: (selections[group.groupId] || []).map(optId => {
                    const opt = group.options.find(o => o.id === optId);
                    return { id: optId, name: opt?.name || optId, price: Number(opt?.priceAdjustment || 0) };
                })
            }))
            : [];

        const itemData = {
            productId: product.id,
            variantId: 'default',
            name: product.name,
            price: finalPrice,
            quantity: quantity,
            modifiers: {
                selectedProteins: [],
                selectedProteinNames: [],
                removedIngredients: [],
                dynamicSelections,
            },
            totalModifierPrice: dynamicModifiersTotal,
            imageUrl: product.imageUrl,
            maxQuantity: product.maxQuantity
        };

        try {
            if (onConfirm) {
                onConfirm(itemData);
            } else {
                cartContext.addToCart(itemData);
            }
            setIsSuccess(true);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in" onClick={onClose} />

            {/* Modal Content */}
            <div className="relative w-full max-w-xl bg-white rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500 max-h-[90vh] flex flex-col">
                
                {/* Header */}
                <header className="p-6 md:p-8 flex items-center justify-between shrink-0 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black italic shadow-lg shadow-orange-500/20 rotate-3 animate-pulse">
                            R
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                                {isSuccess ? '¡LISTO PARA DISFRUTAR!' : 'PERSONALIZA TU'}
                            </h2>
                            <p className="text-orange-500 font-bold uppercase text-[10px] md:text-xs tracking-widest mt-1">
                                {isSuccess ? 'Agregado al Carrito' : product.name}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all">
                        <X size={20} />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-32">
                    {isSuccess ? (
                        <div className="py-12 text-center animate-in zoom-in duration-300">
                            <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-green-500/30">
                                <Check size={48} strokeWidth={3} />
                            </div>
                            <h3 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 mb-4">
                                ¡Agregado con éxito!
                            </h3>
                            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mb-10 max-w-xs mx-auto">
                                Tu selección personalizada ha sido guardada en el carrito.
                            </p>
                            <div className="flex flex-col gap-4">
                                <button 
                                    onClick={onGoToCart}
                                    className="bg-slate-900 text-white w-full py-5 rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-orange-600 transition-all active:scale-95"
                                >
                                    <ShoppingBag size={20} />
                                    Ver mi Pedido
                                </button>
                                <button 
                                    onClick={onClose}
                                    className="bg-white text-slate-400 border-2 border-slate-50 w-full py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:border-orange-500 hover:text-orange-500 transition-all"
                                >
                                    Seguir Comprando
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500" key={step}>
                            
                            {/* Step Indicator */}
                            {totalSteps > 0 && (
                                <div className="flex items-center gap-2">
                                    {Array.from({ length: totalSteps + 1 }).map((_, i) => (
                                        <div 
                                            key={i} 
                                            className={`h-1.5 rounded-full transition-all duration-500 ${
                                                i < step ? 'bg-orange-500 w-8' : 
                                                i === step ? 'bg-orange-500 w-12' : 'bg-slate-100 w-4'
                                            }`} 
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Main Content */}
                            {currentModifier ? (
                                /* ── MODIFIER STEP ── */
                                <div className="space-y-6">
                                    <div className="relative">
                                        <div className="w-10 h-[2px] bg-orange-500 mb-2" />
                                        <h3 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900">
                                            {currentModifier.displayName}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Info size={12} className="text-orange-400" />
                                            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.2em] italic">
                                                {currentModifier.type === 'SINGLE_SELECT' 
                                                    ? 'Elige 1 de la lista' 
                                                    : currentModifier.minSelections > 0 
                                                        ? `Selecciona de ${currentModifier.minSelections} a ${currentModifier.maxSelections}`
                                                        : `Selecciona hasta ${currentModifier.maxSelections} (opcional)`
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        {/* Search Input */}
                                        {currentModifier.options.length > 5 && (
                                            <div className="relative mb-2">
                                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
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
                                                        className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-orange-500"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {filteredOptions.length > 0 ? (
                                            filteredOptions.map((option) => {
                                                const isSelected = (selections[currentModifier.groupId] || []).includes(option.id);
                                                const isUnavailable = option.available === false;
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
                                                        className={`p-5 rounded-[1.5rem] border-2 transition-all flex items-center justify-between group active:scale-[0.98] ${
                                                            isUnavailable
                                                            ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                                                            : isSelected 
                                                            ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/10' 
                                                            : 'bg-white border-slate-50 text-slate-500 hover:border-orange-200'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                                                isUnavailable ? 'border-slate-200 bg-slate-100' :
                                                                isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-200 group-hover:border-orange-300'
                                                            }`}>
                                                                {isSelected && !isUnavailable && <Check size={14} className="text-white" strokeWidth={4} />}
                                                                {isUnavailable && <X size={10} className="text-slate-300" strokeWidth={3} />}
                                                            </div>
                                                            <span className={`font-black italic uppercase text-sm tracking-tighter ${isUnavailable ? 'line-through' : ''}`}>
                                                                {option.name}
                                                            </span>
                                                            {isUnavailable && (
                                                                <span className="text-[8px] font-black uppercase bg-red-50 text-red-400 px-2 py-0.5 rounded-full tracking-widest">
                                                                    Sin stock
                                                                </span>
                                                            )}
                                                        </div>
                                                        {option.priceAdjustment !== 0 && (
                                                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                                                                isUnavailable ? 'bg-slate-100 text-slate-300' :
                                                                isSelected ? 'bg-white/10 text-orange-400' : 'bg-orange-50 text-orange-500'
                                                            }`}>
                                                                {option.priceAdjustment > 0 ? '+' : ''}
                                                                ${Number(option.priceAdjustment).toLocaleString()}
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                    <Search size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-black italic uppercase text-xs text-slate-700 tracking-tight">No hay resultados</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Intenta con otra palabra</p>
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
                                /* ── SUMMARY STEP (last) ── */
                                <div className="space-y-8">
                                    <div className="relative">
                                        <div className="w-10 h-[2px] bg-orange-500 mb-2" />
                                        <h3 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900">
                                            REVISA TU PEDIDO
                                        </h3>
                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">
                                            Todo listo para sumarlo al carrito
                                        </p>
                                    </div>

                                     <div className="bg-slate-50 rounded-[2rem] p-6 space-y-4 border border-slate-100">
                                        {/* Main selections summary */}
                                        {mainSteps.map(group => {
                                            const selectedIds = selections[group.groupId] || [];
                                            if (selectedIds.length === 0) return null;
                                            
                                            return (
                                                <div key={group.groupId} className="flex flex-col gap-1 border-b border-slate-200/50 pb-3 last:border-0 last:pb-0">
                                                    <p className="text-[10px] font-black uppercase text-orange-500 tracking-widest italic">{group.displayName}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {selectedIds.map(optId => {
                                                            const opt = group.options.find(o => o.id === optId);
                                                            return (
                                                                <span key={optId} className="bg-white px-3 py-1 rounded-full text-xs font-bold text-slate-700 shadow-sm border border-slate-100">
                                                                    {opt?.name}
                                                                    {opt && opt.priceAdjustment !== 0 && (
                                                                        <span className="ml-1 text-orange-500 text-[10px]">
                                                                            +${Number(opt.priceAdjustment).toLocaleString()}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Dynamic Upsell Formato */}
                                    {(() => {
                                        const formatoGroup = mainSteps.find(g => g.groupName?.toLowerCase().includes('formato'));
                                        if (!formatoGroup) return null;
                                        const selectedOptId = (selections[formatoGroup.groupId] || [])[0];
                                        if (!selectedOptId) return null;
                                        
                                        const sortedOptions = [...formatoGroup.options].sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0));
                                        const currentIndex = sortedOptions.findIndex(o => o.id === selectedOptId);
                                        if (currentIndex === -1) return null;

                                        // Undo state?
                                        const isUpsold = originalFormatoId && selectedOptId !== originalFormatoId;

                                        const canUpgrade = currentIndex < sortedOptions.length - 1;
                                        const nextOpt = canUpgrade ? sortedOptions[currentIndex + 1] : null;
                                        const currentOpt = sortedOptions[currentIndex];
                                        const upgradePrice = nextOpt ? Number(nextOpt.priceAdjustment) - Number(currentOpt.priceAdjustment) : 0;

                                        // If they can't upgrade anymore AND they didn't upsell, show nothing.
                                        if (!canUpgrade && !isUpsold) return null;

                                        return (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <Plus size={14} className="text-orange-500" />
                                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">
                                                        {isUpsold ? '¿CAMBIASTE DE OPINIÓN?' : '¿MUCHA HAMBRE?'}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    {canUpgrade && !isUpsold && (
                                                        <button
                                                            onClick={() => toggleOption(formatoGroup.groupId, nextOpt!.id, 'SINGLE_SELECT', 1)}
                                                            className="w-full p-4 rounded-2xl border-2 border-orange-200 bg-orange-50/50 hover:bg-orange-100 hover:border-orange-300 flex items-center justify-between transition-all active:scale-[0.98] animate-in slide-in-from-bottom-2"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-orange-200 text-orange-600 flex items-center justify-center p-1 font-black">
                                                                    <ChevronRight size={16} />
                                                                </div>
                                                                <span className="font-black italic uppercase text-xs tracking-tighter text-orange-700 text-left leading-tight">
                                                                    AGRANDAR A <span className="text-sm">{nextOpt!.name}</span>
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-white text-orange-600 shadow-sm border border-orange-100">
                                                                +${upgradePrice.toLocaleString()}
                                                            </span>
                                                        </button>
                                                    )}
                                                    
                                                    {isUpsold && originalFormatoId && (
                                                        <button
                                                            onClick={() => toggleOption(formatoGroup.groupId, originalFormatoId, 'SINGLE_SELECT', 1)}
                                                            className="w-full p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 flex items-center justify-between transition-all active:scale-[0.98] animate-in slide-in-from-bottom-2"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center p-1 font-black">
                                                                    <Minus size={16} />
                                                                </div>
                                                                <span className="font-black italic uppercase text-xs tracking-tighter text-slate-600 text-left leading-tight">
                                                                    DESHACER AGRANDADO
                                                                </span>
                                                            </div>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Quick Toggles Section (optional single-option groups) */}
                                    {quickToggles.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Plus size={14} className="text-orange-500" />
                                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">
                                                    ¿Quieres agregar algo más?
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2">
                                                {quickToggles.map(group => {
                                                    const opt = group.options[0];
                                                    if (!opt) return null;
                                                    const isSelected = (selections[group.groupId] || []).includes(opt.id);
                                                    
                                                    return (
                                                        <button
                                                            key={group.groupId}
                                                            onClick={() => toggleOption(group.groupId, opt.id, 'SINGLE_SELECT', 1)}
                                                            className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all active:scale-[0.98] ${
                                                                isSelected 
                                                                    ? 'border-orange-400 bg-orange-50 shadow-md' 
                                                                    : 'border-slate-100 bg-white hover:border-slate-200'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                                                    isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-200'
                                                                }`}>
                                                                    {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                                                                </div>
                                                                <span className={`font-black italic uppercase text-xs tracking-tighter ${isSelected ? 'text-orange-600' : 'text-slate-500'}`}>
                                                                    {group.displayName}
                                                                </span>
                                                            </div>
                                                            {opt.priceAdjustment !== 0 && (
                                                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                                                                    isSelected ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'
                                                                }`}>
                                                                    +${Number(opt.priceAdjustment).toLocaleString()}
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Quantity Selector */}
                                    <div className="pt-4 mt-4 border-t-2 border-dashed border-slate-200">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="font-black italic uppercase text-sm text-slate-400 tracking-tighter">Cantidad</span>
                                                {product.maxQuantity != null && product.maxQuantity < 999 && (
                                                    <span className={`text-[9px] font-black uppercase tracking-wider mt-0.5 ${
                                                        product.maxQuantity <= 3 ? 'text-amber-500' : 'text-slate-300'
                                                    }`}>
                                                        Stock: {product.maxQuantity} disponible{product.maxQuantity !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                    className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center font-black text-lg transition-all active:scale-90 ${
                                                        quantity <= 1 ? 'border-slate-100 text-slate-200 cursor-not-allowed' : 'border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-500'
                                                    }`}
                                                    disabled={quantity <= 1}
                                                >
                                                    <Minus size={16} strokeWidth={3} />
                                                </button>
                                                <span className="w-8 text-center text-xl font-black italic text-slate-900 tabular-nums">{quantity}</span>
                                                <button
                                                    onClick={() => {
                                                        const max = product.maxQuantity ?? 999;
                                                        setQuantity(Math.min(quantity + 1, max));
                                                    }}
                                                    disabled={product.maxQuantity != null && quantity >= product.maxQuantity}
                                                    className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center font-black text-lg transition-all active:scale-90 ${
                                                        product.maxQuantity != null && quantity >= product.maxQuantity
                                                            ? 'border-red-100 text-red-300 cursor-not-allowed bg-red-50'
                                                            : 'border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-500'
                                                    }`}
                                                >
                                                    <Plus size={16} strokeWidth={3} />
                                                </button>
                                            </div>
                                        </div>
                                        {product.maxQuantity != null && quantity >= product.maxQuantity && product.maxQuantity < 999 && (
                                            <p className="text-[9px] font-black text-red-500 uppercase tracking-wider text-right mt-1 animate-in fade-in">
                                                Máximo disponible por inventario
                                            </p>
                                        )}
                                    </div>

                                    {/* Total */}
                                    <div className="flex justify-between items-center">
                                        <span className="font-black italic uppercase text-sm text-slate-400 tracking-tighter">Total Personalizado</span>
                                        <span className="text-2xl font-black italic text-slate-900 tracking-tighter">
                                            ${(finalPrice * quantity).toLocaleString()}
                                        </span>
                                    </div>
                                    
                                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-4">
                                        <ChefHat className="text-orange-500 shrink-0" size={24} />
                                        <p className="text-[10px] font-bold text-slate-600 leading-relaxed uppercase italic">
                                            Nuestros chefs prepararán tu pedido siguiendo exactamente las personalizaciones que has seleccionado. ¡Buen provecho!
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {!isSuccess && (
                    <footer className="absolute bottom-0 left-0 right-0 p-6 md:p-8 bg-white/80 backdrop-blur-xl border-t border-slate-50 flex items-center gap-4 z-20">
                        {step > 0 && (
                            <button 
                                onClick={handleBack}
                                className="w-16 h-16 rounded-[1.5rem] border-2 border-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all hover:border-slate-200"
                            >
                                <ChevronLeft size={24} />
                            </button>
                        )}
                        <button 
                            onClick={handleNext}
                            disabled={isAdding}
                            className={`flex-1 h-16 rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-orange-500/10 transition-all active:scale-95 flex items-center justify-center gap-3 italic
                                ${!isAdding ? 'bg-slate-900 text-white hover:bg-orange-600' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                        >
                            {isAdding ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    <span>
                                        {isLastStep ? 'Agregar al Pedido' : 'Continuar'}
                                    </span>
                                    {isLastStep ? <ShoppingBag size={20} /> : <ChevronRight size={20} />}
                                </>
                            )}
                        </button>
                    </footer>
                )}
            </div>
        </div>
    );
};
