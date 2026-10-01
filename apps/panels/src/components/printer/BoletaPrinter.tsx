import React, { forwardRef } from 'react';
import { type CartItem } from '../../types';
import { cleanModifierLabel } from '@lomasrico/shared-types';

export type BoletaGuest = {
    name: string;
    items: CartItem[];
    total?: number;
};

interface BoletaProps {
    mode: 'guest' | 'table';
    tableNumber?: number | string;
    saleCode?: string;
    guests: BoletaGuest[];
    waiter?: string;
    tipPercent?: number;
    date?: Date;
}

const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

function modifierLines(item: CartItem): string[] {
    const lines: string[] = [];
    const mods = item.modifiers || {};
    mods.dynamicSelections?.forEach((g: any) => {
        g.selectedOptions?.forEach((o: any) => lines.push(`${cleanModifierLabel(g.displayName || g.groupName)}: ${o.name}`));
    });
    mods.selectedProteinNames?.forEach((p: string) => lines.push(p));
    mods.selectedProteins?.forEach((p: string) => lines.push(p));
    mods.removedIngredients?.forEach((v: string) => lines.push(`Sin ${v}`));
    mods.extras?.forEach((e: any) => lines.push(e.name || e));
    return lines;
}

const guestTotal = (g: BoletaGuest) => g.total ?? g.items.reduce((s, i) => s + i.price * i.quantity, 0);

const rule = (style: 'solid' | 'dashed' = 'dashed', weight = 1): React.CSSProperties => ({
    borderTop: `${weight}px ${style} #000`,
    margin: '8px 0',
});

export const BoletaPrinter = forwardRef<HTMLDivElement, BoletaProps>(({
    mode, tableNumber, saleCode, guests, waiter, tipPercent = 10, date = new Date(),
}, ref) => {
    const time = date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const day = date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const subtotal = guests.reduce((s, g) => s + guestTotal(g), 0);
    const tip = Math.round((subtotal * tipPercent) / 100);
    const showGuestHeaders = mode === 'table' && guests.length > 1;
    const title = mode === 'table'
        ? `Mesa ${tableNumber ?? ''}`
        : `${guests[0]?.name || 'Comensal'} · Mesa ${tableNumber ?? ''}`;

    return (
        <div
            ref={ref}
            style={{
                width: '80mm',
                maxWidth: '80mm',
                color: '#000',
                background: '#fff',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '12px',
                lineHeight: 1.3,
                padding: '5mm 4mm 14mm',
                boxSizing: 'border-box',
            }}
        >
            <style>{`
                @page { size: 80mm auto; margin: 0; }
                @media print {
                    html, body { margin: 0 !important; width: 80mm !important; }
                }
            `}</style>

            <div style={{ textAlign: 'center' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="/assets/products/LOGO SVG.svg"
                    alt="Lo Más Rico"
                    style={{ height: '26mm', width: 'auto', filter: 'brightness(0)', display: 'inline-block' }}
                />
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, marginTop: 4 }}>CEVICHERÍA</div>
            </div>

            <div style={rule('solid', 2)} />

            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 17, fontWeight: 900, textTransform: 'uppercase' }}>{title}</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>
                    {day} · {time}{saleCode ? ` · ${saleCode}` : ''}
                </div>
                {waiter && <div style={{ fontSize: 11 }}>Te atendió {waiter}</div>}
            </div>

            <div style={rule('solid', 2)} />

            {guests.map((g, gi) => (
                <div key={gi} style={{ marginBottom: showGuestHeaders ? 6 : 0 }}>
                    {showGuestHeaders && (
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                            fontSize: 13, fontWeight: 900, textTransform: 'uppercase',
                            borderBottom: '1px solid #000', paddingBottom: 2, marginBottom: 4, marginTop: gi ? 8 : 0,
                        }}>
                            <span>{g.name}</span>
                            <span>{clp(guestTotal(g))}</span>
                        </div>
                    )}
                    {g.items.map((item, ii) => {
                        const lines = modifierLines(item);
                        return (
                            <div key={ii} style={{ padding: '3px 0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontWeight: 700 }}>
                                    <span>{item.quantity} × {item.name}</span>
                                    <span style={{ whiteSpace: 'nowrap' }}>{clp(item.price * item.quantity)}</span>
                                </div>
                                {lines.map((line, li) => (
                                    <div key={li} style={{ paddingLeft: 12, fontSize: 11 }}>· {line}</div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            ))}

            <div style={rule('dashed')} />

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Consumo</span>
                <span>{clp(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Propina sugerida ({tipPercent}%)</span>
                <span>{clp(tip)}</span>
            </div>

            <div style={rule('solid', 2)} />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 900 }}>
                <span>TOTAL</span>
                <span>{clp(subtotal + tip)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2 }}>
                <span>Sin propina</span>
                <span>{clp(subtotal)}</span>
            </div>

            <div style={rule('solid', 2)} />

            <div style={{ textAlign: 'center', marginTop: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 900 }}>¡Gracias por venir!</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                    Fue un gusto tenerte en nuestra mesa.
                    <br />
                    Te esperamos pronto con más limón y ají.
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 8 }}>@cevichelomasrico</div>
                <div style={{ fontSize: 9, marginTop: 10 }}>
                    La propina es voluntaria · Documento no válido como boleta
                </div>
            </div>
        </div>
    );
});

BoletaPrinter.displayName = 'BoletaPrinter';
