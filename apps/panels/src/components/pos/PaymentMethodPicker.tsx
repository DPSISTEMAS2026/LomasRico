'use client';

import { useEffect, useState } from 'react';
import { Banknote, CreditCard, TrendingUp } from 'lucide-react';
import { isFoodPaymentMethod, type PaymentMethodCode } from '@lomasrico/shared-types';
import { fetchPaymentConfig } from '../../services/api';

export type PosPaymentMethod = Extract<
    PaymentMethodCode,
    'CASH' | 'MP' | 'TRANSFER' | 'DEBIT' | 'CREDIT' | 'EDENRED' | 'PLUXEE' | 'JUNAEB' | 'FOOD_CARD'
>;

export type TerminalCardMethod = Extract<PosPaymentMethod, 'DEBIT' | 'CREDIT'>;
/** Medios que pasan por la máquina TUU (boleta Haulmer). */
export type TerminalPayMethod = Extract<PosPaymentMethod, 'DEBIT' | 'CREDIT' | 'CASH' | 'TRANSFER'>;

export function isTerminalCardMethod(method: PosPaymentMethod): method is TerminalCardMethod {
    return method === 'DEBIT' || method === 'CREDIT';
}

export function isTerminalPayMethod(method: PosPaymentMethod): method is TerminalPayMethod {
    return method === 'DEBIT' || method === 'CREDIT' || method === 'CASH' || method === 'TRANSFER';
}

let terminalConfig: Promise<boolean> | null = null;

/** true cuando las tarjetas se cobran en la máquina TUU integrada. */
export function useCardTerminal(): boolean {
    const [enabled, setEnabled] = useState(false);
    useEffect(() => {
        terminalConfig ??= fetchPaymentConfig().then((c) => c.cardTerminal === 'tuu');
        let alive = true;
        void terminalConfig.then((v) => { if (alive) setEnabled(v); });
        return () => { alive = false; };
    }, []);
    return enabled;
}

const MP_METHODS: { id: PosPaymentMethod; label: string }[] = [
    { id: 'CASH', label: 'Efectivo' },
    { id: 'MP', label: 'Mercado Pago' },
    { id: 'TRANSFER', label: 'Transferencia' },
];

const TERMINAL_METHODS: { id: PosPaymentMethod; label: string }[] = [
    { id: 'CASH', label: 'Efectivo' },
    { id: 'DEBIT', label: 'Débito' },
    { id: 'CREDIT', label: 'Crédito' },
    { id: 'TRANSFER', label: 'Transferencia' },
];

const FOOD_METHODS: { id: PosPaymentMethod; label: string; logo: string }[] = [
    { id: 'EDENRED', label: 'Edenred', logo: '/assets/alimentacion/edenred.png' },
    { id: 'PLUXEE', label: 'Pluxee', logo: '/assets/alimentacion/pluxee.svg' },
    { id: 'JUNAEB', label: 'JUNAEB', logo: '/assets/alimentacion/junaeb.png' },
];

interface Props {
    value: PosPaymentMethod;
    onChange: (method: PosPaymentMethod) => void;
    cardTerminal?: boolean;
}

export function PaymentMethodPicker({ value, onChange, cardTerminal = false }: Props) {
    const mainMethods = cardTerminal ? TERMINAL_METHODS : MP_METHODS;
    return (
        <div className="space-y-3">
            <div className={`grid gap-2 ${cardTerminal ? 'grid-cols-4' : 'grid-cols-3'}`}>
                {mainMethods.map((m) => {
                    const selected = value === m.id;
                    return (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => onChange(m.id)}
                            className={`h-[84px] px-1.5 rounded-2xl font-black italic uppercase text-[8px] tracking-widest border-2 transition-all flex flex-col items-center justify-center gap-1.5
                                ${selected
                                    ? m.id === 'MP'
                                        ? 'bg-[#009ee3] border-[#009ee3] text-white shadow-md'
                                        : 'bg-white border-orange-500 text-orange-500 shadow-md'
                                    : 'bg-white border-slate-200 text-slate-900 hover:border-slate-400'}`}
                        >
                            {m.id === 'CASH' && <Banknote size={26} strokeWidth={2.2} />}
                            {m.id === 'TRANSFER' && <TrendingUp size={26} strokeWidth={2.2} />}
                            {(m.id === 'DEBIT' || m.id === 'CREDIT') && <CreditCard size={26} strokeWidth={2.2} />}
                            {m.id === 'MP' && (
                                <img
                                    src="/assets/mercadopago/icono.svg"
                                    alt=""
                                    className="h-9 w-9 object-contain"
                                />
                            )}
                            <span className="leading-tight text-center">{m.label}</span>
                        </button>
                    );
                })}
            </div>

            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-800 px-1">
                Tarjetas de alimentación
            </p>
            <div className="grid grid-cols-3 gap-2">
                {FOOD_METHODS.map((m) => {
                    const selected = value === m.id;
                    return (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => onChange(m.id)}
                            className={`h-[84px] px-1.5 rounded-2xl font-black italic uppercase text-[8px] tracking-widest border-2 transition-all flex flex-col items-center justify-center gap-1.5
                                ${selected
                                    ? 'bg-white border-orange-500 text-orange-500 shadow-md'
                                    : 'bg-white border-slate-200 text-slate-900 hover:border-slate-400'}`}
                        >
                            <img
                                src={m.logo}
                                alt=""
                                className="h-8 w-12 object-contain shrink-0"
                            />
                            <span className="leading-tight text-center">{m.label}</span>
                        </button>
                    );
                })}
            </div>

            {isFoodPaymentMethod(value) && (
                <p className="text-[10px] font-bold text-slate-900 px-1">
                    Pasa la tarjeta en el lector de alimentación y luego confirma la venta.
                </p>
            )}
        </div>
    );
}

export function checkoutButtonLabel(method: PosPaymentMethod): string {
    if (method === 'MP') return 'COBRAR CON MP';
    if (method === 'DEBIT') return 'COBRAR DÉBITO';
    if (method === 'CREDIT') return 'COBRAR CRÉDITO';
    if (method === 'CASH') return 'COBRAR EFECTIVO';
    if (method === 'TRANSFER') return 'COBRAR TRANSFERENCIA';
    if (method === 'EDENRED') return 'COBRAR EDENRED';
    if (method === 'PLUXEE') return 'COBRAR PLUXEE';
    if (method === 'JUNAEB') return 'COBRAR JUNAEB';
    if (method === 'FOOD_CARD') return 'COBRAR ALIMENTACIÓN';
    return 'COBRAR RETIRO';
}
