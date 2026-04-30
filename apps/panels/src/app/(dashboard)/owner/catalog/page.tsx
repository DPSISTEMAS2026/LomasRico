'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Camera,
    Save,
    Search,
    X,
    Image as ImageIcon,
    CheckCircle2,
    LayoutGrid,
    Gift,
    Fish,
    ChefHat,
    Wheat,
    Plus,
    Power,
    Settings,
    PlusCircle,
    ChevronRight,
    Loader2,
    Layers,
    ToggleLeft,
    ToggleRight,
    Pencil,
    ArrowUp,
    ArrowDown,
    GripVertical,
    Trash2,
    AlertTriangle
} from 'lucide-react';

import { API_URL } from '../../../../services/api';
import { authFetch } from '../../../../services/authFetch';
import { supabase } from '../../../../lib/supabase';

export default function CatalogManagementPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingProduct, setEditingProduct] = useState<any | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
    const [filterAsset, setFilterAsset] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [showAssetSelector, setShowAssetSelector] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [supabaseAssets, setSupabaseAssets] = useState<string[]>([]);
    const [loadingAssets, setLoadingAssets] = useState(false);
    const [allModifierGroups, setAllModifierGroups] = useState<any[]>([]);
    const [productModifierIds, setProductModifierIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [modifierSearchQuery, setModifierSearchQuery] = useState('');
    const [showSortModal, setShowSortModal] = useState(false);
    const [sortItems, setSortItems] = useState<any[]>([]);
    const [savingSort, setSavingSort] = useState(false);
    const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
    const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
    const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

    const CATEGORIES = useMemo(() => {
        const unique = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
        return [
            { id: 'ALL', name: 'Todos', icon: <LayoutGrid size={12} /> },
            ...unique.sort().map(cat => ({
                id: cat,
                name: cat,
                icon: <ChevronRight size={12} />
            }))
        ];
    }, [products]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setError(null);
            const prodRes = await authFetch(`${API_URL}/products`, { cache: 'no-store' });
            if (!prodRes.ok) throw new Error(`Error API Productos: ${prodRes.status}`);

            const productsData = await prodRes.json();
            setProducts(productsData);
        } catch (e: any) {
            console.error(e);
            setError(`Error de Conexión: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const loadModifierGroups = async () => {
        try {
            const res = await authFetch(`${API_URL}/modifiers/groups`);
            if (res.ok) setAllModifierGroups(await res.json());
        } catch (e) {
            console.error('Error loading modifier groups:', e);
        }
    };

    const loadProductModifiers = async (productId: string) => {
        try {
            const res = await authFetch(`${API_URL}/modifiers/product/${productId}`);
            if (res.ok) {
                const data = await res.json();
                setProductModifierIds(data.map((m: any) => m.groupId));
            }
        } catch (e) {
            console.error('Error loading product modifiers:', e);
        }
    };

    const toggleModifierForProduct = async (productId: string, groupId: string, isCurrentlyAssigned: boolean) => {
        try {
            if (isCurrentlyAssigned) {
                await authFetch(`${API_URL}/modifiers/product/${productId}/remove/${groupId}`, { method: 'DELETE' });
                setProductModifierIds(prev => prev.filter(id => id !== groupId));
            } else {
                await authFetch(`${API_URL}/modifiers/product/${productId}/assign`, {
                    method: 'POST',
                    body: JSON.stringify({ modifierGroupId: groupId, isRequired: false, sortOrder: productModifierIds.length }),
                });
                setProductModifierIds(prev => [...prev, groupId]);
            }
        } catch (e) {
            console.error('Error toggling modifier:', e);
        }
    };

    const loadSupabaseAssets = async () => {
        setLoadingAssets(true);
        try {
            const { data, error } = await supabase.storage
                .from('assets')
                .list('', {
                    limit: 1000,
                    sortBy: { column: 'name', order: 'asc' }
                });

            if (error) throw error;

            const imageFiles = data
                .filter(file => {
                    const ext = file.name.split('.').pop()?.toLowerCase();
                    return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '');
                })
                .map(file => file.name);

            setSupabaseAssets(imageFiles);
        } catch (error: any) {
            console.error('Error loading assets:', error.message);
        } finally {
            setLoadingAssets(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        setUploading(true);
        try {
            const { error: uploadError } = await supabase.storage
                .from('assets')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('assets')
                .getPublicUrl(filePath);

            if (editingProduct) {
                setEditingProduct({
                    ...editingProduct,
                    imageUrl: data.publicUrl,
                    imageKey: filePath
                });
            }
            await loadSupabaseAssets();
        } catch (error: any) {
            alert('Error al subir imagen: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        setUploading(true);
        try {
            const { error: uploadError } = await supabase.storage
                .from('assets')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('assets')
                .getPublicUrl(filePath);

            if (editingProduct) {
                setEditingProduct({
                    ...editingProduct,
                    hoverVideoUrl: data.publicUrl,
                    hoverVideoKey: filePath
                });
            }
        } catch (error: any) {
            alert('Error al subir video: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleAddNew = () => {
        setEditingProduct({
            id: 'NEW',
            name: '',
            description: '',
            price: 0,
            category: 'PROMOS',
            imageUrl: '',
            imageKey: '',
            hoverVideoUrl: '',
            hoverVideoKey: '',
            isActive: true,
            isConfigurable: false,
            maxProteins: 0,
            order: products.length + 1
        });
        setProductModifierIds([]);
        setModifierSearchQuery('');
        loadModifierGroups();
    };

    const handleSave = async () => {
        if (!editingProduct) return;
        setSaveStatus('saving');

        const isNew = editingProduct.id === 'NEW';
        const url = isNew ? `${API_URL}/products` : `${API_URL}/products/${editingProduct.id}`;
        const method = isNew ? 'POST' : 'PATCH';

        const payload = {
            name: editingProduct.name,
            description: editingProduct.description,
            price: editingProduct.price,
            category: editingProduct.category,
            imageUrl: editingProduct.imageUrl,
            imageKey: editingProduct.imageKey,
            hoverVideoUrl: editingProduct.hoverVideoUrl || undefined,
            hoverVideoKey: editingProduct.hoverVideoKey || undefined,
            isActive: editingProduct.isActive,
            isConfigurable: editingProduct.isConfigurable,
            maxProteins: editingProduct.maxProteins || 0
        };

        try {
            const res = await authFetch(url, {
                method: method,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setSaveStatus('success');
                loadData();
                setTimeout(() => {
                    setEditingProduct(null);
                    setModifierSearchQuery('');
                    setSaveStatus('idle');
                }, 1000);
            } else {
                setSaveStatus('idle');
                alert('Error al guardar.');
            }
        } catch (error) {
            setSaveStatus('idle');
            alert('Error de conexión.');
        }
    };

    const toggleProductStatus = async (id: string, currentStatus: boolean, field: 'isActive' | 'isConfigurable') => {
        setProducts(prev => prev.map(p =>
            p.id === id ? { ...p, [field]: !currentStatus } : p
        ));

        try {
            await authFetch(`${API_URL}/products/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ [field]: !currentStatus })
            });
        } catch (e) {
            setProducts(prev => prev.map(p =>
                p.id === id ? { ...p, [field]: currentStatus } : p
            ));
        }
    };

    const handleDeleteProduct = async (id: string, name: string) => {
        const confirmed = window.confirm(
            `⚠️ ELIMINAR PERMANENTEMENTE "${name}"?\n\nEsto borrará el producto, sus variantes, recetas, modificadores asignados y su historial de ventas asociado.\n\nEsta acción NO se puede deshacer.`
        );
        if (!confirmed) return;

        setDeletingProductId(id);
        try {
            const res = await authFetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setProducts(prev => prev.filter(p => p.id !== id));
            } else {
                const data = await res.json().catch(() => ({}));
                alert(`Error al eliminar: ${data.message || res.statusText}`);
            }
        } catch (e: any) {
            alert('Error de conexión al eliminar.');
        } finally {
            setDeletingProductId(null);
        }
    };

    const handleDeleteCategory = async (category: string) => {
        const productCount = products.filter(p => p.category === category).length;
        const confirmed = window.confirm(
            `⚠️ ELIMINAR CATEGORÍA "${category}"?\n\nEsto eliminará PERMANENTEMENTE los ${productCount} productos de esta categoría, incluyendo sus recetas, variantes e historial.\n\nEsta acción NO se puede deshacer.`
        );
        if (!confirmed) return;

        const doubleConfirm = window.confirm(
            `🔴 ÚLTIMA CONFIRMACIÓN\n\nVas a eliminar ${productCount} productos de "${category}".\n\n¿Estás ABSOLUTAMENTE seguro?`
        );
        if (!doubleConfirm) return;

        setDeletingCategory(category);
        try {
            const res = await authFetch(`${API_URL}/products/category/${encodeURIComponent(category)}`, { method: 'DELETE' });
            if (res.ok) {
                setProducts(prev => prev.filter(p => p.category !== category));
                if (selectedCategory === category) setSelectedCategory('ALL');
            } else {
                alert('Error al eliminar la categoría.');
            }
        } catch (e) {
            alert('Error de conexión.');
        } finally {
            setDeletingCategory(null);
        }
    };

    const selectAsset = (asset: string) => {
        if (!editingProduct) return;
        const { data } = supabase.storage.from('assets').getPublicUrl(asset);
        setEditingProduct({
            ...editingProduct,
            imageUrl: data.publicUrl,
            imageKey: asset
        });
        setShowAssetSelector(false);
    };

    const displayedProducts = useMemo(() => {
        let filtered = products;

        // Search Filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(query) || 
                (p.description && p.description.toLowerCase().includes(query))
            );
        }

        // Category Filter
        if (selectedCategory !== 'ALL') {
            filtered = filtered.filter(p => p.category === selectedCategory);
        }

        // Sort: Active first, then by name
        return [...filtered].sort((a, b) => {
            if (a.isActive === b.isActive) return a.name.localeCompare(b.name);
            return a.isActive ? -1 : 1;
        });
    }, [products, selectedCategory, searchQuery]);

    if (loading) return (
        <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-orange-500 mb-4" size={48} />
            <p className="font-black uppercase text-xs tracking-widest text-slate-400 italic">Sincronizando Menú...</p>
        </div>
    );

    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <header className="flex flex-col gap-6 md:gap-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                            GESTIÓN DE <span className="text-orange-500">CATÁLOGO</span>
                        </h1>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="w-8 h-[2px] bg-orange-500"></span>
                            <p className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest px-1">
                                Control Total de Productos y Lógica de Venta
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                const sorted = products.filter(p => p.isActive).sort((a: any, b: any) => {
                                    if (a.sortOrder > 0 && b.sortOrder > 0) return a.sortOrder - b.sortOrder;
                                    if (a.sortOrder > 0) return -1;
                                    if (b.sortOrder > 0) return 1;
                                    return a.name.localeCompare(b.name);
                                });
                                setSortItems(sorted);
                                // Derive category order from the sorted products
                                const cats: string[] = [];
                                sorted.forEach(p => { if (p.category && !cats.includes(p.category)) cats.push(p.category); });
                                setCategoryOrder(cats);
                                setShowSortModal(true);
                            }}
                            className="bg-white text-slate-600 border border-slate-200 px-5 py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-wider hover:border-orange-400 hover:text-orange-600 transition-all flex items-center gap-2 whitespace-nowrap"
                        >
                            <GripVertical size={16} />
                            Organizar
                        </button>
                        <button
                            onClick={handleAddNew}
                            className="bg-slate-900 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-[2rem] font-black uppercase text-[10px] md:text-xs tracking-[0.2em] shadow-2xl shadow-orange-500/10 hover:bg-orange-600 hover:scale-105 transition-all flex items-center justify-center gap-3 active:scale-95 italic whitespace-nowrap"
                        >
                            <PlusCircle size={18} />
                            Nuevo Producto
                        </button>
                    </div>
                </div>

                {/* Barra de Búsqueda y Filtros Compacta */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm font-bold text-slate-600 outline-none focus:border-orange-500 transition-all text-sm"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                            className={`flex items-center gap-3 px-6 py-4 bg-white rounded-2xl border shadow-sm font-black uppercase text-[11px] tracking-wider transition-all whitespace-nowrap
                                ${selectedCategory !== 'ALL' ? 'border-orange-500 text-orange-600' : 'border-slate-100 text-slate-600'}`}
                        >
                            <LayoutGrid size={16} />
                            {selectedCategory === 'ALL' ? 'Todas las Categorías' : selectedCategory}
                            <ChevronRight size={14} className={`transition-transform duration-300 ${showCategoryDropdown ? 'rotate-90' : ''}`} />
                        </button>

                        {showCategoryDropdown && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 py-2 animate-in fade-in slide-in-from-top-2">
                                {CATEGORIES.map(cat => (
                                    <div key={cat.id} className="flex items-center group">
                                        <button
                                            onClick={() => {
                                                setSelectedCategory(cat.id);
                                                setShowCategoryDropdown(false);
                                            }}
                                            className={`flex-1 text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-between transition-colors
                                                ${selectedCategory === cat.id ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            {cat.name}
                                            {selectedCategory === cat.id && <CheckCircle2 size={14} />}
                                        </button>
                                        {cat.id !== 'ALL' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowCategoryDropdown(false);
                                                    handleDeleteCategory(cat.id);
                                                }}
                                                disabled={deletingCategory === cat.id}
                                                className="px-2 py-3 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                title={`Eliminar categoría ${cat.name}`}
                                            >
                                                {deletingCategory === cat.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Product Table */}
            <div className="bg-white rounded-2xl md:rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden border-b-8 border-b-slate-900">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px] xl:min-w-0">
                                <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                                <th className="px-6 md:px-10 py-5 md:py-8">Vista Previa</th>
                                <th className="px-4 md:px-6 py-5 md:py-8">Producto / Descripción</th>
                                <th className="px-4 md:px-6 py-5 md:py-8">Categoría</th>
                                <th className="px-4 md:px-6 py-5 md:py-8 text-center text-slate-900">Publicado</th>
                                <th className="px-6 md:px-10 py-5 md:py-8 text-right">Editor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {displayedProducts.map((p) => (
                                <tr key={p.id} className={`group hover:bg-orange-50/10 transition-colors ${!p.isActive ? 'opacity-60 grayscale' : ''}`}>
                                    <td className="px-6 md:px-10 py-4 md:py-5">
                                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-slate-100 overflow-hidden border-2 md:border-4 border-white shadow-sm relative group-hover:scale-110 transition-transform duration-500">
                                            {p.imageUrl ? (
                                                <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon className="m-auto text-slate-300 w-5 h-5 md:w-6 md:h-6" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 md:px-6 py-4 md:py-5">
                                        <div className="font-black uppercase text-sm md:text-base text-slate-900 italic tracking-tighter mb-1">{p.name}</div>
                                        <div className="text-[9px] md:text-[10px] text-slate-400 font-bold line-clamp-1 max-w-[150px] md:max-w-sm uppercase">{p.description}</div>
                                        <div className="text-orange-500 font-black text-xs md:text-sm mt-1 italic">${p.price.toLocaleString()}</div>
                                    </td>
                                    <td className="px-4 md:px-6 py-4 md:py-5 text-center sm:text-left">
                                        <span className="text-[8px] md:text-[9px] font-black uppercase bg-slate-900 text-white px-2 md:px-3 py-0.5 md:py-1 rounded-full italic tracking-widest whitespace-nowrap">
                                            {p.category}
                                        </span>
                                    </td>
                                    <td className="px-4 md:px-6 py-4 md:py-5">
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => toggleProductStatus(p.id, p.isActive, 'isActive')}
                                                className={`w-10 h-5 md:w-12 md:h-6 rounded-full p-1 transition-all relative ${p.isActive ? 'bg-orange-500 shadow-md shadow-orange-500/20' : 'bg-slate-200'}`}
                                            >
                                                <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full bg-white shadow-sm transition-transform ${p.isActive ? 'translate-x-5 md:translate-x-6' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 md:px-10 py-4 md:py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                                disabled={deletingProductId === p.id}
                                                className="bg-white text-slate-300 w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center border-2 border-slate-100 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all active:scale-90"
                                                title="Eliminar permanentemente"
                                            >
                                                {deletingProductId === p.id ? <Loader2 className="w-[18px] h-[18px] md:w-5 md:h-5 animate-spin" /> : <Trash2 className="w-[18px] h-[18px] md:w-5 md:h-5" />}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingProduct(p);
                                                    loadModifierGroups();
                                                    if (p.id !== 'NEW') loadProductModifiers(p.id);
                                                }}
                                                className="bg-white text-slate-900 w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center border-2 border-slate-100 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all active:scale-90 group-hover:shadow-lg"
                                            >
                                                <Pencil className="w-[18px] h-[18px] md:w-5 md:h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Editor Modal */}
            {editingProduct && (
                <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-2 md:p-4 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl md:rounded-[3rem] w-full max-w-4xl h-[95vh] md:h-auto md:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
                        {/* Modal Header */}
                        <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
                            <div>
                                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-orange-500 mb-1 md:mb-2 italic">Product Control Center</p>
                                <h3 className="font-black uppercase text-xl md:text-3xl italic tracking-tighter text-slate-900 leading-tight">
                                    {editingProduct.id === 'NEW' ? 'Nuevo Ítem' : editingProduct.name}
                                </h3>
                            </div>
                            <button onClick={() => {
                                setEditingProduct(null);
                                setModifierSearchQuery('');
                            }} className="p-3 md:p-4 bg-slate-50 hover:bg-red-50 hover:text-red-500 rounded-full transition-all">
                                <X className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 md:space-y-12 no-scrollbar">
                            {/* General Section */}
                            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                <div className="space-y-4 md:space-y-6">
                                    <label className="block">
                                        <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1 mb-1 md:mb-2 block italic">Nombre Comercial</span>
                                        <input
                                            value={editingProduct.name || ''}
                                            onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                            className="w-full p-3 md:p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-xl md:rounded-[1.5rem] font-black text-slate-900 outline-none transition-all placeholder:text-slate-300 uppercase italic tracking-tighter text-sm md:text-base"
                                            placeholder="Nombre del Plato..."
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1 mb-1 md:mb-2 block italic">Categoría</span>
                                        <input
                                            list="categories_list"
                                            value={editingProduct.category}
                                            onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value.toUpperCase() })}
                                            className="w-full p-3 md:p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-xl md:rounded-[1.5rem] font-black text-slate-900 outline-none transition-all uppercase italic text-sm md:text-base placeholder:text-slate-300"
                                            placeholder="ESCRIBE O SELECCIONA..."
                                        />
                                        <datalist id="categories_list">
                                            {CATEGORIES.filter(c => c.id !== 'ALL').map(c => (
                                                <option key={c.id} value={c.id} />
                                            ))}
                                        </datalist>
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="block">
                                            <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1 mb-1 md:mb-2 block italic">Precio ($)</span>
                                            <input
                                                type="number"
                                                value={editingProduct.price}
                                                onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                                                className="w-full p-3 md:p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-xl md:rounded-[1.5rem] font-black text-slate-900 outline-none transition-all text-sm md:text-base"
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-4 md:space-y-6">
                                    <label className="block">
                                        <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1 mb-1 md:mb-2 block italic">Descripción del Plato</span>
                                        <textarea
                                            value={editingProduct.description || ''}
                                            onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                                            className="w-full p-3 md:p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-xl md:rounded-[1.5rem] font-bold text-slate-600 outline-none transition-all h-[150px] md:h-[210px] resize-none text-[13px] md:text-sm leading-relaxed"
                                            placeholder="Detalla los ingredientes y frescura del plato..."
                                        />
                                    </label>
                                </div>
                            </section>

                            {/* Multimedia Section */}
                            <section className="bg-slate-50 rounded-2xl md:rounded-[2.5rem] p-6 md:p-8 border border-slate-100">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 px-1 md:px-2 gap-2">
                                    <h4 className="font-black italic uppercase tracking-tighter text-lg md:text-xl flex items-center gap-3">
                                        <ImageIcon className="text-orange-500" size={20} /> Multimedia
                                    </h4>
                                    <button
                                        onClick={() => {
                                            loadSupabaseAssets();
                                            setShowAssetSelector(true);
                                        }}
                                        className="text-[9px] md:text-[10px] font-black uppercase text-orange-500 hover:underline tracking-widest"
                                    >
                                        Abrir Galería
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                                    {/* Imagen Estática */}
                                    <div className="flex flex-col items-center">
                                        <div className="aspect-square w-full max-w-[200px] bg-white rounded-xl md:rounded-[2rem] shadow-inner overflow-hidden border-4 border-white flex items-center justify-center mx-auto mb-4">
                                            {editingProduct.imageUrl ? (
                                                <img src={editingProduct.imageUrl} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <div className="text-slate-200 flex flex-col items-center gap-2">
                                                    <ImageIcon size={40} className="md:w-12 md:h-12" />
                                                    <span className="text-[8px] md:text-[9px] font-black uppercase">Sin Imagen</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="w-full max-w-[200px]">
                                            <input type="file" id="img-upload" className="hidden" onChange={handleFileUpload} disabled={uploading}/>
                                            <label htmlFor="img-upload" className={`w-full block py-3 rounded-xl font-black uppercase text-[9px] tracking-widest text-center cursor-pointer transition-all flex items-center justify-center gap-2 ${uploading ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-200'}`}>
                                                {uploading ? <Loader2 className="animate-spin" size={14} /> : <Camera size={14} />} SUBIR IMAGEN
                                            </label>
                                        </div>
                                    </div>

                                    {/* Video en Movimiento */}
                                    <div className="flex flex-col items-center">
                                        <div className="aspect-square w-full max-w-[200px] bg-white rounded-xl md:rounded-[2rem] shadow-inner overflow-hidden border-4 border-white flex items-center justify-center mx-auto mb-4">
                                            {editingProduct.hoverVideoUrl ? (
                                                <video src={editingProduct.hoverVideoUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                                            ) : (
                                                <div className="text-slate-200 flex flex-col items-center gap-2">
                                                    <ImageIcon size={40} className="md:w-12 md:h-12 opacity-50" />
                                                    <span className="text-[8px] md:text-[9px] font-black uppercase text-center px-4">Sin Video<br/>(.MP4)</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="w-full max-w-[200px]">
                                            <input type="file" id="vid-upload" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleVideoUpload} disabled={uploading}/>
                                            <label htmlFor="vid-upload" className={`w-full block py-3 rounded-xl font-black uppercase text-[9px] tracking-widest text-center cursor-pointer transition-all flex items-center justify-center gap-2 ${uploading ? 'bg-slate-200 text-slate-400' : 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-200'}`}>
                                                {uploading ? <Loader2 className="animate-spin" size={14} /> : <Camera size={14} />} SUBIR VIDEO
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-center gap-3">
                                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase leading-relaxed text-center md:text-left">
                                            1. El video (.mp4) será el elemento magnético que se reproducirá de forma automática cuando el usuario pase el cursor sobre el producto.<br/><br/>
                                            2. La imagen será la portada estática clásica.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Logic Section */}
                            <section className="grid grid-cols-1 gap-4 md:gap-6 pb-4 md:pb-10">
                                <div
                                    className={`p-4 md:p-6 rounded-2xl md:rounded-[2rem] border-2 transition-all cursor-pointer flex justify-between items-center
                                    ${editingProduct.isActive ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100'}`}
                                    onClick={() => setEditingProduct({ ...editingProduct, isActive: !editingProduct.isActive })}
                                >
                                    <div className="flex gap-3 md:gap-4 items-center">
                                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center ${editingProduct.isActive ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            <Power size={18} className="md:w-5 md:h-5" />
                                        </div>
                                        <div>
                                            <p className="font-black italic uppercase text-slate-900 tracking-tighter text-sm md:text-base">Publicado</p>
                                            <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Visible en canales</p>
                                        </div>
                                    </div>
                                    <div className={`w-12 h-7 md:w-14 md:h-8 rounded-full p-1 transition-all ${editingProduct.isActive ? 'bg-orange-500' : 'bg-slate-200'} shrink-0`}>
                                        <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full bg-white transition-transform ${editingProduct.isActive ? 'translate-x-5 md:translate-x-6' : 'translate-x-0'}`} />
                                    </div>
                                </div>
                            </section>

                            {/* Modifiers Section */}
                            {editingProduct.id !== 'NEW' && allModifierGroups.length > 0 && (
                                <section className="bg-slate-50 rounded-2xl md:rounded-[2.5rem] p-6 md:p-8 border border-slate-100">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 px-1">
                                        <div className="flex items-center gap-3">
                                            <Layers className="text-orange-500" size={20} />
                                            <h4 className="font-black italic uppercase tracking-tighter text-lg md:text-xl">
                                                Modificadores Activos
                                            </h4>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-white px-2 py-1 rounded-full">
                                                {productModifierIds.length} asignados
                                            </span>
                                        </div>

                                        <div className="relative w-full sm:w-64">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                            <input 
                                                type="text"
                                                placeholder="Buscar modificador..."
                                                value={modifierSearchQuery}
                                                onChange={(e) => setModifierSearchQuery(e.target.value)}
                                                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-100 rounded-xl text-[10px] font-bold uppercase tracking-widest outline-none focus:border-orange-500 transition-all placeholder:text-slate-200"
                                            />
                                            {modifierSearchQuery && (
                                                <button 
                                                    onClick={() => setModifierSearchQuery('')}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                                                >
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {allModifierGroups
                                            .filter(g => 
                                                !modifierSearchQuery || 
                                                g.displayName.toLowerCase().includes(modifierSearchQuery.toLowerCase()) ||
                                                g.name.toLowerCase().includes(modifierSearchQuery.toLowerCase())
                                            )
                                            .sort((a, b) => {
                                                const isAssignedA = productModifierIds.includes(a.id);
                                                const isAssignedB = productModifierIds.includes(b.id);
                                                if (isAssignedA && !isAssignedB) return -1;
                                                if (!isAssignedA && isAssignedB) return 1;
                                                return a.displayName.localeCompare(b.displayName);
                                            })
                                            .map((group: any) => {
                                                const isAssigned = productModifierIds.includes(group.id);
                                                return (
                                                    <div
                                                        key={group.id}
                                                        onClick={() => toggleModifierForProduct(editingProduct.id, group.id, isAssigned)}
                                                        className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                                                            isAssigned
                                                                ? 'bg-orange-50 border-orange-200 hover:border-orange-400'
                                                                : 'bg-white border-slate-100 hover:border-slate-200'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                                                isAssigned ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'
                                                            }`}>
                                                                <Layers size={16} />
                                                            </div>
                                                            <div>
                                                                <p className="font-black italic uppercase tracking-tighter text-sm">
                                                                    {group.displayName}
                                                                </p>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                                    {group.type === 'SINGLE_SELECT' ? 'Única' : 'Multi'} · {group.options?.length || 0} opciones
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {isAssigned ? (
                                                            <ToggleRight size={24} className="text-orange-500" />
                                                        ) : (
                                                            <ToggleLeft size={24} className="text-slate-300" />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        {allModifierGroups.length > 0 && 
                                         allModifierGroups.filter(g => 
                                            !modifierSearchQuery || 
                                            g.displayName.toLowerCase().includes(modifierSearchQuery.toLowerCase())
                                         ).length === 0 && (
                                            <p className="text-center text-slate-400 font-bold text-[10px] uppercase italic py-8 bg-white rounded-2xl border-2 border-dashed border-slate-100">
                                                No hay resultados para "{modifierSearchQuery}"
                                            </p>
                                        )}
                                    </div>
                                    {allModifierGroups.length === 0 && (
                                        <p className="text-center text-slate-400 font-bold text-xs uppercase italic py-4">
                                            No hay grupos de modificadores creados. Créalos desde el menú "Modificadores".
                                        </p>
                                    )}
                                </section>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3 md:gap-4 px-6 md:px-10 shrink-0">
                            <button onClick={() => {
                                setEditingProduct(null);
                                setModifierSearchQuery('');
                            }} className="flex-1 sm:flex-none px-6 md:px-8 py-3 md:py-4 font-black uppercase text-[9px] md:text-[10px] tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors order-2 sm:order-1">
                                Descartar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saveStatus !== 'idle'}
                                className={`flex-1 sm:flex-none px-8 md:px-12 py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase text-[9px] md:text-[10px] tracking-[0.2em] shadow-xl italic transition-all active:scale-95 flex items-center justify-center gap-2 md:gap-3 order-1 sm:order-2
                                    ${saveStatus === 'success' ? 'bg-green-500 text-white' : 'bg-slate-900 text-white hover:bg-orange-600'}`}
                            >
                                {saveStatus === 'saving' ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                                {saveStatus === 'success' ? '¡Actualizado!' : saveStatus === 'saving' ? 'Guardando...' : 'Aplicar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Asset Selector Overlay */}
            {showAssetSelector && (
                <div className="fixed inset-0 bg-white z-[60] flex flex-col animate-in slide-in-from-bottom duration-500 p-4 md:p-8 lg:p-16">
                    <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
                        <div className="flex justify-between items-start mb-6 md:mb-12">
                            <div>
                                <h2 className="text-3xl md:text-5xl lg:text-6xl font-black uppercase italic tracking-tighter leading-none shrink-0">BIBLIOTECA <span className="text-orange-500">ASSETS</span></h2>
                                <p className="text-slate-400 font-bold text-[8px] md:text-[10px] lg:text-xs uppercase tracking-[0.3em] mt-2 md:mt-3">Supabase Cloud Storage</p>
                            </div>
                            <button onClick={() => setShowAssetSelector(false)} className="bg-slate-100 p-3 md:p-4 lg:p-6 rounded-full hover:bg-orange-500 hover:text-white transition-all shrink-0">
                                <X size={20} className="md:w-6 md:h-6 lg:w-8 lg:h-8" />
                            </button>
                        </div>

                        <div className="relative mb-6 md:mb-10 group">
                            <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors md:w-6 md:h-6" size={20} />
                            <input
                                placeholder="Filtrar por nombre..."
                                className="w-full bg-slate-50 pl-12 md:pl-16 pr-6 md:pr-8 py-4 md:py-6 lg:py-8 rounded-xl md:rounded-[2rem] font-black text-sm md:text-lg lg:text-xl italic uppercase tracking-tighter outline-none border-2 md:border-4 border-transparent focus:border-slate-900 transition-all shadow-inner"
                                value={filterAsset}
                                onChange={e => setFilterAsset(e.target.value)}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 md:pr-4 no-scrollbar pb-10">
                            {loadingAssets ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4">
                                    <Loader2 className="animate-spin text-slate-200 w-12 h-12 md:w-16 md:h-16" size={48} />
                                    <p className="font-black uppercase text-[10px] md:text-xs tracking-widest text-slate-200 italic">Cargando...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
                                    {supabaseAssets
                                        .filter(a => a.toLowerCase().includes(filterAsset.toLowerCase()))
                                        .map((asset) => {
                                            const { data } = supabase.storage.from('assets').getPublicUrl(asset);
                                            return (
                                                <button
                                                    key={asset}
                                                    onClick={() => selectAsset(asset)}
                                                    className="group relative aspect-square rounded-xl md:rounded-[2rem] overflow-hidden border-2 md:border-4 border-white shadow-sm hover:border-orange-500 transition-all bg-slate-50"
                                                >
                                                    <img src={data.publicUrl} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" alt="" />
                                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 md:p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <p className="text-white text-[7px] md:text-[9px] font-black uppercase tracking-tight truncate italic">{asset}</p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════ SORT / ORGANIZE MODAL ════════════ */}
            {showSortModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowSortModal(false)} />
                    <div className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-300">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div>
                                <h2 className="text-xl font-black italic tracking-tighter uppercase text-slate-900">
                                    ORGANIZAR <span className="text-orange-500">CATÁLOGO</span>
                                </h2>
                                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mt-1">
                                    Reordena categorías y productos con flechas o arrastrando
                                </p>
                            </div>
                            <button onClick={() => setShowSortModal(false)} className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {categoryOrder.map((cat, catOrderIdx) => {
                                const catItems = sortItems.filter(p => p.category === cat);
                                if (catItems.length === 0) return null;
                                return (
                                    <div
                                        key={cat}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('dragType', 'category');
                                            e.dataTransfer.setData('dragCat', cat);
                                            e.dataTransfer.effectAllowed = 'move';
                                            (e.currentTarget as HTMLElement).style.opacity = '0.5';
                                        }}
                                        onDragEnd={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                                        onDragOver={(e) => {
                                            if (!e.dataTransfer.types.includes('dragtype')) return;
                                            e.preventDefault();
                                            e.dataTransfer.dropEffect = 'move';
                                            (e.currentTarget as HTMLElement).style.outline = '2px solid #f97316';
                                            (e.currentTarget as HTMLElement).style.outlineOffset = '2px';
                                        }}
                                        onDragLeave={(e) => { (e.currentTarget as HTMLElement).style.outline = ''; (e.currentTarget as HTMLElement).style.outlineOffset = ''; }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            (e.currentTarget as HTMLElement).style.outline = '';
                                            (e.currentTarget as HTMLElement).style.outlineOffset = '';
                                            const dragType = e.dataTransfer.getData('dragType');
                                            if (dragType === 'category') {
                                                const fromCat = e.dataTransfer.getData('dragCat');
                                                if (fromCat === cat) return;
                                                const newOrder = [...categoryOrder];
                                                const fromIdx = newOrder.indexOf(fromCat);
                                                const toIdx = newOrder.indexOf(cat);
                                                if (fromIdx === -1) return;
                                                newOrder.splice(fromIdx, 1);
                                                newOrder.splice(toIdx, 0, fromCat);
                                                setCategoryOrder(newOrder);
                                            }
                                        }}
                                        className="bg-white border border-slate-100 rounded-2xl overflow-hidden"
                                    >
                                        {/* Category Header — draggable + arrows */}
                                        <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 cursor-grab active:cursor-grabbing select-none">
                                            <GripVertical size={16} className="text-slate-500 hover:text-orange-400 transition-colors shrink-0" />
                                            <div className="w-6 h-[2px] bg-orange-500 shrink-0" />
                                            <p className="text-[11px] font-black uppercase text-white tracking-widest italic flex-1">{cat}</p>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase">{catItems.length}</span>
                                            <div className="flex gap-1">
                                                <button
                                                    disabled={catOrderIdx === 0}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const newOrder = [...categoryOrder];
                                                        [newOrder[catOrderIdx - 1], newOrder[catOrderIdx]] = [newOrder[catOrderIdx], newOrder[catOrderIdx - 1]];
                                                        setCategoryOrder(newOrder);
                                                    }}
                                                    className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-orange-400 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                                >
                                                    <ArrowUp size={12} />
                                                </button>
                                                <button
                                                    disabled={catOrderIdx === categoryOrder.length - 1}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const newOrder = [...categoryOrder];
                                                        [newOrder[catOrderIdx], newOrder[catOrderIdx + 1]] = [newOrder[catOrderIdx + 1], newOrder[catOrderIdx]];
                                                        setCategoryOrder(newOrder);
                                                    }}
                                                    className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-orange-400 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                                >
                                                    <ArrowDown size={12} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Products within category */}
                                        <div className="divide-y divide-slate-50">
                                            {catItems.map((item, catIdx) => (
                                                <div
                                                    key={item.id}
                                                    draggable
                                                    onDragStart={(e) => {
                                                        e.stopPropagation();
                                                        e.dataTransfer.setData('dragType', 'product');
                                                        e.dataTransfer.setData('text/plain', item.id);
                                                        e.dataTransfer.setData('productCat', cat);
                                                        e.dataTransfer.effectAllowed = 'move';
                                                        (e.currentTarget as HTMLElement).style.opacity = '0.4';
                                                    }}
                                                    onDragEnd={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                                                    onDragOver={(e) => {
                                                        if (!e.dataTransfer.types.includes('productcat')) return;
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        (e.currentTarget as HTMLElement).style.borderTop = '3px solid #f97316';
                                                    }}
                                                    onDragLeave={(e) => { (e.currentTarget as HTMLElement).style.borderTop = ''; }}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        (e.currentTarget as HTMLElement).style.borderTop = '';
                                                        const dragType = e.dataTransfer.getData('dragType');
                                                        if (dragType !== 'product') return;
                                                        const draggedId = e.dataTransfer.getData('text/plain');
                                                        const draggedCat = e.dataTransfer.getData('productCat');
                                                        if (draggedCat !== cat) return;
                                                        const newItems = [...sortItems];
                                                        const fromIdx = newItems.findIndex(s => s.id === draggedId);
                                                        const toIdx = newItems.findIndex(s => s.id === item.id);
                                                        if (fromIdx === toIdx || fromIdx === -1) return;
                                                        const [moved] = newItems.splice(fromIdx, 1);
                                                        newItems.splice(toIdx, 0, moved);
                                                        setSortItems(newItems);
                                                    }}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-grab active:cursor-grabbing select-none"
                                                >
                                                    <GripVertical size={12} className="text-slate-200 shrink-0" />
                                                    <span className="w-5 h-5 rounded bg-slate-100 text-slate-400 text-[9px] font-black flex items-center justify-center shrink-0">
                                                        {catIdx + 1}
                                                    </span>
                                                    {item.imageUrl && <img src={item.imageUrl} className="w-7 h-7 rounded-lg object-cover shrink-0" alt="" />}
                                                    <span className="flex-1 font-bold text-xs text-slate-700 truncate">{item.name}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 shrink-0">${Number(item.price).toLocaleString()}</span>
                                                    <div className="flex gap-0.5">
                                                        <button
                                                            disabled={catIdx === 0}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const prev = catItems[catIdx - 1];
                                                                const newItems = [...sortItems];
                                                                const a = newItems.findIndex(s => s.id === item.id);
                                                                const b = newItems.findIndex(s => s.id === prev.id);
                                                                [newItems[a], newItems[b]] = [newItems[b], newItems[a]];
                                                                setSortItems(newItems);
                                                            }}
                                                            className="w-6 h-6 rounded border border-slate-100 flex items-center justify-center text-slate-300 hover:border-orange-400 hover:text-orange-500 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                                        >
                                                            <ArrowUp size={10} />
                                                        </button>
                                                        <button
                                                            disabled={catIdx === catItems.length - 1}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const next = catItems[catIdx + 1];
                                                                const newItems = [...sortItems];
                                                                const a = newItems.findIndex(s => s.id === item.id);
                                                                const b = newItems.findIndex(s => s.id === next.id);
                                                                [newItems[a], newItems[b]] = [newItems[b], newItems[a]];
                                                                setSortItems(newItems);
                                                            }}
                                                            className="w-6 h-6 rounded border border-slate-100 flex items-center justify-center text-slate-300 hover:border-orange-400 hover:text-orange-500 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                                        >
                                                            <ArrowDown size={10} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-white">
                            <button
                                onClick={() => setShowSortModal(false)}
                                className="px-6 py-3 rounded-xl text-slate-400 font-black uppercase text-[10px] tracking-wider hover:text-slate-600 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    setSavingSort(true);
                                    try {
                                        // Rebuild sortItems ordered by categoryOrder
                                        const finalItems: any[] = [];
                                        categoryOrder.forEach(cat => {
                                            sortItems.filter(p => p.category === cat).forEach(p => finalItems.push(p));
                                        });
                                        const items = finalItems.map((item, idx) => ({ id: item.id, sortOrder: idx + 1 }));
                                        await authFetch(`${API_URL}/products/reorder/bulk`, {
                                            method: 'PATCH',
                                            body: JSON.stringify({ items })
                                        });
                                        setProducts(prev => prev.map(p => {
                                            const sorted = items.find(s => s.id === p.id);
                                            return sorted ? { ...p, sortOrder: sorted.sortOrder } : p;
                                        }));
                                        setShowSortModal(false);
                                    } catch (e) {
                                        console.error('Error saving sort order:', e);
                                        alert('Error al guardar el orden');
                                    } finally {
                                        setSavingSort(false);
                                    }
                                }}
                                disabled={savingSort}
                                className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-orange-600 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {savingSort ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                Guardar Orden
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
