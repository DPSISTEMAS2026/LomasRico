'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

const TOC = [
    { id: 'acceso', label: '1. Acceso al Sistema' },
    { id: 'web', label: '2. Web E-commerce' },
    { id: 'panel', label: '3. Panel de Administración' },
    { id: 'pos', label: '4. Punto de Venta (POS)' },
    { id: 'cocina', label: '5. Panel Cocina (KDS)' },
    { id: 'whatsapp', label: '6. WhatsApp Bot "Maxi"' },
    { id: 'integraciones', label: '7. Integraciones Externas' },
    { id: 'health', label: '8. Monitoreo Automático' },
    { id: 'faq', label: '9. Preguntas Frecuentes' },
];

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
    return <h2 id={id} className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 mt-14 mb-6 pb-3 border-b-2 border-orange-500 scroll-mt-6">{children}</h2>;
}

function SubTitle({ children }: { children: React.ReactNode }) {
    return <h3 className="text-lg font-black italic uppercase tracking-tight text-slate-700 mt-8 mb-3">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
    return <p className="text-sm text-slate-600 leading-relaxed mb-4">{children}</p>;
}

function GoTo({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link href={href} className="inline-flex items-center gap-1.5 text-orange-600 hover:text-orange-700 font-bold text-sm underline underline-offset-2 decoration-orange-200 hover:decoration-orange-400 transition-all">
            {children} <ExternalLink size={12} />
        </Link>
    );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
    return (
        <div className="flex gap-3 mb-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-black flex items-center justify-center">{n}</span>
            <span className="text-sm text-slate-600 leading-relaxed pt-0.5">{children}</span>
        </div>
    );
}

function Tip({ children }: { children: React.ReactNode }) {
    return <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-xl mb-4 text-sm text-orange-800 font-medium italic">{children}</div>;
}

function Warning({ children }: { children: React.ReactNode }) {
    return <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-xl mb-4 text-sm text-red-700 font-medium italic">{children}</div>;
}

export default function ManualPage() {
    const [tocOpen, setTocOpen] = useState(false);

    return (
        <div className="max-w-3xl mx-auto pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-1">
                    <BookOpen size={28} className="text-orange-500" />
                    <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase text-slate-900">
                        Manual <span className="text-orange-500">Operativo</span>
                    </h1>
                </div>
                <p className="text-xs text-slate-400 font-bold italic mt-1">Lo Más Rico V3 — Versión 2.3.0 · Mayo 2026</p>
            </div>

            {/* TOC colapsable */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-10 overflow-hidden">
                <button onClick={() => setTocOpen(!tocOpen)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 italic">📑 Índice del Manual</span>
                    {tocOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                </button>
                {tocOpen && (
                    <div className="px-6 pb-4 border-t border-slate-100 pt-3 space-y-1">
                        {TOC.map(t => (
                            <a key={t.id} href={`#${t.id}`} className="block text-sm text-slate-600 hover:text-orange-600 py-1 font-medium transition-colors">{t.label}</a>
                        ))}
                    </div>
                )}
            </div>

            {/* ═══ SECCIÓN 1 ═══ */}
            <SectionTitle id="acceso">1. Acceso al Sistema</SectionTitle>

            <SubTitle>1.1 URLs del Sistema</SubTitle>
            <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-50"><tr className="text-left text-xs font-black uppercase text-slate-500">
                        <th className="px-4 py-3">Plataforma</th><th className="px-4 py-3">URL</th><th className="px-4 py-3">Para quién</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                        <tr><td className="px-4 py-3 font-bold">Web Tienda</td><td className="px-4 py-3"><a href="https://lomasrico.cl" target="_blank" className="text-orange-600 underline">lomasrico.cl</a></td><td className="px-4 py-3">Clientes</td></tr>
                        <tr><td className="px-4 py-3 font-bold">Panel de Gestión</td><td className="px-4 py-3"><a href="https://lomasrico-panels.netlify.app" target="_blank" className="text-orange-600 underline break-all">lomasrico-panels.netlify.app</a></td><td className="px-4 py-3">Dueño, Admin, Cajeros, Cocina</td></tr>
                    </tbody>
                </table>
            </div>

            <SubTitle>1.2 Roles de Usuario</SubTitle>
            <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-50"><tr className="text-left text-xs font-black uppercase text-slate-500">
                        <th className="px-4 py-3">Rol</th><th className="px-4 py-3">Acceso</th><th className="px-4 py-3">Para quién</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                        <tr><td className="px-4 py-3 font-bold">OWNER</td><td className="px-4 py-3">Todo el sistema sin restricciones</td><td className="px-4 py-3">Oscar</td></tr>
                        <tr><td className="px-4 py-3 font-bold">ADMIN</td><td className="px-4 py-3">Todo el sistema</td><td className="px-4 py-3">Encargado de turno</td></tr>
                        <tr><td className="px-4 py-3 font-bold">CASHIER</td><td className="px-4 py-3">POS + Cocina</td><td className="px-4 py-3">Personal de caja</td></tr>
                        <tr><td className="px-4 py-3 font-bold">KITCHEN</td><td className="px-4 py-3">Solo panel de cocina</td><td className="px-4 py-3">Personal de preparación</td></tr>
                    </tbody>
                </table>
            </div>

            <SubTitle>1.3 Cómo Ingresar</SubTitle>
            <Step n={1}>Ir a <GoTo href="https://lomasrico-panels.netlify.app/login">lomasrico-panels.netlify.app</GoTo></Step>
            <Step n={2}>Ingresar <strong>usuario</strong> y <strong>contraseña</strong> proporcionados</Step>
            <Step n={3}>El sistema redirige automáticamente al panel correspondiente según su rol</Step>
            <Tip>Si olvida su contraseña, el administrador puede resetearla desde <GoTo href="/owner/cashiers">Personal</GoTo>.</Tip>

            {/* ═══ SECCIÓN 2 ═══ */}
            <SectionTitle id="web">2. Web E-commerce</SectionTitle>
            <P>La web pública del negocio donde los clientes pueden ver el menú, armar su pedido, elegir delivery o retiro, y pagar online.</P>

            <SubTitle>2.1 Flujo de Compra del Cliente</SubTitle>
            <Step n={1}>El cliente ingresa a <strong>lomasrico.cl</strong></Step>
            <Step n={2}>Navega el catálogo por categorías</Step>
            <Step n={3}>Selecciona un producto → personaliza (proteínas, extras, sin ingredientes)</Step>
            <Step n={4}>Agrega al carrito</Step>
            <Step n={5}>Ingresa su dirección → el sistema cotiza envío automáticamente</Step>
            <Step n={6}>Elige método de pago → MercadoPago (tarjeta/débito)</Step>
            <Step n={7}>Confirma pedido → aparece en el <GoTo href="/kitchen">Panel Cocina</GoTo> automáticamente</Step>

            <SubTitle>2.2 Lo que el Cliente Ve</SubTitle>
            <ul className="list-disc pl-6 space-y-1 text-sm text-slate-600 mb-4">
                <li><strong>Banners promocionales</strong> en la parte superior (administrables desde <GoTo href="/owner/banners">Marketing</GoTo>)</li>
                <li><strong>Catálogo</strong> organizado por categorías con fotos y precios</li>
                <li><strong>Constructor de Ceviche</strong>: elegir proteínas, quitar ingredientes, agregar extras</li>
                <li><strong>Carrito de compra</strong> con resumen y cálculo de envío</li>
                <li><strong>Pasarela de pago</strong> de MercadoPago</li>
            </ul>

            <SubTitle>2.3 Disponibilidad Automática</SubTitle>
            <P>El sistema verifica el stock de ingredientes en tiempo real. Si un producto no tiene suficiente inventario, se <strong>desactiva automáticamente</strong> de la web.</P>
            <P>Usted administra todo el contenido visible (productos, precios, fotos, banners) desde el <GoTo href="/owner">Panel de Administración</GoTo>.</P>

            {/* ═══ SECCIÓN 3 ═══ */}
            <SectionTitle id="panel">3. Panel de Administración</SectionTitle>
            <P>Se accede con rol OWNER o ADMIN. La barra lateral izquierda muestra todos los módulos disponibles.</P>

            <SubTitle>3.1 Resumen (Dashboard)</SubTitle>
            <P><GoTo href="/owner">Ir a Resumen →</GoTo></P>
            <P>Vista ejecutiva: ingresos del día/mes, órdenes activas, alertas de stock, gráfico de canales de venta, top 5 productos y distribución horaria de demanda.</P>

            <SubTitle>3.2 Catálogo de Productos</SubTitle>
            <P><GoTo href="/owner/catalog">Ir a Catálogo →</GoTo></P>
            <ul className="list-disc pl-6 space-y-1 text-sm text-slate-600 mb-4">
                <li><strong>Crear producto:</strong> Botón "Nuevo Producto" → nombre, precio, categoría, foto</li>
                <li><strong>Editar:</strong> Click en el producto → modificar campos → Guardar</li>
                <li><strong>Activar/Desactivar:</strong> Toggle de disponibilidad</li>
                <li><strong>Subir foto:</strong> Click en la imagen → seleccionar archivo</li>
            </ul>
            <Warning>Los cambios en el catálogo se reflejan inmediatamente en la web, WhatsApp y POS.</Warning>

            <SubTitle>3.3 Modificadores</SubTitle>
            <P><GoTo href="/owner/modifiers">Ir a Modificadores →</GoTo></P>
            <P>Son las opciones de personalización (proteínas, extras). Cada grupo tiene opciones con precio adicional y límites mín/máx de selección. Se pueden reordenar por producto.</P>

            <SubTitle>3.4 Marketing (Banners)</SubTitle>
            <P><GoTo href="/owner/banners">Ir a Marketing →</GoTo></P>
            <P>Administre banners promocionales de la web: subir (1200×400px JPG/PNG), reordenar, activar/desactivar.</P>

            <SubTitle>3.5 Inventario</SubTitle>
            <P><GoTo href="/owner/inventory">Ir a Inventario →</GoTo></P>
            <P>Control completo de stock con las siguientes acciones por insumo:</P>
            <ul className="list-disc pl-6 space-y-1 text-sm text-slate-600 mb-4">
                <li><strong>Reponer:</strong> Registrar compra con cantidad, costo y <strong>rendimiento (%)</strong></li>
                <li><strong>Ajustar:</strong> Corregir stock real tras inventario físico</li>
                <li><strong>Merma:</strong> Registrar pérdida con motivo (vencido, dañado, etc.)</li>
                <li><strong>Editar:</strong> Modificar nombre, rol, tipo, costo, umbral mínimo</li>
                <li><strong>Nuevo insumo:</strong> Crear con categoría, rol, tipo, unidad y rendimiento</li>
            </ul>
            <Tip><strong>Sistema de Rendimiento:</strong> Al reponer, puede indicar el % de aprovechamiento. Ej: 10 kg salmón con 80% rendimiento = 8 kg útiles, costo real $10.000/kg. El sistema calcula automáticamente.</Tip>
            <P>El descuento de inventario es <strong>automático</strong>: cada venta descuenta ingredientes según la receta. Si el stock llega a cero, el producto se desactiva en la web.</P>

            <SubTitle>3.6 Recetas Maestras</SubTitle>
            <P><GoTo href="/owner/recipes">Ir a Recetas →</GoTo></P>
            <P>Módulo de ingeniería de producto con dos pestañas:</P>
            <ul className="list-disc pl-6 space-y-1 text-sm text-slate-600 mb-4">
                <li><strong>Platos Finales:</strong> Recetas de productos de venta (indica ✅ si configurada, ⚠️ si pendiente)</li>
                <li><strong>Bases & Preps:</strong> Sub-recetas (Base Ceviche, Salsas, etc.)</li>
            </ul>
            <P>Al editar una receta: agregar ingredientes del inventario, definir cantidades y roles. El sistema muestra <strong>costo de producción, precio de venta y margen de utilidad</strong> en tiempo real.</P>

            <SubTitle>3.7 Reportes</SubTitle>
            <P><GoTo href="/owner/reports">Ir a Reportes →</GoTo></P>
            <P>Ventas por período (día/semana/mes), desglose por canal, productos más vendidos, historial de transacciones.</P>

            <SubTitle>3.8 Clientes</SubTitle>
            <P><GoTo href="/owner/customers">Ir a Clientes →</GoTo></P>
            <P>Registro de clientes: nombre, teléfono, email, historial de pedidos y dirección.</P>

            <SubTitle>3.9 Personal</SubTitle>
            <P><GoTo href="/owner/cashiers">Ir a Personal →</GoTo></P>
            <ul className="list-disc pl-6 space-y-1 text-sm text-slate-600 mb-4">
                <li><strong>Crear usuario:</strong> nombre, email, contraseña, rol</li>
                <li><strong>Asignar rol:</strong> Owner, Admin, Cashier o Kitchen</li>
                <li><strong>Módulos individuales:</strong> seleccionar qué secciones puede ver cada usuario</li>
                <li><strong>Resetear contraseña:</strong> botón en cada usuario</li>
            </ul>

            {/* ═══ SECCIÓN 4 ═══ */}
            <SectionTitle id="pos">4. Punto de Venta (POS)</SectionTitle>
            <P><GoTo href="/pos">Ir al POS →</GoTo></P>
            <P>Módulo de venta presencial en el local.</P>

            <SubTitle>4.1 Crear una Venta</SubTitle>
            <Step n={1}>Seleccionar productos del catálogo lateral</Step>
            <Step n={2}>Personalizar con modificadores (proteínas, extras)</Step>
            <Step n={3}>Los productos se agregan al carrito (panel derecho)</Step>
            <Step n={4}>Ajustar cantidades con +/-</Step>
            <Step n={5}>Click en <strong>"Pagar"</strong> → seleccionar método (Efectivo, Tarjeta, Transferencia, MercadoPago)</Step>

            <SubTitle>4.2 Cajas y Turnos</SubTitle>
            <P><strong>Abrir Caja:</strong> Al iniciar turno, el cajero abre caja con un monto inicial. <strong>Operar:</strong> Todas las ventas se asocian a la caja abierta. <strong>Cerrar Caja:</strong> Al terminar, se cierra con resumen de ventas por método de pago.</P>
            <P>Se pueden registrar gastos y retiros durante el turno.</P>
            <Tip>Al confirmar una venta: se registra → se descuenta inventario automáticamente → aparece en Cocina.</Tip>

            {/* ═══ SECCIÓN 5 ═══ */}
            <SectionTitle id="cocina">5. Panel Cocina (KDS)</SectionTitle>
            <P><GoTo href="/kitchen">Ir a Cocina →</GoTo></P>
            <P>Pantalla donde llegan <strong>todos los pedidos</strong> de todos los canales en tiempo real.</P>

            <SubTitle>5.1 Canales de Origen</SubTitle>
            <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-50"><tr className="text-left text-xs font-black uppercase text-slate-500">
                        <th className="px-4 py-3">Canal</th><th className="px-4 py-3">Cómo llega</th><th className="px-4 py-3">Etiqueta</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                        <tr><td className="px-4 py-3">Web</td><td className="px-4 py-3">Automático al pagar</td><td className="px-4 py-3 font-bold">WEB</td></tr>
                        <tr><td className="px-4 py-3">POS</td><td className="px-4 py-3">Automático al confirmar</td><td className="px-4 py-3 font-bold">POS</td></tr>
                        <tr><td className="px-4 py-3">WhatsApp</td><td className="px-4 py-3">Automático vía Maxi</td><td className="px-4 py-3 font-bold">WHATSAPP</td></tr>
                        <tr><td className="px-4 py-3">Uber Eats</td><td className="px-4 py-3">Scraping cada 30-60s</td><td className="px-4 py-3 font-bold">UBER_EATS</td></tr>
                    </tbody>
                </table>
            </div>

            <SubTitle>5.2 Flujo de Estados</SubTitle>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-4 flex-wrap">
                <span className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg">📥 Entrante</span>
                <span className="text-slate-300">→</span>
                <span className="bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg">🔥 Preparando</span>
                <span className="text-slate-300">→</span>
                <span className="bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">✅ Entrega</span>
            </div>
            <P>Cada tarjeta muestra: número de orden, cliente, productos con personalizaciones, gramajes, tiempo transcurrido y notas.</P>

            {/* ═══ SECCIÓN 6 ═══ */}
            <SectionTitle id="whatsapp">6. WhatsApp Bot "Maxi"</SectionTitle>
            <P><GoTo href="/owner/inbox/whatsapp">Ir a WhatsApp Bot →</GoTo></P>
            <P>Maxi es un asistente de IA que atiende clientes por WhatsApp: muestra el menú, toma pedidos, personaliza, cotiza envío y genera links de pago de MercadoPago automáticamente.</P>
            <Tip>Maxi opera de forma autónoma. Para ajustes en respuestas o catálogo, contactar al soporte técnico.</Tip>

            {/* ═══ SECCIÓN 7 ═══ */}
            <SectionTitle id="integraciones">7. Integraciones Externas</SectionTitle>

            <SubTitle>Uber Eats</SubTitle>
            <P>Captura automática de pedidos cada 30-60 segundos. Aparecen con etiqueta "UBER_EATS" en cocina. El mapeo de productos es automático. El inventario se descuenta.</P>
            <Warning>Requiere renovación periódica de cookie (cada 24-48h). El Health Check detecta cuando expira. Cubierto por soporte técnico.</Warning>

            <SubTitle>MercadoPago</SubTitle>
            <P>Pasarela de pagos: tarjeta crédito/débito y saldo MercadoPago. Funciona en la web y links por WhatsApp. Confirmación automática vía webhook.</P>

            <SubTitle>PedidosYa</SubTitle>
            <P>Cotización de envío integrada en el checkout. El cliente ingresa dirección y se cotiza delivery vía API.</P>

            <SubTitle>Google Maps</SubTitle>
            <P>Autocompletado de direcciones, cálculo de cobertura y geocodificación para envío.</P>

            {/* ═══ SECCIÓN 8 ═══ */}
            <SectionTitle id="health">8. Monitoreo Automático</SectionTitle>
            <P>El sistema ejecuta un <strong>chequeo diario a las 10:00 AM</strong> (hora Chile) que verifica:</P>
            <ul className="list-disc pl-6 space-y-1 text-sm text-slate-600 mb-4">
                <li><strong>Cookie Uber Eats:</strong> sesión vigente o requiere renovación</li>
                <li><strong>Mapeo de productos:</strong> alias apuntan a productos existentes</li>
                <li><strong>Modificadores:</strong> grupos con opciones activas y consistentes</li>
                <li><strong>Turno de caja:</strong> hay caja abierta para registrar ventas</li>
                <li><strong>Inventario crítico:</strong> items con stock en 0 o negativo</li>
            </ul>
            <P>Resultados: ✅ OK · ⚠️ Warning · 🔴 Crítico. El soporte técnico monitorea las alertas.</P>

            {/* ═══ SECCIÓN 9 ═══ */}
            <SectionTitle id="faq">9. Preguntas Frecuentes</SectionTitle>

            {[
                { q: '¿Cómo cambio el precio de un producto?', a: 'Catálogo → Click en el producto → Editar precio → Guardar', href: '/owner/catalog' },
                { q: '¿Cómo desactivo un producto temporalmente?', a: 'Catálogo → Toggle de disponibilidad', href: '/owner/catalog' },
                { q: '¿Cómo agrego un banner?', a: 'Marketing → "Nuevo Banner" → Subir imagen → Guardar', href: '/owner/banners' },
                { q: '¿Cómo creo un usuario para un cajero?', a: 'Personal → "Nuevo Usuario" → Rol "Cajero"', href: '/owner/cashiers' },
                { q: '¿Cómo registro una compra de insumos?', a: 'Inventario → "Reponer" → Cantidad, costo y rendimiento', href: '/owner/inventory' },
                { q: '¿Cómo registro merma?', a: 'Inventario → "Merma" → Cantidad, motivo y nota', href: '/owner/inventory' },
                { q: '¿Cómo edito una receta?', a: 'Recetas → Click producto → Agregar ingredientes → "Deploy Receta Maestra"', href: '/owner/recipes' },
                { q: '¿Qué pasa si un producto queda sin stock?', a: 'Se desactiva automáticamente de la web hasta reponer', href: '/owner/inventory' },
            ].map((faq, i) => (
                <div key={i} className="mb-3">
                    <p className="text-sm font-bold text-slate-900 mb-0.5">{faq.q}</p>
                    <p className="text-sm text-slate-500"><GoTo href={faq.href}>{faq.a}</GoTo></p>
                </div>
            ))}

            <div className="mt-10 bg-slate-900 rounded-2xl p-6 text-white">
                <p className="font-black italic uppercase text-sm mb-1">¿Necesitas ayuda?</p>
                <p className="text-slate-400 text-sm">WhatsApp directo con Daniel — Lun a Sáb 10:00 a 20:30 hrs</p>
            </div>

            <p className="text-center text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-8 italic">Lo Más Rico V3 · Manual Operativo v2.3.0 · Mayo 2026</p>
        </div>
    );
}
