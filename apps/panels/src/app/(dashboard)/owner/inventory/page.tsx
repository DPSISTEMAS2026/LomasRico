'use client';

import { useState, useEffect } from 'react';
import {
    Package,
    Search,
    DollarSign,
    Save,
    RefreshCw,
    X,
    Power,
    AlertCircle,
    TrendingUp,
    ChevronRight,
    Loader2,
    ArrowUpRight,
    Layers,
    PlusCircle,
    ClipboardCheck,
    History,
    Trash2,
    Pencil,
    Percent
} from 'lucide-react';
import { API_URL } from '../../../../services/api';
import { authFetch } from '../../../../services/authFetch';

export default function InventoryManagementPage() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');

    // Modals state
    const [isCreating, setIsCreating] = useState(false);
    const [restockItem, setRestockItem] = useState<any>(null);
    const [adjustItem, setAdjustItem] = useState<any>(null);
    const [wasteItem, setWasteItem] = useState<any>(null);
    const [editItem, setEditItem] = useState<any>(null);
    const [deleteItem, setDeleteItem] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);
    const [editData, setEditData] = useState({ name: '', role: 'BASE', type: 'RAW', unit: 'KG', costPerUnit: '', minStockThreshold: '10', category: 'GENERAL' });


    // Form States
    const [newItem, setNewItem] = useState({
        name: '', category: '', unit: 'KG', yield: '100',
        purchasePrice: '', role: 'BASE', type: 'RAW', currentStock: '', minStock: '10'
    });
    const [newCategoryInput, setNewCategoryInput] = useState('');
    const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
    const [restockData, setRestockData] = useState({ quantity: '', unitCost: '', yieldPercent: '100' });
    const [adjustValue, setAdjustValue] = useState('');
    const [wasteData, setWasteData] = useState({ quantity: '', reason: 'EXPIRED', note: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const invRes = await authFetch(`${API_URL}/inventory`, { cache: 'no-store' });
            if (invRes.ok) {
                const data = await invRes.json();
                setItems(data);
            }
        } catch (e) {
            console.error('Error loading inventory:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newItem.name.trim()) { alert('Ingrese un nombre.'); return; }
        try {
            const pPrice = Number(newItem.purchasePrice) || 0;
            const yieldPct = Number(newItem.yield) || 100;
            const netCost = yieldPct > 0 ? (pPrice / (yieldPct / 100)) : pPrice;

            const res = await authFetch(`${API_URL}/inventory`, {
                method: 'POST',
                body: JSON.stringify({
                    name: newItem.name,
                    unit: newItem.unit,
                    role: newItem.role,
                    type: newItem.type,
                    category: newItem.category || 'GENERAL',
                    costPerUnit: Math.round(netCost),
                    currentStock: Number(newItem.currentStock) || 0,
                    minStockThreshold: Number(newItem.minStock) || 10,
                })
            });

            if (res.ok) {
                loadData();
                setIsCreating(false);
                setNewItem({ name: '', category: '', unit: 'KG', yield: '100', purchasePrice: '', role: 'BASE', type: 'RAW', currentStock: '', minStock: '10' });
            }
        } catch (e) {
            alert('Error al crear insumo');
        }
    };

    const handleRestock = async () => {
        if (!restockItem) return;
        const rawQty = Number(restockData.quantity);
        if (!rawQty || isNaN(rawQty)) {
            alert('Por favor, ingrese una cantidad válida.');
            return;
        }
        const yieldPct = Number(restockData.yieldPercent) || 100;
        const actualQty = Math.round((rawQty * (yieldPct / 100)) * 100) / 100;
        const mermaQty = Math.round((rawQty - actualQty) * 100) / 100;

        const confirmMsg = yieldPct < 100
            ? `Compra: ${rawQty} ${restockItem.unit}\nRendimiento: ${yieldPct}%\nMerma: ${mermaQty} ${restockItem.unit}\n\n→ Se agregarán ${actualQty} ${restockItem.unit} útiles al stock\n\n¿Confirmar?`
            : `Se agregarán ${rawQty} ${restockItem.unit} al stock. ¿Confirmar?`;

        if (!confirm(confirmMsg)) return;

        try {
            const res = await authFetch(`${API_URL}/inventory/${restockItem.id}/restock`, {
                method: 'POST',
                body: JSON.stringify({
                    quantity: actualQty,
                    unitCost: Number(restockData.unitCost)
                })
            });

            if (res.ok) {
                const summary = yieldPct < 100
                    ? `✓ Stock actualizado\n${rawQty} ${restockItem.unit} comprados → ${actualQty} ${restockItem.unit} útiles (${mermaQty} merma)`
                    : `✓ Stock actualizado: +${actualQty} ${restockItem.unit}`;
                alert(summary);
                loadData();
                setRestockItem(null);
                setRestockData({ quantity: '', unitCost: '', yieldPercent: '100' });
            } else {
                alert('Error al procesar la reposición.');
            }
        } catch (e) {
            alert('Error de conexión en reposición');
        }
    };

    const handleAdjustStock = async () => {
        if (!adjustItem) {
            console.error('No item selected for adjustment');
            return;
        }

        const finalVal = Number(adjustValue);
        if (adjustValue === '' || isNaN(finalVal)) {
            alert('Por favor, ingrese un valor de stock válido.');
            return;
        }

        try {
            const res = await authFetch(`${API_URL}/inventory/${adjustItem.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ currentStock: finalVal })
            });

            if (res.ok) {
                alert('✓ Ajuste de stock aplicado correctamente.');
                await loadData(); // Reload all data
                setAdjustItem(null);
                setAdjustValue('');
            } else {
                const errorData = await res.json();
                alert(`Error al ajustar: ${errorData.message || 'Verifique los datos'}`);
            }
        } catch (e) {
            console.error('Adjustment Error:', e);
            alert('Error de conexión al aplicar el ajuste.');
        }
    };

    const handleWaste = async () => {
        if (!wasteItem) return;
        const qty = Number(wasteData.quantity);
        if (!qty || qty <= 0) {
            alert('Ingrese una cantidad válida de merma.');
            return;
        }
        try {
            const res = await authFetch(`${API_URL}/inventory/${wasteItem.id}/waste`, {
                method: 'POST',
                body: JSON.stringify({
                    quantity: qty,
                    reason: wasteData.reason,
                    note: wasteData.note || undefined,
                }),
            });
            if (res.ok) {
                const result = await res.json();
                alert(`✓ Merma registrada: ${result.quantityLost} ${wasteItem.unit} de ${wasteItem.name}\nPérdida estimada: $${result.estimatedLoss}`);
                loadData();
                setWasteItem(null);
                setWasteData({ quantity: '', reason: 'EXPIRED', note: '' });
            } else {
                alert('Error al registrar merma.');
            }
        } catch (e) {
            alert('Error de conexión.');
        }
    };

    const handleDelete = async () => {
        if (!deleteItem) return;
        try {
            setDeleting(true);
            const res = await authFetch(`${API_URL}/inventory/${deleteItem.id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                alert(`✓ "${deleteItem.name}" eliminado permanentemente del inventario.`);
                loadData();
                setDeleteItem(null);
            } else {
                const err = await res.json().catch(() => ({}));
                alert(`Error al eliminar: ${err.message || 'Este insumo podría estar vinculado a recetas. Verifique y reintente.'}`);
            }
        } catch (e) {
            alert('Error de conexión al eliminar.');
        } finally {
            setDeleting(false);
        }
    };

    // Dynamic categories from actual data
    const dynamicCategories = Array.from(new Set(items.map((i: any) => i.category || 'GENERAL'))).sort() as string[];
    const categoriesList = ['TODOS', ...dynamicCategories];

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(filter.toLowerCase());
        const matchesCategory = selectedCategory === 'TODOS' || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const inventoryValue = items.reduce((acc, curr) => acc + ((curr.currentStock || 0) * curr.costPerUnit), 0);
    const lowStockItems = items.filter(i => (i.currentStock || 0) < 10);

    if (loading && items.length === 0) return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="animate-spin text-orange-500 mb-4" size={48} />
            <p className="font-black uppercase text-xs tracking-widest text-slate-400 italic">Sincronizando Inventario Real...</p>
        </div>
    );

    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                        GESTIÓN <span className="text-orange-500">INVENTARIO</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest mt-2 px-1">
                        CONTROL DINÁMICO DESDE BASE DE DATOS
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
                    <button
                        onClick={loadData}
                        className="bg-white text-slate-900 border border-slate-200 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2 active:scale-95 italic"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refrescar Datos
                    </button>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="bg-slate-900 text-white px-8 py-4 rounded-2xl md:rounded-[2rem] font-black uppercase text-[10px] md:text-xs tracking-[0.2em] shadow-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-3 active:scale-95 italic"
                    >
                        <PlusCircle size={18} />
                        Nuevo Insumo
                    </button>
                </div>
            </header>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center hover:bg-slate-900 transition-all duration-500 group">
                    <div>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1 italic group-hover:text-slate-500">Insumos Totales</p>
                        <p className="text-3xl md:text-4xl font-black italic text-slate-900 tracking-tighter group-hover:text-white">{items.length}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-slate-800">
                        <Layers size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center hover:border-orange-500 transition-all duration-500">
                    <div>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1 italic">Valor Total Stock</p>
                        <p className="text-3xl md:text-4xl font-black italic text-orange-500 tracking-tighter">${inventoryValue.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-2xl text-orange-500">
                        <DollarSign size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center hover:border-red-500 transition-all duration-500">
                    <div>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1 italic">Alertas de Stock</p>
                        <p className="text-3xl md:text-4xl font-black italic text-red-500 tracking-tighter">{lowStockItems.length}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-2xl text-red-500">
                        <AlertCircle size={24} />
                    </div>
                </div>
            </div>

            {/* Insumos de Bajo Stock */}
            {lowStockItems.length > 0 && (
                <div className="bg-red-50/50 p-6 rounded-[2rem] border border-red-100">
                    <h3 className="text-xs font-black uppercase italic text-red-600 mb-4 tracking-[0.2em] flex items-center gap-2">
                        <AlertCircle size={14} /> REPOSICIÓN URGENTE NECESARIA
                    </h3>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                        {lowStockItems.map((item) => (
                            <div key={item.id} className="min-w-[220px] bg-white p-4 rounded-2xl border border-red-200 shadow-sm shrink-0">
                                <p className="font-black text-slate-800 uppercase text-xs truncate italic">{item.name}</p>
                                <div className="flex justify-between items-end mt-3">
                                    <p className="text-xl font-black text-red-500 italic leading-none">{item.currentStock} <span className="text-[10px] uppercase text-slate-400">{item.unit}</span></p>
                                    <button
                                        onClick={() => { setRestockItem(item); setRestockData({ quantity: '', unitCost: item.costPerUnit?.toString() || '' }); }}
                                        className="text-[9px] font-black text-red-600 underline hover:text-red-800"
                                    >
                                        COMPRAR →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filter Bar */}
            <div className="flex flex-col xl:flex-row gap-4 items-center bg-white p-3 rounded-[2.5rem] border border-slate-100 shadow-sm sticky top-4 z-[40] backdrop-blur-md">
                <div className="flex gap-2 bg-slate-50 p-1 rounded-full overflow-x-auto no-scrollbar w-full xl:w-auto">
                    {categoriesList.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                                ${selectedCategory === cat
                                    ? 'bg-slate-900 text-white shadow-xl italic'
                                    : 'text-slate-400 hover:bg-white hover:text-slate-900'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3 bg-white px-6 py-2.5 rounded-full border border-slate-100 w-full xl:flex-1 shadow-inner">
                    <Search size={18} className="text-slate-300" />
                    <input
                        placeholder="Buscar por nombre de insumo..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="bg-transparent outline-none text-sm font-bold text-slate-900 w-full italic"
                    />
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-sm border-b-8 border-b-slate-900">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                            <th className="px-8 py-6 text-left">Insumo</th>
                            <th className="px-8 py-6 text-center">Stock Actual</th>
                            <th className="px-8 py-6 text-right">Costo Unitario</th>
                            <th className="px-8 py-6 text-center">Gestión</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredItems.map(item => {
                            const isLow = (item.currentStock || 0) < 10;
                            return (
                                <tr key={item.id} className="group hover:bg-slate-50 transition-all">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] text-white shadow-sm bg-slate-700">
                                                {(item.category || 'GEN').substring(0, 3)}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 uppercase italic text-sm tracking-tight">{item.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{item.category}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="flex flex-col">
                                            <span className={`text-2xl font-black italic tracking-tighter ${isLow ? 'text-red-500' : 'text-slate-900'}`}>
                                                {item.currentStock || 0}
                                            </span>
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.unit}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <p className="font-black text-xl italic text-slate-900 tracking-tighter">${item.costPerUnit?.toLocaleString() || 0}</p>
                                        <p className="text-[8px] font-black text-slate-300 uppercase italic">PMP REAL</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditItem(item);
                                                    setEditData({ name: item.name, role: item.role || 'BASE', type: item.type || 'RAW', unit: item.unit || 'KG', costPerUnit: item.costPerUnit?.toString() || '0', minStockThreshold: item.minStockThreshold?.toString() || '10', category: item.category || 'GENERAL' });
                                                }}
                                                className="px-3 py-2 bg-blue-50 text-blue-600 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1.5"
                                            >
                                                <Pencil size={12} /> Editar
                                            </button>
                                            <button
                                                id={`adjust-btn-${item.id}`}
                                                onClick={() => {
                                                    setAdjustItem(item);
                                                    setAdjustValue(item.currentStock?.toString() || '0');
                                                }}
                                                className="px-3 py-2 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-900 hover:text-white transition-all flex items-center gap-1.5"
                                            >
                                                <RefreshCw size={12} /> Ajustar
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setRestockItem(item);
                                                    setRestockData({ quantity: '', unitCost: item.costPerUnit?.toString() || '', yieldPercent: '100' });
                                                }}
                                                className="px-3 py-2 bg-orange-500 text-white rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-orange-600 transition-all flex items-center gap-1.5 shadow-sm"
                                            >
                                                <TrendingUp size={12} /> Reponer
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setWasteItem(item);
                                                    setWasteData({ quantity: '', reason: 'EXPIRED', note: '' });
                                                }}
                                                className="px-3 py-2 bg-red-50 text-red-500 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5"
                                            >
                                                <Trash2 size={12} /> Merma
                                            </button>
                                            <button
                                                onClick={() => setDeleteItem(item)}
                                                className="px-3 py-2 bg-red-600 text-white rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-red-700 transition-all flex items-center gap-1.5 shadow-sm"
                                            >
                                                <X size={12} /> Eliminar
                                            </button>

                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards View */}
            <div className="lg:hidden space-y-4">
                {filteredItems.map(item => (
                    <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] text-white shrink-0 bg-slate-700">
                                    {(item.category || 'GEN').substring(0, 3)}
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-900 uppercase italic text-sm">{item.name}</h4>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-2xl font-black italic tracking-tighter leading-none ${(item.currentStock || 0) < 10 ? 'text-red-500' : 'text-slate-900'}`}>
                                    {item.currentStock || 0}
                                </p>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.unit}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-50">
                            <button
                                onClick={() => {
                                    setEditItem(item);
                                    setEditData({ name: item.name, role: item.role || 'BASE', type: item.type || 'RAW', unit: item.unit || 'KG', costPerUnit: item.costPerUnit?.toString() || '0', minStockThreshold: item.minStockThreshold?.toString() || '10', category: item.category || 'GENERAL' });
                                }}
                                className="bg-blue-50 text-blue-600 py-3 rounded-xl font-black uppercase text-[8px] tracking-widest flex items-center justify-center gap-1 border border-blue-100 active:scale-95"
                            >
                                <Pencil size={12} /> Editar
                            </button>
                            <button
                                onClick={() => {
                                    setAdjustItem(item);
                                    setAdjustValue(item.currentStock?.toString() || '0');
                                }}
                                className="bg-slate-50 text-slate-500 py-3 rounded-xl font-black uppercase text-[8px] tracking-widest flex items-center justify-center gap-1 border border-slate-100 active:scale-95"
                            >
                                <RefreshCw size={12} /> Ajust
                            </button>
                            <button
                                onClick={() => {
                                    setRestockItem(item);
                                    setRestockData({ quantity: '', unitCost: item.costPerUnit?.toString() || '' });
                                }}
                                className="bg-slate-900 text-white py-3 rounded-xl font-black uppercase text-[8px] tracking-widest flex items-center justify-center gap-1 shadow-lg active:scale-95"
                            >
                                <TrendingUp size={12} /> Repo
                            </button>
                            <button
                                onClick={() => {
                                    setWasteItem(item);
                                    setWasteData({ quantity: '', reason: 'EXPIRED', note: '' });
                                }}
                                className="bg-red-50 text-red-500 py-3 rounded-xl font-black uppercase text-[8px] tracking-widest flex items-center justify-center gap-1 border border-red-100 active:scale-95"
                            >
                                <Trash2 size={12} /> Merma
                            </button>
                            <button
                                onClick={() => setDeleteItem(item)}
                                className="bg-red-600 text-white py-3 rounded-xl font-black uppercase text-[8px] tracking-widest flex items-center justify-center gap-1 shadow-lg active:scale-95 col-span-4"
                            >
                                <X size={12} /> Eliminar Producto
                            </button>

                        </div>
                    </div>
                ))}
            </div>

            {/* Creating Insumo Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-10 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-50">
                            <h3 className="text-2xl font-black italic uppercase text-slate-900 tracking-tighter">Registrar <span className="text-orange-500">Nuevo Insumo</span></h3>
                            <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X size={24} /></button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Nombre */}
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block italic">Nombre del Insumo</label>
                                <input className="w-full bg-slate-50 p-4 rounded-2xl font-black italic outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all border border-transparent" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="Ej: Salmón Fresco" autoFocus />
                            </div>

                            {/* Categoría */}
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block italic">Categoría</label>
                                {!showNewCategoryInput ? (
                                    <div className="flex gap-2">
                                        <select className="flex-1 bg-slate-50 p-4 rounded-2xl font-black italic outline-none focus:ring-2 focus:ring-orange-500 transition-all border border-transparent" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                                            <option value="">Seleccionar categoría...</option>
                                            {dynamicCategories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setShowNewCategoryInput(true)}
                                            className="px-4 py-2 bg-orange-500 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-orange-600 transition-all whitespace-nowrap"
                                        >
                                            + Nueva
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            className="flex-1 bg-slate-50 p-4 rounded-2xl font-black italic outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all border border-transparent uppercase"
                                            value={newCategoryInput}
                                            onChange={e => setNewCategoryInput(e.target.value.toUpperCase())}
                                            placeholder="Ej: ÚTILES DE ASEO"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (newCategoryInput.trim()) {
                                                    setNewItem({ ...newItem, category: newCategoryInput.trim() });
                                                    setShowNewCategoryInput(false);
                                                    setNewCategoryInput('');
                                                }
                                            }}
                                            className="px-4 py-2 bg-green-500 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-green-600 transition-all"
                                        >
                                            OK
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setShowNewCategoryInput(false); setNewCategoryInput(''); }}
                                            className="px-3 py-2 bg-slate-200 text-slate-500 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-300 transition-all"
                                        >
                                            X
                                        </button>
                                    </div>
                                )}
                                {newItem.category && (
                                    <p className="text-[9px] font-bold text-orange-500 mt-1 italic">Categoría seleccionada: {newItem.category}</p>
                                )}
                            </div>

                            {/* Rol */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block italic">Rol en Producción</label>
                                <select className="w-full bg-slate-50 p-4 rounded-2xl font-black italic outline-none focus:ring-2 focus:ring-orange-500 transition-all border border-transparent" value={newItem.role} onChange={e => setNewItem({ ...newItem, role: e.target.value })}>
                                    <option value="BASE">Base / Abarrote</option>
                                    <option value="PROTEIN_MAIN">Proteína Principal</option>
                                    <option value="PROTEIN_SPECIAL">Proteína Premium</option>
                                    <option value="VEGGIE">Verdura / Vegetal</option>
                                    <option value="SAUCE">Salsa / Aderezo</option>
                                    <option value="PACKAGING">Packaging</option>
                                </select>
                            </div>

                            {/* Tipo */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block italic">Tipo</label>
                                <select className="w-full bg-slate-50 p-4 rounded-2xl font-black italic outline-none focus:ring-2 focus:ring-orange-500 transition-all border border-transparent" value={newItem.type} onChange={e => setNewItem({ ...newItem, type: e.target.value })}>
                                    <option value="RAW">🪨 Materia Prima</option>
                                    <option value="PREPARED">🍳 Preparado / Sub-receta</option>
                                    <option value="PACKAGING">📦 Envase / Empaque</option>
                                </select>
                            </div>

                            {/* Unidad */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block italic">Unidad de Medida</label>
                                <select className="w-full bg-slate-50 p-4 rounded-2xl font-black italic outline-none focus:ring-2 focus:ring-orange-500 transition-all border border-transparent" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })}>
                                    <option value="KG">Kilogramo (KG)</option>
                                    <option value="GR">Gramo (GR)</option>
                                    <option value="LT">Litro (LT)</option>
                                    <option value="ML">Mililitro (ML)</option>
                                    <option value="UN">Unidad (UN)</option>
                                </select>
                            </div>

                            {/* Rendimiento */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block italic">Rendimiento %</label>
                                <input type="number" className="w-full bg-slate-50 p-4 rounded-2xl font-black italic outline-none focus:ring-2 focus:ring-orange-500 transition-all border border-transparent text-center" value={newItem.yield} onChange={e => setNewItem({ ...newItem, yield: e.target.value })} placeholder="100" />
                                <p className="text-[8px] text-slate-400 mt-1 italic text-center">100% = sin merma | 60% = 40% pérdida en limpieza</p>
                            </div>

                            {/* Precio Compra */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block italic">Precio Compra ($ por {newItem.unit})</label>
                                <input type="number" className="w-full bg-slate-50 p-4 rounded-2xl font-black italic outline-none focus:ring-2 focus:ring-orange-500 transition-all border border-transparent text-center" value={newItem.purchasePrice} onChange={e => setNewItem({ ...newItem, purchasePrice: e.target.value })} placeholder="$0" />
                            </div>

                            {/* Stock Inicial */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block italic">Stock Inicial ({newItem.unit})</label>
                                <input type="number" className="w-full bg-slate-50 p-4 rounded-2xl font-black italic outline-none focus:ring-2 focus:ring-orange-500 transition-all border border-transparent text-center" value={newItem.currentStock} onChange={e => setNewItem({ ...newItem, currentStock: e.target.value })} placeholder="0" />
                            </div>

                            {/* Umbral Mínimo */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block italic">Alerta Stock Mínimo</label>
                                <input type="number" className="w-full bg-slate-50 p-4 rounded-2xl font-black italic outline-none focus:ring-2 focus:ring-orange-500 transition-all border border-transparent text-center" value={newItem.minStock} onChange={e => setNewItem({ ...newItem, minStock: e.target.value })} placeholder="10" />
                            </div>

                            {/* Preview costo neto */}
                            {newItem.purchasePrice && (
                                <div className="md:col-span-2 bg-orange-50 p-4 rounded-2xl border border-orange-100 text-center">
                                    <p className="text-[10px] font-black uppercase text-orange-400 tracking-widest italic">Costo Neto Calculado (PMP)</p>
                                    <p className="text-3xl font-black italic text-orange-600 tracking-tighter">
                                        ${Math.round(Number(newItem.purchasePrice) / ((Number(newItem.yield) || 100) / 100)).toLocaleString()}
                                        <span className="text-sm text-orange-400"> /{newItem.unit}</span>
                                    </p>
                                </div>
                            )}

                            <div className="md:col-span-2 grid grid-cols-2 gap-4 mt-4">
                                <button onClick={() => setIsCreating(false)} className="py-4 font-black uppercase text-slate-400 text-[10px] tracking-widest hover:text-slate-900 transition-colors italic">Cancelar</button>
                                <button onClick={handleCreate} className="bg-slate-900 text-white py-4 rounded-2xl font-black uppercase italic tracking-widest shadow-xl text-[11px] hover:bg-orange-600 transition-all">Crear Insumo →</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Restock Modal */}
            {restockItem && (
                <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-500">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 mx-auto mb-4">
                                <TrendingUp size={32} />
                            </div>
                            <h3 className="text-2xl font-black italic uppercase text-slate-900 tracking-tighter">Reponer <span className="text-orange-500">{restockItem.name}</span></h3>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-2 px-10">Se registrará una compra y se recalculará el PMP en la base de datos</p>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block italic">Cantidad Comprada ({restockItem.unit})</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    className="w-full bg-slate-50 p-5 rounded-2xl font-black italic text-3xl outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all text-center border border-transparent shadow-inner"
                                    value={restockData.quantity}
                                    onChange={e => setRestockData({ ...restockData, quantity: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block italic">Costo Neto Unitario ($)</label>
                                <input
                                    type="number"
                                    placeholder="$ 0.00"
                                    className="w-full bg-slate-50 p-4 rounded-2xl font-black italic text-xl outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all text-center border border-transparent shadow-inner"
                                    value={restockData.unitCost}
                                    onChange={e => setRestockData({ ...restockData, unitCost: e.target.value })}
                                />
                            </div>

                            {/* Rendimiento / Yield */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block italic flex items-center gap-2">
                                    <Percent size={12} className="text-orange-500" /> Rendimiento del Insumo (%)
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="1" max="100"
                                        placeholder="100"
                                        className="flex-1 bg-slate-50 p-4 rounded-2xl font-black italic text-xl outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all text-center border border-transparent shadow-inner"
                                        value={restockData.yieldPercent}
                                        onChange={e => setRestockData({ ...restockData, yieldPercent: e.target.value })}
                                    />
                                    <div className="flex gap-1">
                                        {[70, 80, 90, 100].map(pct => (
                                            <button
                                                key={pct}
                                                onClick={() => setRestockData({ ...restockData, yieldPercent: pct.toString() })}
                                                className={`px-3 py-2 rounded-xl font-black text-[9px] transition-all ${
                                                    restockData.yieldPercent === pct.toString()
                                                        ? 'bg-orange-500 text-white shadow-md'
                                                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                                }`}
                                            >
                                                {pct}%
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Live Preview */}
                            {restockData.quantity && Number(restockData.yieldPercent) < 100 && (
                                <div className="bg-green-50 border border-green-100 rounded-2xl p-4 space-y-1 animate-in fade-in">
                                    <p className="text-[10px] font-black uppercase text-green-700 tracking-widest italic">📊 Resumen con Merma</p>
                                    <div className="flex justify-between text-xs font-bold text-slate-600">
                                        <span>Compra bruta:</span>
                                        <span>{restockData.quantity} {restockItem.unit}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-red-500">
                                        <span>Merma ({100 - Number(restockData.yieldPercent)}%):</span>
                                        <span>-{(Number(restockData.quantity) * (1 - Number(restockData.yieldPercent) / 100)).toFixed(2)} {restockItem.unit}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-black text-green-700 pt-1 border-t border-green-200">
                                        <span>Stock útil a ingresar:</span>
                                        <span>{(Number(restockData.quantity) * Number(restockData.yieldPercent) / 100).toFixed(2)} {restockItem.unit}</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-3 mt-4">
                                <button onClick={handleRestock} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase italic tracking-widest shadow-xl text-xs hover:bg-green-600 transition-all flex items-center justify-center gap-3">
                                    <Save size={18} /> Confirmar Ingreso Stock
                                </button>
                                <button onClick={() => setRestockItem(null)} className="w-full py-2 font-black uppercase text-slate-400 text-[10px] tracking-widest hover:text-red-500 transition-colors italic">Cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Adjustment Modal */}
            {adjustItem && (
                <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden relative">
                        {/* Decorative background icon */}
                        <RefreshCw size={120} className="absolute -top-10 -right-10 text-slate-50 opacity-10 rotate-12" />

                        <div className="text-center mb-8 relative z-10">
                            <div className="w-20 h-20 rounded-[2rem] bg-slate-900 flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-slate-200">
                                <ClipboardCheck size={36} />
                            </div>
                            <h3 className="text-3xl font-black italic uppercase text-slate-900 tracking-tighter leading-none">AJUSTE <span className="text-slate-400">ESTRATÉGICO</span></h3>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mt-3 bg-slate-100 py-1.5 px-3 rounded-full inline-block">{adjustItem.name}</p>
                        </div>

                        <div className="space-y-6 relative z-10">
                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 block text-center italic">Ingresa el Stock Real Verificado</label>
                                <div className="flex flex-col items-center">
                                    <div className="relative w-full">
                                        <input
                                            type="number"
                                            placeholder={adjustItem.currentStock || '0'}
                                            className="w-full bg-white p-6 rounded-2xl font-black italic text-5xl outline-none ring-4 ring-transparent focus:ring-slate-900/5 transition-all text-center border-2 border-slate-100 focus:border-slate-900 text-slate-900 shadow-sm"
                                            value={adjustValue}
                                            onChange={e => setAdjustValue(e.target.value)}
                                            autoFocus
                                            step="0.01"
                                        />
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300 uppercase italic text-sm">
                                            {adjustItem.unit}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest italic">
                                        <History size={14} /> Stock Actual en Sistema: {adjustItem.currentStock} {adjustItem.unit}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleAdjustStock}
                                    className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase italic tracking-[0.2em] shadow-2xl shadow-slate-300 hover:bg-orange-600 hover:shadow-orange-200 transition-all flex items-center justify-center gap-4 active:scale-95 group"
                                >
                                    <span>ACTUALIZAR BASE DE DATOS</span>
                                    <ArrowUpRight size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </button>
                                <button onClick={() => setAdjustItem(null)} className="w-full py-2 font-black uppercase text-slate-400 text-[10px] tracking-widest hover:text-red-500 transition-colors italic">Cancelar Operación</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Waste / Merma Modal */}
            {wasteItem && (
                <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden relative">
                        <Trash2 size={120} className="absolute -top-10 -right-10 text-red-50 opacity-20 rotate-12" />

                        <div className="text-center mb-8 relative z-10">
                            <div className="w-20 h-20 rounded-[2rem] bg-red-500 flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-red-200">
                                <Trash2 size={36} />
                            </div>
                            <h3 className="text-3xl font-black italic uppercase text-slate-900 tracking-tighter leading-none">REGISTRAR <span className="text-red-500">MERMA</span></h3>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mt-3 bg-slate-100 py-1.5 px-3 rounded-full inline-block">{wasteItem.name} — Stock: {wasteItem.currentStock} {wasteItem.unit}</p>
                        </div>

                        <div className="space-y-5 relative z-10">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block italic">Cantidad Perdida ({wasteItem.unit})</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    className="w-full bg-slate-50 p-5 rounded-2xl font-black italic text-3xl outline-none focus:bg-white focus:ring-2 focus:ring-red-500 transition-all text-center border border-transparent shadow-inner"
                                    value={wasteData.quantity}
                                    onChange={e => setWasteData({ ...wasteData, quantity: e.target.value })}
                                    autoFocus
                                    step="0.01"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block italic">Razón de la Merma</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { value: 'EXPIRED', label: '🕐 Vencido', color: 'orange' },
                                        { value: 'DAMAGED', label: '💥 Dañado', color: 'red' },
                                        { value: 'OVERPRODUCTION', label: '📦 Sobrante', color: 'blue' },
                                        { value: 'SPILL', label: '💧 Derrame', color: 'purple' },
                                        { value: 'OTHER', label: '📋 Otro', color: 'slate' },
                                    ].map(r => (
                                        <button
                                            key={r.value}
                                            onClick={() => setWasteData({ ...wasteData, reason: r.value })}
                                            className={`py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all ${
                                                wasteData.reason === r.value
                                                    ? 'bg-red-500 text-white shadow-lg'
                                                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                            }`}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block italic">Nota (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Salmón llegó en mal estado del proveedor"
                                    className="w-full bg-slate-50 p-4 rounded-2xl font-bold italic text-sm outline-none focus:bg-white focus:ring-2 focus:ring-red-500 transition-all border border-transparent"
                                    value={wasteData.note}
                                    onChange={e => setWasteData({ ...wasteData, note: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col gap-3 mt-4">
                                <button
                                    onClick={handleWaste}
                                    className="w-full bg-red-500 text-white py-5 rounded-[2rem] font-black uppercase italic tracking-[0.2em] shadow-2xl shadow-red-200 hover:bg-red-600 transition-all flex items-center justify-center gap-4 active:scale-95"
                                >
                                    <Trash2 size={18} /> CONFIRMAR MERMA
                                </button>
                                <button onClick={() => setWasteItem(null)} className="w-full py-2 font-black uppercase text-slate-400 text-[10px] tracking-widest hover:text-red-500 transition-colors italic">Cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Ingredient Modal */}
            {editItem && (
                <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-10 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-50">
                            <h3 className="text-2xl font-black italic uppercase text-slate-900 tracking-tighter">Editar <span className="text-blue-500">{editItem.name}</span></h3>
                            <button onClick={() => setEditItem(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X size={24} /></button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Nombre */}
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block italic">Nombre del Insumo</label>
                                <input className="w-full bg-slate-50 p-4 rounded-2xl font-black italic outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all border border-transparent" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
                            </div>

                            {/* Categoría (editable) */}
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block italic">Categoría</label>
                                <div className="flex gap-2">
                                    <select className="flex-1 bg-slate-50 p-4 rounded-2xl font-black italic outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all border border-transparent appearance-none" value={editData.category} onChange={e => setEditData({ ...editData, category: e.target.value })}>
                                        {dynamicCategories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                        {editData.category && !dynamicCategories.includes(editData.category) && (
                                            <option value={editData.category}>{editData.category}</option>
                                        )}
                                    </select>
                                    <input
                                        className="w-40 bg-slate-50 p-4 rounded-2xl font-black italic outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all border border-transparent uppercase text-[11px]"
                                        placeholder="O escribir nueva..."
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                const val = (e.target as HTMLInputElement).value.trim().toUpperCase();
                                                if (val) { setEditData({ ...editData, category: val }); (e.target as HTMLInputElement).value = ''; }
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Rol */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block italic">Rol en Producción</label>
                                <select className="w-full bg-slate-50 p-4 rounded-2xl font-black italic outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all border border-transparent appearance-none" value={editData.role} onChange={e => setEditData({ ...editData, role: e.target.value })}>
                                    <option value="PROTEIN_MAIN">Proteína Principal</option>
                                    <option value="PROTEIN_SPECIAL">Proteína Especial</option>
                                    <option value="VEGGIE">Vegetal / Fresco</option>
                                    <option value="BASE">Base / Cereal</option>
                                    <option value="SAUCE">Salsa / Aderezo</option>
                                    <option value="PACKAGING">Envase / Packaging</option>
                                </select>
                            </div>

                            {/* Tipo */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block italic">Tipo</label>
                                <select className="w-full bg-slate-50 p-4 rounded-2xl font-black italic outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all border border-transparent appearance-none" value={editData.type} onChange={e => setEditData({ ...editData, type: e.target.value })}>
                                    <option value="RAW">🧊 Materia Prima</option>
                                    <option value="PREPARED">🍲 Preparado / Sub-receta</option>
                                    <option value="PACKAGING">📦 Empaque</option>
                                </select>
                            </div>

                            {/* Unidad */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block italic">Unidad de Medida</label>
                                <select className="w-full bg-slate-50 p-4 rounded-2xl font-black italic outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all border border-transparent appearance-none" value={editData.unit} onChange={e => setEditData({ ...editData, unit: e.target.value })}>
                                    <option value="KG">KG – Kilogramo</option>
                                    <option value="GR">GR – Gramo</option>
                                    <option value="LT">LT – Litro</option>
                                    <option value="ML">ML – Mililitro</option>
                                    <option value="UN">UN – Unidad</option>
                                </select>
                            </div>

                            {/* Costo Unitario */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block italic">Costo por {editData.unit}</label>
                                <div className="relative">
                                    <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input type="number" className="w-full bg-slate-50 p-4 pl-10 rounded-2xl font-black italic outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all border border-transparent" value={editData.costPerUnit} onChange={e => setEditData({ ...editData, costPerUnit: e.target.value })} />
                                </div>
                            </div>

                            {/* Umbral Mínimo */}
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block italic">🔔 Alerta de Stock Mínimo ({editData.unit})</label>
                                <input type="number" className="w-full bg-slate-50 p-4 rounded-2xl font-black italic outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all border border-transparent" value={editData.minStockThreshold} onChange={e => setEditData({ ...editData, minStockThreshold: e.target.value })} placeholder="10" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 mt-8">
                            <button
                                onClick={async () => {
                                    try {
                                        const res = await authFetch(`${API_URL}/inventory/${editItem.id}`, {
                                            method: 'PATCH',
                                            body: JSON.stringify(editData)
                                        });
                                        if (res.ok) {
                                            alert('✅ Ingrediente actualizado');
                                            setEditItem(null);
                                            loadData();
                                        } else {
                                            alert('Error al actualizar');
                                        }
                                    } catch { alert('Error de conexión'); }
                                }}
                                className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase italic tracking-[0.2em] shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-4 active:scale-95"
                            >
                                <Save size={18} /> GUARDAR CAMBIOS
                            </button>
                            <button onClick={() => setEditItem(null)} className="w-full py-2 font-black uppercase text-slate-400 text-[10px] tracking-widest hover:text-blue-500 transition-colors italic">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteItem && (
                <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden relative">
                        <X size={120} className="absolute -top-10 -right-10 text-red-50 opacity-20 rotate-12" />

                        <div className="text-center mb-8 relative z-10">
                            <div className="w-20 h-20 rounded-[2rem] bg-red-600 flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-red-200 animate-pulse">
                                <AlertCircle size={36} />
                            </div>
                            <h3 className="text-3xl font-black italic uppercase text-slate-900 tracking-tighter leading-none">ELIMINAR <span className="text-red-600">PRODUCTO</span></h3>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mt-3 bg-slate-100 py-1.5 px-3 rounded-full inline-block">{deleteItem.name}</p>
                        </div>

                        <div className="space-y-5 relative z-10">
                            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                                <p className="text-[10px] font-black uppercase text-red-600 tracking-widest italic mb-3">⚠️ ACCIÓN IRREVERSIBLE</p>
                                <ul className="space-y-2 text-xs font-bold text-slate-600">
                                    <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">•</span> Se eliminará <strong>"{deleteItem.name}"</strong> permanentemente del inventario.</li>
                                    <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">•</span> Stock actual: <strong>{deleteItem.currentStock} {deleteItem.unit}</strong></li>
                                    <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">•</span> Si está vinculado a recetas, podría generar errores.</li>
                                </ul>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="w-full bg-red-600 text-white py-5 rounded-[2rem] font-black uppercase italic tracking-[0.2em] shadow-2xl shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {deleting ? <Loader2 size={18} className="animate-spin" /> : <X size={18} />}
                                    {deleting ? 'ELIMINANDO...' : 'SÍ, ELIMINAR PERMANENTEMENTE'}
                                </button>
                                <button onClick={() => setDeleteItem(null)} className="w-full py-2 font-black uppercase text-slate-400 text-[10px] tracking-widest hover:text-slate-900 transition-colors italic">Cancelar — No eliminar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
