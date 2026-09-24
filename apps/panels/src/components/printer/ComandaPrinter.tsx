import React, { forwardRef } from 'react';
import { type CartItem } from '../../types';
import { cleanModifierLabel } from '@lomasrico/shared-types';

interface ComandaProps {
    saleCode: string;
    items: CartItem[];
    customerInfo?: string;
    channel?: string;
    kind?: 'kitchen' | 'account';
    total?: number;
}

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

export const ComandaPrinter = forwardRef<HTMLDivElement, ComandaProps>(({
    saleCode, items, customerInfo, channel, kind = 'kitchen', total,
}, ref) => {
    const now = new Date();
    const time = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('es-CL');
    const isAccount = kind === 'account';
    const computedTotal = total ?? items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <div
            ref={ref}
            style={{
                width: '80mm',
                maxWidth: '80mm',
                color: '#000',
                background: '#fff',
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '13px',
                lineHeight: 1.25,
                padding: '4mm 3mm 12mm',
                boxSizing: 'border-box',
            }}
        >
            <style>{`
                @page { size: 80mm auto; margin: 0; }
                @media print {
                    html, body { margin: 0 !important; width: 80mm !important; }
                }
            `}</style>

            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1 }}>LO MAS RICO</div>
                <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                    {isAccount ? 'CUENTA / PRE-CUENTA' : 'COMANDA COCINA'}
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, marginTop: 6 }}>
                    {(channel || 'MESA').toUpperCase()}
                </div>
                {customerInfo && (
                    <div style={{ fontSize: 16, fontWeight: 900, marginTop: 4 }}>
                        {customerInfo.toUpperCase()}
                    </div>
                )}
                <div style={{ fontSize: 11, marginTop: 4 }}>#{saleCode} · {date} {time}</div>
            </div>

            <div>
                {items.map((item, index) => {
                    const lines = modifierLines(item);
                    const lineTotal = item.price * item.quantity;
                    return (
                        <div key={index} style={{ borderBottom: '1px dashed #000', padding: '6px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 14 }}>
                                <span>{item.quantity}x {item.name}</span>
                                {isAccount && <span>${lineTotal.toLocaleString('es-CL')}</span>}
                            </div>
                            {lines.map((line, i) => (
                                <div key={i} style={{ paddingLeft: 12, fontSize: 12 }}>+ {line}</div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {isAccount ? (
                <div style={{ marginTop: 10, borderTop: '2px solid #000', paddingTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 900 }}>
                        <span>TOTAL</span>
                        <span>${computedTotal.toLocaleString('es-CL')}</span>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11 }}>
                        Documento interno · no es boleta SII
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, borderTop: '2px solid #000', paddingTop: 8 }}>
                    Revisar proteínas y formato antes de salir
                </div>
            )}
        </div>
    );
});

ComandaPrinter.displayName = 'ComandaPrinter';
