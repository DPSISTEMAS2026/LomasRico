'use client';

import { useState, useEffect, useMemo } from 'react';
import { ProductCard } from './ProductCard';
import { CevicheBuilderModal } from '../modals/CevicheBuilderModal';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';
import { REAL_PRODUCT_CATALOG } from '@lomasrico/shared-types';
import { API_URL } from '../../services/api';

import { LayoutGrid, Gift, Fish, ChefHat, Wheat, Plus, CupSoda } from 'lucide-react';

const CATEGORIES = [
    { id: 'PROMOS', name: 'Promociones', icon: <Gift size={20} strokeWidth={2.5} /> },
    { id: 'CEVICHE LOMASRICO', name: 'Lo Más Rico', icon: <Fish size={20} strokeWidth={2.5} /> },
    { id: 'CEVICHE PERUANO', name: 'Peruanos', icon: <ChefHat size={20} strokeWidth={2.5} /> },
    { id: 'EMPANADAS', name: 'Empanadas', icon: <Wheat size={20} strokeWidth={2.5} /> },
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
    const [availableProteins, setAvailableProteins] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Products
                const prodResponse = await fetch(`${API_URL}/products`);
                if (prodResponse.ok) {
                    const data = await prodResponse.json();
                    if (Array.isArray(data) && data.length > 0) {
                        setProducts(data);
                    } else {
                        setProducts(REAL_PRODUCT_CATALOG);
                    }
                } else {
                    setProducts(REAL_PRODUCT_CATALOG);
                }

                // Fetch Proteins for Modal
                const invResponse = await fetch(`${API_URL}/inventory`);
                if (invResponse.ok) {
                    const invData = await invResponse.json();
                    const proteins = invData.filter((i: any) => i.category === 'PROTEINAS' && i.isActive);
                    setAvailableProteins(proteins);
                }
            } catch (error) {
                console.warn('API error', error);
                setProducts(REAL_PRODUCT_CATALOG);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const scrollToCategory = (categoryId: string) => {
        const element = document.getElementById(categoryId);
        if (element) {
            // Offset for fixed header if needed, but smooth block start works well visually
            const y = element.getBoundingClientRect().top + window.scrollY - 100; // 100px offset
            window.scrollTo({ top: y, behavior: 'smooth' });
            setSelectedCategory(categoryId);
        }
    };

    const handleAddClick = (product: Product) => {
        const hasModifiers = product.allowsModifiers || 
                           product.isConfigurable || 
                           (product.modifiers && product.modifiers.length > 0);

        if (hasModifiers) {
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

    return (
        <div className="space-y-0 pb-20">
            {/* CATEGORY MENU - NOW AT TOP */}
            <div className="sticky top-[90px] z-40 bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex overflow-x-auto gap-2 no-scrollbar scroll-smooth">
                        {CATEGORIES.map(cat => (
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
                </div>
            </div>

            {/* HERO BANNER SECTION */}
            <div className="relative w-full h-[45vh] md:h-[50vh] bg-slate-900 overflow-hidden">
                {/* Banner Image */}
                <div className="absolute inset-0">
                    <img
                        src="/assets/BANNER VERANO.png"
                        alt="Banner Verano"
                        className="w-full h-full object-cover opacity-90"
                    />
                    {/* Gradient Overlay for better contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-black/30" />
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-4">
                    {/* Optional: Add a subtle animated element or logo if needed */}
                </div>
            </div>

            {/* Reduced spacer */}
            <div className="h-8" />

            {/* CONTENT CONTAINER */}
            <div className="max-w-7xl mx-auto px-6 space-y-16">
                {CATEGORIES.map(category => {
                    const categoryProducts = products.filter(p => p.category === category.id);
                    if (categoryProducts.length === 0) return null;

                    return (
                        <div key={category.id} id={category.id} className="scroll-mt-40 relative">
                            {/* Section Header */}
                            <div className="flex items-end gap-6 mb-8 border-b-2 border-slate-100 pb-3">
                                <h3 className="text-3xl font-[900] italic uppercase text-slate-900 flex items-center gap-3">
                                    <span className="text-[#f2642e]">{category.icon}</span>
                                    {category.name}
                                </h3>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full mb-1">
                                    {categoryProducts.length} opc.
                                </span>
                            </div>

                            {/* Responsive Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10">
                                {categoryProducts.map(product => (
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
                    availableProteins={availableProteins.length > 0 ? availableProteins : [
                        // Fallback if API fails
                        { id: '16', name: 'Salmón' },
                        { id: '19', name: 'Camarón' },
                        { id: '18', name: 'Atún' },
                        { id: '17', name: 'Reineta' },
                        { id: '20', name: 'Pulpo' },
                        { id: '21', name: 'Mix Mariscos' }
                    ]}
                    availableVeggies={[
                        { id: 'cebolla', name: 'Cebolla Morada' },
                        { id: 'choclo', name: 'Choclo Peruano' },
                    ]}
                />
            )}
        </div>
    );
};
