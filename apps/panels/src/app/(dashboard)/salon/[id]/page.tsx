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
import { ApprovalModal, type Approval } from '../../../../components/common/ApprovalModal';
import { isTerminalPayMethod, type PosPaymentMethod, type TerminalPayMethod } from '../../../../components/pos/PaymentMethodPicker';
import { TerminalChargeModal } from '../../../../components/pos/TerminalChargeModal';
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
    const [voidItem, setVoidItem] = useState<{ saleId: string; guestName: string; item: any } | null>(null);
    const [payPrompt, setPayPrompt] = useState<{ guestId?: string; label: string; amount: number } | null>(null);
    const [payMethod, setPayMethod] = useState<PosPaymentMethod>('DEBIT');
    const [tipPercent, setTipPercent] = useState(10);
    const [terminalCharge, setTerminalCharge] = useState<{ guestId?: string; amount: number; method: TerminalPayMethod } | null>(null);
    const [paidTerminal, setPaidTerminal] = useState<{ guestId?: string; amount: number; key: string } | null>(null);
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
        tipPercent?: number;
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

    const askPayGuest = (targetGuestId?: string) => {
        const payId = targetGuestId || guestId;
        const row = table?.guests?.find((g: any) => g.id === payId);
        if (!payId || !row?.openSale?.items?.length) return;
        setPayMethod('DEBIT');
        // Conserva tipPercent elegido en la cuenta / pre-cuenta
        setPayPrompt({ guestId: payId, label: `Cobrar a ${row.name}`, amount: Number(row.openSale.total || 0) });
    };

    const askPayAll = () => {
        const amount = Number(bill?.grandTotal ?? table?.openTotal ?? 0);
        if (!amount) return;
        setPayMethod('DEBIT');
        setPayPrompt({ label: 'Cobrar toda la mesa', amount });
    };

    const confirmPay = () => {
        if (!payPrompt) return;
        const prompt = payPrompt;
        const tip = Math.round(prompt.amount * tipPercent / 100);
        setPayPrompt(null);
        let key: string | undefined;
        if (isTerminalPayMethod(payMethod)) {
            const amount = Math.round(prompt.amount + tip);
            if (paidTerminal?.guestId === prompt.guestId && paidTerminal?.amount === amount) key = paidTerminal.key;
            else { setTerminalCharge({ guestId: prompt.guestId, amount, method: payMethod }); return; }
        }
        if (prompt.guestId) void payGuest(prompt.guestId, payMethod, key, tipPercent);
        else void payAll(payMethod, key, tipPercent);
    };

    const terminalFailMessage = (e: any) =>
        `El pago en la máquina quedó aprobado, pero no se registró: ${e.message}. Vuelve a cobrar sin pasar la tarjeta de nuevo.`;

    const payGuest = async (targetGuestId: string | undefined, method: PosPaymentMethod, terminalPaymentKey?: string, tipPct = 0) => {
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
        setBusy(true);
        try {
            const res = await authFetch(`${API_URL}/tables/${id}/guests/${payId}/pay`, {
                method: 'POST',
                body: JSON.stringify({ paymentMethod: method, userId: user?.id, terminalPaymentKey, tipPercent: tipPct }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'No se pudo cobrar');
            if (terminalPaymentKey) setPaidTerminal(null);
            setPrintSale({
                code: data.sale?.code || '',
                items: payItems,
                channel: `MESA ${table?.number}`,
                guestName: payGuestRow?.name,
                kind: 'account',
                mode: 'guest',
                tipPercent: tipPct,
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
            alert(terminalPaymentKey ? terminalFailMessage(e) : e.message);
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
                price: Number(i.price || 0),
                quantity: i.quantity,
                modifiers: i.modifiers || {},
            }));
            setPrintSale({
                code: g.saleCode || '',
                items,
                channel: `MESA ${bill.number}`,
                guestName: g.name,
                kind: 'account',
                mode: 'guest',
                tipPercent,
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
                    price: Number(i.price || 0),
                    quantity: i.quantity,
                    modifiers: i.modifiers || {},
                })),
                total: Number(g.total || 0),
            })).filter((g: any) => g.items.length > 0);

            setPrintSale({
                code: '',
                items: tableGuests.flatMap(g => g.items),
                channel: `MESA ${bill.number}`,
                kind: 'account',
                mode: 'table',
                tipPercent,
                guests: tableGuests,
                total: Number(bill.grandTotal || 0),
            });
        }
    };

    const confirmVoidItem = async (body: Approval, quantity: number) => {
        if (!voidItem) return;
        const res = await authFetch(`${API_URL}/sales/${voidItem.saleId}/void-items`, {
            method: 'POST',
            body: JSON.stringify({ items: [{ saleItemId: voidItem.item.id, quantity }], ...body }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
            throw new Error(msg || 'No se pudo quitar');
        }
        setVoidItem(null);
        const billRes = await authFetch(`${API_URL}/tables/${id}/bill`);
        if (billRes.ok) setBill(await billRes.json());
        await loadTable(guestId);
    };

    const openBill = async () => {
        const res = await authFetch(`${API_URL}/tables/${id}/bill`);
        if (res.ok) setBill(await res.json());
        setShowBill(true);
    };

    const payAll = async (method: PosPaymentMethod, terminalPaymentKey?: string, tipPct = 0) => {
        setBusy(true);
        try {
            const res = await authFetch(`${API_URL}/tables/${id}/pay-all`, {
                method: 'POST',
                body: JSON.stringify({ paymentMethod: method, userId: user?.id, terminalPaymentKey, tipPercent: tipPct }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'No se pudo cobrar la mesa');
            if (terminalPaymentKey) setPaidTerminal(null);

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
                    tipPercent: tipPct,
                    total: tableGuests.reduce((s, g) => s + (g.total || 0), 0),
                });
            }

            setTable(data.table);
            setShowBill(false);
            setGuestId(null);
        } catch (e: any) {
            alert(terminalPaymentKey ? terminalFailMessage(e) : e.message);
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
                                        {g.openSale ? `$${Number(g.openSale.total).toLocaleString('es-CL')}` : 'Sin pedido'}
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
                        <p className="text-orange-500 font-black text-sm">${Number(product.price).toLocaleString('es-CL')}</p>
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
                        <p className="font-black italic text-lg leading-none">${accountTotal.toLocaleString('es-CL')}</p>
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
                                        <span className="font-black shrink-0">${(item.price * item.quantity).toLocaleString('es-CL')}</span>
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
                                onClick={() => askPayGuest()}
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
                                    <span>${Number(g.total).toLocaleString('es-CL')}</span>
                                </div>
                                {g.items.map((item: any) => (
                                    <div key={item.id} className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-bold text-slate-900">
                                            {item.quantity}x {item.name} · ${(item.price * item.quantity).toLocaleString('es-CL')}
                                        </p>
                                        {g.saleId && (
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => setVoidItem({ saleId: g.saleId, guestName: g.name, item })}
                                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 shrink-0"
                                                title="Quitar de la cuenta"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
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
                                        onClick={() => { setGuestId(g.id); askPayGuest(g.id); }}
                                        className="py-3 rounded-xl bg-slate-900 text-white font-black uppercase italic text-[11px] disabled:opacity-40"
                                    >
                                        Cobrar {g.name}
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Propina (antes del cobro)</p>
                            <div className="grid grid-cols-4 gap-2">
                                {[0, 10, 15, 20].map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setTipPercent(p)}
                                        className={`py-2.5 rounded-xl text-[10px] font-black uppercase italic border-2 ${tipPercent === p ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-900 border-transparent'}`}
                                    >
                                        {p === 0 ? 'No' : `${p}%`}
                                    </button>
                                ))}
                            </div>
                            <div className="flex justify-between text-sm font-black italic text-slate-900 pt-1">
                                <span>Subtotal</span>
                                <span>${Number(bill.grandTotal).toLocaleString('es-CL')}</span>
                            </div>
                            {tipPercent > 0 && (
                                <div className="flex justify-between text-sm font-bold text-emerald-800">
                                    <span>Propina {tipPercent}%</span>
                                    <span>${Math.round(Number(bill.grandTotal) * tipPercent / 100).toLocaleString('es-CL')}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-xl font-black italic text-slate-900 border-t border-emerald-100 pt-2">
                                <span>Total {tipPercent > 0 ? 'con propina' : 'mesa'}</span>
                                <span>${Math.round(Number(bill.grandTotal) * (1 + tipPercent / 100)).toLocaleString('es-CL')}</span>
                            </div>
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
                                onClick={askPayAll}
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

            {payPrompt && (
                <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-3" onClick={() => setPayPrompt(null)}>
                    <div className="w-full max-w-md bg-white rounded-[2rem] p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Mesa {table?.number}</p>
                                <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">{payPrompt.label}</h2>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-black italic text-slate-900">
                                    ${Math.round(payPrompt.amount * (1 + tipPercent / 100)).toLocaleString('es-CL')}
                                </span>
                                {tipPercent > 0 && (
                                    <p className="text-[10px] font-bold text-slate-800">
                                        Incluye propina {tipPercent}%
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {([
                                { id: 'DEBIT' as const, label: 'Débito' },
                                { id: 'CREDIT' as const, label: 'Crédito' },
                                { id: 'CASH' as const, label: 'Efectivo' },
                            ]).map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setPayMethod(m.id)}
                                    className={`h-20 rounded-2xl border-2 font-black italic uppercase text-xs tracking-wide ${payMethod === m.id ? 'bg-white border-orange-500 text-orange-500 shadow-md' : 'bg-white border-slate-200 text-slate-900'}`}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs font-bold text-slate-800 -mt-2">
                            {isTerminalPayMethod(payMethod) ? 'El monto sale en la Point de Mercado Pago.' : 'Efectivo. Se imprime la boleta, sin máquina.'}
                        </p>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-2">Propina</p>
                            <div className="grid grid-cols-4 gap-2">
                                {[0, 10, 15, 20].map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setTipPercent(p)}
                                        className={`py-2.5 rounded-xl text-[10px] font-black uppercase italic border-2 ${tipPercent === p ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-900 border-transparent'}`}
                                    >
                                        {p === 0 ? 'No' : `${p}%`}
                                    </button>
                                ))}
                            </div>
                            {tipPercent > 0 && (
                                <p className="mt-2 text-xs font-bold text-slate-800">
                                    Propina ${Math.round(payPrompt.amount * tipPercent / 100).toLocaleString('es-CL')}
                                    {' · '}Total ${Math.round(payPrompt.amount * (1 + tipPercent / 100)).toLocaleString('es-CL')}
                                </p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => setPayPrompt(null)} className="py-3 rounded-2xl bg-slate-100 font-black uppercase italic text-xs text-slate-900">
                                Cancelar
                            </button>
                            <button type="button" onClick={confirmPay} disabled={busy} className="py-3 rounded-2xl bg-slate-900 text-white font-black uppercase italic text-xs disabled:opacity-40">
                                {isTerminalPayMethod(payMethod) ? 'Enviar a la máquina' : 'Dar boleta'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {terminalCharge && (
                <TerminalChargeModal
                    amount={terminalCharge.amount}
                    method={terminalCharge.method}
                    reference={`Mesa ${table?.number ?? ''}`.trim()}
                    onClose={() => setTerminalCharge(null)}
                    onPaid={(key) => {
                        const charged = terminalCharge;
                        const tipPct = tipPercent;
                        setPaidTerminal({ guestId: charged.guestId, amount: charged.amount, key });
                        setTerminalCharge(null);
                        if (charged.guestId) void payGuest(charged.guestId, charged.method, key, tipPct);
                        else void payAll(charged.method, key, tipPct);
                    }}
                />
            )}

            {voidItem && (
                <ApprovalModal
                    title="Quitar de la cuenta"
                    summary={`${voidItem.item.name} · ${voidItem.guestName}`}
                    confirmLabel="Quitar"
                    maxQuantity={voidItem.item.quantity}
                    onConfirm={confirmVoidItem}
                    onClose={() => setVoidItem(null)}
                />
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
                            saleCode={printSale.code ? `#${String(printSale.code).replace(/^#+/, '')}` : undefined}
                            guests={printSale.guests || [{
                                name: printSale.guestName || 'Comensal',
                                items: printSale.items,
                                total: printSale.total,
                            }]}
                            waiter={user?.name || undefined}
                            tipPercent={printSale.tipPercent ?? 0}
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
