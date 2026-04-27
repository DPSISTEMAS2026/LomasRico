'use client';

import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-6">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black italic text-slate-700 mb-4">404</div>
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">
          Acceso no encontrado
        </h1>
        <p className="text-sm text-slate-400 mb-8">
          Esta sección no existe o no tienes permisos para acceder.
        </p>
        <button
          onClick={() => router.push('/owner')}
          className="inline-block bg-orange-500 text-white px-8 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/30"
        >
          Ir al Dashboard
        </button>
      </div>
    </div>
  );
}
