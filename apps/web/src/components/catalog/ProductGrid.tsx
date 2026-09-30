'use client';

import { useState, useEffect, useMemo } from 'react';
import { ProductCard } from './ProductCard';
import { CevicheBuilderModal } from '../modals/CevicheBuilderModal';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';
import { PROTEINS, VEGGIES, categoryRole, MENU_ROLE_LABEL, webMenuSectionId, groupProductsByWebSection, filterModifiersForChannel } from '@lomasrico/shared-types';
import { useTableSession } from '../../context/TableSessionContext';
import { API_URL } from '../../services/api';



import { ArrowLeft } from 'lucide-react';

function photosForIds(products: Product[], ids: Set<string>) {
    const urls: string[] = [];
    for (const product of products) {
        if (!ids.has(product.id)) continue;
        const url = product.imageUrl;
        if (url && url.length > 4 && !urls.includes(url)) urls.push(url);
        if (urls.length >= 8) break;
    }
    return urls;
}

function buildMenuSections(products: Product[]) {
    return groupProductsByWebSection(products).map((section) => {
        const ids = new Set(section.products.map((product) => product.id));
        return {
            id: section.id,
            name: section.name,
            count: section.products.length,
            photos: photosForIds(products, ids),
        };
    });
}

function CategoryMosaic({ photos }: { photos: string[] }) {
    const pics = photos.slice(0, 4);
    if (pics.length === 0) {
        return (
            <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                <img src="/assets/Logo Restaurante.png" alt="" className="h-16 w-16 object-contain opacity-30" />
            </div>
        );
    }

    const cell = (src: string, extra = '') => (
        <div key={src} className={`relative overflow-hidden bg-slate-100 ${extra}`}>
            <img
                src={src}
                alt=""
                className="absolute inset-0 h-full w-full object-cover scale-100 transition-transform duration-500 ease-out group-hover:scale-110"
                onError={(e) => {
                    const img = e.currentTarget;
                    const used = Number(img.dataset.backup || '0');
                    const next = photos[4 + used];
                    if (next) {
                        img.dataset.backup = String(used + 1);
                        img.src = next;
                    } else if (!img.src.includes('Logo')) {
                        img.src = '/assets/Logo Restaurante.png';
                    }
                }}
            />
        </div>
    );

    if (pics.length === 1) {
        return <div className="absolute inset-0">{cell(pics[0], 'h-full w-full')}</div>;
    }
    if (pics.length === 2) {
        return <div className="absolute inset-0 grid grid-cols-2 gap-0.5 bg-white">{pics.map((src) => cell(src))}</div>;
    }
    if (pics.length === 3) {
        return (
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5 bg-white">
                {cell(pics[0], 'row-span-2')}
                {cell(pics[1])}
                {cell(pics[2])}
            </div>
        );
    }
    return (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5 bg-white">
            {pics.map((src) => cell(src))}
        </div>
    );
}

function catalogHref(cat: string | null) {
    const url = new URL(window.location.href);
    if (cat) url.searchParams.set('cat', cat);
    else url.searchParams.delete('cat');
    return `${url.pathname}${url.search}${url.hash}`;
}

export const ProductGrid = () => {
    const { addToCart } = useCart();
    const { session: tableSession } = useTableSession();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [directAdded, setDirectAdded] = useState(false);
    const [availableProteins, setAvailableProteins] = useState<{ id: string; name: string }[]>([]);



    useEffect(() => {
        const fetchData = async () => {
            try {
                const prodResponse = await fetch(`${API_URL}/products/active`);
                if (prodResponse.ok) {
                    const data = await prodResponse.json();
                    const list = Array.isArray(data) ? data : [];
                    const names = list.slice(0, 8).map((p: any) => p.name);
                    const cats = [...new Set(list.map((p: any) => p.category))];
                    const hasLegacy = list.some((p: any) => /^PROMO [123]$/i.test(p.name || ''));
                    const leftover = groupProductsByWebSection(list).filter((s) => String(s.id).startsWith('other-')).map((s) => ({ id: s.id, names: s.products.map((p) => p.name) }));
                    const missing = list.filter((p: any) => !p.name || p.price == null || Number.isNaN(Number(p.price))).map((p: any) => p.name);
                    const emptyAfterFilter = (channel: 'web' | 'salon') => list.filter((p: any) => {
                        const raw = (p.modifiers || []).some((m: any) => m.options?.length);
                        const vis = filterModifiersForChannel(p.modifiers, channel).some((m: any) => m.options?.length);
                        return raw && !vis;
                    }).map((p: any) => p.name);
                    setProducts(list);
                } else {
                    setProducts([]);
                }

                setAvailableProteins(PROTEINS);
            } catch (error) {
                console.warn('API error', error);
                setProducts([]);
                setAvailableProteins(PROTEINS);
            } finally {
                setLoading(false);
            }
        };
        fetchData();

        // Polling cada 30 segundos para refrescar disponibilidad
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${API_URL}/products/active`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        setProducts(data);
                    }
                }
            } catch { /* silently ignore polling errors */ }
        }, 30_000);

        return () => clearInterval(interval);
    }, []);

    const categories = useMemo(() => {
        const next = buildMenuSections(products);
        return next;
    }, [products]);

    useEffect(() => {
        const fromUrl = new URLSearchParams(window.location.search).get('cat');
        if (fromUrl) setSelectedCategory(fromUrl);
        const onPop = () => {
            const cat = new URLSearchParams(window.location.search).get('cat');
            setSelectedCategory(cat);
        };
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    const openCategory = (categoryId: string) => {
        history.pushState({ catalog: categoryId }, '', catalogHref(categoryId));
        setSelectedCategory(categoryId);
    };

    const backToCategories = () => {
        history.pushState({ catalog: null }, '', catalogHref(null));
        setSelectedCategory(null);
    };

    const handleAddClick = (product: Product) => {
        // Guard: no permitir agregar productos agotados
        if (product.available === false) return;

        const channel = tableSession ? 'salon' : 'web';
        const visibleMods = filterModifiersForChannel(product.modifiers, channel);
        const hasRealModifiers = visibleMods.some(m => m.options && m.options.length > 0);

        if (hasRealModifiers) {
            setDirectAdded(false);
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
                imageUrl: product.imageUrl,
                maxQuantity: product.maxQuantity
            });
            setDirectAdded(true);
            setSelectedProduct(product);
            setIsModalOpen(true);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
        </div>
    );

    if (products.length === 0) return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <p className="text-sm font-black uppercase tracking-widest text-slate-900">El menú se está cargando desde el local</p>
            <p className="mt-2 text-xs text-slate-900">Si esto no cambia, la API no está disponible.</p>
        </div>
    );

    const currentCat = categories.find((c) => c.id === selectedCategory);
    const displayProducts = currentCat
        ? products.filter((p) => {
            const sectionId = webMenuSectionId(p.category, p.name);
            if (sectionId) return sectionId === currentCat.id;
            return currentCat.id === `other-${p.category || 'otros'}`;
        })
        : [];

    return (
        <div id="catalog-root" className="relative pb-20 min-w-0">
            <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 md:pt-10">
                {selectedCategory ? (
                    <div className="flex items-center gap-3 mb-6 min-h-[52px]">
                        <button
                            type="button"
                            onClick={backToCategories}
                            className="flex items-center justify-center h-11 w-11 rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-700"
                            aria-label="Volver a categorías"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#f2642e]">
                                Nuestro menú
                            </p>
                            <h2 className="text-2xl md:text-3xl font-[900] italic uppercase text-slate-900 truncate">
                                {currentCat?.name}
                            </h2>
                        </div>
                        {currentCat && (
                            <span className="ml-auto text-xs font-bold text-slate-900 uppercase tracking-widest bg-white border border-slate-100 px-3 py-1 rounded-full">
                                {displayProducts.length} opc.
                            </span>
                        )}
                        {tableSession && currentCat && (
                            <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest text-orange-400">
                                {MENU_ROLE_LABEL[categoryRole(currentCat.id)]}
                            </span>
                        )}
                    </div>
                ) : (
                    <div className="text-center mb-10 md:mb-12">
                        <p className="text-xs sm:text-sm font-black uppercase tracking-[0.38em] text-[#f2642e]">
                            Elige una categoría
                        </p>
                        <h2 className="mt-2 text-4xl sm:text-5xl md:text-6xl font-[900] italic uppercase text-slate-900">
                            Nuestro menú
                        </h2>
                    </div>
                )}

                <div className="relative min-h-[28rem]">
                    <div className={`catalog-stage ${selectedCategory ? 'catalog-stage-out-left absolute inset-x-0 top-0' : 'catalog-stage-in'}`}>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => openCategory(cat.id)}
                                    className="group relative aspect-square rounded-[1.6rem] overflow-hidden bg-white border border-slate-100 shadow-[0_8px_30px_rgba(15,23,42,0.04)] text-center hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(242,100,46,0.28)] hover:ring-2 hover:ring-[#f2642e]/50 active:scale-[0.98] transition-all duration-300"
                                >
                                    <CategoryMosaic photos={cat.photos} />
                                    <div className="absolute inset-0 bg-black/45 transition-colors duration-300 group-hover:bg-black/25" />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center px-3 transition-transform duration-300 group-hover:scale-105">
                                        <span className="w-full font-black uppercase text-[clamp(1.45rem,5.8vw,2.15rem)] tracking-wide text-white leading-[0.95] drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]">
                                            {cat.name}
                                        </span>
                                        <span className="mt-2 text-[11px] sm:text-sm font-bold uppercase tracking-[0.2em] text-white/85">
                                            {cat.count} opc.
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={`catalog-stage ${selectedCategory && currentCat ? 'catalog-stage-in' : 'catalog-stage-out-right absolute inset-x-0 top-0'}`}>
                        {currentCat && (
                            <div className={`grid ${displayProducts.length === 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'} lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10`}>
                                {displayProducts.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        onAdd={handleAddClick}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {selectedProduct && (
                <CevicheBuilderModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setDirectAdded(false);
                    }}
                    product={selectedProduct}
                    availableProteins={availableProteins}
                    availableVeggies={VEGGIES}
                    startInSuccess={directAdded}
                    onGoToCart={() => {
                        setIsModalOpen(false);
                        setDirectAdded(false);
                        window.dispatchEvent(new CustomEvent('open-checkout'));
                    }}
                />
            )}
        </div>
    );
};
