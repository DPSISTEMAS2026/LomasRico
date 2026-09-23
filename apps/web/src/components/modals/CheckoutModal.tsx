'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getShippingQuote, getUserAddresses, addUserAddress, createPaymentPreference, API_URL, createSale, fetchCatalog } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useTableSession } from '../../context/TableSessionContext';
import { CheckCircle2, MapPin, Plus, Loader2, ShoppingBag, X, Trash2, ArrowRight, Store, Truck, LogIn, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import AddressAutocomplete from '../common/AddressAutocomplete';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import { categoryRole } from '@lomasrico/shared-types';

// Categorías cuyos productos aparecen como upsell
const UPSELL_CATEGORIES = ['EXTRAS', 'BEBIDAS', 'AGREGADOS', 'LIMONADAS'];

interface Props {
    isOpen: boolean;
    onClose: () => void;
    total: number;
}

// Initialize MercadoPago SDK once
if (typeof window !== 'undefined') {
    initMercadoPago(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '', { locale: 'es-CL' });
}

export default function CheckoutModal({ isOpen, onClose, total }: Props) {
    const { user, isLoggedIn } = useAuth();
    const { items, clearCart, removeFromCart, updateQuantity, addToCart } = useCart();
    const { session: tableSession } = useTableSession();
    const dineIn = !!tableSession;

    const [address, setAddress] = useState('');
    const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [showNewAddressInput, setShowNewAddressInput] = useState(false);
    const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');

    // Coordenadas para envío preciso
    const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | undefined>(undefined);

    const [shippingQuote, setShippingQuote] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'checking' | 'ready' | 'error' | 'out-of-range' | 'paying' | 'success'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [preferenceId, setPreferenceId] = useState<string | null>(null);

    // Dynamic Upsell
    const [upsellProducts, setUpsellProducts] = useState<any[]>([]);
    const upsellRef = useRef<HTMLDivElement>(null);
    const [tableBill, setTableBill] = useState<any>(null);
    const [billMode, setBillMode] = useState<'ALL' | 'MINE'>('ALL');
    const [showConfirmPopup, setShowConfirmPopup] = useState(false);

    const loadTableBill = async () => {
        if (!tableSession) return null;
        const res = await fetch(`${API_URL}/public/tables/${tableSession.tableNumber}/bill`);
        if (!res.ok) return null;
        const data = await res.json();
        setTableBill(data);
        return data;
    };

    useEffect(() => {
        if (isOpen && dineIn) {
            loadTableBill().catch(() => {});
        }
        if (!isOpen) setShowConfirmPopup(false);
    }, [isOpen, dineIn, tableSession?.tableNumber]);

    const sendToTableAccount = async () => {
        if (!tableSession || items.length === 0) return;
        setLoading(true);
        setErrorMsg('');
        try {
            const res = await fetch(`${API_URL}/public/tables/guests/${tableSession.id}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    claimToken: tableSession.claimToken,
                    items: items.map((item) => ({
                        sellingProductId: item.productId,
                        quantity: item.quantity,
                        modifiers: item.modifiers,
                    })),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'No se pudo agregar a tu cuenta');
            const kitchen = await fetch(`${API_URL}/public/tables/guests/${tableSession.id}/send-kitchen`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ claimToken: tableSession.claimToken }),
            });
            if (!kitchen.ok) {
                const kitchenData = await kitchen.json().catch(() => ({}));
                throw new Error(kitchenData.message || 'Se agregó, pero no se envió a cocina');
            }
            clearCart();
            await loadTableBill();
            setStatus('success');
            setShowConfirmPopup(false);
            // #region agent log
            fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'kitchen-flow',hypothesisId:'K6',location:'CheckoutModal.tsx:sendToTableAccount',message:'diner confirmed and sent to kitchen',data:{tableNumber:tableSession.tableNumber,itemCount:items.length},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
        } catch (e: any) {
            setErrorMsg(e.message || 'No se pudo enviar a tu cuenta');
            // #region agent log
            fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'qr-web',hypothesisId:'H3',location:'CheckoutModal.tsx:sendToTableAccount',message:'web cart to table failed',data:{error:String(e?.message||e)},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
        } finally {
            setLoading(false);
        }
    };

    const requestTableBill = async (mode: 'ALL' | 'GUEST') => {
        if (!tableSession) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/public/tables/${tableSession.tableNumber}/request-bill`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode,
                    guestId: tableSession.id,
                    guestName: tableSession.name,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'No se pudo pedir la cuenta');
            setTableBill(data);
            alert(mode === 'ALL' ? 'Se pidió una sola cuenta. El garzón ya puede cobrar.' : 'Se pidió tu cuenta. El garzón ya puede cobrar.');
            // #region agent log
            fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'qr-web',hypothesisId:'H5',location:'CheckoutModal.tsx:requestTableBill',message:'web requested table bill',data:{mode},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
        } catch (e: any) {
            setErrorMsg(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchCatalog().then((catalog: any[]) => {
                const unique = (role: 'DRINK' | 'SIDE') => {
                    const seen = new Set<string>();
                    return catalog.filter((p: any) => {
                        if (p.available === false || categoryRole(p.category) !== role) return false;
                        if (seen.has(p.name)) return false;
                        seen.add(p.name);
                        return true;
                    });
                };
                const extras = catalog.filter((p: any) => {
                    const cat = (p.category || '').toUpperCase();
                    return p.available !== false && (cat.includes('EXTRAS') || cat.includes('AGREGADOS'));
                });
                const drinks = unique('DRINK');
                const sides = unique('SIDE').slice(0, 6);
                const upsells = dineIn ? [...drinks, ...sides] : [...extras, ...drinks];
                setUpsellProducts(upsells);
                // #region agent log
                fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'kitchen-flow',hypothesisId:'K9',location:'CheckoutModal.tsx:upsell',message:'checkout upsell built',data:{dineIn,drinkCount:drinks.length,sideCount:sides.length,extraCount:extras.length},timestamp:Date.now()})}).catch(()=>{});
                // #endregion
            }).catch(() => {});
        }
    }, [isOpen, dineIn]);

    // Auto-scroll upsell strip
    useEffect(() => {
        if (!isOpen || upsellProducts.length <= 3) return;
        const interval = setInterval(() => {
            const el = upsellRef.current;
            if (!el) return;
            const maxScroll = el.scrollWidth - el.clientWidth;
            if (el.scrollLeft >= maxScroll - 10) {
                el.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                el.scrollBy({ left: 200, behavior: 'smooth' });
            }
        }, 4000);
        return () => clearInterval(interval);
    }, [isOpen, upsellProducts.length]);

    useEffect(() => {
        if (isOpen && isLoggedIn && user) {
            loadAddresses();
        }
    }, [isOpen, isLoggedIn, user]);

    const loadAddresses = async () => {
        if (!user) return;
        try {
            const addresses = await getUserAddresses(user.id);
            setSavedAddresses(addresses);
            if (addresses.length > 0) {
                const defaultAddr = addresses.find((a: any) => a.isDefault) || addresses[0];
                handleSelectSavedAddress(defaultAddr);
            } else {
                setShowNewAddressInput(true);
            }
        } catch (e) {
            console.error('Failed to load addresses');
            setShowNewAddressInput(true);
        }
    };

    const handleSelectSavedAddress = async (addr: any) => {
        setSelectedAddressId(addr.id);
        setAddress(addr.addressText);
        setCoordinates(addr.lat && addr.lng ? { lat: addr.lat, lng: addr.lng } : undefined);
        setShowNewAddressInput(false);
        // Si tiene coordenadas guardadas, usarlas
        calculateShipping(addr.addressText, addr.lat && addr.lng ? { lat: addr.lat, lng: addr.lng } : undefined);
    };

    const calculateShipping = async (addrText: string, coords?: { lat: number; lng: number }) => {
        if (!addrText) return;
        setLoading(true);
        setStatus('checking');
        setErrorMsg('');
        setShippingQuote(null);

        try {
            const quote = await getShippingQuote(addrText, coords);
            if (!quote.valid) {
                setStatus('out-of-range');
                setErrorMsg(quote.reason || 'Fuera de radio (8km).');
            } else {
                setShippingQuote(quote);
                setStatus('ready');
            }
        } catch (e) {
            setStatus('error');
            setErrorMsg('Servicio de despacho no disponible.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddressSelect = (data: { address: string; lat?: number; lng?: number }) => {
        setAddress(data.address);
        if (data.lat && data.lng) {
            setCoordinates({ lat: data.lat, lng: data.lng });
            calculateShipping(data.address, { lat: data.lat, lng: data.lng });
        } else {
            setCoordinates(undefined);
            calculateShipping(data.address);
        }
    };

    const handleAddNewAddress = async () => {
        if (!address || !user) return;
        setLoading(true);
        try {
            const newAddr = await addUserAddress(user.id, {
                addressText: address,
                isDefault: savedAddresses.length === 0,
                latitude: coordinates?.lat,
                longitude: coordinates?.lng
            });
            setSavedAddresses([newAddr, ...savedAddresses]);
            setSelectedAddressId(newAddr.id);
            setShowNewAddressInput(false);
            // Ya calculamos shipping al seleccionar, no es necesario recalcular si no cambió
        } catch (e) {
            setErrorMsg('Error al guardar dirección.');
        } finally {
            setLoading(false);
        }
    };

    const finalTotal = total + (deliveryType === 'delivery' ? (shippingQuote?.cost || 0) : 0);
    const canPay = (deliveryType === 'pickup') || (status === 'ready');

    const handleDeliveryTypeChange = (type: 'delivery' | 'pickup') => {
        setDeliveryType(type);
        if (type === 'pickup') {
            setShippingQuote(null);
            setErrorMsg('');
            setStatus('ready'); // pickup siempre habilitado
        } else {
            // Volver al estado idle para que elija dirección
            if (!address) setStatus('idle');
        }
    };

    // Create preference and show Wallet Brick
    const handlePreparePayment = async () => {
        if (deliveryType === 'delivery' && !address) {
            setErrorMsg('Ingresa una dirección válida');
            return;
        }

        setLoading(true);
        setStatus('paying');
        setErrorMsg('');
        setPreferenceId(null);

        try {
            // Create sale first
            const sale = await createSale(items, {
                status: 'PENDING',
                userId: user?.id,
                shippingData: deliveryType === 'delivery' ? {
                    address: address,
                    cost: shippingQuote?.cost || 0,
                    estimateId: shippingQuote?.estimateId,
                    coordinates: coordinates
                } : undefined
            });

            const orderId = sale.id;

            // Create MP preference
            const prefRes = await fetch(`${API_URL}/payments/create-preference`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    channel: 'WEB',
                    amount: finalTotal,
                    items: items.map(i => ({
                        id: i.productId,
                        title: i.name,
                        quantity: i.quantity,
                        unit_price: Number(i.price),
                    })),
                    payer: { email: user?.email || 'cliente@lomasrico.cl' },
                    shippingCost: deliveryType === 'delivery' ? (shippingQuote?.cost || 0) : 0,
                    metadata: {
                        userId: user?.id,
                        deliveryType,
                        address: deliveryType === 'delivery' ? address : null,
                        cartItems: items.map(i => ({
                            productId: i.productId,
                            name: i.name,
                            quantity: i.quantity,
                            price: i.price,
                            modifiers: i.modifiers,
                        }))
                    }
                })
            });

            if (!prefRes.ok) {
                const errData = await prefRes.json().catch(() => ({}));
                throw new Error(errData.message || `Error ${prefRes.status} iniciando el pago`);
            }

            const pref = await prefRes.json();
            if (pref.preferenceId || pref.id) {
                setPreferenceId(pref.preferenceId || pref.id);
            } else {
                throw new Error('MercadoPago no devolvió un ID de preferencia.');
            }

        } catch (e: any) {
            const msg = e?.message || 'Error desconocido al iniciar el pago';
            console.error('[Checkout] ❌ Payment failed:', msg, e);
            setStatus('error');
            setErrorMsg(msg);
            setPreferenceId(null);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const mine = tableBill?.guests?.find((g: any) => g.id === tableSession?.id);
    const isFirstPlate = dineIn && !(mine?.items?.length);

    return (
        <>
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-2 md:p-4 backdrop-blur-sm overflow-hidden">
            <div className="bg-[#f8f9fa] rounded-[2rem] w-full max-w-5xl h-[95vh] md:h-[85vh] flex flex-col md:flex-row shadow-2xl overflow-y-auto md:overflow-hidden relative animate-in fade-in zoom-in-95 duration-300">
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 z-50 bg-white/50 hover:bg-white p-2 rounded-full backdrop-blur-sm transition-all shadow-sm">
                    <X size={20} className="text-slate-900" />
                </button>

                {/* LEFT COLUMN: Order Details & Upsell (Scrollable on desktop, full height on mobile) */}
                <div className="flex-none md:flex-1 flex flex-col overflow-visible md:overflow-hidden bg-white md:border-r border-slate-100">
                    <div className="p-6 md:p-8 pb-2 md:pb-4">
                        <h2 className="text-3xl font-[900] italic tracking-tighter uppercase text-slate-900 flex items-center gap-3">
                            <ShoppingBag className="text-[#f2642e]" strokeWidth={2.5} size={28} />
                            {dineIn ? `Mesa ${tableSession?.tableNumber}` : 'Tu Pedido'}
                        </h2>
                        {dineIn && (
                            <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mt-2">
                                Pedido de {tableSession?.name}
                            </p>
                        )}
                    </div>

                    {/* Cart Items List */}
                    <div className="flex-none md:flex-1 overflow-visible md:overflow-y-auto px-6 md:px-8 py-2 space-y-4">
                        {items.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
                                <ShoppingBag size={48} />
                                <p className="font-black uppercase tracking-widest text-xs">Carrito Vacío</p>
                            </div>
                        ) : (
                            items.map((item) => (
                                <div key={item.tempId} className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 items-start group hover:border-slate-200 transition-colors">
                                    <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center shadow-sm overflow-hidden shrink-0 relative">
                                        <img
                                            src={item.imageUrl || `/assets/${item.name}.jpg`}
                                            onError={(e) => {
                                                const target = e.currentTarget;
                                                if (!target.src.includes('Logo')) {
                                                    target.src = '/assets/Logo Restaurante.png';
                                                    target.className = "w-full h-full object-contain p-2 opacity-20";
                                                }
                                            }}
                                            className="w-full h-full object-cover"
                                            alt={item.name}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-black text-sm uppercase text-slate-900 leading-tight">{item.name}</h4>
                                            <span className="font-black text-sm text-slate-900 ml-2">${(item.price * item.quantity).toLocaleString()}</span>
                                        </div>
                                        {/* Legacy: protein names */}
                                        {item.modifiers?.selectedProteins?.length > 0 && (
                                            <p className="text-[10px] text-slate-500 font-bold mt-1 line-clamp-1">
                                                {(item.modifiers.selectedProteinNames || item.modifiers.selectedProteins).join(', ')}
                                            </p>
                                        )}
                                        {/* Dynamic: modifier selections */}
                                        {(item.modifiers?.dynamicSelections?.length ?? 0) > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {item.modifiers?.dynamicSelections
                                                    ?.filter((ds: any) => ds.selectedOptions?.length > 0)
                                                    .map((ds: any) => (
                                                        <span key={ds.groupId} className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                                                            {ds.selectedOptions.map((o: any) => o.name).join(', ')}
                                                        </span>
                                                    ))}
                                            </div>
                                        )}
                                        {item.modifiers?.extras?.map((ex: any) => (
                                            <p key={ex.id} className="text-[10px] text-green-600 font-bold mt-1 leading-tight">
                                                + {ex.name}
                                            </p>
                                        ))}
                                        <div className="flex justify-between items-center mt-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        if (item.quantity <= 1) {
                                                            removeFromCart(item.tempId);
                                                        } else {
                                                            updateQuantity(item.tempId, item.quantity - 1);
                                                        }
                                                    }}
                                                    className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:border-red-300 hover:text-red-500 transition-all active:scale-90"
                                                >
                                                    {item.quantity <= 1 ? <Trash2 size={12} /> : <span className="text-sm font-black leading-none">−</span>}
                                                </button>
                                                <span className="w-6 text-center text-sm font-black text-slate-900 tabular-nums">{item.quantity}</span>
                                                <button
                                                    onClick={() => {
                                                        const max = item.maxQuantity ?? 999;
                                                        if (item.quantity < max) {
                                                            updateQuantity(item.tempId, item.quantity + 1);
                                                        }
                                                    }}
                                                    disabled={item.maxQuantity != null && item.quantity >= item.maxQuantity}
                                                    className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all active:scale-90 ${
                                                        item.maxQuantity != null && item.quantity >= item.maxQuantity
                                                            ? 'border-red-200 text-red-300 cursor-not-allowed bg-red-50'
                                                            : 'border-slate-200 text-slate-400 hover:border-orange-300 hover:text-orange-500'
                                                    }`}
                                                >
                                                    <span className="text-sm font-black leading-none">+</span>
                                                </button>
                                                {item.maxQuantity != null && item.maxQuantity < 999 && (
                                                    <span className={`text-[8px] font-black uppercase tracking-wider ml-1 ${
                                                        item.quantity >= item.maxQuantity ? 'text-red-400' : 'text-slate-300'
                                                    }`}>
                                                        máx {item.maxQuantity}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.tempId)}
                                                className="text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                                    {/* Upsell Strip — Dynamic from Catalog */}
                    {upsellProducts.length > 0 && (
                        <div className="p-6 bg-slate-50 border-t border-slate-100">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f2642e] mb-3 ml-1">{dineIn ? 'ACOMPAÑANTES Y BEBESTIBLES' : '¿TE FALTA ALGO?'}</p>
                            <div ref={upsellRef} className="flex gap-3 overflow-x-auto no-scrollbar pb-2 scroll-smooth">
                                {upsellProducts.map((u: any) => (
                                    <button
                                        key={u.id}
                                        onClick={() => addToCart({
                                            productId: u.id,
                                            name: u.name,
                                            price: u.variants?.[0]?.price ?? u.price ?? 0,
                                            quantity: 1,
                                            variantId: u.variants?.[0]?.id || 'default',
                                            modifiers: { selectedProteins: [], removedIngredients: [] },
                                            imageUrl: u.imageUrl,
                                            maxQuantity: u.maxQuantity
                                        })}
                                        disabled={u.available === false}
                                        className={`flex items-center gap-3 bg-white p-2 pr-4 rounded-xl border border-slate-100 shadow-sm min-w-[180px] shrink-0 group transition-all ${
                                            u.available === false ? 'opacity-40 cursor-not-allowed' : 'hover:border-[#f2642e]/30'
                                        }`}
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden">
                                            <img
                                                src={u.imageUrl || `/assets/${u.name}.jpg`}
                                                onError={(e) => { (e.target as HTMLImageElement).src = '/assets/Logo Restaurante.png'; (e.target as HTMLImageElement).className = 'w-full h-full object-contain p-1.5 opacity-20'; }}
                                                className="w-full h-full object-cover"
                                                alt={u.name}
                                            />
                                        </div>
                                        <div className="text-left min-w-0">
                                            <p className="font-black text-[10px] uppercase text-slate-800 leading-tight group-hover:text-[#f2642e] transition-colors truncate">{u.name}</p>
                                            <p className="font-bold text-[10px] text-slate-400">+ ${(u.variants?.[0]?.price ?? u.price ?? 0).toLocaleString()}</p>
                                        </div>
                                        <div className={`ml-auto w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${
                                            u.available === false ? 'bg-red-100 text-red-300' : 'bg-slate-100 text-slate-400 group-hover:bg-[#f2642e] group-hover:text-white'
                                        }`}>
                                            <Plus size={12} strokeWidth={3} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Actions & Summary */}
                <div className="w-full md:w-[400px] bg-slate-100 p-6 md:p-8 pb-10 flex flex-col gap-6 flex-none relative overflow-y-auto">

                    {dineIn ? (
                        <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estás en la mesa</p>
                            <div className="bg-white p-4 rounded-2xl border border-orange-100">
                                <p className="text-xs font-black uppercase text-orange-500">Mesa {tableSession?.tableNumber}</p>
                                <p className="text-lg font-black italic uppercase">{tableSession?.name}</p>
                                <p className="text-xs font-bold text-slate-500 mt-1">
                                    Cuando lo tengas listo, envíalo a cocina. Te vamos a pedir que lo confirmes.
                                </p>
                            </div>
                            {tableBill && (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={() => setBillMode('ALL')} className={`py-3 rounded-2xl font-black uppercase italic text-xs ${billMode === 'ALL' ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                                            Una cuenta
                                        </button>
                                        <button type="button" onClick={() => setBillMode('MINE')} className={`py-3 rounded-2xl font-black uppercase italic text-xs ${billMode === 'MINE' ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                                            Mi cuenta
                                        </button>
                                    </div>
                                    {(billMode === 'ALL' ? tableBill.guests : tableBill.guests.filter((g: any) => g.id === tableSession?.id)).map((g: any) => (
                                        <div key={g.id} className="bg-white rounded-2xl p-3">
                                            <div className="flex justify-between font-black italic uppercase text-xs">
                                                <span>{g.name}</span>
                                                <span>${Number(g.total).toLocaleString()}</span>
                                            </div>
                                            {g.items?.map((item: any) => (
                                                <p key={item.id} className="text-[10px] font-bold text-slate-500">{item.quantity}x {item.name}</p>
                                            ))}
                                        </div>
                                    ))}
                                    {billMode === 'ALL' && (
                                        <p className="text-xl font-black italic">Total ${Number(tableBill.grandTotal || 0).toLocaleString()}</p>
                                    )}
                                </div>
                            )}
                            {errorMsg && (
                                <div className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl text-xs font-bold text-red-600">{errorMsg}</div>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setShowConfirmPopup(true);
                                    // #region agent log
                                    fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'kitchen-flow',hypothesisId:'K8',location:'CheckoutModal.tsx:openConfirm',message:'diner confirm popup opened',data:{itemCount:items.length},timestamp:Date.now()})}).catch(()=>{});
                                    // #endregion
                                }}
                                disabled={items.length === 0}
                                className={`w-full py-5 rounded-2xl font-black text-base uppercase tracking-widest shadow-2xl ${
                                    items.length > 0 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                            >
                                <span className="italic">Enviar a cocina</span>
                            </button>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => requestTableBill(billMode === 'ALL' ? 'ALL' : 'GUEST')}
                                className="w-full py-4 rounded-2xl bg-orange-500 text-white font-black uppercase italic text-sm"
                            >
                                {billMode === 'ALL' ? 'Pedir una sola cuenta' : 'Pedir mi cuenta'}
                            </button>
                        </div>
                    ) : (
                    <>
                    {/* Delivery Type Selector */}
                    <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">¿Cómo lo recibís?</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => handleDeliveryTypeChange('delivery')}
                                className={`p-3 rounded-2xl border-2 flex items-center gap-2 transition-all ${deliveryType === 'delivery'
                                    ? 'border-slate-900 bg-white shadow-md'
                                    : 'border-slate-200 bg-transparent opacity-60 hover:opacity-100'
                                    }`}
                            >
                                <Truck size={16} className={deliveryType === 'delivery' ? 'text-[#f2642e]' : 'text-slate-400'} />
                                <span className="font-black text-xs uppercase text-slate-800">Delivery</span>
                            </button>
                            <button
                                onClick={() => handleDeliveryTypeChange('pickup')}
                                className={`p-3 rounded-2xl border-2 flex items-center gap-2 transition-all ${deliveryType === 'pickup'
                                    ? 'border-slate-900 bg-white shadow-md'
                                    : 'border-slate-200 bg-transparent opacity-60 hover:opacity-100'
                                    }`}
                            >
                                <Store size={16} className={deliveryType === 'pickup' ? 'text-[#f2642e]' : 'text-slate-400'} />
                                <span className="font-black text-xs uppercase text-slate-800">Retiro</span>
                            </button>
                        </div>
                    </div>

                    {/* Shipping Section — solo visible en Delivery */}
                    {deliveryType === 'delivery' && <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-400">
                            <MapPin size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Dirección de Entrega</span>
                        </div>

                        {/* Input Area */}
                        {!isLoggedIn ? (
                            <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-6 rounded-3xl text-center space-y-4">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                                    <LogIn size={20} className="text-slate-400" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-black text-[10px] uppercase tracking-widest text-slate-900">¿Eres cliente?</p>
                                    <p className="text-[10px] font-bold text-slate-400">Inicia sesión para usar tus direcciones guardadas y acumular puntos.</p>
                                </div>
                                <button
                                    onClick={() => (window as any).openAuthModal?.()}
                                    className="bg-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-900 border border-slate-200 hover:border-slate-900 transition-all"
                                >
                                    Ingresar / Registro
                                </button>
                                <div className="pt-4 border-t border-slate-100 mt-2">
                                    <AddressAutocomplete
                                        onSelect={handleAddressSelect}
                                        placeholder="O ingresa dirección manual..."
                                        defaultValue={address}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {savedAddresses.length > 0 && !showNewAddressInput && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        {savedAddresses.map(addr => (
                                            <div
                                                key={addr.id}
                                                onClick={() => handleSelectSavedAddress(addr)}
                                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 group relative overflow-hidden ${selectedAddressId === addr.id
                                                    ? 'bg-white border-[#f2642e] shadow-lg shadow-orange-100/50 scale-[1.02]'
                                                    : 'bg-white border-slate-100 opacity-70 hover:opacity-100 hover:border-slate-300'
                                                    }`}
                                            >
                                                {selectedAddressId === addr.id && (
                                                    <div className="absolute top-0 right-0 p-1">
                                                        <div className="w-8 h-8 bg-[#f2642e] rotate-45 translate-x-4 -translate-y-4 flex items-center justify-center pt-3 pr-3">
                                                            <CheckCircle2 size={10} className="text-white -rotate-45" />
                                                        </div>
                                                    </div>
                                                )}
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${selectedAddressId === addr.id ? 'bg-orange-50 text-[#f2642e]' : 'bg-slate-50 text-slate-400'}`}>
                                                    <MapPin size={18} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <span className="font-black text-[11px] uppercase text-slate-900 truncate block tracking-tight">{addr.addressText}</span>
                                                    {addr.isDefault ? (
                                                        <span className="text-[8px] font-black uppercase text-[#f2642e] tracking-widest mt-0.5 block italic">Dirección Principal</span>
                                                    ) : (
                                                        <span className="text-[8px] font-bold uppercase text-slate-400 tracking-widest mt-0.5 block italic">Dirección Guardada</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        <button
                                            onClick={() => { setShowNewAddressInput(true); setAddress(''); setCoordinates(undefined); setStatus('idle'); }}
                                            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:text-[#f2642e] hover:border-[#f2642e] hover:bg-orange-50/30 transition-all mt-2 group flex items-center justify-center gap-2 italic"
                                        >
                                            <Plus size={14} className="group-hover:rotate-90 transition-transform" strokeWidth={3} />
                                            Agregar nueva ubicación manual
                                        </button>
                                    </div>
                                )}

                                {(showNewAddressInput || savedAddresses.length === 0) && (
                                    <div className="bg-white p-5 rounded-3xl border-2 border-slate-900 shadow-xl space-y-4 animate-in zoom-in-95 duration-300">
                                        <div className="relative">
                                            <AddressAutocomplete
                                                onSelect={handleAddressSelect}
                                                placeholder="Ingresa tu dirección exacta..."
                                                defaultValue={address}
                                            />
                                            {loading && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                    <Loader2 className="animate-spin text-[#f2642e]" size={16} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAddNewAddress()}
                                                disabled={loading || !address}
                                                className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-black disabled:opacity-50 transition-all flex justify-center items-center gap-2 active:scale-95 italic"
                                            >
                                                {loading ? <Loader2 className="animate-spin" size={14} /> : 'Guardar y Confirmar Dirección'}
                                            </button>
                                            {savedAddresses.length > 0 && (
                                                <button
                                                    onClick={() => { setShowNewAddressInput(false); const def = savedAddresses.find(a => a.isDefault) || savedAddresses[0]; handleSelectSavedAddress(def); }}
                                                    className="px-4 py-4 bg-slate-100 text-slate-400 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 italic"
                                                >
                                                    Atrás
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Quote Status */}
                        {status === 'ready' && shippingQuote && (
                            <div className="bg-white p-4 rounded-2xl border border-green-100 flex justify-between items-center shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="font-bold text-xs text-green-700">Envío disponible</span>
                                </div>
                                <span className="font-black text-sm text-slate-900">${shippingQuote.cost.toLocaleString()}</span>
                            </div>
                        )}
                        {status === 'out-of-range' && (
                            <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-xs font-bold text-orange-600">
                                📍 Fuera de radio. Elige "Retiro" o intenta con otra dirección.
                            </div>
                        )}
                    </div>}

                    {/* Pickup info */}
                    {deliveryType === 'pickup' && (
                        <div className="bg-white p-4 rounded-2xl border border-green-100 flex items-start gap-3 shadow-sm">
                            <Store size={18} className="text-green-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-black text-xs uppercase text-green-700">Retiro en Tienda</p>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">Pagas online y retiras cuando quieras. Te avisamos cuando está listo.</p>
                            </div>
                        </div>
                    )}

                    {/* › Error de pago - SIEMPRE VISIBLE independiente del tipo de entrega */}
                    {errorMsg && (
                        <div className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <span className="text-xl shrink-0">❌</span>
                            <div>
                                <p className="font-black text-xs uppercase text-red-700 mb-1">Error al iniciar el pago</p>
                                <p className="text-xs font-medium text-red-600">{errorMsg}</p>
                            </div>
                        </div>
                    )}

                    <div className="mt-auto pt-6 border-t border-slate-200/50 space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold uppercase text-slate-400">
                                <span>Subtotal</span>
                                <span>${total.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold uppercase text-slate-400">
                                <span>Envío</span>
                                <span>{deliveryType === 'pickup' ? 'Gratis (Retiro)' : shippingQuote ? `$${shippingQuote.cost.toLocaleString()}` : '--'}</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-end border-t border-slate-200 pt-4">
                            <span className="text-sm font-black uppercase text-slate-900 tracking-tight">Total a Pagar</span>
                            <span className="text-4xl font-[900] text-slate-900 tracking-tighter leading-none">${finalTotal.toLocaleString()}</span>
                        </div>

                        {/* MercadoPago Wallet Brick */}
                        {!preferenceId ? (
                            <button
                                onClick={handlePreparePayment}
                                disabled={!canPay || loading || items.length === 0}
                                className={`w-full py-5 rounded-2xl font-black text-base uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3 relative overflow-hidden group ${canPay && items.length > 0
                                    ? 'bg-[#009EE3] text-white hover:bg-[#0089C7] hover:scale-[1.02] shadow-blue-200'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>
                                        <span className="italic">PROCEDER AL PAGO</span>
                                        <ArrowRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-white p-4 rounded-2xl border-2 border-[#009EE3] shadow-xl shadow-blue-100/50 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black uppercase text-[#009EE3] tracking-widest italic">Finalizar Pago</p>
                                        <button
                                            onClick={() => { setPreferenceId(null); setStatus('ready'); }}
                                            className="text-[9px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                    <Wallet
                                        initialization={{ preferenceId, redirectMode: 'self' }}
                                        customization={{ texts: { action: 'pay', valueProp: 'security_safety' } }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col items-center gap-2 mt-2">
                            <img src="/assets/mercadopago/horizontal.svg" alt="Mercado Pago" className="h-5 object-contain" />
                            <p className="text-[8px] font-black uppercase text-slate-300 tracking-[0.3em] italic">Transacción segura</p>
                        </div>
                    </div>
                    </>
                    )}
                </div>
            </div>
        </div>
        {showConfirmPopup && (
            <div className="fixed inset-0 z-[120] bg-black/70 flex items-end sm:items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-[2rem] p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Mesa {tableSession?.tableNumber}</p>
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">
                        {isFirstPlate ? 'Confirma tu primer plato' : 'Confirma tu pedido'}
                    </h2>
                    <p className="text-sm font-bold text-slate-500">
                        Revisa cantidad, precio e ingredientes. Si está bien, va a cocina.
                    </p>
                    {items.map((item) => (
                        <div key={item.tempId} className="border-b border-slate-100 pb-3">
                            <div className="flex justify-between gap-2">
                                <p className="text-sm font-black uppercase italic">{item.quantity}x {item.name}</p>
                                <p className="text-sm font-black shrink-0">${(item.price * item.quantity).toLocaleString()}</p>
                            </div>
                            {item.modifiers?.dynamicSelections?.map((g: any) =>
                                g.selectedOptions?.map((o: any, i: number) => (
                                    <p key={`${g.groupId}-${i}`} className="text-xs font-bold text-slate-500">+ {g.groupName}: {o.name}</p>
                                ))
                            )}
                            {item.modifiers?.selectedProteinNames?.map((n: string, i: number) => (
                                <p key={`p-${i}`} className="text-xs font-bold text-slate-500">+ {n}</p>
                            ))}
                            {item.modifiers?.removedIngredients?.map((n: string, i: number) => (
                                <p key={`r-${i}`} className="text-xs font-bold text-red-500">Sin {n}</p>
                            ))}
                        </div>
                    ))}
                    <div className="flex justify-between items-end">
                        <span className="text-sm font-black uppercase">Total</span>
                        <span className="text-3xl font-black italic">${total.toLocaleString()}</span>
                    </div>
                    {errorMsg && <p className="text-xs font-bold text-red-600">{errorMsg}</p>}
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setShowConfirmPopup(false)} className="py-4 rounded-2xl bg-slate-100 font-black uppercase italic">
                            Volver
                        </button>
                        <button
                            type="button"
                            disabled={loading}
                            onClick={sendToTableAccount}
                            className="py-4 rounded-2xl bg-orange-500 text-white font-black uppercase italic"
                        >
                            {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Sí, enviar'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
