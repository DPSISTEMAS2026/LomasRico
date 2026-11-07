'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCcw, Store, Power, Clock, Truck } from 'lucide-react';
import { authFetch } from '../../../../services/authFetch';
import { API_URL } from '../../../../services/api';
import { WEB_DELIVERY_PAUSED_MESSAGE } from '@lomasrico/shared-types';

type StoreAdmin = {
  webOrdersEnabled: boolean;
  webDeliveryEnabled: boolean;
  webHours: string | null;
  updatedAt: string | null;
  status: {
    open: boolean;
    opensAt: string;
    closesAt: string;
    ordersEnabled: boolean;
    deliveryEnabled?: boolean;
    envKillSwitch: boolean;
    schedule: { label: string; opensAt: string; closesAt: string }[];
  };
};

export default function StoreSettingsPage() {
  const [data, setData] = useState<StoreAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [opensAt, setOpensAt] = useState('11:00');
  const [closesAt, setClosesAt] = useState('22:00');
  const [useCustomHours, setUseCustomHours] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`${API_URL}/store/settings`);
      if (!res.ok) throw new Error('No se pudo cargar la configuración');
      const json = (await res.json()) as StoreAdmin;
      setData(json);
      if (json.webHours && /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(json.webHours)) {
        const [o, c] = json.webHours.split('-');
        setOpensAt(o);
        setClosesAt(c);
        setUseCustomHours(true);
      } else {
        setUseCustomHours(false);
        setOpensAt(json.status.opensAt || '11:00');
        setClosesAt(json.status.closesAt || '22:00');
      }
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (body: { webOrdersEnabled?: boolean; webDeliveryEnabled?: boolean; webHours?: string | null }) => {
    setSaving(true);
    setError('');
    try {
      const res = await authFetch(`${API_URL}/store/settings`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'No se pudo guardar');
      }
      const json = (await res.json()) as StoreAdmin;
      setData(json);
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <RefreshCcw className="animate-spin text-orange-500 mb-4" size={40} />
        <p className="font-black uppercase italic text-slate-800">Cargando tienda web...</p>
      </div>
    );
  }

  const enabled = data?.webOrdersEnabled !== false;
  const deliveryOn = data?.webDeliveryEnabled !== false;
  const accepting = !!data?.status?.ordersEnabled && !!data?.status?.open;

  return (
    <div className="w-full space-y-4 md:space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-3">
            <Store className="text-orange-500 shrink-0" /> Tienda web
          </h1>
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-800 mt-2">
            Pedidos, delivery y horario
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="p-3 rounded-xl bg-white border border-slate-100 text-slate-800 hover:text-orange-500 shrink-0"
          title="Actualizar"
        >
          <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl px-4 py-3 text-sm font-bold">
          {error}
        </div>
      )}

      {data?.status?.envKillSwitch && (
        <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-2xl px-4 py-3 text-sm font-bold">
          La variable de entorno WEB_ORDERS_ENABLED=false está activa en el servidor. El panel no puede reabrir hasta quitar ese bloqueo en Render.
        </div>
      )}

      <div className={`rounded-3xl border p-5 sm:p-6 ${accepting ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-1">Estado ahora</p>
        <p className={`text-xl sm:text-2xl font-black italic uppercase tracking-tighter ${accepting ? 'text-green-700' : 'text-red-600'}`}>
          {accepting ? 'Recibiendo pedidos web' : 'Web cerrada / fuera de horario'}
        </p>
        <p className="text-xs sm:text-sm font-bold text-slate-800 mt-2">
          Horario {data?.status.opensAt} – {data?.status.closesAt}
          {enabled ? '' : ' · Pedidos apagados'}
          {deliveryOn ? '' : ' · Sin delivery'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <section className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Power className={enabled ? 'text-green-600 shrink-0' : 'text-red-500 shrink-0'} size={22} />
            <div>
              <h2 className="font-black uppercase italic tracking-tighter text-slate-900 text-lg sm:text-xl">Pedidos web</h2>
              <p className="text-xs font-bold text-slate-800 mt-1">
                Cierra la tienda completa. La caja, el salón y el QR siguen.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={saving || data?.status?.envKillSwitch}
            onClick={() => void patch({ webOrdersEnabled: !enabled })}
            className={`w-full py-4 rounded-2xl font-black uppercase italic tracking-tight text-white text-base transition-all active:scale-[0.98] disabled:opacity-60 ${
              enabled ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {saving ? (
              <span className="inline-flex items-center gap-2 justify-center"><Loader2 className="animate-spin" size={18} /> Guardando</span>
            ) : enabled ? (
              'Cerrar pedidos web'
            ) : (
              'Reabrir pedidos web'
            )}
          </button>
        </section>

        <section className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Truck className={deliveryOn ? 'text-orange-500 shrink-0' : 'text-slate-400 shrink-0'} size={22} />
            <div>
              <h2 className="font-black uppercase italic tracking-tighter text-slate-900 text-lg sm:text-xl">Delivery</h2>
              <p className="text-xs font-bold text-slate-800 mt-1">
                Quita el envío a domicilio. El cliente puede retirar en el local.
              </p>
            </div>
          </div>
          <p className="text-sm font-bold text-slate-900 bg-slate-50 rounded-2xl p-4 leading-snug">
            {WEB_DELIVERY_PAUSED_MESSAGE}
          </p>
          <button
            type="button"
            disabled={saving}
            onClick={() => void patch({ webDeliveryEnabled: !deliveryOn })}
            className={`w-full py-4 rounded-2xl font-black uppercase italic tracking-tight text-white text-base transition-all active:scale-[0.98] disabled:opacity-60 ${
              deliveryOn ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {saving ? (
              <span className="inline-flex items-center gap-2 justify-center"><Loader2 className="animate-spin" size={18} /> Guardando</span>
            ) : deliveryOn ? (
              'Quitar delivery'
            ) : (
              'Devolver delivery'
            )}
          </button>
        </section>

        <section className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 space-y-4 lg:col-span-2">
          <div className="flex items-start gap-3">
            <Clock className="text-orange-500 shrink-0" size={22} />
            <div>
              <h2 className="font-black uppercase italic tracking-tighter text-slate-900 text-lg sm:text-xl">Horario web</h2>
              <p className="text-xs font-bold text-slate-800 mt-1">El mismo rango todos los días, hora de Chile.</p>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={useCustomHours}
              onChange={(e) => setUseCustomHours(e.target.checked)}
              className="w-5 h-5 accent-orange-500"
            />
            <span className="text-sm font-black text-slate-800">Usar horario propio</span>
          </label>

          {useCustomHours ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-800">Abre</label>
                <input
                  type="time"
                  value={opensAt}
                  onChange={(e) => setOpensAt(e.target.value)}
                  className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-200 font-black text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-800">Cierra</label>
                <input
                  type="time"
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                  className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-200 font-black text-slate-900"
                />
              </div>
            </div>
          ) : (
            <p className="text-sm font-bold text-slate-800 bg-slate-50 rounded-2xl p-4">
              Horario del servidor
              {data?.status.schedule?.length
                ? `: ${data.status.schedule.map((s) => `${s.label} ${s.opensAt}–${s.closesAt}`).join(' · ')}`
                : ''}
              .
            </p>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              void patch({
                webHours: useCustomHours ? `${opensAt}-${closesAt}` : null,
              })
            }
            className="w-full sm:w-auto sm:min-w-56 py-4 px-6 rounded-2xl bg-slate-900 text-white font-black uppercase italic tracking-tight hover:bg-black disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar horario'}
          </button>
        </section>
      </div>
    </div>
  );
}
