'use client';

import { useState, useEffect, useMemo } from 'react';
import { ProductCard } from './ProductCard';
import { CevicheBuilderModal } from '../modals/CevicheBuilderModal';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';
import { REAL_PRODUCT_CATALOG, PROTEINS, VEGGIES } from '@lomasrico/shared-types';
import { API_URL } from '../../services/api';



import { LayoutGrid, Gift, Fish, ChefHat, Wheat, Plus, CupSoda } from 'lucide-react';

const CATEGORIES = [
    { id: 'PROMOS', name: 'Promociones', icon: <Gift size={20} strokeWidth={2.5} /> },
    { id: 'CEVICHE LOMASRICO', name: 'Lo Más Rico', icon: <Fish size={20} strokeWidth={2.5} /> },
    { id: 'CEVICHE PERUANO', name: 'Peruanos', icon: <ChefHat size={20} strokeWidth={2.5} /> },
    { id: 'CEVICHE VEG', name: 'Vegano/Veg', icon: <Fish size={20} strokeWidth={2.5} className="text-green-500" /> },
    { id: 'CEVICHE TROPICAL', name: 'Tropicales', icon: <Fish size={20} strokeWidth={2.5} className="rotate-45" /> },
    { id: 'CEVICHE SIN VERDE', name: 'Sin Verduras', icon: <Fish size={20} strokeWidth={2.5} className="opacity-50" /> },
    { id: 'CRUDOS', name: 'Crudos', icon: <Fish size={20} strokeWidth={2.5} /> },
    { id: 'GOHAN', name: 'Gohan', icon: <ChefHat size={20} strokeWidth={2.5} /> },
    { id: 'BOWLS', name: 'Bowls', icon: <Fish size={20} strokeWidth={2.5} /> },
    { id: 'ROLLS PREMIUM', name: 'Rolls Premium', icon: <Fish size={20} strokeWidth={2.5} /> },
    { id: 'HAND ROLLS', name: 'Hand Rolls', icon: <Fish size={20} strokeWidth={2.5} /> },
    { id: 'EMPANADAS', name: 'Empanadas', icon: <Wheat size={20} strokeWidth={2.5} /> },
    { id: 'PAPAS / FRITOS', name: 'Papas & Fritos', icon: <Plus size={20} strokeWidth={3} /> },
    { id: 'PANCITOS', name: 'Pancitos horneados', icon: <ChefHat size={20} strokeWidth={2.5} /> },
    { id: 'EXTRAS', name: 'Agregados', icon: <Plus size={20} strokeWidth={3} /> },
    { id: 'BEBIDAS', name: 'Bebidas', icon: <CupSoda size={20} strokeWidth={2.5} /> },
];



export const ProductGrid = () => {
    const { addToCart } = useCart();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('todo');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [availableProteins, setAvailableProteins] = useState<{ id: string; name: string }[]>([]);



    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Products (Active Only)
                const prodResponse = await fetch(`${API_URL}/products/active`);
                if (prodResponse.ok) {
                    const data = await prodResponse.json();
                    if (Array.isArray(data) && data.length > 0) {
                        setProducts(data);
                    } else {
                        setProducts(REAL_PRODUCT_CATALOG.filter(p => p.isActive));
                    }
                } else {
                    setProducts(REAL_PRODUCT_CATALOG.filter(p => p.isActive));
                }

                // Las proteínas ahora vienen de la lista limpia (PROTEINS) importada arriba
                setAvailableProteins(PROTEINS);
            } catch (error) {
                console.warn('API error', error);
                setProducts(REAL_PRODUCT_CATALOG);
                setAvailableProteins(PROTEINS);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const scrollToCategory = (categoryId: string) => {
        const element = document.getElementById(categoryId);
        if (element) {
            const y = element.getBoundingClientRect().top + window.scrollY - (isMobile ? 180 : 150);
            window.scrollTo({ top: y, behavior: 'smooth' });
            setSelectedCategory(categoryId);
            setIsMenuOpen(false);
        }
    };

    const handleAddClick = (product: Product) => {
        // Only open builder modal if there are modifiers with actual options
        const hasRealModifiers = product.modifiers && 
            product.modifiers.some(m => m.options && m.options.length > 0);

        if (hasRealModifiers) {
            setSelectedProduct(product);
            setIsModalOpen(true);
        } else {
            addToCart({
                productId: product.id,
                variantId: 'default',
                name: product.name,
                price: Number(product.price),
                quantity: 1,
                modifiers: { selectedProteins: [], removedIngredients: [] },
                imageUrl: product.imageUrl
            });
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
        </div>
    );

    const activeMenuCategories = CATEGORIES.filter(cat => products.some(p => p.category === cat.id));
    const currentCat = activeMenuCategories.find(c => c.id === selectedCategory);


    return (
        <div className="space-y-0 pb-20">
            {/* CATEGORY NAV - ADAPTIVE */}
            <div className="sticky top-[80px] md:top-[90px] z-40 bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-lg shadow-black/[0.03]">
                <div className="max-w-7xl mx-auto px-4 py-3">

                    {/* PC VIEW: Horizontal Scroll */}
                    <div className="hidden lg:flex overflow-x-auto gap-3 scroll-smooth pb-2 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-orange-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
                        {activeMenuCategories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => scrollToCategory(cat.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap border-2
                                    ${selectedCategory === cat.id
                                        ? 'bg-[#f2642e] border-[#f2642e] text-white shadow-md'
                                        : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                    }`}
                            >
                                <span className={selectedCategory === cat.id ? 'text-white' : 'text-[#f2642e]'}>{cat.icon}</span>
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* MOBILE VIEW: Dropdown Selector */}
                    <div className="lg:hidden relative">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="w-full flex items-center justify-between px-6 py-4 bg-slate-900 text-white rounded-[1.2rem] font-black uppercase text-xs italic tracking-widest shadow-xl shadow-slate-200 active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-[#f2642e]">{currentCat?.icon || <LayoutGrid size={18} />}</span>
                                <span>{currentCat?.name || 'Explorar Menú'}</span>
                            </div>
                            <div className={`transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`}>
                                <Plus size={18} className={isMenuOpen ? 'rotate-45' : ''} />
                            </div>
                        </button>

                        {/* DESPLEGABLE */}
                        {isMenuOpen && (
                            <div className="absolute top-[calc(100%+10px)] left-0 right-0 bg-white rounded-[2rem] border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 z-50 p-2 max-h-[70vh] overflow-y-auto no-scrollbar">
                                <div className="grid grid-cols-1 gap-1">
                                    {activeMenuCategories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => scrollToCategory(cat.id)}
                                            className={`flex items-center gap-4 w-full p-4 rounded-2xl text-left transition-all
                                                ${selectedCategory === cat.id
                                                    ? 'bg-orange-50 text-[#f2642e] border-l-4 border-[#f2642e]'
                                                    : 'hover:bg-slate-50 text-slate-600'}`}
                                        >
                                            <span className={`${selectedCategory === cat.id ? 'text-[#f2642e]' : 'text-slate-400'}`}>{cat.icon}</span>
                                            <span className="font-black uppercase text-[11px] tracking-widest italic">{cat.name}</span>
                                            {selectedCategory === cat.id && <div className="ml-auto w-2 h-2 rounded-full bg-[#f2642e] animate-pulse" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>



            {/* CONTENT CONTAINER */}
            <div className="max-w-7xl mx-auto px-6 space-y-16">
                {CATEGORIES.map(category => {
                    const displayProducts = products.filter(p => p.category === category.id);
                    if (displayProducts.length === 0) return null;


                    return (
                        <div key={category.id} id={category.id} className="scroll-mt-40 relative">
                            {/* Section Header */}
                            <div className="flex items-end gap-6 mb-8 border-b-2 border-slate-100 pb-3">
                                <h3 className="text-3xl font-[900] italic uppercase text-slate-900 flex items-center gap-3">
                                    <span className="text-[#f2642e]">{category.icon}</span>
                                    {category.name}
                                </h3>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full mb-1">
                                    {displayProducts.length} opc.
                                </span>
                            </div>

                            {/* Responsive Grid — full-width card when only 1 product in category */}
                            <div className={`grid ${displayProducts.length === 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'} lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10`}>
                                {displayProducts.map(product => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        onAdd={handleAddClick}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedProduct && (
                <CevicheBuilderModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    product={selectedProduct}
                    availableProteins={availableProteins}
                    availableVeggies={VEGGIES}
                    onGoToCart={() => {
                        setIsModalOpen(false);
                        // Disparamos un evento global para que la página principal abra el checkout
                        window.dispatchEvent(new CustomEvent('open-checkout'));
                    }}
                />
            )}
        </div>
    );
};
