import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Copyright, Scale, RefreshCcw, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function TermsPage() {
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
                        Enero 2026
                    </span>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 pt-32 pb-20">
                <header className="mb-12 text-center md:text-left">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f2642e] mb-2">Legal & Cumplimiento</p>
                    <h1 className="text-4xl md:text-6xl font-[900] italic uppercase tracking-tighter text-slate-900 leading-[0.9] mb-4">
                        Términos y Condiciones
                    </h1>
                    <p className="text-base md:text-lg text-slate-500 font-medium max-w-2xl">
                        Acuerdo legal que rige el uso de nuestra plataforma y las transacciones comerciales realizadas en el sitio web de LOMASRICO SpA.
                    </p>
                </header>

                <div className="space-y-8 text-slate-600 leading-relaxed font-medium">
                    {/* Sección 1 */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                        <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-slate-900 mb-4 flex items-center gap-3">
                            <span className="text-orange-500 font-black text-2xl italic tracking-tighter">01.</span>
                            Ámbito de Aplicación
                        </h2>
                        <p className="text-sm md:text-base">
                            Estos términos y condiciones regulan el uso del sitio web y la compra de productos a través de la plataforma digital de <strong>LOMASRICO SpA</strong> (en adelante, "La Empresa").
                            Al utilizar esta plataforma o realizar una compra, usted declara ser mayor de edad en Chile y aceptar íntegramente estas condiciones, las cuales se rigen por la legislación de la <strong>República de Chile</strong>, en particular la Ley N° 19.496 sobre Protección de los Derechos de los Consumidores y la Ley N° 19.628 sobre Protección de la Vida Privada.
                        </p>
                    </div>

                    {/* Sección 2 */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                        <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-slate-900 mb-4 flex items-center gap-3">
                            <span className="text-[#f2642e] font-black text-2xl italic tracking-tighter">02.</span>
                            Política de Cambios y Devoluciones
                        </h2>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4 text-xs md:text-sm">
                            <p>
                                <strong>Naturaleza de los Productos:</strong> Dado que comercializamos <strong>alimentos preparados al momento y altamente perecibles</strong>, se informa a los clientes que no resulta aplicable el derecho a retracto contemplado en el artículo 3 bis letra b) de la Ley N° 19.496. No se aceptarán devoluciones por disconformidad subjetiva o "arrepentimiento" una vez que la orden ha ingresado a la cocina para su preparación.
                            </p>
                            <p>
                                <strong>Garantía de Calidad:</strong> Garantizamos la óptima condición de nuestros productos. Si recibe un pedido que presenta:
                            </p>
                            <ul className="list-disc pl-5 space-y-1.5 marker:text-[#f2642e] text-slate-600 font-medium">
                                <li>Problemas evidentes de higiene, temperatura o mal estado del producto.</li>
                                <li>Ítems incompletos o productos distintos a los solicitados.</li>
                                <li>Daños graves ocasionados durante el trayecto por transportistas propios.</li>
                            </ul>
                            <p className="mt-2">
                                Usted podrá solicitar la <strong>reposición sin costo</strong> de los productos defectuosos o el <strong>reembolso proporcional</strong> del dinero del ítem afectado, reportando el incidente adjuntando registro fotográfico en un plazo máximo de <strong>2 horas</strong> posteriores a la entrega a nuestros canales oficiales de contacto.
                            </p>
                        </div>
                    </div>

                    {/* Sección 3 */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                        <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-slate-900 mb-4 flex items-center gap-3">
                            <span className="text-[#f2642e] font-black text-2xl italic tracking-tighter">03.</span>
                            Alérgenos y Responsabilidad Alimentaria
                        </h2>
                        <div className="flex gap-4 items-start bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
                            <div className="bg-orange-500 text-white p-2 rounded-xl mt-1">
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <p className="text-sm md:text-base text-slate-700 font-semibold mb-2">Presencia de Alérgenos en Cocina</p>
                                <p className="text-xs md:text-sm text-slate-600 font-medium">
                                    Nuestras especialidades gastronómicas se elaboran en cocinas que procesan ingredientes altamente alergénicos como: <strong>pescados, mariscos, lácteos, gluten (trigo), huevos, soya, maní y frutos secos</strong>.
                                    Aunque aplicamos estrictos protocolos de sanitización para mitigar la contaminación cruzada, no es posible garantizar la ausencia absoluta de trazas. Es deber exclusivo del cliente evaluar su grado de riesgo médico antes de consumir los productos.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Sección 4: Privacidad y Protección de Datos */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                        <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-slate-900 mb-4 flex items-center gap-3">
                            <span className="text-[#f2642e] font-black text-2xl italic tracking-tighter">04.</span>
                            Protección de Datos Personales
                        </h2>
                        <div className="flex gap-4 items-start bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <div className="bg-slate-900 text-white p-2 rounded-xl mt-1">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <p className="text-sm md:text-base text-slate-800 font-bold mb-2">Tratamiento Seguro de Información</p>
                                <p className="text-xs md:text-sm text-slate-600 font-medium mb-3">
                                    La seguridad de su información es prioritaria. Los datos personales provistos por el usuario (como dirección de despacho, correo electrónico y RUT) serán tratados con confidencialidad absoluta de acuerdo con lo estipulado en nuestra Política de Privacidad y la normativa de protección de datos chilena.
                                </p>
                                <Link href="/legal/privacy" className="text-xs font-black uppercase tracking-wider text-[#f2642e] hover:underline">
                                    Ver Política de Privacidad completa →
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Sección 5 */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                        <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-slate-900 mb-4 flex items-center gap-3">
                            <span className="text-[#f2642e] font-black text-2xl italic tracking-tighter">05.</span>
                            Propiedad Intelectual
                        </h2>
                        <p className="text-sm md:text-base">
                            Todos los componentes visuales e informativos del sitio web, incluyendo textos, diseños vectoriales, logotipos ("Lo Más Rico"), fotografías de catálogo, códigos de programación y bases de datos son propiedad intelectual exclusiva de <strong>LOMASRICO SpA</strong> o de licenciantes autorizados, encontrándose protegidos bajo leyes de propiedad industrial e intelectual. Queda expresamente prohibido su uso, reproducción o copia sin consentimiento escrito.
                        </p>
                    </div>

                    {/* Sección 6 */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                        <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-slate-900 mb-4 flex items-center gap-3">
                            <span className="text-[#f2642e] font-black text-2xl italic tracking-tighter">06.</span>
                            Jurisdicción y Ley Aplicable
                        </h2>
                        <p className="text-sm md:text-base">
                            Para todo efecto legal derivado de la utilización de esta plataforma, las partes fijan domicilio convencional en la comuna de Santiago de Chile, sometiéndose a la competencia exclusiva de sus Tribunales Ordinarios de Justicia.
                        </p>
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

