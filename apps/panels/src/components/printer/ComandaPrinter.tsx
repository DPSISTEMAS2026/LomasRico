import React, { forwardRef } from 'react';
import { type CartItem } from '../../types';

interface ComandaProps {
    saleCode: string;
    items: CartItem[];
    customerInfo?: string;
    channel?: string;
}

export const ComandaPrinter = forwardRef<HTMLDivElement, ComandaProps>(({ saleCode, items, customerInfo, channel }, ref) => {
    const today = new Date();
    const formattedTime = today.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const formattedDate = today.toLocaleDateString('es-CL');

    return (
        <div ref={ref} className="p-4" style={{ width: '80mm', color: 'black', fontFamily: 'monospace', fontSize: '12px' }}>
            {/* Cabecera */}
            <div className="text-center mb-4">
                <h1 className="font-black text-lg mb-1" style={{ fontSize: '16px' }}>LO MÁS RICO</h1>
                <p>Comprobante de Pedido</p>
                <p>--------------------------------</p>
            </div>

            {/* Datos de Orden */}
            <div className="mb-4">
                <p><strong>ORDEN:</strong> #{saleCode}</p>
                <p><strong>FECHA:</strong> {formattedDate}</p>
                <p><strong>HORA:</strong> {formattedTime}</p>
                <p><strong>CANAL:</strong> {channel || 'POS'}</p>
                {customerInfo && <p><strong>INFO:</strong> {customerInfo}</p>}
                <p>--------------------------------</p>
            </div>

            {/* Items */}
            <div className="space-y-4 mb-4">
                {items.map((item, index) => (
                    <div key={index}>
                        <div className="flex justify-between font-bold">
                            <span>{item.quantity}x {item.name}</span>
                        </div>

                        {/* Modificadores */}
                        {((item.modifiers?.selectedProteinNames?.length ?? 0) > 0 || (item.modifiers?.removedIngredients?.length ?? 0) > 0 || (item.modifiers?.extras?.length ?? 0) > 0) && (
                            <div className="ml-4 mt-1" style={{ fontSize: '10px' }}>
                                {item.modifiers.selectedProteinNames?.map((p: string, i: number) => (
                                    <div key={`p-${i}`}>+ {p}</div>
                                ))}
                                {item.modifiers.removedIngredients?.map((v: string, i: number) => (
                                    <div key={`v-${i}`}>- Sin {v}</div>
                                ))}
                                {item.modifiers.extras?.map((e: any, i: number) => (
                                    <div key={`e-${i}`}>+ {e.name}</div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Pie */}
            <div className="text-center mt-6">
                <p>--------------------------------</p>
                <p>Revisa tu orden antes de salir</p>
                <p>¡Gracias por tu preferencia!</p>
            </div>

            {/* Espacio extra abajo para que la ticketera corte bien */}
            <div style={{ height: '40px' }} />
        </div>
    );
});

ComandaPrinter.displayName = 'ComandaPrinter';
