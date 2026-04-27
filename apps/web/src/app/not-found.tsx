import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black italic text-slate-200 mb-4">404</div>
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 mb-2">
          Página no encontrada
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          Lo sentimos, esta página no existe o fue movida.
        </p>
        <Link
          href="/"
          className="inline-block bg-orange-500 text-white px-8 py-3.5 rounded-full font-black uppercase text-xs tracking-widest hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/30"
        >
          Volver al menú
        </Link>
      </div>
    </div>
  );
}
