
'use client';

import { useState, useEffect } from 'react';
import { getShippingQuote, getUserAddresses, addUserAddress, createPaymentPreference, API_URL, createSale } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { CheckCircle2, MapPin, Plus, Loader2, ShoppingBag, X, Trash2, ArrowRight, Store, Truck, LogIn } from 'lucide-react';
import AddressAutocomplete from '../common/AddressAutocomplete';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    total: number;
}

// Productos rápidos para upsell (Mock - idealmente vendrían del backend)
const UPSELL_ITEMS = [
    { id: 'upsell-coca', name: 'Coca Cola 591cc', price: 1600, img: '/assets/Coca Cola 591cc.jpg' },
    { id: 'upsell-empanada', name: 'Empanada Queso', price: 2000, img: '/assets/Empanada Queso.jpg' },
    { id: 'upsell-papas', name: 'Papas Fritas', price: 2900, img: '/assets/Papas Fritas LoMASRico.png' },
];

// Initialize MercadoPago SDK once
if (typeof window !== 'undefined') {
    initMercadoPago(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '', { locale: 'es-CL' });
}

export default function CheckoutModal({ isOpen, onClose, total }: Props) {
    const { user, isLoggedIn } = useAuth();
    const { items, clearCart, removeFromCart, updateQuantity, addToCart } = useCart();

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

    const addUpsellItem = (item: any) => {
        addToCart({
            productId: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
            variantId: 'default',
            modifiers: { selectedProteins: [], removedIngredients: [] }
        });
    };

    if (!isOpen) return null;

    return (
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
                            Tu Pedido
                        </h2>
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
                                                    onClick={() => updateQuantity(item.tempId, item.quantity + 1)}
                                                    className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:border-orange-300 hover:text-orange-500 transition-all active:scale-90"
                                                >
                                                    <span className="text-sm font-black leading-none">+</span>
                                                </button>
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

                    {/* Upsell Strip */}
                    <div className="p-6 bg-slate-50 border-t border-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f2642e] mb-3 ml-1">¿TE FALTA ALGO?</p>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                            {UPSELL_ITEMS.map((u) => (
                                <button
                                    key={u.id}
                                    onClick={() => addUpsellItem(u)}
                                    className="flex items-center gap-3 bg-white p-2 pr-4 rounded-xl border border-slate-100 shadow-sm min-w-[180px] hover:border-[#f2642e]/30 group transition-all"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden">
                                        <img src={u.img} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-black text-[10px] uppercase text-slate-800 leading-tight group-hover:text-[#f2642e] transition-colors">{u.name}</p>
                                        <p className="font-bold text-[10px] text-slate-400">+ ${u.price.toLocaleString()}</p>
                                    </div>
                                    <div className="ml-auto bg-slate-100 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-[#f2642e] group-hover:text-white transition-all">
                                        <Plus size={12} strokeWidth={3} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Actions & Summary */}
                <div className="w-full md:w-[400px] bg-slate-100 p-6 md:p-8 pb-10 flex flex-col gap-6 flex-none relative overflow-y-auto">

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
                            <p className="text-[8px] font-black uppercase text-slate-300 tracking-[0.3em] italic">Transacción Segura · Mercado Pago</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
