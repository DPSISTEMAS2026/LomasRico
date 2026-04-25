'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Check, ChefHat, Minus, ShoppingBag, Plus, ChevronRight, ChevronLeft, Loader2, Info, Search } from 'lucide-react';
import { Product, ModifierGroup, ModifierOption } from '../../types';

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

    // Selections State (Map: groupId -> selected Option IDs)
    const [selections, setSelections] = useState<Record<string, string[]>>({});

    // Determine if we use dynamic modifiers or legacy builder
    const hasDynamicModifiers = product.modifiers && product.modifiers.length > 0;
    
    // Setup initial selections based on defaults
    useEffect(() => {
        if (isOpen) {
            setStep(0);
            setSearchQuery('');
            
            if (hasDynamicModifiers) {
                const initial: Record<string, string[]> = {};
                product.modifiers!.forEach(group => {
                    const defaults = group.options
                        .filter(opt => opt.isDefault)
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
    const currentModifier = hasDynamicModifiers && step < (product.modifiers?.length || 0)
        ? product.modifiers![step] 
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

    const modifierStepsCount = hasDynamicModifiers ? product.modifiers!.length : 0;
    const isLastStep = hasDynamicModifiers ? step === modifierStepsCount : true;

    // Price Calculation
    const basePrice = Number(product.price);
    
    const modifiersTotal = hasDynamicModifiers 
        ? Object.entries(selections).reduce((groupSum, [groupId, selectedIds]) => {
            const group = product.modifiers?.find(m => m.groupId === groupId);
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
            const group = product.modifiers![step];
            const currentCount = (selections[group.groupId] || []).length;
            if (currentCount < (group.minSelections || 0)) {
                alert(`Por favor selecciona al menos ${group.minSelections} opción(es) de ${group.displayName}`);
                return;
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

    const handleAddToCart = () => {
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
            quantity: 1,
            modifiers: {
                selectedProteins,
                selectedProteinNames,
                removedIngredients: [],
                dynamicSelections
            },
            totalModifierPrice: modifiersTotal,
            imageUrl: product.imageUrl
        };

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
                    <button onClick={onClose} className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all">
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
                                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.2em] italic">
                                            {currentModifier.type === 'SINGLE_SELECT' ? 'Elige 1 de la lista' : `Selecciona de ${currentModifier.minSelections} a ${currentModifier.maxSelections}`}
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
                                            return (
                                                <button
                                                    key={option.id}
                                                    onClick={() => toggleOption(
                                                        currentModifier.groupId, 
                                                        option.id, 
                                                        currentModifier.type,
                                                        currentModifier.maxSelections
                                                    )}
                                                    className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between group active:scale-[0.98] ${
                                                        isSelected 
                                                        ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                                                        : 'bg-white border-slate-50 text-slate-500 hover:border-orange-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                                            isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-200 group-hover:border-orange-300'
                                                        }`}>
                                                            {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                                                        </div>
                                                        <span className="font-bold uppercase text-xs tracking-tight">
                                                            {option.name}
                                                        </span>
                                                    </div>
                                                    {option.priceAdjustment !== 0 && (
                                                        <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${
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
                            <div className="space-y-6">
                                {/* Summary View */}
                                <div className="relative">
                                    <h3 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900">
                                        REVISA TU PEDIDO
                                    </h3>
                                    <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest mt-1">
                                        Todo listo para sumarlo al carrito
                                    </p>
                                </div>

                                <div className="bg-slate-50 rounded-2xl p-6 space-y-4 border border-slate-100">
                                    {Object.entries(selections).map(([groupId, selectedIds]) => {
                                        const group = product.modifiers?.find(m => m.groupId === groupId);
                                        if (!group || selectedIds.length === 0) return null;
                                        
                                        return (
                                            <div key={groupId} className="flex flex-col gap-1 border-b border-slate-200/50 pb-3 last:border-0 last:pb-0">
                                                <p className="text-[9px] font-black uppercase text-orange-500 tracking-widest italic">{group.displayName}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedIds.map(optId => {
                                                        const opt = group.options.find(o => o.id === optId);
                                                        return (
                                                            <span key={optId} className="bg-white px-3 py-1 rounded-full text-[10px] font-bold text-slate-700 shadow-sm border border-slate-100">
                                                                {opt?.name}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    
                                    <div className="pt-4 mt-4 border-t-2 border-dashed border-slate-200 flex justify-between items-center">
                                        <span className="font-black italic uppercase text-xs text-slate-400 tracking-tighter">Total Personalizado</span>
                                        <span className="text-xl font-black italic text-slate-900 tracking-tighter">
                                            ${finalPrice.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <footer className="p-6 md:p-8 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
                    {step > 0 && (
                        <button 
                            onClick={handleBack}
                            className="w-14 h-14 rounded-2xl border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"
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
