'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] p-10">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 text-4xl">
          ⚠️
        </div>
        <h1 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 mb-2">
          Error en el módulo
        </h1>
        <p className="text-sm font-bold text-slate-400 uppercase italic mb-2">
          {error.message || 'Ocurrió un error inesperado.'}
        </p>
        <p className="text-xs text-slate-300 mb-8 font-mono">
          {error.digest && `Código: ${error.digest}`}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black uppercase italic text-xs tracking-widest hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/30"
          >
            Reintentar
          </button>
          <button
            onClick={() => router.push('/owner')}
            className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-black uppercase italic text-xs tracking-widest hover:bg-slate-200 transition-colors"
          >
            Ir al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
