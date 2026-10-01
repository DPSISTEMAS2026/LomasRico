'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useReactToPrint } from 'react-to-print';
import {
    ArrowLeft, Plus, Users, Loader2, Printer, CreditCard, Trash2, Search, ChevronUp, X,
    Gift, Fish, ChefHat, Wheat, CupSoda, Flame, Salad, Shell, Sparkles, UtensilsCrossed,
} from 'lucide-react';
import { fetchCatalog, API_URL } from '../../../../services/api';
import { authFetch } from '../../../../services/authFetch';
import { WaiterDishBuilder } from '../../../../components/modals/WaiterDishBuilder';
import { ComandaPrinter } from '../../../../components/printer/ComandaPrinter';
import { BoletaPrinter, type BoletaGuest } from '../../../../components/printer/BoletaPrinter';
import { Product, CartItem } from '../../../../types';
import { useAuth } from '../../../../context/AuthContext';
import { filterModifiersForChannel, normalizeDrinkModifiers } from '@lomasrico/shared-types';

const CATEGORY_META: Record<string, { name: string; Icon: typeof Fish }> = {
    PROMOS: { name: 'Promos', Icon: Gift },
    'CEVICHE LOMASRICO': { name: 'Lo Más Rico', Icon: Fish },
    'CEVICHE PERUANO': { name: 'Peruanos', Icon: ChefHat },
    'CEVICHE VEG': { name: 'Veg', Icon: Salad },
    'CEVICHE TROPICAL': { name: 'Tropicales', Icon: Fish },
    'CEVICHE SIN VERDE': { name: 'Sin verde', Icon: Fish },
    CRUDOS: { name: 'Crudos', Icon: Shell },
    GOHAN: { name: 'Gohan', Icon: ChefHat },
    BOWLS: { name: 'Bowls', Icon: Fish },
    'ROLLS PREMIUM': { name: 'Rolls', Icon: Sparkles },
    'HAND ROLLS': { name: 'Hand rolls', Icon: Fish },
    HANDROLL: { name: 'Hand rolls', Icon: Fish },
    EMPANADAS: { name: 'Empanadas', Icon: Wheat },
    'PAPAS / FRITOS': { name: 'Fritos', Icon: Flame },
    PANCITOS: { name: 'Pancitos', Icon: ChefHat },
    EXTRAS: { name: 'Extras', Icon: Plus },
    AGREGADOS: { name: 'Agregados', Icon: Plus },
    BEBIDAS: { name: 'Bebestibles', Icon: CupSoda },
};

export default function SalonTablePage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const [table, setTable] = useState<any>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [guestId, setGuestId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [configProduct, setConfigProduct] = useState<Product | null>(null);
    const [nameModal, setNameModal] = useState<'add' | 'rename' | null>(null);
    const [nameInput, setNameInput] = useState('');
    const [showBill, setShowBill] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [bill, setBill] = useState<any>(null);
    const nameRef = useRef<HTMLInputElement>(null);
    const [printSale, setPrintSale] = useState<{
        code: string;
        items: CartItem[];
        channel: string;
        guestName?: string;
        kind?: 'kitchen' | 'account';
        total?: number;
        mode?: 'guest' | 'table';
        guests?: BoletaGuest[];
    } | null>(null);
    const printerRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printerRef as any,
        onAfterPrint: () => setPrintSale(null),
    });

    useEffect(() => {
        if (printSale && printerRef.current) handlePrint();
    }, [printSale, handlePrint]);

    useEffect(() => {
    }, [accountOpen, table]);

    const loadTable = async (preferGuestId?: string | null) => {
        const res = await authFetch(`${API_URL}/tables/${id}`);
        if (!res.ok) return null;
        const data = await res.json();
        setTable(data);
        setGuestId((current) => {
            const next = preferGuestId ?? current;
            if (next && data.guests?.some((g: any) => g.id === next)) return next;
            return data.guests?.[0]?.id || null;
        });
        return data;
    };

    useEffect(() => {
        loadTable().then(async (data) => {
            const request = data?.billRequest;
            if (request?.guestId) setGuestId(request.guestId);
            if (request) {
                const res = await authFetch(`${API_URL}/tables/${id}/bill`);
                if (res.ok) {
                    setBill(await res.json());
                    setShowBill(true);
                }
            }
        });
        fetchCatalog().then(setProducts).catch(() => {});
    }, [id]);

    useEffect(() => {
        if (!showBill) return;
        const catalog = document.querySelector('[data-salon-catalog]') as HTMLElement | null;
        const html = document.documentElement;
        const prevCatalog = catalog?.style.overflow ?? '';
        const prevHtml = html.style.overflow;
        const prevBody = document.body.style.overflow;
        if (catalog) catalog.style.overflow = 'hidden';
        html.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';

        const insideBill = (target: EventTarget | null) =>
            target instanceof Element && !!target.closest('[data-bill-scroll]');
        const blockBackground = (e: Event) => {
            if (!insideBill(e.target)) e.preventDefault();
        };
        document.addEventListener('wheel', blockBackground, { passive: false });
        document.addEventListener('touchmove', blockBackground, { passive: false });

        const catalogOverflow = catalog ? getComputedStyle(catalog).overflowY : 'missing';

        return () => {
            if (catalog) catalog.style.overflow = prevCatalog;
            html.style.overflow = prevHtml;
            document.body.style.overflow = prevBody;
            document.removeEventListener('wheel', blockBackground);
            document.removeEventListener('touchmove', blockBackground);
        };
    }, [showBill]);

    const guest = table?.guests?.find((g: any) => g.id === guestId) || null;
    const accountItems: CartItem[] = (guest?.openSale?.items || []).map((item: any) => ({
        tempId: item.id,
        productId: item.sellingProductId,
        variantId: 'default',
        name: item.sellingProduct?.name || 'Producto',
        price: Number(item.priceUnit),
        quantity: item.quantity,
        modifiers: item.modifiers || {},
        sentToKitchen: !!item.sentToKitchenAt,
    }));
    const pendingItems = accountItems.filter((item) => !(item as any).sentToKitchen);
    const sentItems = accountItems.filter((item) => (item as any).sentToKitchen);

    const categories = useMemo(() => {
        const counts = new Map<string, number>();
        for (const product of products) {
            if (!product.category || product.available === false) continue;
            counts.set(product.category, (counts.get(product.category) || 0) + 1);
        }
        return [...counts.entries()].map(([id, count]) => ({
            id,
            count,
            name: CATEGORY_META[id]?.name || id,
            Icon: CATEGORY_META[id]?.Icon || UtensilsCrossed,
        }));
    }, [products]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return products.filter((p) => {
            if (p.available === false) return false;
            if (q && !p.name.toLowerCase().includes(q)) return false;
            if (!q && selectedCategory && p.category !== selectedCategory) return false;
            if (!q && !selectedCategory) return false;
            return true;
        });
    }, [products, search, selectedCategory]);

    const showCategories = !search.trim() && !selectedCategory;

    const backToCategories = () => {
        setSelectedCategory(null);
        setSearch('');
    };

    const persistItem = async (item: Omit<CartItem, 'tempId'>) => {
        if (!guestId) {
            alert('Primero agrega un comensal');
            return;
        }
        const t0 = Date.now();
        setBusy(true);
        try {
            const res = await authFetch(`${API_URL}/tables/${id}/guests/${guestId}/items`, {
                method: 'POST',
                body: JSON.stringify({
                    items: [{
                        sellingProductId: item.productId,
                        quantity: item.quantity,
                        modifiers: item.modifiers,
                    }],
                    userId: user?.id,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || 'No se pudo guardar el plato');
            const afterApi = Date.now();
            if (data.guests) {
                setTable(data);
                setGuestId((current) => {
                    const next = guestId || current;
                    if (next && data.guests?.some((g: any) => g.id === next)) return next;
                    return data.guests?.[0]?.id || null;
                });
            } else {
                await loadTable(guestId);
            }
            backToCategories();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setBusy(false);
        }
    };

    const onProduct = (product: Product) => {
        if (!guestId) {
            alert('Primero agrega un comensal');
            return;
        }
        const salonGroups = filterModifiersForChannel(product.modifiers, 'salon');
        const drinkGroups = normalizeDrinkModifiers({
            ...product,
            modifiers: salonGroups,
        });
        if (drinkGroups.length === 0 && /bebida|limonad|cervez|jugo|monster|agua/i.test(`${product.category} ${product.name}`)) {
            void persistItem({
                productId: product.id,
                variantId: 'default',
                name: product.name,
                price: product.price,
                quantity: 1,
                modifiers: { selectedProteins: [], removedIngredients: [] },
            });
            return;
        }
        if (salonGroups.length > 0) {
            setConfigProduct(product);
            return;
        }
        void persistItem({
            productId: product.id,
            variantId: 'default',
            name: product.name,
            price: product.price,
            quantity: 1,
            modifiers: { selectedProteins: [], removedIngredients: [] },
        });
    };

    const openAddGuest = () => {
        setNameInput('');
        setNameModal('add');
        setTimeout(() => nameRef.current?.focus(), 50);
    };

    const openRenameGuest = () => {
        if (!guest) return;
        setNameInput(guest.name || '');
        setNameModal('rename');
        setTimeout(() => nameRef.current?.focus(), 50);
    };

    const submitGuestName = async () => {
        const name = nameInput.trim();
        if (!name) {
            alert('Escribe el nombre, por ejemplo Diego');
            return;
        }
        setBusy(true);
        try {
            if (nameModal === 'add') {
                const res = await authFetch(`${API_URL}/tables/${id}/guests`, {
                    method: 'POST',
                    body: JSON.stringify({ name }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'No se pudo agregar comensal');
                setTable(data);
                const newest = data.guests?.[data.guests.length - 1];
                if (newest) setGuestId(newest.id);
            } else if (guestId) {
                const res = await authFetch(`${API_URL}/tables/${id}/guests/${guestId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ name }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'No se pudo cambiar el nombre');
                setTable(data);
            }
            setNameModal(null);
            setNameInput('');
        } catch (e: any) {
            alert(e.message);
        } finally {
            setBusy(false);
        }
    };

    const sendKitchen = async () => {
        if (!guestId || pendingItems.length === 0) return;
        setBusy(true);
        try {
            const res = await authFetch(`${API_URL}/tables/${id}/guests/${guestId}/send-kitchen`, {
                method: 'POST',
                body: JSON.stringify({ userId: user?.id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'No se pudo enviar a cocina');
            setPrintSale({
                code: data.sale?.code || '',
                items: pendingItems,
                channel: data.ticket?.label || `MESA ${table?.number}`,
                guestName: guest?.name,
            });
            setTable(data.table);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setBusy(false);
        }
    };

    const payGuest = async (targetGuestId?: string) => {
        const payId = targetGuestId || guestId;
        const payGuestRow = table?.guests?.find((g: any) => g.id === payId);
        const payItems: CartItem[] = (payGuestRow?.openSale?.items || []).map((item: any) => ({
            tempId: item.id,
            productId: item.sellingProductId,
            variantId: 'default',
            name: item.sellingProduct?.name || 'Producto',
            price: Number(item.priceUnit),
            quantity: item.quantity,
            modifiers: item.modifiers || {},
            sentToKitchen: !!item.sentToKitchenAt,
        }));
        if (!payId || payItems.length === 0) return;
        if (!confirm(`¿Cobrar a ${payGuestRow?.name}?`)) return;
        setBusy(true);
        try {
            const res = await authFetch(`${API_URL}/tables/${id}/guests/${payId}/pay`, {
                method: 'POST',
                body: JSON.stringify({ paymentMethod: 'CASH', userId: user?.id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'No se pudo cobrar');
            setPrintSale({
                code: data.sale?.code || '',
                items: payItems,
                channel: `MESA ${table?.number}`,
                guestName: payGuestRow?.name,
                kind: 'account',
                mode: 'guest',
                guests: [{
                    name: payGuestRow?.name || 'Comensal',
                    items: payItems,
                    total: Number(payGuestRow?.openSale?.total || 0),
                }],
                total: Number(payGuestRow?.openSale?.total || 0),
            });
            setShowBill(false);
            setTable(data.table);
            setGuestId(data.table.guests?.[0]?.id || null);
            if (!data.table.guests?.length) {
                router.push('/salon');
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setBusy(false);
        }
    };

    const printPreCuenta = (targetGuestId?: string) => {
        if (!bill) return;
        if (targetGuestId) {
            const g = bill.guests?.find((x: any) => x.id === targetGuestId);
            if (!g) return;
            const items: CartItem[] = (g.items || []).map((i: any) => ({
                tempId: i.id,
                productId: i.sellingProductId,
                variantId: 'default',
                name: i.name,
                price: Number(i.priceUnit || 0),
                quantity: i.quantity,
                modifiers: i.modifiers || {},
            }));
            setPrintSale({
                code: bill.saleCode || '',
                items,
                channel: `MESA ${bill.number}`,
                guestName: g.name,
                kind: 'account',
                mode: 'guest',
                guests: [{ name: g.name, items, total: Number(g.total || 0) }],
                total: Number(g.total || 0),
            });
        } else {
            const tableGuests: BoletaGuest[] = (bill.guests || []).map((g: any) => ({
                name: g.name,
                items: (g.items || []).map((i: any) => ({
                    tempId: i.id,
                    productId: i.sellingProductId,
                    variantId: 'default',
                    name: i.name,
                    price: Number(i.priceUnit || 0),
                    quantity: i.quantity,
                    modifiers: i.modifiers || {},
                })),
                total: Number(g.total || 0),
            })).filter((g: any) => g.items.length > 0);

            setPrintSale({
                code: bill.saleCode || '',
                items: tableGuests.flatMap(g => g.items),
                channel: `MESA ${bill.number}`,
                kind: 'account',
                mode: 'table',
                guests: tableGuests,
                total: Number(bill.grandTotal || 0),
            });
        }
    };

    const openBill = async () => {
        const res = await authFetch(`${API_URL}/tables/${id}/bill`);
        if (res.ok) setBill(await res.json());
        setShowBill(true);
    };

    const payAll = async () => {
        if (!confirm('¿Cobrar toda la mesa en un solo pago?')) return;
        setBusy(true);
        try {
            const res = await authFetch(`${API_URL}/tables/${id}/pay-all`, {
                method: 'POST',
                body: JSON.stringify({ paymentMethod: 'CASH', userId: user?.id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'No se pudo cobrar la mesa');

            const tableGuests: BoletaGuest[] = (table?.guests || []).map((g: any) => ({
                name: g.name,
                items: (g.openSale?.items || []).map((item: any) => ({
                    tempId: item.id,
                    productId: item.sellingProductId,
                    variantId: 'default',
                    name: item.sellingProduct?.name || 'Producto',
                    price: Number(item.priceUnit),
                    quantity: item.quantity,
                    modifiers: item.modifiers || {},
                    sentToKitchen: true,
                })),
                total: Number(g.openSale?.total || 0),
            })).filter((g: any) => g.items.length > 0);

            if (tableGuests.length > 0) {
                setPrintSale({
                    code: data.sale?.code || '',
                    items: tableGuests.flatMap(g => g.items),
                    channel: `MESA ${table?.number}`,
                    kind: 'account',
                    mode: 'table',
                    guests: tableGuests,
                    total: tableGuests.reduce((s, g) => s + (g.total || 0), 0),
                });
            }

            setTable(data.table);
            setShowBill(false);
            setGuestId(null);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setBusy(false);
        }
    };


    const leaveGuest = async () => {
        if (!guestId) return;
        setBusy(true);
        try {
            const res = await authFetch(`${API_URL}/tables/${id}/guests/${guestId}/leave`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'No se pudo quitar');
            setTable(data);
            setGuestId(data.guests?.[0]?.id || null);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setBusy(false);
        }
    };

    if (!table) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
        );
    }

    const accountTotal = Number(guest?.openSale?.total || 0);
    const guestCount = Math.max(table.guests.length, 1);

    return (
        <div className="h-full min-h-0 flex flex-col overflow-hidden">
            <div className="shrink-0 p-3 md:p-4 pb-0 space-y-3">
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => router.push('/salon')} className="p-2.5 rounded-xl bg-white border border-slate-100 ml-12 lg:ml-0 shrink-0" title="Volver al salón">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex-1 min-w-0 text-right">
                        <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-slate-900">
                            Mesa {table.number}
                        </h1>
                    </div>
                    {guest && (
                        <button type="button" onClick={leaveGuest} className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-800 hover:text-red-500 shrink-0" title="Quitar comensal">
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
                {table.billRequest ? (
                    <button
                        type="button"
                        onClick={openBill}
                        className="w-full px-4 py-3 rounded-2xl bg-amber-400 text-slate-900 text-[11px] font-black uppercase italic tracking-tight text-left"
                    >
                        {table.billRequest.guestName
                            ? `${table.billRequest.guestName} pidió la cuenta`
                            : 'Pidieron la cuenta'}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={openBill}
                        className="w-full px-4 py-2.5 rounded-2xl bg-white border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-800"
                    >
                        Ver cuenta de la mesa
                    </button>
                )}

                <div className="bg-white rounded-3xl p-3 border border-slate-100">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-1">
                            <Users size={12} /> Comensales · cada uno su cuenta
                        </p>
                        <button type="button" onClick={openAddGuest} disabled={busy} className="text-[10px] font-black uppercase text-orange-500 flex items-center gap-1">
                            <Plus size={14} /> Agregar
                        </button>
                    </div>
                    {table.guests.length === 0 ? (
                        <p className="text-xs font-bold text-slate-800 px-1 py-3">Esta mesa está libre. Agrega el primer comensal.</p>
                    ) : (
                        <div className={`grid gap-2 w-full ${guestCount <= 2 ? 'grid-cols-2' : guestCount === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}>
                            {table.guests.map((g: any) => (
                                <button
                                    key={g.id}
                                    type="button"
                                    onClick={() => setGuestId(g.id)}
                                    className={`w-full px-4 py-3 rounded-2xl border-2 text-left ${
                                        guestId === g.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-transparent'
                                    }`}
                                >
                                    <p className="text-sm font-black italic uppercase truncate">{g.name}</p>
                                    <p className={`text-[10px] font-bold ${guestId === g.id ? 'text-orange-300' : 'text-slate-800'}`}>
                                        {table.billRequest?.guestId === g.id ? 'Pidió cuenta · ' : ''}
                                        {g.openSale ? `$${Number(g.openSale.total).toLocaleString()}` : 'Sin pedido'}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {!showCategories && (
                        <button type="button" onClick={backToCategories} className="p-3 rounded-2xl bg-white border border-slate-100">
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-800" size={18} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={showCategories ? 'Buscar o elige categoría...' : 'Buscar en esta categoría...'}
                            className="w-full bg-white pl-12 pr-4 py-3 rounded-2xl font-bold border border-slate-100 outline-none"
                        />
                    </div>
                </div>
            </div>

            <div data-salon-catalog className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
                {showCategories ? categories.map((cat) => (
                    <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                            setSelectedCategory(cat.id);
                        }}
                        className="bg-white rounded-2xl p-4 text-left border border-slate-100 active:scale-95 min-h-[140px] md:min-h-[160px] flex flex-col justify-between"
                    >
                        <cat.Icon size={22} className="text-orange-500" />
                        <div>
                            <p className="font-black uppercase italic text-sm leading-tight">{cat.name}</p>
                            <p className="text-[10px] font-bold text-slate-800">{cat.count} platos</p>
                        </div>
                    </button>
                )) : filtered.map((product) => (
                    <button
                        key={product.id}
                        type="button"
                        onClick={() => onProduct(product)}
                        disabled={busy || !guestId}
                        className="bg-white rounded-2xl p-3 text-left border border-slate-100 active:scale-95 disabled:opacity-50"
                    >
                        <p className="font-black uppercase italic text-xs truncate">{product.name}</p>
                        <p className="text-orange-500 font-black text-sm">${Number(product.price).toLocaleString()}</p>
                    </button>
                ))}
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white">
                <button
                    type="button"
                    onClick={() => {
                        setAccountOpen((open) => !open);
                    }}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3"
                >
                    <div className="min-w-0 text-left">
                        <p className="text-[10px] font-black uppercase text-slate-800 truncate">{guest?.name || 'Cuenta'}</p>
                        <p className="font-black italic text-lg leading-none">${accountTotal.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-black uppercase text-orange-500">
                            {pendingItems.length} por enviar
                        </span>
                        <ChevronUp size={18} className={`text-slate-800 transition-transform ${accountOpen ? '' : 'rotate-180'}`} />
                    </div>
                </button>
                {accountOpen && (
                    <div className="px-3 md:px-4 pb-3 space-y-3">
                        <button type="button" onClick={openRenameGuest} className="text-[10px] font-black uppercase text-slate-800">
                            Cambiar nombre · {sentItems.length} en cocina
                        </button>
                        {accountItems.length > 0 && (
                            <div className="max-h-36 overflow-y-auto space-y-1">
                                {accountItems.map((item) => (
                                    <div key={item.tempId} className="flex justify-between text-xs">
                                        <span className="font-black uppercase italic truncate pr-2">
                                            {item.quantity}x {item.name}
                                            <span className="ml-2 text-orange-500">{(item as any).sentToKitchen ? 'Cocina' : 'Nuevo'}</span>
                                        </span>
                                        <span className="font-black shrink-0">${(item.price * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={sendKitchen}
                                disabled={busy || !guestId || pendingItems.length === 0}
                                className="py-3 rounded-2xl bg-orange-500 text-white font-black uppercase italic disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                {busy ? <Loader2 className="animate-spin" size={18} /> : <Printer size={16} />} Enviar cocina
                            </button>
                            <button
                                type="button"
                                onClick={payGuest}
                                disabled={busy || !guestId || accountItems.length === 0}
                                className="py-3 rounded-2xl bg-slate-900 text-white font-black uppercase italic disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                <CreditCard size={16} /> Cobrar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showBill && bill && (
                <div
                    className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-3 overflow-hidden overscroll-none touch-none"
                    onClick={() => {
                        setShowBill(false);
                    }}
                >
                    <div className="w-full max-w-lg bg-white rounded-[2rem] max-h-[85vh] flex flex-col overscroll-contain touch-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="shrink-0 flex items-start justify-between gap-3 p-5 pb-3">
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Mesa {bill.number}</p>
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter">Cuenta de la mesa</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowBill(false);
                                }}
                                className="p-2.5 rounded-full bg-slate-50 hover:bg-red-50 hover:text-red-500 shrink-0"
                                title="Cerrar"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div data-bill-scroll className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-auto px-5 pb-6 space-y-4">
                        {bill.billRequest?.guestName && (
                            <p className="text-sm font-bold text-amber-700 bg-amber-50 rounded-2xl px-4 py-3">
                                {bill.billRequest.mode === 'GUEST'
                                    ? `${bill.billRequest.guestName} pidió solo su cuenta.`
                                    : `${bill.billRequest.guestName} pidió la cuenta de toda la mesa.`}
                            </p>
                        )}
                        {bill.guests.map((g: any) => (
                            <div key={g.id} className="border-b border-slate-100 pb-3">
                                <div className="flex justify-between font-black italic uppercase">
                                    <span>{g.name}{bill.billRequest?.guestId === g.id ? ' · pidió cuenta' : ''}</span>
                                    <span>${Number(g.total).toLocaleString()}</span>
                                </div>
                                {g.items.map((item: any) => (
                                    <p key={item.id} className="text-xs font-bold text-slate-900">
                                        {item.quantity}x {item.name}
                                    </p>
                                ))}
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <button
                                        type="button"
                                        disabled={busy || !g.total}
                                        onClick={() => printPreCuenta(g.id)}
                                        className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 font-black uppercase italic text-[11px] disabled:opacity-40 flex items-center justify-center gap-1.5"
                                    >
                                        <Printer size={13} /> Pre-cuenta
                                    </button>
                                    <button
                                        type="button"
                                        disabled={busy || !g.total}
                                        onClick={() => { setGuestId(g.id); void payGuest(g.id); }}
                                        className="py-3 rounded-xl bg-slate-900 text-white font-black uppercase italic text-[11px] disabled:opacity-40"
                                    >
                                        Cobrar {g.name}
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div className="flex justify-between text-xl font-black italic">
                            <span>Total mesa</span>
                            <span>${Number(bill.grandTotal).toLocaleString()}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2">
                            <button
                                type="button"
                                disabled={busy || !bill.grandTotal}
                                onClick={() => printPreCuenta()}
                                className="py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 font-black uppercase italic text-xs flex items-center justify-center gap-2"
                            >
                                <Printer size={16} /> Pre-cuenta mesa
                            </button>
                            <button
                                type="button"
                                onClick={payAll}
                                disabled={busy || !bill.grandTotal}
                                className="py-4 rounded-2xl bg-slate-900 text-white font-black uppercase italic text-xs"
                            >
                                Cobrar toda la mesa
                            </button>
                        </div>
                        </div>
                    </div>
                </div>
            )}

            {nameModal && (
                <div className="fixed inset-0 z-[80] bg-black/50 flex items-end md:items-center justify-center p-4">
                    <form
                        className="w-full max-w-md bg-white rounded-[2rem] p-6 space-y-4"
                        onSubmit={(e) => { e.preventDefault(); void submitGuestName(); }}
                    >
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Mesa {table.number}</p>
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter">
                            {nameModal === 'add' ? 'Nombre del comensal' : 'Cambiar nombre'}
                        </h2>
                        <p className="text-sm font-bold text-slate-800">
                            Anótalo como te lo dijo. Sale en su cuenta y en la comanda.
                        </p>
                        <input
                            ref={nameRef}
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            placeholder="Ej: Diego"
                            autoComplete="name"
                            className="w-full bg-slate-50 px-4 py-4 rounded-2xl font-black text-lg outline-none border-2 border-transparent focus:border-orange-500"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => setNameModal(null)} className="py-4 rounded-2xl bg-slate-100 font-black uppercase italic">
                                Cancelar
                            </button>
                            <button type="submit" disabled={busy} className="py-4 rounded-2xl bg-slate-900 text-white font-black uppercase italic">
                                {busy ? '...' : nameModal === 'add' ? 'Sentar' : 'Guardar'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {configProduct && (
                <WaiterDishBuilder
                    isOpen={!!configProduct}
                    product={configProduct}
                    guestName={guest?.name}
                    onClose={() => setConfigProduct(null)}
                    onConfirm={(item: any) => { setConfigProduct(null); void persistItem(item); }}
                />
            )}

            <div style={{ display: 'none' }}>
                {printSale && (
                    printSale.kind === 'account' ? (
                        <BoletaPrinter
                            ref={printerRef}
                            mode={printSale.mode || (printSale.guests && printSale.guests.length > 1 ? 'table' : 'guest')}
                            tableNumber={table?.number}
                            saleCode={printSale.code ? `#${printSale.code}` : undefined}
                            guests={printSale.guests || [{
                                name: printSale.guestName || 'Comensal',
                                items: printSale.items,
                                total: printSale.total,
                            }]}
                            waiter={user?.name || undefined}
                        />
                    ) : (
                        <ComandaPrinter
                            ref={printerRef}
                            saleCode={printSale.code}
                            items={printSale.items}
                            channel={printSale.channel}
                            customerInfo={printSale.guestName}
                            kind="kitchen"
                            total={printSale.total}
                        />
                    )
                )}
            </div>
        </div>
    );
}
