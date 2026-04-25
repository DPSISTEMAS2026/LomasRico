import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, Eye, BookOpen, Database, Trash2, Globe } from 'lucide-react';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-white">
            <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-100">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
                    <Link href="/" className="bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-slate-900" />
                    </Link>
                    <span className="font-black italic text-lg uppercase tracking-tighter">Volver al Inicio</span>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 pt-32 pb-20">
                <header className="mb-12">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f2642e] mb-2">Transparencia y Confianza</p>
                    <h1 className="text-5xl font-[900] italic uppercase tracking-tighter text-slate-900 leading-[0.9] mb-4">
                        Política de Privacidad
                    </h1>
                    <p className="text-lg text-slate-500 font-medium">
                        En cumplimiento con la Ley N° 19.628 sobre Protección de la Vida Privada (Chile) y Políticas de Datos de Usuario de Google.
                    </p>
                </header>

                <div className="space-y-8">

                    {/* Sección Clave: Google Auth */}
                    <div className="bg-blue-50/50 p-8 rounded-[2rem] border border-blue-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <Globe size={120} />
                        </div>
                        <div className="flex items-center gap-4 mb-4 relative z-10">
                            <div className="bg-blue-600 text-white p-3 rounded-xl shadow-lg shadow-blue-200">
                                <Lock size={24} />
                            </div>
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-blue-900">Uso de Datos de Google</h2>
                        </div>
                        <p className="text-blue-800 leading-relaxed font-medium relative z-10">
                            Nuestra aplicación utiliza el servicio de autenticación <strong>Google OAuth 2.0</strong> para facilitar su registro e inicio de sesión.
                            Al utilizar este servicio, usted nos autoriza explícitamente a acceder a la siguiente información limitada proporcionada por Google:
                        </p>
                        <ul className="mt-4 space-y-2 relative z-10">
                            <li className="flex items-center gap-3 bg-white/60 p-3 rounded-xl">
                                <span className="font-black text-xs uppercase bg-blue-200 text-blue-800 px-2 py-1 rounded">email</span>
                                <span className="text-sm font-bold text-blue-900">Su dirección de correo electrónico (para identificar su cuenta).</span>
                            </li>
                            <li className="flex items-center gap-3 bg-white/60 p-3 rounded-xl">
                                <span className="font-black text-xs uppercase bg-blue-200 text-blue-800 px-2 py-1 rounded">profile</span>
                                <span className="text-sm font-bold text-blue-900">Su nombre y foto de perfil (para personalizar su experiencia).</span>
                            </li>
                        </ul>
                        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-blue-400 relative z-10">
                            * No tenemos acceso a su contraseña de Google, lista de contactos ni a ningún otro dato privado.
                        </p>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-slate-900 text-white p-3 rounded-xl">
                                <Database size={24} />
                            </div>
                            <h2 className="text-xl font-black uppercase text-slate-900">Recopilación y Uso Legal de Datos</h2>
                        </div>
                        <p className="text-slate-600 leading-relaxed mb-4 font-medium">
                            De acuerdo a la Ley N° 19.628, sus datos personales serán tratados exclusivamente para:
                        </p>
                        <ul className="grid gap-3 font-medium text-slate-600">
                            <li className="flex items-start gap-3">
                                <div className="min-w-1.5 h-1.5 rounded-full bg-slate-400 mt-2.5"></div>
                                <span><strong>Gestión de Pedidos:</strong> Procesar pagos, facturación electrónica y despacho de productos a su domicilio.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="min-w-1.5 h-1.5 rounded-full bg-slate-400 mt-2.5"></div>
                                <span><strong>Atención al Cliente:</strong> Contactarlo en caso de incidencias con su pedido (retrasos, falta de stock, etc.).</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="min-w-1.5 h-1.5 rounded-full bg-slate-400 mt-2.5"></div>
                                <span><strong>Mejora del Servicio:</strong> Análisis estadístico anónimo para mejorar nuestra oferta gastronómica.</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-[#f2642e] text-white p-3 rounded-xl">
                                <Trash2 size={24} />
                            </div>
                            <h2 className="text-xl font-black uppercase text-slate-900">Sus Derechos (ARCO)</h2>
                        </div>
                        <p className="text-slate-600 leading-relaxed font-medium">
                            Usted es el dueño de sus datos. En cualquier momento puede ejercer sus derechos de <strong>Acceso, Rectificación, Cancelación y Oposición</strong>.
                            <br /><br />
                            Si desea <strong>eliminar permanentemente su cuenta</strong> y todos los datos asociados de nuestros servidores, puede solicitarlo enviando un correo a:
                            <br />
                            <a href="mailto:privacidad@lomasrico.cl" className="text-[#f2642e] font-black text-lg hover:underline mt-2 block">privacidad@lomasrico.cl</a>
                        </p>
                    </div>

                    <div className="text-slate-400 text-xs font-medium text-center pt-8 border-t border-slate-100">
                        <p>LO MÁS RICO SpA - Rut: 77.XXX.XXX-X</p>
                        <p>Santiago, Chile.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
