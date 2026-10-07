'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { API_URL } from '../../../../services/api';
import { authFetch } from '../../../../services/authFetch';

const ACTION_LABEL: Record<string, string> = {
    ORDER_CANCEL: 'Pedido anulado',
    BATCH_CANCEL: 'Tanda anulada',
    ITEM_VOID: 'Producto quitado',
    DISCOUNT: 'Descuento',
    CASH_WITHDRAWAL: 'Retiro de caja',
    CASH_EXPENSE: 'Gasto de caja',
    SHIFT_CLOSE: 'Cierre de turno',
    STAFF_CREATE: 'Personal creado',
    STAFF_UPDATE: 'Personal modificado',
    STAFF_DELETE: 'Personal eliminado',
    PAID_AFTER_CANCEL: 'Pago tras anulación (devolver)',
};

const ACTION_COLOR: Record<string, string> = {
    ORDER_CANCEL: 'bg-red-50 text-red-700',
    BATCH_CANCEL: 'bg-red-50 text-red-700',
    ITEM_VOID: 'bg-amber-50 text-amber-800',
    DISCOUNT: 'bg-blue-50 text-blue-800',
    CASH_WITHDRAWAL: 'bg-slate-100 text-slate-900',
    CASH_EXPENSE: 'bg-slate-100 text-slate-900',
    SHIFT_CLOSE: 'bg-emerald-50 text-emerald-800',
    PAID_AFTER_CANCEL: 'bg-red-50 text-red-700',
};

const money = (n: any) => `$${Math.round(Number(n || 0)).toLocaleString('es-CL')}`;

function describe(log: any): string {
    const d = log.details || {};
    const items = Array.isArray(d.items)
        ? d.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')
        : '';
    switch (log.action) {
        case 'ITEM_VOID':
            return `${items}${d.paid ? ' · ya pagado, devolución en caja' : ''}`;
        case 'ORDER_CANCEL':
        case 'BATCH_CANCEL':
            return `${d.label || ''}${items ? ` · ${items}` : ''}${d.paid ? ' · estaba pagado' : ''}`;
        case 'SHIFT_CLOSE':
            return `Esperado ${money(d.expectedCash)} · contado ${money(d.counted)}`;
        default:
            return '';
    }
}

export default function AuditPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [action, setAction] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/audit${action ? `?action=${action}` : ''}`, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setLogs(await res.json());
            setError('');
        } catch (e: any) {
            setError(e?.message || 'Error');
        } finally {
            setLoading(false);
        }
    }, [action]);

    useEffect(() => { void load(); }, [load]);

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-5">
            <div className="flex items-center justify-between gap-3 pl-14 lg:pl-0">
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-3">
                    <ShieldCheck className="text-orange-500" /> Registro
                </h1>
                <div className="flex gap-2">
                    <select
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-sm text-slate-900"
                    >
                        <option value="">Todo</option>
                        {Object.entries(ACTION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <button onClick={() => void load()} className="p-2.5 rounded-xl bg-slate-100 text-slate-900" title="Actualizar">
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {error && <p className="text-red-600 font-black">{error}</p>}
            {loading ? (
                <p className="text-center py-16 font-black uppercase italic text-slate-900">Cargando...</p>
            ) : logs.length === 0 ? (
                <p className="text-center py-16 font-black uppercase italic text-slate-900">Sin registros</p>
            ) : (
                <div className="space-y-2">
                    {logs.map((log) => (
                        <div key={log.id} className="bg-white rounded-2xl border border-slate-100 p-4">
                            <div className="flex flex-wrap items-center gap-2 justify-between">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${ACTION_COLOR[log.action] || 'bg-slate-100 text-slate-900'}`}>
                                        {ACTION_LABEL[log.action] || log.action}
                                    </span>
                                    {log.saleCode && <span className="font-black italic text-slate-900">{log.saleCode}</span>}
                                    {log.amount != null && <span className="font-black text-slate-900">{money(log.amount)}</span>}
                                </div>
                                <span className="text-xs font-bold text-slate-900">
                                    {new Date(log.createdAt).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            {describe(log) && <p className="text-sm font-bold text-slate-900 mt-1">{describe(log)}</p>}
                            {log.reason && <p className="text-sm text-slate-900 mt-1">Motivo: {log.reason}</p>}
                            <p className="text-xs font-bold text-slate-900 mt-1">
                                {log.actorName ? `Pidió: ${log.actorName}` : ''}
                                {log.approverName ? `${log.actorName ? ' · ' : ''}Autorizó: ${log.approverName}` : ''}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
