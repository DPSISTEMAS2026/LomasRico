import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Cookie, Shield, Eye, Settings, HelpCircle } from 'lucide-react';

export default function CookiesPage() {
    return (
        <div className="min-h-screen bg-slate-50/30">
            <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-100">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-all hover:scale-105 active:scale-95">
                            <ArrowLeft size={20} className="text-slate-900" />
                        </Link>
                        <span className="font-black italic text-lg uppercase tracking-tighter text-slate-900">Volver al Inicio</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-orange-50 text-[#f2642e] px-3 py-1 rounded-full border border-orange-100">
                        Vigente 2026
                    </span>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 pt-32 pb-20">
                <header className="mb-12 text-center md:text-left">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f2642e] mb-2">Transparencia y Control</p>
                    <h1 className="text-4xl md:text-6xl font-[900] italic uppercase tracking-tighter text-slate-900 leading-[0.9] mb-4">
                        Política de Cookies
                    </h1>
                    <p className="text-base md:text-lg text-slate-500 font-medium max-w-2xl">
                        Información clara y transparente sobre cómo utilizamos las cookies y tecnologías similares para garantizar el funcionamiento y mejorar su experiencia en nuestra plataforma.
                    </p>
                </header>

                <div className="space-y-8">
                    {/* ¿Qué son las cookies? */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-orange-50 text-[#f2642e] p-3 rounded-2xl border border-orange-100">
                                <Cookie size={24} />
                            </div>
                            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-slate-900">1. ¿Qué son las Cookies?</h2>
                        </div>
                        <p className="text-slate-600 leading-relaxed font-medium text-sm md:text-base">
                            Las cookies son pequeños archivos de texto que los sitios web almacenan en su navegador web o dispositivo móvil al visitarlos. Tienen funciones muy diversas y necesarias, como permitir que el sitio web reconozca su dispositivo, mantener abierta su sesión del usuario de forma segura, recordar los artículos agregados al carro de compras y analizar el tráfico de visitas para mejorar el rendimiento técnico.
                        </p>
                    </div>

                    {/* Tipos de Cookies */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-slate-900 text-white p-3 rounded-2xl">
                                <Shield size={24} />
                            </div>
                            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-slate-900">2. Tipos de Cookies que Utiliza la Plataforma</h2>
                        </div>
                        <p className="text-slate-600 leading-relaxed font-medium mb-6 text-sm md:text-base">
                            De acuerdo con la regulación vigente y los lineamientos de consentimiento en Chile, dividimos nuestras cookies en tres categorías. Puede configurar cuáles acepta directamente en el banner de consentimiento:
                        </p>

                        <div className="space-y-4">
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="font-black text-[9px] uppercase tracking-wider bg-slate-900 text-white px-2 py-1 rounded">Obligatorias</span>
                                    <h3 className="font-black text-slate-900 text-sm md:text-base">Cookies Técnicas / Esenciales</h3>
                                </div>
                                <p className="text-xs md:text-sm text-slate-500 font-medium">
                                    Son indispensables para permitir la navegación básica y asegurar funciones críticas del sitio. Incluyen la cookie de autenticación segura (Google OAuth), el almacenamiento del carro de compras en su sesión, y la persistencia de sus preferencias de privacidad de cookies. No se pueden desactivar, ya que el sitio web no funcionaría sin ellas.
                                </p>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="font-black text-[9px] uppercase tracking-wider bg-orange-100 text-[#f2642e] px-2 py-1 rounded border border-orange-200">Opcionales</span>
                                    <h3 className="font-black text-slate-900 text-sm md:text-base">Cookies de Análisis / Estadísticas</h3>
                                </div>
                                <p className="text-xs md:text-sm text-slate-500 font-medium">
                                    Nos permiten contar las visitas, medir las fuentes de tráfico y comprender qué secciones o productos son los más populares de forma completamente anónima. Nos ayudan a mejorar constantemente nuestra carta gastronómica y la velocidad de carga del e-commerce. Solo se cargan bajo su consentimiento expreso.
                                </p>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="font-black text-[9px] uppercase tracking-wider bg-orange-100 text-[#f2642e] px-2 py-1 rounded border border-orange-200">Opcionales</span>
                                    <h3 className="font-black text-slate-900 text-sm md:text-base">Cookies de Personalización y Publicidad</h3>
                                </div>
                                <p className="text-xs md:text-sm text-slate-500 font-medium">
                                    Se utilizan para rastrear la efectividad de campañas publicitarias en redes sociales o motores de búsqueda y mostrar anuncios adaptados a sus intereses o preferencias de consumo fuera de nuestra web. Solo se cargan bajo su consentimiento expreso.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Tabla de cookies específicas */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md overflow-hidden">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-orange-50 text-[#f2642e] p-3 rounded-2xl border border-orange-100">
                                <Eye size={24} />
                            </div>
                            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-slate-900">3. Detalle de Cookies Utilizadas</h2>
                        </div>
                        <p className="text-slate-600 leading-relaxed font-medium mb-6 text-sm md:text-base">
                            A continuación, detallamos de forma transparente las cookies específicas utilizadas en nuestro e-commerce:
                        </p>

                        <div className="overflow-x-auto rounded-2xl border border-slate-100">
                            <table className="w-full text-left border-collapse text-xs md:text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 font-black text-slate-900 uppercase font-[Outfit] italic tracking-tighter">
                                        <th className="p-4">Cookie</th>
                                        <th className="p-4">Tipo</th>
                                        <th className="p-4">Propósito</th>
                                        <th className="p-4">Duración</th>
                                    </tr>
                                </thead>
                                <tbody className="font-medium text-slate-600 divide-y divide-slate-100">
                                    <tr className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 font-bold text-slate-900">lomasrico-cookie-consent</td>
                                        <td className="p-4">Propia (Esencial)</td>
                                        <td className="p-4">Almacena el consentimiento del usuario sobre qué cookies se permiten.</td>
                                        <td className="p-4">1 año</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 font-bold text-slate-900">next-auth.session-token</td>
                                        <td className="p-4">Propia (Esencial)</td>
                                        <td className="p-4">Mantiene abierta de forma segura su sesión iniciada a través de Google OAuth.</td>
                                        <td className="p-4">Sesión</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 font-bold text-slate-900">lomasrico-cart-state</td>
                                        <td className="p-4">Propia (Esencial)</td>
                                        <td className="p-4">Almacena de forma temporal los productos agregados al carro de compras para no perderlos al recargar.</td>
                                        <td className="p-4">30 días</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Cómo gestionar cookies */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-slate-900 text-white p-3 rounded-2xl">
                                <Settings size={24} />
                            </div>
                            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-slate-900">4. Cómo Desactivar o Gestionar las Cookies</h2>
                        </div>
                        <p className="text-slate-600 leading-relaxed font-medium mb-4 text-sm md:text-base">
                            Además de utilizar el configurador en nuestro banner de cookies, usted puede restringir, bloquear o borrar las cookies del sitio web modificando directamente la configuración de su navegador de internet. Dado que cada navegador posee una interfaz distinta, puede consultar las guías oficiales en los siguientes enlaces:
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-xs font-black uppercase tracking-wider mb-6">
                            <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="p-4 bg-slate-50 hover:bg-orange-50 hover:text-[#f2642e] rounded-2xl border border-slate-100 transition-all hover:scale-105 active:scale-95 shadow-sm">
                                Google Chrome
                            </a>
                            <a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" rel="noopener noreferrer" className="p-4 bg-slate-50 hover:bg-orange-50 hover:text-[#f2642e] rounded-2xl border border-slate-100 transition-all hover:scale-105 active:scale-95 shadow-sm">
                                Mozilla Firefox
                            </a>
                            <a href="https://support.apple.com/es-cl/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="p-4 bg-slate-50 hover:bg-orange-50 hover:text-[#f2642e] rounded-2xl border border-slate-100 transition-all hover:scale-105 active:scale-95 shadow-sm">
                                Apple Safari
                            </a>
                            <a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-y-administrar-cookies-168dab11-0753-2457-ad6d-469002d35f22" target="_blank" rel="noopener noreferrer" className="p-4 bg-slate-50 hover:bg-orange-50 hover:text-[#f2642e] rounded-2xl border border-slate-100 transition-all hover:scale-105 active:scale-95 shadow-sm">
                                Microsoft Edge
                            </a>
                        </div>
                        <p className="text-xs text-slate-400 font-bold italic">
                            ⚠️ Advertencia: Si decide bloquear o eliminar de forma absoluta todas las cookies de su navegador (incluyendo las necesarias), es posible que no pueda iniciar sesión en el sitio ni completar compras en nuestro e-commerce de manera satisfactoria.
                        </p>
                    </div>

                    {/* Más información */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-orange-50 text-[#f2642e] p-3 rounded-2xl border border-orange-100">
                                <HelpCircle size={24} />
                            </div>
                            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-slate-900">5. Más Información y Contacto</h2>
                        </div>
                        <p className="text-slate-600 leading-relaxed font-medium text-sm md:text-base mb-4">
                            Para conocer más detalles sobre el tratamiento de sus datos personales, le sugerimos revisar nuestra Política de Privacidad. Si tiene cualquier duda técnica sobre el funcionamiento de las cookies en este sitio, puede escribirnos a:
                        </p>
                        <a href="mailto:privacidad@lomasrico.cl" className="text-[#f2642e] font-black text-lg hover:underline">
                            privacidad@lomasrico.cl
                        </a>
                    </div>

                    {/* Footer legal */}
                    <div className="text-slate-400 text-xs font-semibold text-center pt-8 border-t border-slate-200">
                        <p className="font-bold">LOMASRICO SpA • RUT: 77.615.941-7</p>
                        <p>Santiago, Chile. Todos los derechos reservados.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
