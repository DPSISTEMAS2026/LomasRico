'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Web error:', error);
  }, [error]);

  return (
    <html lang="es">
      <body className="min-h-screen flex items-center justify-center bg-slate-50 px-6 font-sans">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl">
            ⚠️
          </div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 mb-2">
            Algo salió mal
          </h1>
          <p className="text-sm text-slate-500 mb-8">
            Hubo un problema al cargar la página. Intenta de nuevo.
          </p>
          <button
            onClick={reset}
            className="bg-orange-500 text-white px-8 py-3.5 rounded-full font-black uppercase text-xs tracking-widest hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/30"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
