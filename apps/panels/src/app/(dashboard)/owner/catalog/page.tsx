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
import { groupProductsByWebSection, webSectionKey, displayCategoryName } from '@lomasrico/shared-types';

export default function CatalogManagementPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingProduct, setEditingProduct] = useState<any | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
    const [filterAsset, setFilterAsset] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [catalogTab, setCatalogTab] = useState<'active' | 'hidden'>('active');
    const [showAssetSelector, setShowAssetSelector] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [supabaseAssets, setSupabaseAssets] = useState<string[]>([]);
    const [loadingAssets, setLoadingAssets] = useState(false);
    const [allModifierGroups, setAllModifierGroups] = useState<any[]>([]);
    const [productModifiers, setProductModifiers] = useState<{groupId: string, sortOrder: number}[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [modifierSearchQuery, setModifierSearchQuery] = useState('');
    const [showSortModal, setShowSortModal] = useState(false);
    const [sortTab, setSortTab] = useState<'products' | 'categories'>('categories');
    const [sortFocusCategory, setSortFocusCategory] = useState('');
    const [sortItems, setSortItems] = useState<any[]>([]);
    const [savingSort, setSavingSort] = useState(false);
    const [sortSections, setSortSections] = useState<{ id: string; name: string }[]>([]);
    const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
    const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
    const [showNewCategory, setShowNewCategory] = useState(false);
    const [editorTab, setEditorTab] = useState<'config' | 'media' | 'modifiers'>('config');

    useEffect(() => {
        if (!editingProduct) return;
        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'catalog-editor',hypothesisId:'H-TABS',location:'catalog/page.tsx:editorTab',message:'catalog editor tab',data:{tab:editorTab,productId:editingProduct.id,isNew:editingProduct.id==='NEW'},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
    }, [editorTab, editingProduct?.id]);

    const CATEGORIES = useMemo(() => {
        const unique = Array.from(new Set(products.map(p => p.category))).filter(Boolean) as string[];
        return unique
            .map((cat) => {
                const inCat = products.filter((p) => p.category === cat);
                const order = Math.min(...inCat.map((p) => Number(p.sortOrder || 9999)), 9999);
                return { id: cat, name: displayCategoryName(cat), count: inCat.length, order };
            })
            .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    }, [products]);

    useEffect(() => {
        loadData();
        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'admin-catalog',hypothesisId:'H-width',location:'catalog/page.tsx:mount',message:'Ancho disponible del panel',data:{innerWidth:typeof window!=='undefined'?window.innerWidth:0,cappedAt7xl:false},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
    }, []);

    useEffect(() => {
        if (!showSortModal) return;
        const main = document.querySelector('main') as HTMLElement | null;
        const prevBody = document.body.style.overflow;
        const prevMain = main?.style.overflow || '';
        document.body.style.overflow = 'hidden';
        if (main) main.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prevBody;
            if (main) main.style.overflow = prevMain;
        };
    }, [showSortModal]);

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
                setProductModifiers(data.map((m: any) => ({ groupId: m.groupId, sortOrder: m.sortOrder ?? 0 })));
            }
        } catch (e) {
            console.error('Error loading product modifiers:', e);
        }
    };

    const toggleModifierForProduct = async (productId: string, groupId: string, isCurrentlyAssigned: boolean) => {
        try {
            if (isCurrentlyAssigned) {
                await authFetch(`${API_URL}/modifiers/product/${productId}/remove/${groupId}`, { method: 'DELETE' });
                setProductModifiers(prev => {
                    const filtered = prev.filter(m => m.groupId !== groupId);
                    // Reindex sort orders
                    return filtered.map((m, i) => ({ ...m, sortOrder: i }));
                });
            } else {
                const newSortOrder = productModifiers.length;
                await authFetch(`${API_URL}/modifiers/product/${productId}/assign`, {
                    method: 'POST',
                    body: JSON.stringify({ modifierGroupId: groupId, isRequired: false, sortOrder: newSortOrder }),
                });
                setProductModifiers(prev => [...prev, { groupId, sortOrder: newSortOrder }]);
            }
        } catch (e) {
            console.error('Error toggling modifier:', e);
        }
    };

    const handleReorderProductModifier = async (productId: string, groupId: string, direction: 'up' | 'down') => {
        const sorted = [...productModifiers].sort((a, b) => a.sortOrder - b.sortOrder);
        const idx = sorted.findIndex(m => m.groupId === groupId);
        if (idx === -1) return;
        if (direction === 'up' && idx === 0) return;
        if (direction === 'down' && idx === sorted.length - 1) return;

        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        [sorted[idx], sorted[swapIdx]] = [sorted[swapIdx], sorted[idx]];

        const reordered = sorted.map((m, i) => ({ ...m, sortOrder: i }));
        setProductModifiers(reordered);

        try {
            await authFetch(`${API_URL}/modifiers/product/${productId}/reorder`, {
                method: 'PATCH',
                body: JSON.stringify({
                    items: reordered.map(m => ({ groupId: m.groupId, sortOrder: m.sortOrder }))
                })
            });
        } catch (e) {
            console.error('Error reordering product modifiers:', e);
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
        setEditorTab('config');
        setEditingProduct({
            id: 'NEW',
            name: '',
            description: '',
            price: 0,
            category: selectedCategory || 'PROMOS',
            imageUrl: '',
            imageKey: '',
            hoverVideoUrl: '',
            hoverVideoKey: '',
            isActive: true,
            isConfigurable: false,
            maxProteins: 0,
            order: products.length + 1
        });
        setProductModifiers([]);
        setModifierSearchQuery('');
        setShowNewCategory(false);
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
                const saved = await res.json().catch(() => payload);
                // #region agent log
                fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'admin-catalog',hypothesisId:'H5',location:'catalog/page.tsx:handleSave',message:'Producto guardado desde admin',data:{id:editingProduct.id,name:saved?.name||payload.name,isActive:saved?.isActive??payload.isActive,descLen:(payload.description||'').length},timestamp:Date.now()})}).catch(()=>{});
                // #endregion
                setSaveStatus('success');
                loadData();
                setTimeout(() => {
                    setEditingProduct(null);
                    setModifierSearchQuery('');
                    setSaveStatus('idle');
                }, 1000);
            } else {
                const data = await res.json().catch(() => ({}));
                setSaveStatus('idle');
                alert(data.message || 'No se pudo guardar el producto.');
            }
        } catch (error) {
            setSaveStatus('idle');
            alert('Error de conexión.');
        }
    };

    const toggleProductStatus = async (id: string, currentStatus: boolean, field: 'isActive' | 'isConfigurable') => {
        const next = !currentStatus;
        setProducts(prev => prev.map(p =>
            p.id === id ? { ...p, [field]: next } : p
        ));

        try {
            const res = await authFetch(`${API_URL}/products/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ [field]: next })
            });
            if (!res.ok) throw new Error(String(res.status));
            // #region agent log
            fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'admin-catalog',hypothesisId:'H3',location:'catalog/page.tsx:toggle',message:'Publicado en web cambiado',data:{id,field,next},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
        } catch (e) {
            setProducts(prev => prev.map(p =>
                p.id === id ? { ...p, [field]: currentStatus } : p
            ));
            alert('No se pudo cambiar la publicación en la web.');
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
                if (selectedCategory === category) setSelectedCategory('');
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

    const openSortModal = () => {
        const active = products.filter((p) => p.isActive).sort((a: any, b: any) => {
            const ao = Number(a.sortOrder ?? 0);
            const bo = Number(b.sortOrder ?? 0);
            if (ao !== bo) return ao - bo;
            return String(a.name || '').localeCompare(String(b.name || ''));
        });
        const grouped = groupProductsByWebSection(active);
        const rawCats = Array.from(new Set(active.map((p) => p.category).filter(Boolean)));
        const zeros = active.filter((p) => !Number(p.sortOrder)).length;
        setSortItems(active);
        setSortSections(grouped.map((section) => ({ id: section.id, name: section.name })));
        const focus = selectedCategory ? webSectionKey(selectedCategory, '') : '';
        setSortTab(selectedCategory ? 'products' : 'categories');
        setSortFocusCategory(focus);
        setShowSortModal(true);
        // #region agent log
        fetch('/api/debug-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({href:'/owner/catalog',apiUrl:grouped.map((s)=>s.name).join('|'),ua:`H-SORT web:${grouped.length} raw:${rawCats.length} zeros:${zeros}`})}).catch(()=>{});
        // #endregion
    };

    const moveSortCategory = (id: string, direction: 'up' | 'down') => {
        const idx = sortSections.findIndex((section) => section.id === id);
        const swap = direction === 'up' ? idx - 1 : idx + 1;
        if (idx < 0 || swap < 0 || swap >= sortSections.length) return;
        const next = [...sortSections];
        [next[idx], next[swap]] = [next[swap], next[idx]];
        setSortSections(next);
    };

    const moveSortProduct = (id: string, direction: 'up' | 'down') => {
        const item = sortItems.find((p) => p.id === id);
        if (!item) return;
        const section = webSectionKey(item.category, item.name);
        const siblings = sortItems.filter((p) => webSectionKey(p.category, p.name) === section);
        const idx = siblings.findIndex((p) => p.id === id);
        const other = direction === 'up' ? siblings[idx - 1] : siblings[idx + 1];
        if (!other) return;
        const next = [...sortItems];
        const a = next.findIndex((p) => p.id === id);
        const b = next.findIndex((p) => p.id === other.id);
        [next[a], next[b]] = [next[b], next[a]];
        setSortItems(next);
    };

    const saveSortOrder = async () => {
        setSavingSort(true);
        try {
            const finalItems: any[] = [];
            sortSections.forEach((section) => {
                sortItems.filter((p) => webSectionKey(p.category, p.name) === section.id).forEach((p) => finalItems.push(p));
            });
            const items = finalItems.map((item, idx) => ({ id: item.id, sortOrder: idx + 1 }));
            await authFetch(`${API_URL}/products/reorder/bulk`, {
                method: 'PATCH',
                body: JSON.stringify({ items }),
            });
            setProducts((prev) => prev.map((p) => {
                const sorted = items.find((s) => s.id === p.id);
                return sorted ? { ...p, sortOrder: sorted.sortOrder } : p;
            }));
            setShowSortModal(false);
            // #region agent log
            fetch('/api/debug-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({href:'/owner/catalog',apiUrl:sortSections.map((s)=>s.name).join('|'),ua:`H-SORT saved sections:${sortSections.length} items:${items.length}`})}).catch(()=>{});
            // #endregion
        } catch (e) {
            console.error('Error saving sort order:', e);
            alert('Error al guardar el orden');
        } finally {
            setSavingSort(false);
        }
    };

    const displayedProducts = useMemo(() => {
        let filtered = products;
        const query = searchQuery.toLowerCase().trim();

        if (selectedCategory) {
            filtered = filtered.filter(p => p.category === selectedCategory);
        }
        if (query) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(query) ||
                (p.description && p.description.toLowerCase().includes(query))
            );
        } else if (selectedCategory) {
            filtered = filtered.filter(p => catalogTab === 'active' ? p.isActive : !p.isActive);
        } else {
            filtered = [];
        }

        return [...filtered].sort((a, b) => {
            const ao = Number(a.sortOrder || 0);
            const bo = Number(b.sortOrder || 0);
            if (ao !== bo) return ao - bo;
            return String(a.name || '').localeCompare(String(b.name || ''));
        });
    }, [products, selectedCategory, searchQuery, catalogTab]);

    const showLobby = !selectedCategory && !searchQuery.trim();

    if (loading) return (
        <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-orange-500 mb-4" size={48} />
            <p className="font-black uppercase text-xs tracking-widest text-slate-400 italic">Sincronizando Menú...</p>
        </div>
    );

    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in duration-700 pb-10 min-w-0 overflow-x-hidden">
            <header className="flex items-center justify-between gap-3">
                <div className="min-w-0 pl-14 lg:pl-0 text-right lg:text-left">
                    <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                        Catálogo
                    </h1>
                    {selectedCategory && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 italic mt-1">{displayCategoryName(selectedCategory)}</p>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={openSortModal}
                        className="p-2.5 bg-white text-slate-500 border border-slate-200 rounded-xl"
                        title="Organizar"
                    >
                        <GripVertical size={16} />
                    </button>
                    <button
                        onClick={handleAddNew}
                        className="bg-slate-900 text-white px-3 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider flex items-center gap-1.5"
                    >
                        <PlusCircle size={16} /> Nuevo
                    </button>
                </div>
            </header>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                    type="text"
                    placeholder={selectedCategory ? `Buscar en ${displayCategoryName(selectedCategory)}...` : 'Buscar producto por nombre'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-10 py-3 bg-white rounded-xl border border-slate-100 shadow-sm font-bold text-slate-600 outline-none focus:border-orange-500 text-sm"
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                        <X size={16} />
                    </button>
                )}
            </div>

            {showLobby && (
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic mb-3 px-1">
                        ¿Qué categoría quieres trabajar?
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                    setSelectedCategory(cat.id);
                                    setCatalogTab('active');
                                    // #region agent log
                                    fetch('/api/debug-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({href:'/owner/catalog',apiUrl:cat.id,ua:`cat-pick:${cat.count}`})}).catch(()=>{});
                                    // #endregion
                                }}
                                className="text-left bg-white border border-slate-100 rounded-2xl p-4 hover:border-orange-400 hover:shadow-md transition-all"
                            >
                                <p className="font-black uppercase italic tracking-tighter text-slate-900 text-sm leading-tight">{cat.name}</p>
                                <p className="text-[10px] font-black text-slate-400 mt-1">{cat.count} productos</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {!showLobby && (
                <>
                    {selectedCategory && !searchQuery.trim() && (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedCategory('')}
                                className="px-3 py-2 rounded-xl bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500"
                            >
                                Categorías
                            </button>
                            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl flex-1">
                                {([
                                    { key: 'active' as const, label: 'En la web' },
                                    { key: 'hidden' as const, label: 'Ocultos' },
                                ]).map((t) => (
                                    <button
                                        key={t.key}
                                        type="button"
                                        onClick={() => setCatalogTab(t.key)}
                                        className={`py-2 rounded-xl font-black uppercase italic text-[10px] ${catalogTab === t.key ? 'bg-slate-900 text-white shadow' : 'text-slate-400'}`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        {displayedProducts.length > 0 ? displayedProducts.map((p) => (
                            <div key={p.id} className="flex items-center gap-3 px-3 md:px-4 py-3 border-b border-slate-50 last:border-0">
                                <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                                    {p.imageUrl ? (
                                        <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <ImageIcon className="m-auto mt-3.5 text-slate-300 w-5 h-5" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-black text-slate-900 text-sm truncate">{p.name}</p>
                                    <p className="text-[10px] font-black text-orange-500">${Number(p.price || 0).toLocaleString('es-CL')}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => toggleProductStatus(p.id, p.isActive, 'isActive')}
                                    className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase ${p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                                >
                                    {p.isActive ? 'Web' : 'Off'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowNewCategory(false);
                                        setEditorTab('config');
                                        setEditingProduct({ ...p });
                                        loadModifierGroups();
                                        if (p.id !== 'NEW') loadProductModifiers(p.id);
                                    }}
                                    className="shrink-0 bg-slate-900 text-white w-9 h-9 rounded-xl flex items-center justify-center"
                                    title="Editar"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                            </div>
                        )) : (
                            <div className="py-14 text-center">
                                <p className="text-slate-400 font-black uppercase tracking-widest italic text-[10px]">
                                    {searchQuery.trim() ? 'Sin coincidencias' : catalogTab === 'hidden' ? 'Nada oculto en esta categoría' : 'Sin productos'}
                                </p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Editor Modal */}
            {editingProduct && (
                <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-2 md:p-4 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl md:rounded-[2.5rem] w-full max-w-3xl h-[92vh] max-h-[840px] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
                        {/* Modal Header */}
                        <div className="p-5 md:p-6 border-b border-slate-50 flex justify-between items-center bg-white shrink-0">
                            <div className="min-w-0 pr-3">
                                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-orange-500 mb-1 italic">Ficha del producto</p>
                                <h3 className="font-black text-xl md:text-2xl tracking-tight text-slate-900 leading-tight truncate">
                                    {editingProduct.id === 'NEW' ? 'Nuevo producto' : editingProduct.name}
                                </h3>
                            </div>
                            <button onClick={() => {
                                setEditingProduct(null);
                                setModifierSearchQuery('');
                                setEditorTab('config');
                            }} className="p-3 bg-slate-50 hover:bg-red-50 hover:text-red-500 rounded-full transition-all shrink-0">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="px-4 md:px-6 pt-3 shrink-0">
                            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-2xl">
                                {([
                                    { id: 'config', label: 'Configuración', Icon: Settings },
                                    { id: 'media', label: 'Multimedia', Icon: ImageIcon },
                                    { id: 'modifiers', label: 'Modificadores', Icon: Layers },
                                ] as const).map(({ id, label, Icon }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setEditorTab(id)}
                                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-wider transition-all ${
                                            editorTab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                    >
                                        <Icon size={14} className={editorTab === id ? 'text-orange-500' : ''} />
                                        <span className="hidden sm:inline">{label}</span>
                                        <span className="sm:hidden">{id === 'config' ? 'Datos' : id === 'media' ? 'Media' : 'Mods'}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-5 md:p-6 no-scrollbar">
                            {editorTab === 'config' && (
                            <div className="space-y-6">
                            {/* General Section */}
                            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                <div className="space-y-4 md:space-y-6">
                                    <label className="block">
                                        <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1 mb-1 md:mb-2 block italic">Nombre (así se ve en la web)</span>
                                        <input
                                            value={editingProduct.name || ''}
                                            onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                            className="w-full p-3 md:p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-xl md:rounded-[1.5rem] font-bold text-slate-900 outline-none transition-all placeholder:text-slate-300 text-sm md:text-base"
                                            placeholder="Nombre del plato"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1 mb-1 md:mb-2 block italic">Categoría</span>
                                        <select
                                            value={showNewCategory ? '__NEW__' : (editingProduct.category || '')}
                                            onChange={(e) => {
                                                if (e.target.value === '__NEW__') {
                                                    setShowNewCategory(true);
                                                    setEditingProduct({ ...editingProduct, category: '' });
                                                    return;
                                                }
                                                setShowNewCategory(false);
                                                setEditingProduct({ ...editingProduct, category: e.target.value });
                                            }}
                                            className="w-full p-3 md:p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-xl md:rounded-[1.5rem] font-black text-slate-900 outline-none transition-all uppercase italic text-sm md:text-base"
                                        >
                                            <option value="">Selecciona categoría</option>
                                            {CATEGORIES.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                            {editingProduct.category && !CATEGORIES.some(c => c.id === editingProduct.category) && !showNewCategory && (
                                                <option value={editingProduct.category}>{editingProduct.category}</option>
                                            )}
                                            <option value="__NEW__">+ Nueva categoría</option>
                                        </select>
                                        {showNewCategory && (
                                            <input
                                                autoFocus
                                                value={editingProduct.category || ''}
                                                onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value.toUpperCase() })}
                                                className="mt-3 w-full p-3 md:p-4 bg-white border-2 border-orange-200 focus:border-orange-500 rounded-xl md:rounded-[1.5rem] font-black text-slate-900 outline-none transition-all uppercase italic text-sm md:text-base"
                                                placeholder="NOMBRE DE LA NUEVA CATEGORÍA"
                                            />
                                        )}
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
                                        <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1 mb-1 md:mb-2 block italic">Descripción (se puede revisar y editar)</span>
                                        <textarea
                                            value={editingProduct.description || ''}
                                            onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                                            className="w-full p-3 md:p-4 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-xl md:rounded-[1.5rem] font-medium text-slate-700 outline-none transition-all h-[180px] md:h-[240px] resize-y text-sm leading-relaxed whitespace-pre-wrap"
                                            placeholder="Ingredientes, tamaño y cómo se sirve el plato..."
                                        />
                                    </label>
                                </div>
                            </section>

                            <section className="grid grid-cols-1 gap-4 md:gap-6">
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
                                            <p className="font-black text-slate-900 tracking-tight text-sm md:text-base">
                                                {editingProduct.isActive ? 'Visible en la web' : 'Oculto en la web'}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400">
                                                {editingProduct.isActive ? 'Los clientes lo ven en la carta' : 'No aparece en la web ni en el salón'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`w-12 h-7 md:w-14 md:h-8 rounded-full p-1 transition-all ${editingProduct.isActive ? 'bg-orange-500' : 'bg-slate-200'} shrink-0`}>
                                        <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full bg-white transition-transform ${editingProduct.isActive ? 'translate-x-5 md:translate-x-6' : 'translate-x-0'}`} />
                                    </div>
                                </div>
                            </section>
                            </div>
                            )}

                            {editorTab === 'media' && (
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
                            )}

                            {editorTab === 'modifiers' && (
                            <>
                            {editingProduct.id === 'NEW' ? (
                                <div className="py-16 text-center">
                                    <Layers className="mx-auto mb-4 text-slate-300" size={36} />
                                    <p className="font-black uppercase italic text-slate-700">Guarda el producto primero</p>
                                    <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Después podrás asignarle modificadores</p>
                                </div>
                            ) : (
                                <section className="bg-slate-50 rounded-2xl md:rounded-[2.5rem] p-6 md:p-8 border border-slate-100">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 px-1">
                                        <div className="flex items-center gap-3">
                                            <Layers className="text-orange-500" size={20} />
                                            <h4 className="font-black italic uppercase tracking-tighter text-lg md:text-xl">
                                                Modificadores Activos
                                            </h4>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-white px-2 py-1 rounded-full">
                                                {productModifiers.length} asignados
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
                                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                        {/* ── ASSIGNED MODIFIERS (ordered by sortOrder) ── */}
                                        {productModifiers.length > 0 && (
                                            <div className="mb-4">
                                                <p className="text-[9px] font-black uppercase text-orange-500 tracking-widest mb-2 px-1 flex items-center gap-2">
                                                    <GripVertical size={10} /> Orden de aparición en el producto
                                                </p>
                                                <div className="space-y-1.5">
                                                    {[...productModifiers]
                                                        .sort((a, b) => a.sortOrder - b.sortOrder)
                                                        .map((pm, pmIdx) => {
                                                            const group = allModifierGroups.find((g: any) => g.id === pm.groupId);
                                                            if (!group) return null;
                                                            // Apply search filter
                                                            if (modifierSearchQuery && 
                                                                !group.displayName.toLowerCase().includes(modifierSearchQuery.toLowerCase()) &&
                                                                !group.name.toLowerCase().includes(modifierSearchQuery.toLowerCase())) return null;
                                                            return (
                                                                <div
                                                                    key={pm.groupId}
                                                                    className="flex items-center gap-2 p-3 rounded-2xl bg-orange-50 border-2 border-orange-200 transition-all group"
                                                                >
                                                                    <span className="w-6 h-6 rounded-lg bg-orange-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                                                                        {pmIdx + 1}
                                                                    </span>
                                                                    <div className="flex flex-col gap-0.5 shrink-0">
                                                                        <button
                                                                            disabled={pmIdx === 0}
                                                                            onClick={(e) => { e.stopPropagation(); handleReorderProductModifier(editingProduct.id, pm.groupId, 'up'); }}
                                                                            className="w-5 h-4 rounded flex items-center justify-center text-orange-400 hover:text-orange-600 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                                                        >
                                                                            <ArrowUp size={10} />
                                                                        </button>
                                                                        <button
                                                                            disabled={pmIdx === productModifiers.length - 1}
                                                                            onClick={(e) => { e.stopPropagation(); handleReorderProductModifier(editingProduct.id, pm.groupId, 'down'); }}
                                                                            className="w-5 h-4 rounded flex items-center justify-center text-orange-400 hover:text-orange-600 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                                                        >
                                                                            <ArrowDown size={10} />
                                                                        </button>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                        <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                                                                            <Layers size={16} />
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <p className="font-black italic uppercase tracking-tighter text-sm truncate">
                                                                                {group.displayName}
                                                                            </p>
                                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                                                {group.type === 'SINGLE_SELECT' ? 'Única' : 'Multi'} · {group.options?.length || 0} opciones
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); toggleModifierForProduct(editingProduct.id, pm.groupId, true); }}
                                                                        className="p-1.5 text-orange-300 hover:text-red-500 transition-colors"
                                                                        title="Quitar modificador"
                                                                    >
                                                                        <X size={16} />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        )}

                                        {/* ── SEPARATOR ── */}
                                        {productModifiers.length > 0 && (
                                            <div className="flex items-center gap-3 py-2">
                                                <div className="flex-1 h-px bg-slate-200" />
                                                <span className="text-[8px] font-black uppercase text-slate-300 tracking-widest">Disponibles</span>
                                                <div className="flex-1 h-px bg-slate-200" />
                                            </div>
                                        )}

                                        {/* ── UNASSIGNED MODIFIERS ── */}
                                        {allModifierGroups
                                            .filter(g => !productModifiers.some(pm => pm.groupId === g.id))
                                            .filter(g => 
                                                !modifierSearchQuery || 
                                                g.displayName.toLowerCase().includes(modifierSearchQuery.toLowerCase()) ||
                                                g.name.toLowerCase().includes(modifierSearchQuery.toLowerCase())
                                            )
                                            .sort((a, b) => a.displayName.localeCompare(b.displayName))
                                            .map((group: any) => (
                                                <div
                                                    key={group.id}
                                                    onClick={() => toggleModifierForProduct(editingProduct.id, group.id, false)}
                                                    className="flex items-center justify-between p-4 rounded-2xl border-2 bg-white border-slate-100 hover:border-slate-200 cursor-pointer transition-all"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
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
                                                    <Plus size={20} className="text-slate-300" />
                                                </div>
                                            ))}
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
                            </>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3 md:gap-4 px-6 md:px-10 shrink-0">
                            <button onClick={() => {
                                setEditingProduct(null);
                                setModifierSearchQuery('');
                                setEditorTab('config');
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
                                {saveStatus === 'success' ? 'Guardado' : saveStatus === 'saving' ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Asset Selector Overlay */}
            {showAssetSelector && (
                <div className="fixed inset-0 bg-white z-[60] flex flex-col animate-in slide-in-from-bottom duration-500 p-4 md:p-8 lg:p-16">
                    <div className="w-full max-w-none flex flex-col h-full">
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

            {showSortModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 overflow-hidden overscroll-none touch-none">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowSortModal(false)} />
                    <div className="relative w-full max-w-lg max-h-[85vh] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col touch-auto">
                        <div className="p-5 pb-3 border-b border-slate-100 shrink-0">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h2 className="text-xl font-black italic tracking-tighter uppercase text-slate-900">
                                        Organizar <span className="text-orange-500">catálogo</span>
                                    </h2>
                                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mt-1">
                                        {sortTab === 'categories' ? 'Qué categoría se ve primero en la web' : 'Qué plato se ve primero en su categoría'}
                                    </p>
                                </div>
                                <button type="button" onClick={() => setShowSortModal(false)} className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 shrink-0">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl mt-4">
                                {([
                                    { key: 'categories' as const, label: 'Categorías' },
                                    { key: 'products' as const, label: 'Platos' },
                                ]).map((t) => (
                                    <button
                                        key={t.key}
                                        type="button"
                                        onClick={() => {
                                            setSortTab(t.key);
                                            if (t.key === 'products' && !sortFocusCategory && selectedCategory) {
                                                setSortFocusCategory(webSectionKey(selectedCategory, ''));
                                            }
                                            // #region agent log
                                            fetch('/api/debug-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({href:'/owner/catalog',apiUrl:t.key,ua:`H-SORT tab:${t.key}`})}).catch(()=>{});
                                            // #endregion
                                        }}
                                        className={`py-2 rounded-xl font-black uppercase italic text-[10px] ${sortTab === t.key ? 'bg-slate-900 text-white shadow' : 'text-slate-400'}`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div data-bill-scroll className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-2">
                            {sortTab === 'categories' && sortSections.map((section, idx) => {
                                const count = sortItems.filter((p) => webSectionKey(p.category, p.name) === section.id).length;
                                return (
                                    <div key={section.id} className="flex items-center gap-3 px-3 py-3 bg-slate-50 rounded-2xl">
                                        <span className="w-7 h-7 rounded-xl bg-white text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-black uppercase italic text-sm text-slate-900 truncate">{section.name}</p>
                                            <p className="text-[10px] font-black text-slate-400">{count} platos</p>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            <button type="button" disabled={idx === 0} onClick={() => moveSortCategory(section.id, 'up')} className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-orange-500 disabled:opacity-20">
                                                <ArrowUp size={14} />
                                            </button>
                                            <button type="button" disabled={idx === sortSections.length - 1} onClick={() => moveSortCategory(section.id, 'down')} className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-orange-500 disabled:opacity-20">
                                                <ArrowDown size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            {sortTab === 'products' && !sortFocusCategory && (
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic mb-3 px-1">¿Qué categoría quieres ordenar?</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {sortSections.map((section) => (
                                            <button
                                                key={section.id}
                                                type="button"
                                                onClick={() => setSortFocusCategory(section.id)}
                                                className="text-left bg-slate-50 rounded-2xl p-4"
                                            >
                                                <p className="font-black uppercase italic text-sm leading-tight">{section.name}</p>
                                                <p className="text-[10px] font-black text-slate-400 mt-1">{sortItems.filter((p) => webSectionKey(p.category, p.name) === section.id).length} platos</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {sortTab === 'products' && sortFocusCategory && (
                                <div className="space-y-2">
                                    <button type="button" onClick={() => setSortFocusCategory('')} className="px-3 py-2 rounded-xl bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        Elegir categoría
                                    </button>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 italic px-1">
                                        {sortSections.find((section) => section.id === sortFocusCategory)?.name || sortFocusCategory}
                                    </p>
                                    {sortItems.filter((p) => webSectionKey(p.category, p.name) === sortFocusCategory).map((item, idx, list) => (
                                        <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 rounded-2xl">
                                            <span className="w-7 h-7 rounded-xl bg-white text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                                            {item.imageUrl ? <img src={item.imageUrl} className="w-9 h-9 rounded-lg object-cover shrink-0" alt="" /> : <div className="w-9 h-9 rounded-lg bg-white shrink-0" />}
                                            <span className="flex-1 font-bold text-xs text-slate-700 truncate">{item.name}</span>
                                            <div className="flex gap-1 shrink-0">
                                                <button type="button" disabled={idx === 0} onClick={() => moveSortProduct(item.id, 'up')} className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-orange-500 disabled:opacity-20">
                                                    <ArrowUp size={14} />
                                                </button>
                                                <button type="button" disabled={idx === list.length - 1} onClick={() => moveSortProduct(item.id, 'down')} className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-orange-500 disabled:opacity-20">
                                                    <ArrowDown size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-white">
                            <button type="button" onClick={() => setShowSortModal(false)} className="px-6 py-3 rounded-xl text-slate-400 font-black uppercase text-[10px] tracking-wider">
                                Cancelar
                            </button>
                            <button type="button" onClick={saveSortOrder} disabled={savingSort} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 disabled:opacity-50">
                                {savingSort ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                Guardar orden
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
