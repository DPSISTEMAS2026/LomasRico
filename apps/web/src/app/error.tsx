'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Web page error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl">
          ⚠️
        </div>
        <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 mb-2">
          Error al cargar
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          {error.message || 'Hubo un problema al cargar esta sección.'}
        </p>
        <button
          onClick={reset}
          className="bg-orange-500 text-white px-6 py-3 rounded-full font-black uppercase text-xs tracking-widest hover:bg-orange-600 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
