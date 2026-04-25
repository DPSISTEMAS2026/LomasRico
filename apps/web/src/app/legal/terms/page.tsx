import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Copyright, Scale, RefreshCcw, AlertTriangle } from 'lucide-react';

export default function TermsPage() {
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
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f2642e] mb-2">Legal & Cumplimiento</p>
                    <h1 className="text-5xl font-[900] italic uppercase tracking-tighter text-slate-900 leading-[0.9]">
                        Términos y Condiciones
                    </h1>
                    <p className="mt-4 text-slate-400 font-medium">Última actualización: Enero 2026</p>
                </header>

                <div className="space-y-10 text-slate-600 leading-relaxed font-medium">

                    <section>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 mb-4 flex items-center gap-2">
                            1. Ámbito de Aplicación
                        </h2>
                        <p>
                            Estos términos y condiciones regulan el uso del sitio web y la compra de productos a través de la plataforma digital de <strong>LO MÁS RICO SpA</strong> (en adelante, "La Empresa").
                            Al realizar una compra, usted declara ser mayor de edad y aceptar íntegramente estas condiciones, las cuales se rigen por la legislación de la <strong>República de Chile</strong>, especialmente la Ley N° 19.496 sobre Protección de los Derechos de los Consumidores.
                        </p>
                    </section>

                    <section className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                        <h2 className="text-xl font-black uppercase text-slate-900 mb-4 flex items-center gap-3">
                            <div className="bg-slate-900 text-white p-2 rounded-lg"><RefreshCcw size={20} /></div>
                            2. Política de Cambios y Devoluciones
                        </h2>
                        <div className="space-y-4 text-sm">
                            <p>
                                <strong>Naturaleza de los Productos:</strong> Dado que comercializamos <strong>alimentos perecibles y preparados al momento</strong>, informamos que no resulta aplicable el derecho a retracto establecido en el artículo 3 bis letra b) de la Ley N° 19.496. No se aceptarán devoluciones por "arrepentimiento" una vez que el pedido ha comenzado su preparación.
                            </p>
                            <p>
                                <strong>Garantía de Calidad:</strong> No obstante, garantizamos la calidad de nuestros productos. Si recibe un pedido con:
                            </p>
                            <ul className="list-disc pl-5 space-y-1 marker:text-[#f2642e]">
                                <li>Problemas de calidad evidentes o mal estado.</li>
                                <li>Faltantes o productos incorrectos.</li>
                                <li>Daños severos durante el transporte atribuibles al servicio de delivery propio.</li>
                            </ul>
                            <p>
                                Usted tiene derecho a solicitar la <strong>reposición inmediata</strong> del producto o la <strong>devolución del dinero</strong> proporcional al ítem afectado, reportando el incidente dentro de las primeras 2 horas post-entrega a través de nuestros canales de soporte.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 mb-4 flex items-center gap-2">
                            <AlertTriangle size={24} className="text-[#f2642e]" />
                            3. Alérgenos y Responsabilidad
                        </h2>
                        <p>
                            Nuestros productos son preparados en instalaciones que procesan <strong>pescados, mariscos, lácteos, gluten, huevo, frutos secos y soya</strong>.
                            Aunque tomamos medidas de precaución para evitar la contaminación cruzada, no podemos garantizar la ausencia total de trazas.
                            Es responsabilidad del cliente informar y evaluar el riesgo de consumo en caso de alergias alimentarias severas. La Empresa no se hace responsable por reacciones alérgicas no informadas o derivadas del riesgo inherente a una cocina compartida.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 mb-4 flex items-center gap-2">
                            <Copyright size={24} />
                            4. Propiedad Intelectual
                        </h2>
                        <p>
                            Todos los contenidos presentes en el sitio, incluyendo pero no limitado a: textos, gráficas, logos ("Lo Más Rico"), íconos, imágenes, clips de audio, descargas digitales y compilaciones de datos, son propiedad exclusiva de <strong>LO MÁS RICO SpA</strong> o de sus proveedores de contenido y están protegidos por las leyes chilenas e internacionales de propiedad intelectual.
                            <br /><br />
                            Queda estrictamente prohibido el uso comercial de nuestras imágenes, descripciones de productos o marca sin autorización expresa por escrito.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 mb-4 flex items-center gap-2">
                            <Scale size={24} />
                            5. Jurisdicción y Ley Aplicable
                        </h2>
                        <p>
                            Para todos los efectos legales derivados de este contrato, las partes fijan su domicilio en la ciudad y comuna de Santiago de Chile y se someten a la jurisdicción de sus Tribunales Ordinarios de Justicia.
                        </p>
                    </section>

                </div>
            </main>
        </div>
    );
}
