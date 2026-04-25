import { redirect } from 'next/navigation';

export default function EntryPoint() {
    // Redirigir al panel principal (Dashboard del Dueño)
    redirect('/owner');

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900 border-b-8 border-b-orange-500">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-orange-500 border-t-white rounded-full animate-spin mx-auto mb-8 scale-150 shadow-2xl shadow-orange-500/20" />
                <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white mb-2">AUTENTICANDO...</h2>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] italic leading-none">LomasRico PRO v2.2.0-unified</p>
            </div>
        </div>
    );
}
