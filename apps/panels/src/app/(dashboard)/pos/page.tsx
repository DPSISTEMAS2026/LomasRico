'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Search,
    Trash2,
    Plus,
    Minus,
    CreditCard,
    Banknote,
    Truck,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    ChevronRight,
    ShoppingBag,
    Loader2,
    Lock,
    Unlock,
    DollarSign,
    X,
    ArrowUpCircle,
    ArrowDownCircle,
    Clock,
    Printer,
    Coins,
    MessageSquare,
    AlertTriangle,
    Settings2
} from 'lucide-react';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { PROTEINS, VEGGIES } from '@lomasrico/shared-types';
import type { CashierShift, AppUser, ShiftTransaction } from '@lomasrico/shared-types';
import { createSale, getShippingQuote, simulateMPCallback, fetchCatalog, API_URL } from '../../../services/api';
import { authFetch } from '../../../services/authFetch';
import { useAuth } from '../../../context/AuthContext';
import { CevicheBuilderModal } from '../../../components/modals/CevicheBuilderModal';
import { ComandaPrinter } from '../../../components/printer/ComandaPrinter';
import AddressAutocomplete from '../../../components/common/AddressAutocomplete';
import { Product, CartItem } from '../../../types';

// ─── Extracted POS Modals ──────────────────────────────────
import { OpenShiftModal } from '../../../components/pos/OpenShiftModal';
import { CloseShiftModal } from '../../../components/pos/CloseShiftModal';
import { WithdrawalModal } from '../../../components/pos/WithdrawalModal';
import { DiscountModal } from '../../../components/pos/DiscountModal';

// ─────────────────────────────────────────────
// Página Principal del POS
// ─────────────────────────────────────────────
export default function POSPage() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [selectedProductForConfig, setSelectedProductForConfig] = useState<Product | null>(null);

    // Shipping & Checkout State
    const [shippingCost, setShippingCost] = useState(0);
    const [shippingAddress, setShippingAddress] = useState('');
    const [shippingStatus, setShippingStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MP' | 'TRANSFER'>('CASH');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeShift, setActiveShift] = useState<CashierShift | null>(null);
    const [loadingShift, setLoadingShift] = useState(true);

    // Modals
    const [showOpenShift, setShowOpenShift] = useState(false);
    const [showCloseShift, setShowCloseShift] = useState(false);
    const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

    // Delivery Mode
    const [deliveryMode, setDeliveryMode] = useState<'EXTERNAL' | 'INTERNAL'>('EXTERNAL');
    const [loadingDeliveryMode, setLoadingDeliveryMode] = useState(false);
    const [deliveryRadius, setDeliveryRadius] = useState(8);
    const [showRadiusConfig, setShowRadiusConfig] = useState(false);
    const [tempRadius, setTempRadius] = useState(8);

    // Discount State
    const [discount, setDiscount] = useState(0);
    const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('FIXED');
    const [showDiscountModal, setShowDiscountModal] = useState(false);
    const [orderNote, setOrderNote] = useState('');

    // Customer Selection
    const [selectedCustomer, setSelectedCustomer] = useState<AppUser | null>(null);
    const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
    const [customers, setCustomers] = useState<AppUser[]>([]);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');

    // Debounced Customer Search
    useEffect(() => {
        const identifier = setTimeout(async () => {
            if (customerSearchTerm.length > 2) {
                try {
                    const res = await authFetch(`${API_URL}/users/customers/list?search=${customerSearchTerm}`);
                    if (res.ok) setCustomers(await res.json());
                } catch (e) { console.error('Error searching customers:', e); }
            } else if (customerSearchTerm.length === 0) {
                setCustomers([]);
            }
        }, 300);
        return () => clearTimeout(identifier);
    }, [customerSearchTerm]);

    // Printer
    const [lastSaleForPrint, setLastSaleForPrint] = useState<{ code: string, items: CartItem[], channel: string } | null>(null);
    const printerRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: printerRef as any,
        onAfterPrint: () => setLastSaleForPrint(null)
    });

    // Auto-trigger print when lastSaleForPrint is set
    useEffect(() => {
        if (lastSaleForPrint && printerRef.current) {
            handlePrint();
        }
    }, [lastSaleForPrint, handlePrint]);

    const { user } = useAuth();
    const isOwnerOrAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';
    const canApplyDiscount = isOwnerOrAdmin || (user as AppUser | null)?.canDiscount;

    useEffect(() => {
        loadProducts();
        if (user) loadActiveShift();
        loadDeliveryMode();
    }, [user]);

    const loadDeliveryMode = async () => {
        try {
            const res = await authFetch(`${API_URL}/shipping/config/mode`);
            const data = await res.json();
            setDeliveryMode(data.mode);
            if (data.maxDistanceKm) {
                setDeliveryRadius(data.maxDistanceKm);
                setTempRadius(data.maxDistanceKm);
            }
        } catch (e) {
            console.error('Error loading delivery mode:', e);
        }
    };

    const toggleDeliveryMode = async () => {
        const nextMode = deliveryMode === 'EXTERNAL' ? 'INTERNAL' : 'EXTERNAL';
        setLoadingDeliveryMode(true);
        try {
            const res = await authFetch(`${API_URL}/shipping/config/mode`, {
                method: 'POST',
                body: JSON.stringify({ mode: nextMode })
            });
            const data = await res.json();
            setDeliveryMode(data.mode);
        } catch (e) {
            alert('Error al cambiar modo de despacho');
        } finally {
            setLoadingDeliveryMode(false);
        }
    };

    const loadActiveShift = async () => {
        if (!user?.id) { setLoadingShift(false); return; }
        setLoadingShift(true);
        try {
            const res = await authFetch(`${API_URL}/shifts/active/${user.id}`);
            const text = await res.text();
            if (text && text !== 'null' && text.trim() !== '') {
                setActiveShift(JSON.parse(text));
            } else {
                setActiveShift(null);
            }
        } catch (e) {
            console.error('Error fetching shift:', e);
            setActiveShift(null);
        } finally {
            setLoadingShift(false);
        }
    };

    const loadProducts = async () => {
        try {
            const data = await fetchCatalog();
            setProducts(data);
        } catch (e) {
            console.error('Error fetching catalog:', e);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (itemData: any) => {
        const tempId = Math.random().toString(36).substring(7);
        setCart(prev => [...prev, { ...itemData, tempId }]);
    };

    const removeFromCart = (tempId: string) => setCart(prev => prev.filter(i => i.tempId !== tempId));

    const updateQuantity = (tempId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.tempId !== tempId) return item;
            const newQty = item.quantity + delta;
            // Respetar límite de maxQuantity del inventario
            const maxQ = (item as any).maxQuantity || 999;
            return { ...item, quantity: Math.max(1, Math.min(newQty, maxQ)) };
        }));
    };

    const handleProductClick = (product: Product) => {
        // Bloquear productos agotados
        if (product.available === false) return;

        const needsConfig = product.isConfigurable || product.allowsModifiers;
        if (needsConfig) {
            setSelectedProductForConfig(product);
        } else {
            addToCart({
                productId: product.id,
                variantId: 'default',
                name: product.name,
                price: product.price,
                quantity: 1,
                modifiers: { selectedProteins: [], removedIngredients: [] },
                maxQuantity: product.maxQuantity
            });
        }
    };

    const handleCheckout = async () => {
        if (cart.length === 0 || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const saleRes = await createSale(cart, {
                channel: 'POS',
                paymentMethod,
                shiftId: activeShift?.id || undefined,
                userId: selectedCustomer?.id || user?.id,
                shippingData: shippingCost > 0 ? { cost: shippingCost, address: shippingAddress || 'POS_Manual' } : undefined,
                discount: discount > 0 ? discount : undefined,
                discountType: discount > 0 ? discountType : undefined,
                note: orderNote || undefined
            });

            if (paymentMethod === 'MP') {
                const shouldApprove = confirm(`Simular cobro MercadoPago por $${(total + shippingCost).toLocaleString()}?`);
                if (shouldApprove) {
                    await simulateMPCallback(saleRes.id, 'APPROVED');
                    alert('Venta aprobada y enviada a cocina.');
                    setLastSaleForPrint({ code: saleRes.code, items: [...cart], channel: 'POS_MP' });
                } else {
                    alert('Venta pendiente de pago.');
                }
            } else {
                alert(`✓ Venta cobrada! Código: ${saleRes.code}`);
                setLastSaleForPrint({ code: saleRes.code, items: [...cart], channel: paymentMethod === 'TRANSFER' ? 'POS_TRANSFER' : 'POS_EFECTIVO' });
            }
            setCart([]);
            setShippingCost(0);
            setShippingAddress('');
            setShippingStatus('idle');
            setDiscount(0);
            setDiscountType('FIXED');
            setSelectedCustomer(null);
            setOrderNote('');
            // Refrescar catálogo para actualizar disponibilidad después de venta
            loadProducts();
        } catch (e: any) {
            alert(`Error en la venta: ${e.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleShippingQuote = async (data: { address: string; lat?: number; lng?: number }) => {
        const { address, lat, lng } = data;
        setShippingAddress(address);
        if (!address) { setShippingCost(0); setShippingStatus('idle'); return; }
        setShippingStatus('loading');
        try {
            const quote = await getShippingQuote(address, lat && lng ? { lat, lng } : undefined);
            setShippingCost(quote.cost || 0);
            setShippingStatus(quote.valid ? 'ok' : 'error');
        } catch {
            setShippingCost(3000);
            setShippingStatus('error');
        }
    };

    const categories = useMemo(() => {
        const unique = Array.from(new Set(products.map(p => p.category))).filter((c): c is string => !!c);
        return [
            { id: 'ALL', label: 'Todo' },
            ...unique.sort().map(cat => ({ id: cat, label: cat }))
        ];
    }, [products]);

    const subtotal = cart.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);
    const initialTotal = subtotal + shippingCost;
    const discountValue = discountType === 'PERCENT' ? (initialTotal * (discount / 100)) : discount;
    const total = Math.max(0, initialTotal - discountValue);

    const filteredProducts = products.filter(p => {
        if (!p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (selectedCategory === 'ALL') return true;
        if (selectedCategory === 'CEVICHE LOMASRICO') return p.category.includes('CEVICHE');
        return p.category === selectedCategory;
    });

    const canSell = isOwnerOrAdmin || !!activeShift;
    const shiftOpenTime = activeShift?.openingTime
        ? new Date(activeShift.openingTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
        : null;
    const shiftSalesTotal = (activeShift?.transactions || [])
        .filter((t: ShiftTransaction) => t.type === 'SALE_INCOME')
        .reduce((s: number, t: ShiftTransaction) => s + Number(t.amount), 0);

    const [mobileTab, setMobileTab] = useState<'CATALOG' | 'CART'>('CATALOG');

    return (
        <div className="flex-1 flex flex-col xl:grid xl:grid-cols-[1fr,420px] gap-4 xl:h-full p-2 md:p-4 xl:overflow-hidden min-h-0 bg-slate-50/50">

            {/* Mobile Tab Switcher */}
            <div className="xl:hidden flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100 mb-2 shrink-0">
                <button
                    onClick={() => setMobileTab('CATALOG')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase italic text-[10px] tracking-widest transition-all ${mobileTab === 'CATALOG' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
                >
                    <ShoppingBag size={14} /> Catálogo
                </button>
                <button
                    onClick={() => setMobileTab('CART')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase italic text-[10px] tracking-widest transition-all relative ${mobileTab === 'CART' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
                >
                    <ShoppingBag size={14} /> Carrito
                    {cart.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-orange-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[8px] border-2 border-white animate-bounce">
                            {cart.length}
                        </span>
                    )}
                </button>
            </div>

            {/* ── Catálogo (Izquierda) ───────────────────────── */}
            <div className={`flex flex-col gap-4 overflow-hidden min-h-0 ${mobileTab === 'CART' ? 'hidden xl:flex' : 'flex'}`}>

                {/* Barra de turno */}
                {!loadingShift && (
                    <div className={`flex flex-col md:flex-row items-center justify-between px-4 md:px-6 py-4 md:py-3 rounded-[1.5rem] md:rounded-[20px] border-2 gap-4 ${activeShift ? 'bg-white border-green-200' : 'bg-white border-amber-200 shadow-sm'}`}>
                        <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start">
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${activeShift ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-amber-400'}`} />
                            {activeShift ? (
                                <div className="text-center md:text-left">
                                    <p className="text-[10px] md:text-xs font-black uppercase text-slate-900 italic leading-none">Caja en Producción</p>
                                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Desde {shiftOpenTime} · <span className="text-green-600">${shiftSalesTotal.toLocaleString()}</span></p>
                                </div>
                            ) : (
                                <span className="text-[10px] md:text-xs font-black uppercase text-amber-700 italic tracking-widest">
                                    {isOwnerOrAdmin ? 'MODO DIRECTO (SIN TURNO)' : 'TURNO CERRADO — BLOQUEADO'}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar justify-center">
                            <button
                                onClick={toggleDeliveryMode}
                                disabled={loadingDeliveryMode}
                                className={`flex items-center justify-center gap-2 px-6 md:px-4 py-3 md:py-2.5 rounded-xl md:rounded-xl text-[9px] md:text-[10px] font-black uppercase italic transition-all shadow-md shrink-0 active:scale-95 ${deliveryMode === 'EXTERNAL' ? 'bg-slate-900 text-white' : 'bg-orange-500 text-white'}`}
                            >
                                <Truck size={14} className="shrink-0" />
                                {loadingDeliveryMode ? '...' : (deliveryMode === 'EXTERNAL' ? 'PedidosYa' : 'Propio')}
                            </button>

                            {/* Gear: Delivery Radius Config */}
                            <div className="relative">
                                <button
                                    onClick={() => { setTempRadius(deliveryRadius); setShowRadiusConfig(!showRadiusConfig); }}
                                    className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-all shrink-0 active:scale-90 ${
                                        showRadiusConfig ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400 hover:text-slate-600'
                                    }`}
                                    title="Configurar radio de delivery"
                                >
                                    <Settings2 size={16} className={showRadiusConfig ? 'animate-spin' : ''} />
                                </button>
                                {showRadiusConfig && (
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white rounded-2xl shadow-2xl border-2 border-slate-900 p-5 w-[280px] animate-in fade-in zoom-in-95 duration-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Radio Delivery</span>
                                            <button onClick={() => setShowRadiusConfig(false)} className="text-slate-300 hover:text-red-500">
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-3 mb-3">
                                            <button
                                                onClick={() => setTempRadius(Math.max(1, tempRadius - 1))}
                                                className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-600 hover:bg-slate-200 active:scale-90 transition-all"
                                            >
                                                <Minus size={16} />
                                            </button>
                                            <div className="flex-1 text-center">
                                                <span className="text-3xl font-black text-slate-900 tabular-nums">{tempRadius}</span>
                                                <span className="text-sm font-black text-slate-400 ml-1">km</span>
                                            </div>
                                            <button
                                                onClick={() => setTempRadius(Math.min(50, tempRadius + 1))}
                                                className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-600 hover:bg-slate-200 active:scale-90 transition-all"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                        <input
                                            type="range" min={1} max={50} value={tempRadius}
                                            onChange={(e) => setTempRadius(Number(e.target.value))}
                                            className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-orange-500 mb-4"
                                        />
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const res = await authFetch(`${API_URL}/shipping/config/radius`, {
                                                        method: 'POST',
                                                        body: JSON.stringify({ km: tempRadius })
                                                    });
                                                    const data = await res.json();
                                                    setDeliveryRadius(data.maxDistanceKm);
                                                    setShowRadiusConfig(false);
                                                } catch (e) {
                                                    alert('Error al guardar radio');
                                                }
                                            }}
                                            className="w-full py-3 bg-orange-500 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-orange-600 transition-all active:scale-95 italic"
                                        >
                                            Guardar ({tempRadius}km)
                                        </button>
                                        <p className="text-[8px] font-bold text-slate-300 text-center mt-2 uppercase">Actual: {deliveryRadius}km · Web se actualiza en tiempo real</p>
                                    </div>
                                )}
                            </div>

                            {activeShift && (
                                <>
                                    <button
                                        onClick={() => setShowWithdrawalModal(true)}
                                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 text-[10px] font-black uppercase italic hover:bg-orange-500 hover:text-white transition-all shadow-sm shrink-0 active:scale-95"
                                    >
                                        <Coins size={14} /> Retiro Efec.
                                    </button>
                                    <button
                                        onClick={() => setShowCloseShift(true)}
                                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-500 border border-red-100 text-[10px] font-black uppercase italic hover:bg-red-500 hover:text-white transition-all shadow-sm shrink-0 active:scale-95"
                                    >
                                        <Lock size={14} /> Cerrar Caja
                                    </button>
                                </>
                            )}

                            {!activeShift && (
                                <button
                                    onClick={() => setShowOpenShift(true)}
                                    className="flex items-center justify-center gap-2 px-6 md:px-4 py-3 md:py-2.5 rounded-xl bg-green-500 text-white text-[9px] md:text-[10px] font-black uppercase italic hover:bg-green-600 transition-all shadow-xl shadow-green-200 shrink-0 active:scale-95"
                                >
                                    <Unlock size={14} /> Abrir Turno
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Search & Categories */}
                <div className="bg-white p-4 md:p-5 rounded-[2rem] md:rounded-[28px] shadow-sm border border-slate-100 flex flex-col gap-4">
                    <div className="relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar en el catálogo..."
                            className="w-full bg-slate-50 pl-14 pr-5 py-4 rounded-2xl font-bold border-2 border-transparent focus:bg-white focus:border-orange-500 outline-none transition-all text-sm md:text-base text-slate-900 shadow-inner"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar px-1 py-1">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-6 md:px-8 py-3 rounded-xl font-black uppercase italic tracking-tighter text-[10px] md:text-[11px] transition-all border-2 ${selectedCategory === cat.id ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105' : 'bg-white text-slate-400 border-slate-50 hover:border-slate-200 hover:text-slate-600 shadow-sm'}`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-1 pb-24 md:pb-10 xl:pb-0">
                    {loading ? (
                        <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 animate-pulse">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="bg-white aspect-[3/4] rounded-[2rem]" />)}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                            {filteredProducts.map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => handleProductClick(product)}
                                    disabled={product.available === false}
                                    className={`group relative rounded-[2rem] shadow-sm border p-3 transition-all flex flex-col gap-3 text-left overflow-hidden
                                        ${product.available === false
                                            ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                                            : 'bg-white border-slate-100 hover:shadow-2xl hover:-translate-y-1 active:scale-95'
                                        }`}
                                >
                                    <div className="aspect-square rounded-2xl overflow-hidden bg-slate-50 relative shrink-0">
                                        <img
                                            src={product.imageUrl || '/placeholder.png'}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            onError={e => (e.currentTarget.src = 'https://via.placeholder.com/300?text=Sin+Imagen')}
                                        />
                                        <div className="absolute top-3 right-3">
                                            <span className="bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[8px] md:text-[9px] font-black uppercase text-slate-900 shadow-sm border border-slate-100">
                                                {product.category.split(' ')[0]}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="px-1 flex flex-col flex-1">
                                        <h3 className={`font-black uppercase italic tracking-tighter text-xs md:text-sm leading-tight line-clamp-2 md:truncate mb-1 ${product.available === false ? 'text-slate-300' : 'text-slate-800'}`}>{product.name}</h3>
                                        {/* Stock Alert Badge */}
                                        {product.stockAlert && (
                                            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg inline-block w-fit mb-1
                                                ${product.available === false
                                                    ? 'bg-red-50 text-red-500 border border-red-100'
                                                    : product.maxQuantity && product.maxQuantity <= 3
                                                        ? 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse'
                                                        : 'bg-orange-50 text-orange-500 border border-orange-100'
                                                }`}>
                                                {product.stockAlert}
                                            </span>
                                        )}
                                        <div className="mt-auto flex justify-between items-center">
                                            <span className={`font-black text-base md:text-xl italic tracking-tighter ${product.available === false ? 'text-slate-300' : 'text-orange-500'}`}>${product.price.toLocaleString()}</span>
                                            {product.available === false ? (
                                                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-red-100 text-red-400 flex items-center justify-center">
                                                    <AlertTriangle size={14} />
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg group-hover:bg-orange-500 transition-colors">
                                                    <Plus size={16} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Ticket (Derecha) ───────────────────────────── */}
            <div className={`flex flex-col gap-4 overflow-hidden min-h-0 ${mobileTab === 'CATALOG' ? 'hidden xl:flex' : 'flex'}`}>
                <div className="flex-1 bg-white rounded-[2rem] md:rounded-[36px] shadow-sm border border-slate-100 flex flex-col overflow-hidden">

                    {/* Header Ticket */}
                    <div className="p-5 md:p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-xl shadow-orange-500/20">
                                <ShoppingBag className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                            <div>
                                <h1 className="font-black text-slate-900 tracking-tighter italic uppercase text-lg md:text-xl leading-none">Mi Comanda</h1>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5">
                                    {cart.length} Ítem{cart.length !== 1 ? 's' : ''} Seleccionados
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setCart([])} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Limpiar todo">
                            <Trash2 size={20} />
                        </button>
                    </div>

                    {/* Items */}
                    <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4 no-scrollbar bg-white">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-6 opacity-80 text-center py-20 px-10">
                                <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center border-4 border-dashed border-slate-100">
                                    <ShoppingBag size={48} strokeWidth={1} className="text-slate-100" />
                                </div>
                                <div className="space-y-4">
                                    <p className="font-black uppercase italic text-sm tracking-[0.3em] text-slate-300">Carrito vacío</p>
                                    <button
                                        onClick={() => setMobileTab('CATALOG')}
                                        className="text-[10px] font-black uppercase italic text-orange-500 hover:underline"
                                    >
                                        VER PRODUCTOS →
                                    </button>
                                </div>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.tempId} className="flex justify-between items-start gap-4 pb-4 border-b border-slate-50 animate-in fade-in slide-in-from-right-6 duration-300 group">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-black text-slate-900 uppercase tracking-tighter text-sm md:text-base italic truncate group-hover:text-orange-500 transition-colors">{item.name}</div>
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {item.modifiers.dynamicSelections?.map((selection: any) => (
                                                selection.selectedOptions.map((opt: any) => (
                                                    <span 
                                                        key={`${selection.groupId}-${opt.id}`} 
                                                        className={`text-[8px] md:text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border italic tracking-tighter
                                                            ${selection.groupName.toLowerCase().includes('proteina') 
                                                                ? 'bg-orange-50 text-orange-600 border-orange-100' 
                                                                : 'bg-slate-100 text-slate-600 border-slate-200'}`}
                                                    >
                                                        {opt.name}
                                                    </span>
                                                ))
                                            ))}
                                            {/* Legacy compatibility */}
                                            {!item.modifiers.dynamicSelections && item.modifiers.selectedProteinNames?.map((n: string, i: number) => (
                                                <span key={`p-${i}`} className="text-[8px] md:text-[9px] font-black uppercase bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg border border-orange-100 italic">{n}</span>
                                            ))}
                                            {!item.modifiers.dynamicSelections && item.modifiers.extras?.map((e: any, i: number) => (
                                                <span key={`e-${i}`} className="text-[8px] md:text-[9px] font-black uppercase bg-green-50 text-green-700 px-2 py-0.5 rounded-lg border border-green-100 italic">+ {e.name}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <div className="font-black text-slate-900 text-sm md:text-base italic tracking-tighter">${(item.price * item.quantity).toLocaleString()}</div>
                                        <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-2 py-1 border border-slate-100 shadow-inner">
                                            <button onClick={() => updateQuantity(item.tempId, -1)} className="p-1 text-slate-400 hover:text-slate-900 active:scale-90 transition-all"><Minus size={14} /></button>
                                            <span className="text-[11px] md:text-xs font-black text-slate-900 w-5 text-center">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.tempId, 1)} className="p-1 text-slate-400 hover:text-slate-900 active:scale-90 transition-all"><Plus size={14} /></button>
                                        </div>
                                        <button onClick={() => removeFromCart(item.tempId)} className="p-1.5 text-slate-200 hover:text-red-500 transition-colors active:scale-110"><X size={16} /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer: Despacho + Pago + Total */}
                    <div className="p-4 md:p-5 bg-slate-50 border-t border-slate-100 space-y-3 md:space-y-4 overflow-y-auto max-h-[55vh] shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
                        {/* Totales */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">
                                <span className="italic">SUBTOTAL ÓRDEN</span><span>${subtotal.toLocaleString()}</span>
                            </div>
                            {shippingCost > 0 && (
                                <div className="flex justify-between text-[10px] md:text-[11px] font-black text-green-600 uppercase tracking-widest px-1">
                                    <span className="flex items-center gap-1.5 italic"><Truck size={12} /> SERVICIO DESPACHO</span>
                                    <span className="animate-pulse">+ ${shippingCost.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-end pt-3 border-t-2 border-slate-200 mt-2">
                                <span className="text-base md:text-lg font-black text-slate-900 uppercase italic tracking-tighter">Total a Cobrar</span>
                                <div className="flex flex-col items-end">
                                    {discount > 0 && <span className="text-sm font-bold text-slate-300 line-through decoration-red-400/50 decoration-2 italic mb-1">${initialTotal.toLocaleString()}</span>}
                                    <span className="text-3xl md:text-5xl font-black text-slate-900 italic tracking-tighter leading-none shadow-orange-100 drop-shadow-sm">${total.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Descuento Aplicado */}
                        {discount > 0 && (
                            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                        <TrendingDown size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-red-600 italic leading-none">Descuento {discountType === 'PERCENT' ? `${discount}%` : `$${discount.toLocaleString()}`}</p>
                                        <p className="text-[8px] font-bold text-red-400 uppercase tracking-widest mt-1">Ahorro: -${Math.round(discountValue).toLocaleString()}</p>
                                    </div>
                                </div>
                                <button onClick={() => { setDiscount(0); setDiscountType('FIXED'); }} className="text-red-300 hover:text-red-600 p-2">
                                    <X size={16} />
                                </button>
                            </div>
                        )}

                        {/* Botón Descuento (Solo Admin/Owner o Autorizados) */}
                        {canApplyDiscount && cart.length > 0 && !discount && (
                            <button
                                onClick={() => setShowDiscountModal(true)}
                                className="w-full py-2 rounded-xl border-2 border-dashed border-orange-200 text-orange-400 font-black uppercase italic text-[10px] tracking-widest hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50 transition-all flex items-center justify-center gap-2 active:scale-95 animate-in slide-in-from-bottom-2"
                            >
                                <TrendingDown size={14} /> Aplicar Descuento Especial
                            </button>
                        )}

                        {/* Búsqueda de Cliente / Sesión de Cliente Operativo */}
                        {cart.length > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 shadow-inner">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Asignar Cliente</label>
                                    {selectedCustomer && (
                                        <button onClick={() => setSelectedCustomer(null)} className="text-[8px] font-black uppercase text-red-500 hover:text-red-700 transition-colors">Limpiar x</button>
                                    )}
                                </div>
                                {!selectedCustomer ? (
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Nombre / Telefono..."
                                            className="w-full pl-11 pr-4 py-2 bg-slate-50 border-2 border-transparent focus:border-orange-500 rounded-xl text-[11px] font-bold font-black outline-none transition-all uppercase italic"
                                            value={customerSearchTerm}
                                            onChange={(e) => setCustomerSearchTerm(e.target.value)}
                                        />
                                        {customerSearchTerm.length > 2 && (
                                            <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 mt-2 rounded-xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto no-scrollbar animate-in zoom-in-95">
                                                {customers.length > 0 ? (
                                                    customers.map((c: any) => (
                                                        <button
                                                            key={c.id}
                                                            onClick={() => {
                                                                setSelectedCustomer(c);
                                                                setCustomerSearchTerm('');
                                                                setCustomers([]);
                                                            }}
                                                            className="w-full px-4 py-3 text-left hover:bg-orange-50 transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between"
                                                        >
                                                            <div>
                                                                <p className="font-black text-[11px] uppercase italic text-slate-900">{c.name}</p>
                                                                <p className="text-[9px] font-bold text-slate-400">{c.phone || c.email}</p>
                                                            </div>
                                                            <ChevronRight size={14} className="text-slate-200" />
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="p-4 text-center">
                                                        <p className="text-[10px] font-black text-slate-300 uppercase italic">Sin coincidencias para "{customerSearchTerm}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl text-white">
                                        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center font-black uppercase text-xs italic">
                                            {selectedCustomer.name[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-[11px] uppercase italic truncate leading-none">{selectedCustomer.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest leading-none">{selectedCustomer.phone || selectedCustomer.email}</p>
                                        </div>
                                        <div className="bg-orange-500 px-2 py-1 rounded-lg text-[8px] font-black uppercase italic animate-pulse">
                                            En Sesión
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Despacho (Si hay ítems) */}
                        {cart.length > 0 && (
                            <div className="relative animate-in slide-in-from-bottom-2 duration-500">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 mb-2 block italic">Ubicación de Entrega</label>

                                {selectedCustomer && (selectedCustomer.addresses || []).length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar mb-2 pb-1">
                                        {selectedCustomer.addresses?.map((a) => (
                                            <button
                                                key={a.id}
                                                onClick={() => {
                                                    setShippingAddress(a.address);
                                                    handleShippingQuote({ address: a.address, lat: a.latitude, lng: a.longitude });
                                                }}
                                                className={`px-3 py-1.5 rounded-xl border-2 transition-all whitespace-nowrap flex flex-col items-start gap-0.5
                                                ${shippingAddress === a.address ? 'bg-orange-100 border-orange-500 text-orange-600' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                                            >
                                                <span className="text-[9px] font-black uppercase italic leading-none">{a.alias || 'Dirección'}</span>
                                                <span className="text-[8px] font-bold uppercase truncate max-w-[100px]">{a.address}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="relative">
                                    <AddressAutocomplete
                                        onSelect={handleShippingQuote}
                                        defaultValue={shippingAddress}
                                        placeholder="Ingresa dirección manual..."
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex items-center gap-2">
                                        {shippingStatus === 'loading' && <Loader2 className="animate-spin text-orange-500" size={16} />}
                                        {shippingStatus === 'ok' && <CheckCircle2 className="text-green-500" size={20} />}
                                        {shippingStatus === 'error' && <AlertCircle className="text-red-500" size={20} />}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Comentario para cocina */}
                        {cart.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 block italic flex items-center gap-2">
                                    <MessageSquare size={10} className="text-orange-500" /> Notas para Cocina
                                </label>
                                <textarea
                                    value={orderNote}
                                    onChange={(e) => setOrderNote(e.target.value)}
                                    placeholder="Ej: Mucha salsa, Sin cubiertos, etc..."
                                    className="w-full p-3 bg-white border border-slate-100 rounded-2xl text-[11px] font-bold text-slate-600 outline-none focus:border-orange-500 placeholder:text-slate-200 resize-none h-16 shadow-inner tracking-tight"
                                />
                            </div>
                        )}

                        {/* Método de pago */}
                        <div className="grid grid-cols-3 gap-2 md:gap-3">
                            {[
                                { id: 'CASH', label: 'Efectivo', icon: <Banknote size={16} />, color: 'orange' },
                                { id: 'MP', label: 'Mercado Pago', icon: <img src="https://static.mlstatic.com/org-img/mkt/ms-mercadopago/logos/logos-mp/mercado-pago-icono.png" className="w-5 h-5 grayscale-0" />, color: 'blue' },
                                { id: 'TRANSFER', label: 'Transferen.', icon: <TrendingUp size={16} />, color: 'purple' },
                            ].map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setPaymentMethod(m.id as any)}
                                    className={`py-3 md:py-4 rounded-2xl font-black italic uppercase text-[9px] md:text-[10px] tracking-widest border-2 transition-all flex flex-col items-center gap-2 shadow-sm
                                        ${paymentMethod === m.id
                                            ? m.id === 'MP' ? 'bg-[#009EE3] border-[#009EE3] text-white shadow-xl shadow-blue-200 scale-105 z-10'
                                                : 'bg-white border-orange-500 text-orange-500 shadow-xl shadow-orange-100 scale-105 z-10'
                                            : 'bg-white border-transparent text-slate-300 opacity-60 hover:opacity-100 hover:bg-slate-50'}`}
                                >
                                    <div className="w-6 h-6 flex items-center justify-center">
                                        {m.id === 'MP' ? (
                                            <img
                                                src="https://static.mlstatic.com/org-img/mkt/ms-mercadopago/logos/logos-mp/mercado-pago-icono.png"
                                                alt="MP"
                                                className={`w-5 h-5 transition-all ${paymentMethod === 'MP' ? 'brightness-0 invert' : 'grayscale opacity-70'}`}
                                            />
                                        ) : m.icon}
                                    </div>
                                    <span className="truncate w-full px-1">{m.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Alerta turno */}
                        {!canSell && (
                            <div className="bg-red-50 p-4 rounded-2xl border-2 border-red-100 flex items-center gap-3 animate-pulse">
                                <AlertCircle className="text-red-500 shrink-0" size={20} />
                                <p className="text-[10px] font-black text-red-600 uppercase italic tracking-widest">Bloqueado: Abre un turno para procesar ventas</p>
                            </div>
                        )}

                        {/* Botón cobrar */}
                        <div className="pt-0">
                            <button
                                onClick={handleCheckout}
                                id="checkout-button"
                                disabled={cart.length === 0 || isSubmitting || !canSell}
                                className={`w-full py-4 rounded-[1.5rem] font-black uppercase italic tracking-[0.2em] text-sm md:text-base transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] disabled:opacity-50
                                    ${cart.length > 0 && !isSubmitting && canSell
                                        ? 'bg-slate-900 text-white hover:bg-orange-600 shadow-orange-200'
                                        : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'}`}
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="animate-spin" size={20} />
                                        <span>PROCESANDO...</span>
                                    </div>
                                ) : (
                                    <>{paymentMethod === 'MP' ? 'COBRAR CON MP' : 'LIQUIDAR VENTA'} <ChevronRight size={20} /></>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Floating Mobile Button To Toggle View ── */}
            {cart.length > 0 && (
                <button
                    onClick={() => setMobileTab(mobileTab === 'CATALOG' ? 'CART' : 'CATALOG')}
                    className="xl:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-orange-500 text-white px-8 py-4 rounded-full font-black uppercase italic shadow-[0_10px_40px_rgba(249,115,22,0.4)] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-10 border-4 border-white"
                >
                    {mobileTab === 'CATALOG' ? (
                        <>
                            <ShoppingBag size={20} />
                            <span>VER TICKET (${total.toLocaleString()})</span>
                            <span className="bg-white text-orange-500 w-6 h-6 rounded-full flex items-center justify-center text-[10px]">{cart.length}</span>
                        </>
                    ) : (
                        <>
                            <Search size={20} />
                            <span>VOLVER AL CATÁLOGO</span>
                        </>
                    )}
                </button>
            )}

            {/* ── Modales ───────────────────────────────────── */}
            {showOpenShift && user && (
                <OpenShiftModal
                    userId={user.id}
                    onSuccess={shift => { setActiveShift(shift); setShowOpenShift(false); }}
                    onClose={() => setShowOpenShift(false)}
                />
            )}
            {showCloseShift && activeShift && (
                <CloseShiftModal
                    shift={activeShift}
                    onSuccess={() => { setActiveShift(null); setShowCloseShift(false); loadActiveShift(); }}
                    onClose={() => setShowCloseShift(false)}
                />
            )}
            {showWithdrawalModal && activeShift && (
                <WithdrawalModal
                    shiftId={activeShift.id}
                    onSuccess={() => { setShowWithdrawalModal(false); loadActiveShift(); alert('Retiro registrado correctamente.'); }}
                    onClose={() => setShowWithdrawalModal(false)}
                />
            )}

            {showDiscountModal && (
                <DiscountModal
                    currentDiscount={discount}
                    currentType={discountType}
                    onApply={(v, t) => { setDiscount(v); setDiscountType(t); setShowDiscountModal(false); }}
                    onClose={() => setShowDiscountModal(false)}
                />
            )}

            {selectedProductForConfig && (
                <CevicheBuilderModal
                    isOpen={!!selectedProductForConfig}
                    onClose={() => setSelectedProductForConfig(null)}
                    product={selectedProductForConfig as Product}
                    availableProteins={PROTEINS}
                    availableVeggies={VEGGIES}
                    onConfirm={addToCart}
                />
            )}

            {/* Hidden Printer Component */}
            <div style={{ display: 'none' }}>
                {lastSaleForPrint && (
                    <ComandaPrinter
                        ref={printerRef}
                        saleCode={lastSaleForPrint.code}
                        items={lastSaleForPrint.items}
                        channel={lastSaleForPrint.channel}
                    />
                )}
            </div>
        </div>
    );
}
