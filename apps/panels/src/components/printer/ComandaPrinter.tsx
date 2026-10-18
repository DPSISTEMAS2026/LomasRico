import React, { forwardRef } from 'react';
import { type CartItem } from '../../types';
import { formatModifierPrintLines } from '@lomasrico/shared-types';

interface ComandaProps {
    saleCode: string;
    items: CartItem[];
    customerInfo?: string;
    channel?: string;
    kind?: 'kitchen' | 'account';
    total?: number;
}

function modifierLines(item: CartItem): string[] {
    return formatModifierPrintLines(item.modifiers as any);
}

export const ComandaPrinter = forwardRef<HTMLDivElement, ComandaProps>(({
    saleCode, items, customerInfo, channel, kind = 'kitchen', total,
}, ref) => {
    const now = new Date();
    const time = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('es-CL');
    const isAccount = kind === 'account';
    const computedTotal = total ?? items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const channelLabel = (channel || 'MESA').toUpperCase();
    const guest = String(customerInfo || '').trim();
    const guestRedundant = !guest
        || channelLabel.includes(guest.toUpperCase())
        || (/^MESA\s*\d+$/i.test(channelLabel) && /^\d+$/.test(guest));

    return (
        <div
            ref={ref}
            style={{
                width: '58mm',
                maxWidth: '58mm',
                color: '#000',
                background: '#fff',
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '12px',
                lineHeight: 1.3,
                padding: '2mm 2.5mm 18mm',
                boxSizing: 'border-box',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
            }}
        >
            <style>{`
                @page { size: 58mm auto; margin: 0; }
                @media print {
                    html, body { margin: 0 !important; width: 58mm !important; max-width: 58mm !important; }
                }
            `}</style>

            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 6, marginBottom: 6 }}>
                <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 0.5 }}>LO MAS RICO</div>
                <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                    {isAccount ? 'CUENTA / PRE-CUENTA' : 'COMANDA COCINA'}
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, marginTop: 5, lineHeight: 1.1 }}>
                    {channelLabel}
                </div>
                {!guestRedundant && guest && (
                    <div style={{ fontSize: 14, fontWeight: 900, marginTop: 3 }}>
                        {guest.toUpperCase()}
                    </div>
                )}
                <div style={{ fontSize: 11, marginTop: 3 }}>#{saleCode} · {date} {time}</div>
            </div>

            <div>
                {items.map((item, index) => {
                    const lines = modifierLines(item);
                    const lineTotal = item.price * item.quantity;
                    return (
                        <div key={index} style={{ borderBottom: '1px dashed #000', padding: '5px 0' }}>
                            <div style={{ fontWeight: 900, fontSize: 14, wordBreak: 'break-word' }}>
                                {item.quantity}x {item.name}
                                {isAccount ? ` · $${lineTotal.toLocaleString('es-CL')}` : ''}
                            </div>
                            {lines.map((line, i) => (
                                <div key={i} style={{ paddingLeft: 8, fontSize: 12, fontWeight: 700 }}>+ {line}</div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {isAccount ? (
                <div style={{ marginTop: 8, borderTop: '2px solid #000', paddingTop: 6 }}>
                    <div style={{ fontSize: 15, fontWeight: 900 }}>
                        TOTAL ${computedTotal.toLocaleString('es-CL')}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10 }}>
                        Documento interno · no es boleta SII
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10, borderTop: '2px solid #000', paddingTop: 6 }}>
                    Revisar proteínas y formato
                </div>
            )}
            <div style={{ height: '12mm' }} aria-hidden />
        </div>
    );
});

ComandaPrinter.displayName = 'ComandaPrinter';
