import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, Database, Trash2, Globe, Scale, Clock, Send } from 'lucide-react';

export default function PrivacyPage() {
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
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f2642e] mb-2">Transparencia y Confianza</p>
                    <h1 className="text-4xl md:text-6xl font-[900] italic uppercase tracking-tighter text-slate-900 leading-[0.9] mb-4">
                        Política de Privacidad
                    </h1>
                    <p className="text-base md:text-lg text-slate-500 font-medium max-w-2xl">
                        En cumplimiento con la Ley N° 19.628 sobre Protección de la Vida Privada (Chile) y las normativas alineadas al estándar del proyecto de reforma constitucional y legal de datos personales.
                    </p>
                </header>

                <div className="space-y-8">
                    {/* Tarjeta 1: Responsable del Tratamiento */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-orange-50 text-[#f2642e] p-3 rounded-2xl border border-orange-100">
                                <ShieldCheck size={24} />
                            </div>
                            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-slate-900">1. Responsable del Tratamiento</h2>
                        </div>
                        <p className="text-slate-600 leading-relaxed font-medium mb-4">
                            El responsable del tratamiento de sus datos personales recolectados a través de esta plataforma web es:
                        </p>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 grid md:grid-cols-2 gap-4 text-sm font-semibold text-slate-700">
                            <div>
                                <p className="text-slate-400 text-xs font-black uppercase tracking-wider">Razón Social</p>
                                <p className="text-base text-slate-950 font-black">LOMASRICO SpA</p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs font-black uppercase tracking-wider">RUT de la Empresa</p>
                                <p className="text-base text-slate-950 font-black">77.615.941-7</p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs font-black uppercase tracking-wider">Dirección Comercial</p>
                                <p className="text-base text-slate-950 font-black">Santiago, República de Chile</p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs font-black uppercase tracking-wider">Contacto de Privacidad</p>
                                <a href="mailto:privacidad@lomasrico.cl" className="text-[#f2642e] hover:underline font-black">privacidad@lomasrico.cl</a>
                            </div>
                        </div>
                    </div>

                    {/* Tarjeta 2: Datos Recopilados */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-slate-900 text-white p-3 rounded-2xl">
                                <Database size={24} />
                            </div>
                            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-slate-900">2. Datos que Recopilamos</h2>
                        </div>
                        <p className="text-slate-600 leading-relaxed font-medium mb-4">
                            Recopilamos únicamente los datos necesarios para entregar una experiencia gastronómica premium y procesar sus solicitudes. Estos se dividen en:
                        </p>
                        <div className="space-y-4">
                            <div className="border-l-4 border-orange-500 pl-4 py-1">
                                <p className="font-black text-slate-900 uppercase text-xs tracking-wider">Datos de Identificación y Contacto</p>
                                <p className="text-sm text-slate-600 font-medium">Nombre completo, dirección de correo electrónico, y teléfono móvil.</p>
                            </div>
                            <div className="border-l-4 border-slate-400 pl-4 py-1">
                                <p className="font-black text-slate-900 uppercase text-xs tracking-wider">Datos de Despacho y Facturación</p>
                                <p className="text-sm text-slate-600 font-medium">Dirección física de entrega, comuna, notas del repartidor y datos para boletas/facturas electrónicas.</p>
                            </div>
                            <div className="border-l-4 border-slate-400 pl-4 py-1">
                                <p className="font-black text-slate-900 uppercase text-xs tracking-wider">Datos de Transacción y Fidelización</p>
                                <p className="text-sm text-slate-600 font-medium">Historial de pedidos, montos facturados, método de pago seleccionado, y acumulación de puntos (Club Puntos).</p>
                            </div>
                            <div className="border-l-4 border-slate-400 pl-4 py-1">
                                <p className="font-black text-slate-900 uppercase text-xs tracking-wider">Datos de Autenticación de Google</p>
                                <p className="text-sm text-slate-600 font-medium">Mediante Google OAuth 2.0 recopilamos de forma segura su identificador único de Google, dirección de correo, nombre y fotografía de perfil.</p>
                            </div>
                            <div className="border-l-4 border-slate-400 pl-4 py-1">
                                <p className="font-black text-slate-900 uppercase text-xs tracking-wider">Datos de Navegación (Cookies)</p>
                                <p className="text-sm text-slate-600 font-medium">Datos técnicos de sesión para mantener el estado de su carro de compras e identificar preferencias analíticas aceptadas por el usuario.</p>
                            </div>
                        </div>
                        <p className="mt-4 text-xs font-bold text-slate-400 italic">
                            * Nota importante sobre pagos: Toda la información transaccional de tarjetas de crédito o débito es procesada directamente bajo estándares de seguridad PCI-DSS por MercadoPago. No almacenamos credenciales bancarias en nuestros servidores.
                        </p>
                    </div>

                    {/* Tarjeta 3: Base Legal */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-orange-50 text-[#f2642e] p-3 rounded-2xl border border-orange-100">
                                <Scale size={24} />
                            </div>
                            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-slate-900">3. Finalidades y Bases de Licitud</h2>
                        </div>
                        <p className="text-slate-600 leading-relaxed font-medium mb-4">
                            De acuerdo a la Ley N° 19.628, el tratamiento de sus datos personales se fundamenta en las siguientes bases legales y finalidades específicas:
                        </p>
                        <ul className="grid gap-4 font-medium text-slate-600">
                            <li className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <span className="font-black text-[9px] uppercase tracking-wider bg-orange-100 text-orange-950 px-2.5 py-1 rounded-md">Contrato</span>
                                <div>
                                    <strong className="text-slate-950 block text-sm">Gestión Operativa y Comercial</strong>
                                    <span className="text-xs">Procesamiento de pedidos, preparación de alimentos, facturación, y despacho de productos a su domicilio (a través de nuestro sistema de despacho o integradores como PedidosYa Envíos).</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <span className="font-black text-[9px] uppercase tracking-wider bg-slate-200 text-slate-900 px-2.5 py-1 rounded-md">Consentimiento</span>
                                <div>
                                    <strong className="text-slate-950 block text-sm">Comunicaciones y Experiencia del Usuario</strong>
                                    <span className="text-xs">Personalizar su perfil comercial, gestionar la acumulación de Club Puntos, enviar alertas sobre el estado del pedido, y remitir promociones personalizadas (si se ha suscrito). Puede retirar este consentimiento cuando lo desee.</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <span className="font-black text-[9px] uppercase tracking-wider bg-slate-200 text-slate-900 px-2.5 py-1 rounded-md">Legal</span>
                                <div>
                                    <strong className="text-slate-950 block text-sm">Obligaciones Tributarias y Legales</strong>
                                    <span className="text-xs">Emisión y registro de comprobantes tributarios electrónicos (boletas y facturas) exigidos por el Servicio de Impuestos Internos (SII) de Chile y para la defensa jurídica de la empresa ante reclamaciones.</span>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Tarjeta 4: Google OAuth */}
                    <div className="bg-blue-50/40 p-8 rounded-[2rem] border border-blue-100 relative overflow-hidden shadow-sm">
                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                            <Lock size={120} />
                        </div>
                        <div className="flex items-center gap-4 mb-4 relative z-10">
                            <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-md shadow-blue-200">
                                <Lock size={24} />
                            </div>
                            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-blue-900">4. Autenticación con Google</h2>
                        </div>
                        <p className="text-blue-900 leading-relaxed font-medium relative z-10 text-sm md:text-base">
                            Nuestra aplicación utiliza el servicio de autenticación <strong>Google OAuth 2.0</strong>. Al utilizar este inicio de sesión rápido, usted nos autoriza explícitamente a acceder a la información básica de su perfil (correo electrónico, nombre, e imagen de avatar). 
                        </p>
                        <div className="mt-4 bg-white/60 p-4 rounded-xl border border-blue-200/50 text-xs font-semibold text-blue-900">
                            📍 <strong>Seguridad Garantizada:</strong> No almacenamos contraseñas de su cuenta Google ni accedemos a contactos, archivos o datos adicionales de su cuenta personal. Su sesión se gestiona mediante tokens encriptados de corta duración.
                        </div>
                    </div>

                    {/* Tarjeta 5: Transferencias y Almacenamiento */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-slate-900 text-white p-3 rounded-2xl">
                                <Globe size={24} />
                            </div>
                            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-slate-900">5. Destinatarios y Transferencias Internacionales</h2>
                        </div>
                        <p className="text-slate-600 leading-relaxed font-medium mb-4 text-sm md:text-base">
                            Para poder operar con eficiencia, compartimos datos estrictamente necesarios con proveedores que garantizan un estándar equivalente o superior a la ley chilena en seguridad digital:
                        </p>
                        <ul className="space-y-3 text-sm text-slate-700 font-semibold pl-1">
                            <li className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#f2642e]"></div>
                                <span><strong>Despachadores (PedidosYa Envíos):</strong> Compartimos su nombre, teléfono y dirección física exclusivamente para el traslado físico del pedido.</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#f2642e]"></div>
                                <span><strong>Pagos (MercadoPago):</strong> Información del carro de compras y monto total para procesar la transacción segura de pago.</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#f2642e]"></div>
                                <span><strong>Servicios Cloud (Supabase / Vercel):</strong> Para alojar de forma encriptada las bases de datos y la aplicación en servidores ubicados fuera de Chile, cumpliendo con certificaciones de seguridad internacionales (ISO 27001, SOC2).</span>
                            </li>
                        </ul>
                    </div>

                    {/* Tarjeta 6: Conservación de datos */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-orange-50 text-[#f2642e] p-3 rounded-2xl border border-orange-100">
                                <Clock size={24} />
                            </div>
                            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-slate-900">6. Período de Conservación</h2>
                        </div>
                        <p className="text-slate-600 leading-relaxed font-medium text-sm md:text-base">
                            Conservaremos sus datos personales únicamente durante el tiempo que sea necesario para cumplir con los fines para los cuales fueron recopilados (la entrega del pedido) y para cumplir con requerimientos legales obligatorios (como el registro tributario de boletas por un período de 6 años bajo la ley del SII en Chile). Posteriormente, los datos se eliminan de forma segura o se anonimizan para fines estadísticos.
                        </p>
                    </div>

                    {/* Tarjeta 7: Derechos ARCO */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-[#f2642e] text-white p-3 rounded-2xl">
                                <Trash2 size={24} />
                            </div>
                            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-slate-900">7. Sus Derechos (ARCO)</h2>
                        </div>
                        <p className="text-slate-600 leading-relaxed font-medium mb-6 text-sm md:text-base">
                            Usted tiene control absoluto sobre su información. La legislación chilena le garantiza los derechos **ARCO**:
                        </p>
                        <div className="grid md:grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <span className="font-black text-slate-900 block text-xs uppercase mb-1">Acceso y Rectificación</span>
                                <p className="text-xs text-slate-500 font-medium">Permite consultar qué datos suyos almacenamos y corregirlos en caso de que existan imprecisiones o estén desactualizados.</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <span className="font-black text-slate-900 block text-xs uppercase mb-1">Cancelación y Oposición</span>
                                <p className="text-xs text-slate-500 font-medium">Permite solicitar la eliminación definitiva de su cuenta y sus datos, u oponerse a que los tratemos para fines publicitarios directos.</p>
                            </div>
                        </div>
                        <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
                            <p className="text-sm text-slate-700 font-bold mb-4">
                                ¿Cómo ejercer sus derechos o solicitar la eliminación total de su cuenta?
                            </p>
                            <p className="text-xs text-slate-600 font-medium mb-4">
                                Para solicitar el ejercicio de cualquiera de sus derechos o la eliminación inmediata y permanente de toda su información en nuestros servidores, envíe su requerimiento de forma gratuita adjuntando su nombre completo y copia o número de cédula de identidad/RUT para verificación al correo electrónico:
                            </p>
                            <a href="mailto:privacidad@lomasrico.cl" className="inline-flex items-center gap-2 bg-[#f2642e] hover:bg-[#d94e1b] text-white px-5 py-2.5 rounded-full font-black uppercase text-xs tracking-widest transition-all hover:scale-105 shadow-md shadow-orange-700/20">
                                <Send size={14} /> privacidad@lomasrico.cl
                            </a>
                        </div>
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

