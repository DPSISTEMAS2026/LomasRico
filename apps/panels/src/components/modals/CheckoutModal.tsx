
'use client';

import { useState, useEffect } from 'react';
import { getShippingQuote, getUserAddresses, addUserAddress, createPaymentPreference, API_URL, createSale } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { CheckCircle2, MapPin, Plus, Loader2, ShoppingBag, X, Trash2, ArrowRight, Store, Truck } from 'lucide-react';
import AddressAutocomplete from '../common/AddressAutocomplete';

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

export default function CheckoutModal({ isOpen, onClose, total }: Props) {
    const { user, isLoggedIn } = useAuth();
    const { items, clearCart, removeFromCart, addToCart } = useCart();

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
        setCoordinates(addr.latitude && addr.longitude ? { lat: addr.latitude, lng: addr.longitude } : undefined);
        setShowNewAddressInput(false);
        // Si tiene coordenadas guardadas, usarlas
        calculateShipping(addr.addressText, addr.latitude && addr.longitude ? { lat: addr.latitude, lng: addr.longitude } : undefined);
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

    const handlePayment = async () => {
        if (deliveryType === 'delivery' && !address) {
            setErrorMsg('Ingresa una dirección válida');
            return;
        }

        setLoading(true);
        setStatus('paying');
        setErrorMsg('');

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

            // Crear preferencia MP directamente (ahora con la venta existente)
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
                    // Metadata adicional para procesar cuando MP aprueba
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

            // Redirigir a MercadoPago (TEST: sandboxInitPoint, PROD: initPoint)
            const redirectUrl = pref.sandboxInitPoint || pref.initPoint;
            if (redirectUrl) {
                window.location.href = redirectUrl;
            } else {
                throw new Error('MercadoPago no devolvió un link de pago. Intente nuevamente.');
            }

        } catch (e: any) {
            const msg = e?.message || 'Error desconocido al iniciar el pago';
            console.error('[Checkout] ❌ Payment failed:', msg, e);
            setStatus('error');
            setErrorMsg(msg);
            setLoading(false);
            // Mostrar alerta para debugging - el error NUNCA debe ser silencioso
            alert(`❌ Error al pagar:\n${msg}\n\nRevisa la consola del navegador (F12) para más detalles.`);
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
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-hidden">
            <div className="bg-[#f8f9fa] rounded-[2rem] w-full max-w-5xl h-[85vh] flex flex-col md:flex-row shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-300">
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 z-50 bg-white/50 hover:bg-white p-2 rounded-full backdrop-blur-sm transition-all shadow-sm">
                    <X size={20} className="text-slate-900" />
                </button>

                {/* LEFT COLUMN: Order Details & Upsell (Scrollable) */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white md:border-r border-slate-100">
                    <div className="p-8 pb-4">
                        <h2 className="text-3xl font-[900] italic tracking-tighter uppercase text-slate-900 flex items-center gap-3">
                            <ShoppingBag className="text-[#f2642e]" strokeWidth={2.5} size={28} />
                            Tu Pedido
                        </h2>
                    </div>

                    {/* Cart Items List */}
                    <div className="flex-1 overflow-y-auto px-8 py-2 space-y-4">
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
                                        {item.modifiers?.selectedProteins?.length > 0 && (
                                            <p className="text-[10px] text-slate-500 font-bold mt-1 line-clamp-1">
                                                {(item.modifiers.selectedProteinNames || item.modifiers.selectedProteins).join(', ')}
                                            </p>
                                        )}
                                        {item.modifiers?.extras?.map((ex: any) => (
                                            <p key={ex.id} className="text-[10px] text-green-600 font-bold mt-1 leading-tight">
                                                + {ex.name}
                                            </p>
                                        ))}
                                        <div className="flex justify-between items-center mt-3">
                                            <div className="text-[10px] font-black bg-white px-2 py-1 rounded border border-slate-100 text-slate-500">
                                                x{item.quantity}
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
                <div className="w-full md:w-[400px] bg-slate-100 p-8 flex flex-col gap-6 shrink-0 relative overflow-y-auto">

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
                        {!showNewAddressInput && savedAddresses.length > 0 ? (
                            <div className="space-y-2">
                                {savedAddresses.map(addr => (
                                    <div key={addr.id} onClick={() => handleSelectSavedAddress(addr)} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${selectedAddressId === addr.id ? 'bg-white border-slate-900 shadow-lg' : 'bg-transparent border-slate-200 opacity-60 hover:opacity-100'}`}>
                                        <div className={`w-3 h-3 rounded-full ${selectedAddressId === addr.id ? 'bg-[#f2642e]' : 'bg-slate-300'}`} />
                                        <span className="font-bold text-xs uppercase text-slate-700 truncate flex-1">{addr.addressText}</span>
                                    </div>
                                ))}
                                <button onClick={() => { setShowNewAddressInput(true); setAddress(''); setCoordinates(undefined); }} className="text-[10px] font-black uppercase text-blue-600 pl-2 mt-2 hover:underline">
                                    + Nueva Dirección
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <AddressAutocomplete
                                    onSelect={handleAddressSelect}
                                    placeholder="Ingresa tu dirección exacta..."
                                    defaultValue={address}
                                />
                                {address && showNewAddressInput && (
                                    <button
                                        onClick={() => handleAddNewAddress()}
                                        disabled={loading}
                                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-xs uppercase hover:bg-black disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={14} /> : 'Guardar y Cotizar'}
                                    </button>
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

                        <button
                            onClick={handlePayment}
                            disabled={!canPay || loading}
                            className={`w-full py-5 rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 relative overflow-hidden group ${canPay
                                ? 'bg-[#f2642e] text-white hover:bg-[#d9501d] hover:scale-[1.02] shadow-orange-200'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            {status === 'paying' ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <>
                                    <span>Pagar con MercadoPago</span>
                                    <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                        <div className="flex justify-center items-center gap-2 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                            <img src="https://logotipoz.com/wp-content/uploads/2021/10/version-horizontal-large-logo-mercadopago.webp" className="h-6 object-contain" alt="MercadoPago" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
