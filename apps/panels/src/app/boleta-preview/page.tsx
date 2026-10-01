'use client';

import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { BoletaPrinter, type BoletaGuest } from '../../components/printer/BoletaPrinter';
import { ComandaPrinter } from '../../components/printer/ComandaPrinter';

const item = (name: string, price: number, quantity = 1, modifiers: any = {}) => ({
    tempId: name, productId: name, variantId: 'default', name, price, quantity, modifiers,
});

const camila: BoletaGuest = {
    name: 'Camila',
    items: [
        item('Ceviche Lo Más Rico 500g', 13990, 1, {
            dynamicSelections: [
                { groupName: 'Proteína', selectedOptions: [{ name: 'Salmón' }, { name: 'Camarón' }] },
                { groupName: 'Salsa', selectedOptions: [{ name: 'Leche de tigre clásica' }] },
            ],
            removedIngredients: ['cebolla morada'],
        }),
        item('Limonada Lo Más Rico', 3490, 2, {
            dynamicSelections: [{ groupName: 'Sabor', selectedOptions: [{ name: 'Menta jengibre' }] }],
        }),
    ],
};

const jorge: BoletaGuest = {
    name: 'Jorge',
    items: [
        item('Hand roll Acevichado', 5990, 2),
        item('1/2 docena empanadas camarón queso', 7990),
    ],
};

const allKitchenItems = [...camila.items, ...jorge.items];

export default function BoletaPreviewPage() {
    const guestRef = useRef<HTMLDivElement>(null);
    const tableRef = useRef<HTMLDivElement>(null);
    const kitchenRef = useRef<HTMLDivElement>(null);

    const printGuest = useReactToPrint({
        contentRef: guestRef as any,
    });

    const printTable = useReactToPrint({
        contentRef: tableRef as any,
    });

    const printKitchen = useReactToPrint({
        contentRef: kitchenRef as any,
    });

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', padding: 32, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto 32px', textAlign: 'center', color: '#fff' }}>
                <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5, marginBottom: 8 }}>
                    🧾 Comparativa: Boleta Cliente vs Comanda Cocina (80mm)
                </h1>
                <p style={{ color: '#94a3b8', fontSize: 15, maxWidth: 700, margin: '0 auto' }}>
                    Puedes ver y probar la impresión térmica de los dos documentos: la comanda operativa para los cocineros (sin precios, tipografía monoespaciada legible) y la boleta/cuenta final para el comensal.
                </p>
            </div>

            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'center' }}>
                {/* 1. Comanda Cocina */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <button
                        onClick={() => printKitchen()}
                        style={{
                            background: '#ea580c',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '10px 20px',
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            boxShadow: '0 4px 12px rgba(234, 88, 12, 0.35)',
                        }}
                    >
                        👨‍🍳 Imprimir: Comanda Cocina
                    </button>
                    <div style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,.4)' }}>
                        <ComandaPrinter
                            ref={kitchenRef}
                            saleCode="0012"
                            channel="SALÓN · MESA 3"
                            customerInfo="Camila / Jorge"
                            kind="kitchen"
                            items={allKitchenItems}
                        />
                    </div>
                </div>

                {/* 2. Boleta Mesa Completa */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <button
                        onClick={() => printTable()}
                        style={{
                            background: '#059669',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '10px 20px',
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.35)',
                        }}
                    >
                        🧾 Imprimir: Boleta Mesa Completa
                    </button>
                    <div style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,.4)' }}>
                        <BoletaPrinter ref={tableRef} mode="table" tableNumber={3} saleCode="#0012" guests={[camila, jorge]} waiter="Oscar" />
                    </div>
                </div>

                {/* 3. Boleta por Comensal */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <button
                        onClick={() => printGuest()}
                        style={{
                            background: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '10px 20px',
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                        }}
                    >
                        👤 Imprimir: Boleta Por Comensal
                    </button>
                    <div style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,.4)' }}>
                        <BoletaPrinter ref={guestRef} mode="guest" tableNumber={3} saleCode="#0012" guests={[camila]} waiter="Oscar" />
                    </div>
                </div>
            </div>
        </div>
    );
}


