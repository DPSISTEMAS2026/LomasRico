'use client';

import Link from 'next/link';
import {
    BookOpen, LayoutDashboard, ChefHat, MonitorSmartphone, Package,
    Layers, ClipboardList, Flame, BarChart3, Users, MessageSquare,
    User, ExternalLink, ShieldCheck, ArrowRight, Zap, AlertCircle,
    CheckCircle2, HelpCircle, Clock, Phone
} from 'lucide-react';

const PANEL_URL = 'https://lomasrico-panels.netlify.app';
const WEB_URL = 'https://lomasrico.cl';

interface Section {
    id: string;
    title: string;
    icon: React.ElementType;
    color: string;
    href?: string;
    content: { label: string; desc: string; href?: string; external?: boolean }[];
}

const sections: Section[] = [
    {
        id: 'dashboard', title: 'Resumen del Negocio', icon: LayoutDashboard, color: 'orange',
        href: '/owner',
        content: [
            { label: 'Ingresos del día y mes', desc: 'Ver ventas totales con tendencia porcentual', href: '/owner' },
            { label: 'Órdenes activas', desc: 'Pedidos actualmente en cocina', href: '/kitchen' },
            { label: 'Alertas de stock', desc: 'Insumos que necesitan reposición urgente', href: '/owner/inventory' },
            { label: 'Canales de venta', desc: 'Distribución por Web, POS, WhatsApp, Uber Eats', href: '/owner' },
            { label: 'Top 5 productos', desc: 'Ranking de los más vendidos', href: '/owner' },
            { label: 'Horas peak', desc: 'Distribución horaria de la demanda', href: '/owner' },
        ]
    },
    {
        id: 'catalog', title: 'Catálogo de Productos', icon: Package, color: 'blue',
        href: '/owner/catalog',
        content: [
            { label: 'Crear producto', desc: 'Botón "Nuevo Producto" → nombre, precio, categoría, foto', href: '/owner/catalog' },
            { label: 'Editar producto', desc: 'Click en el producto → modificar → Guardar', href: '/owner/catalog' },
            { label: 'Activar/Desactivar', desc: 'Toggle de disponibilidad en cada producto', href: '/owner/catalog' },
            { label: 'Subir foto', desc: 'Click en la imagen → seleccionar archivo', href: '/owner/catalog' },
            { label: 'Ordenar', desc: 'Las categorías se generan dinámicamente desde la BD', href: '/owner/catalog' },
        ]
    },
    {
        id: 'modifiers', title: 'Modificadores', icon: Layers, color: 'purple',
        href: '/owner/modifiers',
        content: [
            { label: 'Grupos', desc: '"Elige tus Proteínas", "Extras", "Sin ingredientes"', href: '/owner/modifiers' },
            { label: 'Opciones', desc: 'Salmón, Reineta, Camarón, Pulpo con precio adicional', href: '/owner/modifiers' },
            { label: 'Límites', desc: 'Mín/Máx selecciones por grupo (ej: 1-3 proteínas)', href: '/owner/modifiers' },
            { label: 'Reordenar', desc: 'Orden personalizado por producto con flechas', href: '/owner/modifiers' },
        ]
    },
    {
        id: 'inventory', title: 'Gestión de Inventario', icon: ClipboardList, color: 'green',
        href: '/owner/inventory',
        content: [
            { label: 'Nuevo Insumo', desc: 'Crear con nombre, categoría, rol, tipo, unidad, rendimiento', href: '/owner/inventory' },
            { label: 'Reponer stock', desc: 'Registrar compra con cantidad, costo y rendimiento (%)', href: '/owner/inventory' },
            { label: 'Ajustar stock', desc: 'Corregir stock real tras inventario físico', href: '/owner/inventory' },
            { label: 'Registrar merma', desc: 'Pérdida por vencimiento, daño u otra razón', href: '/owner/inventory' },
            { label: 'Editar insumo', desc: 'Modificar nombre, rol, tipo, costo y umbral', href: '/owner/inventory' },
        ]
    },
    {
        id: 'recipes', title: 'Recetas Maestras', icon: Flame, color: 'red',
        href: '/owner/recipes',
        content: [
            { label: 'Platos finales', desc: 'Recetas de productos de venta con costo y margen', href: '/owner/recipes' },
            { label: 'Bases & Preps', desc: 'Sub-recetas (Base Ceviche, Salsas)', href: '/owner/recipes' },
            { label: 'Editor de receta', desc: 'Agregar ingredientes, cantidades y roles', href: '/owner/recipes' },
            { label: 'Análisis económico', desc: 'Costo producción, precio venta, margen utilidad', href: '/owner/recipes' },
        ]
    },
    {
        id: 'pos', title: 'Punto de Venta (POS)', icon: MonitorSmartphone, color: 'slate',
        href: '/pos',
        content: [
            { label: 'Crear venta', desc: 'Seleccionar productos → personalizar → pagar', href: '/pos' },
            { label: 'Métodos de pago', desc: 'Efectivo, Tarjeta, Transferencia, MercadoPago', href: '/pos' },
            { label: 'Abrir caja', desc: 'Iniciar turno con monto inicial', href: '/pos' },
            { label: 'Cerrar caja', desc: 'Finalizar turno con resumen de ventas', href: '/pos' },
        ]
    },
    {
        id: 'kitchen', title: 'Cocina (KDS)', icon: ChefHat, color: 'amber',
        href: '/kitchen',
        content: [
            { label: 'Pedidos entrantes', desc: 'Llegan de Web, POS, WhatsApp y Uber Eats', href: '/kitchen' },
            { label: 'Aceptar pedido', desc: 'Mover a "Preparando"', href: '/kitchen' },
            { label: 'Marcar listo', desc: 'Mover a "Entrega" para despacho', href: '/kitchen' },
            { label: 'Imprimir comanda', desc: 'Impresión con gramajes y personalizaciones', href: '/kitchen' },
        ]
    },
    {
        id: 'banners', title: 'Marketing (Banners)', icon: MonitorSmartphone, color: 'pink',
        href: '/owner/banners',
        content: [
            { label: 'Subir banner', desc: '"Nuevo Banner" → imagen 1200×400px JPG/PNG', href: '/owner/banners' },
            { label: 'Reordenar', desc: 'Arrastrar y soltar para cambiar orden', href: '/owner/banners' },
            { label: 'Activar/Desactivar', desc: 'Toggle de visibilidad', href: '/owner/banners' },
        ]
    },
    {
        id: 'reports', title: 'Reportes', icon: BarChart3, color: 'cyan',
        href: '/owner/reports',
        content: [
            { label: 'Ventas por período', desc: 'Día, semana, mes con desglose', href: '/owner/reports' },
            { label: 'Por canal', desc: 'Web, POS, WhatsApp, Uber Eats', href: '/owner/reports' },
            { label: 'Productos top', desc: 'Ranking de más vendidos', href: '/owner/reports' },
        ]
    },
    {
        id: 'customers', title: 'Clientes', icon: Users, color: 'teal',
        href: '/owner/customers',
        content: [
            { label: 'Base de clientes', desc: 'Nombre, teléfono, email, dirección', href: '/owner/customers' },
            { label: 'Historial', desc: 'Pedidos anteriores de cada cliente', href: '/owner/customers' },
        ]
    },
    {
        id: 'whatsapp', title: 'WhatsApp Bot "Maxi"', icon: MessageSquare, color: 'emerald',
        href: '/owner/inbox/whatsapp',
        content: [
            { label: 'Conversaciones', desc: 'Ver chats activos del bot', href: '/owner/inbox/whatsapp' },
            { label: 'Pedidos del bot', desc: 'Órdenes generadas por Maxi', href: '/owner/inbox/whatsapp' },
        ]
    },
    {
        id: 'staff', title: 'Personal', icon: User, color: 'indigo',
        href: '/owner/cashiers',
        content: [
            { label: 'Crear usuario', desc: '"Nuevo Usuario" → nombre, email, contraseña, rol', href: '/owner/cashiers' },
            { label: 'Asignar rol', desc: 'Owner, Admin, Cashier o Kitchen', href: '/owner/cashiers' },
            { label: 'Módulos individuales', desc: 'Seleccionar secciones visibles por usuario', href: '/owner/cashiers' },
            { label: 'Resetear contraseña', desc: 'Botón de reseteo en cada usuario', href: '/owner/cashiers' },
        ]
    },
];

const colorMap: Record<string, { bg: string; text: string; border: string; light: string }> = {
    orange: { bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-200', light: 'bg-orange-50' },
    blue: { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-200', light: 'bg-blue-50' },
    purple: { bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-200', light: 'bg-purple-50' },
    green: { bg: 'bg-green-500', text: 'text-green-500', border: 'border-green-200', light: 'bg-green-50' },
    red: { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-200', light: 'bg-red-50' },
    slate: { bg: 'bg-slate-700', text: 'text-slate-700', border: 'border-slate-200', light: 'bg-slate-50' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-200', light: 'bg-amber-50' },
    pink: { bg: 'bg-pink-500', text: 'text-pink-500', border: 'border-pink-200', light: 'bg-pink-50' },
    cyan: { bg: 'bg-cyan-500', text: 'text-cyan-500', border: 'border-cyan-200', light: 'bg-cyan-50' },
    teal: { bg: 'bg-teal-500', text: 'text-teal-500', border: 'border-teal-200', light: 'bg-teal-50' },
    emerald: { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-200', light: 'bg-emerald-50' },
    indigo: { bg: 'bg-indigo-500', text: 'text-indigo-500', border: 'border-indigo-200', light: 'bg-indigo-50' },
};

export default function ManualPage() {
    return (
        <div className="space-y-8 md:space-y-12 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <header>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-200">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                            MANUAL <span className="text-orange-500">OPERATIVO</span>
                        </h1>
                        <p className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest mt-1">
                            Guía completa — Click en cualquier acción para ir directo al módulo
                        </p>
                    </div>
                </div>
            </header>

            {/* Quick Links */}
            <div className="bg-white p-4 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 italic">Accesos Directos</p>
                <div className="flex flex-wrap gap-2">
                    {sections.map(s => {
                        const c = colorMap[s.color];
                        return (
                            <a key={s.id} href={`#${s.id}`} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest italic border ${c.border} ${c.light} ${c.text} hover:shadow-md transition-all`}>
                                {s.title}
                            </a>
                        );
                    })}
                </div>
            </div>

            {/* URLs del Sistema */}
            <div className="bg-slate-900 p-6 md:p-8 rounded-[2rem] text-white shadow-xl">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 italic flex items-center gap-2">
                    <ExternalLink size={14} className="text-orange-500" /> URLs del Sistema
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <a href={WEB_URL} target="_blank" rel="noopener noreferrer" className="bg-white/5 hover:bg-white/10 border border-white/10 p-5 rounded-2xl transition-all group">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Web Tienda</p>
                        <p className="font-black italic tracking-tight text-orange-400 group-hover:text-orange-300">{WEB_URL}</p>
                        <p className="text-[9px] text-slate-500 mt-2 italic">Para clientes</p>
                    </a>
                    <a href={PANEL_URL} target="_blank" rel="noopener noreferrer" className="bg-white/5 hover:bg-white/10 border border-white/10 p-5 rounded-2xl transition-all group">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Panel de Gestión</p>
                        <p className="font-black italic tracking-tight text-orange-400 group-hover:text-orange-300 text-sm break-all">{PANEL_URL}</p>
                        <p className="text-[9px] text-slate-500 mt-2 italic">Dueño, Admin, Cajeros, Cocina</p>
                    </a>
                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Roles</p>
                        <div className="space-y-1 mt-2">
                            {[
                                { role: 'OWNER', desc: 'Todo el sistema', who: 'Oscar' },
                                { role: 'ADMIN', desc: 'Todo el sistema', who: 'Encargado' },
                                { role: 'CASHIER', desc: 'POS + Cocina', who: 'Cajero' },
                                { role: 'KITCHEN', desc: 'Solo cocina', who: 'Cocina' },
                            ].map(r => (
                                <div key={r.role} className="flex items-center gap-2 text-[9px]">
                                    <span className="font-black text-orange-400 w-16">{r.role}</span>
                                    <span className="text-slate-400">{r.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sections */}
            {sections.map(section => {
                const c = colorMap[section.color];
                const Icon = section.icon;
                return (
                    <div key={section.id} id={section.id} className="scroll-mt-8">
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-lg transition-all duration-500">
                            {/* Section Header */}
                            <div className="p-6 md:p-8 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 ${c.bg} text-white rounded-2xl shadow-lg`}>
                                        <Icon size={22} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-slate-900">{section.title}</h2>
                                    </div>
                                </div>
                                {section.href && (
                                    <Link href={section.href} className={`px-5 py-3 ${c.bg} text-white rounded-2xl font-black uppercase text-[10px] tracking-widest italic shadow-md hover:opacity-90 transition-all flex items-center gap-2 active:scale-95 shrink-0`}>
                                        Ir al módulo <ArrowRight size={14} />
                                    </Link>
                                )}
                            </div>
                            {/* Actions List */}
                            <div className="divide-y divide-slate-50">
                                {section.content.map((item, i) => (
                                    <Link
                                        key={i}
                                        href={item.href || '#'}
                                        target={item.external ? '_blank' : undefined}
                                        className="flex items-center justify-between p-4 md:px-8 md:py-5 hover:bg-slate-50 transition-all group"
                                    >
                                        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                                            <div className={`w-2 h-2 rounded-full ${c.bg} shrink-0 group-hover:scale-150 transition-transform`} />
                                            <div className="min-w-0">
                                                <p className="font-black italic uppercase text-xs md:text-sm tracking-tight text-slate-900 truncate">{item.label}</p>
                                                <p className="text-[9px] md:text-[10px] text-slate-400 font-bold italic truncate">{item.desc}</p>
                                            </div>
                                        </div>
                                        <ArrowRight size={16} className="text-slate-200 group-hover:text-slate-900 transition-colors shrink-0 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Integraciones */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8">
                <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 mb-6 flex items-center gap-3">
                    <Zap className="text-orange-500" size={22} /> Integraciones Externas
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        { name: 'Uber Eats', desc: 'Captura automática de pedidos cada 30-60s. Cookie requiere renovación periódica (soporte técnico).', status: 'Activo' },
                        { name: 'MercadoPago', desc: 'Pasarela de pagos online: tarjeta, débito y saldo. Confirmación automática vía webhook.', status: 'Activo' },
                        { name: 'PedidosYa', desc: 'Cotización de envío integrada en el checkout de la web.', status: 'Activo' },
                        { name: 'Google Maps', desc: 'Autocompletado de direcciones y cálculo de cobertura de delivery.', status: 'Activo' },
                    ].map(int => (
                        <div key={int.name} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                            <div className="flex justify-between items-start mb-2">
                                <p className="font-black italic uppercase text-sm tracking-tight text-slate-900">{int.name}</p>
                                <span className="text-[8px] font-black uppercase tracking-widest bg-green-100 text-green-600 px-2 py-1 rounded-full">{int.status}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold italic leading-relaxed">{int.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Health Check */}
            <div className="bg-slate-900 rounded-[2rem] p-6 md:p-8 text-white shadow-xl">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 italic flex items-center gap-2">
                    <ShieldCheck size={14} className="text-green-400" /> Health Check Diario (10:00 AM automático)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {[
                        { check: 'Cookie Uber', desc: 'Sesión vigente' },
                        { check: 'Mapeo Productos', desc: 'Aliases válidos' },
                        { check: 'Modificadores', desc: 'Grupos consistentes' },
                        { check: 'Turno Caja', desc: 'Caja abierta' },
                        { check: 'Stock Crítico', desc: 'Sin items en 0' },
                    ].map(h => (
                        <div key={h.check} className="bg-white/5 border border-white/10 p-4 rounded-xl">
                            <CheckCircle2 size={14} className="text-green-400 mb-2" />
                            <p className="font-black italic text-xs uppercase tracking-tight">{h.check}</p>
                            <p className="text-[9px] text-slate-500 italic mt-1">{h.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* FAQ */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8">
                <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 mb-6 flex items-center gap-3">
                    <HelpCircle className="text-orange-500" size={22} /> Preguntas Frecuentes
                </h2>
                <div className="space-y-3">
                    {[
                        { q: '¿Cómo cambio el precio de un producto?', a: 'Catálogo → Click en el producto → Editar precio → Guardar', href: '/owner/catalog' },
                        { q: '¿Cómo desactivo un producto?', a: 'Catálogo → Toggle de disponibilidad', href: '/owner/catalog' },
                        { q: '¿Cómo agrego un banner?', a: 'Marketing → "Nuevo Banner" → Subir imagen → Guardar', href: '/owner/banners' },
                        { q: '¿Cómo creo un cajero?', a: 'Personal → "Nuevo Usuario" → Rol "Cajero"', href: '/owner/cashiers' },
                        { q: '¿Cómo registro una compra de insumos?', a: 'Inventario → Botón "Reponer" → Cantidad, costo y rendimiento', href: '/owner/inventory' },
                        { q: '¿Cómo registro merma?', a: 'Inventario → Botón "Merma" → Cantidad, motivo y nota', href: '/owner/inventory' },
                        { q: '¿Cómo edito una receta?', a: 'Recetas → Click producto → Agregar ingredientes → "Deploy Receta Maestra"', href: '/owner/recipes' },
                        { q: '¿Qué pasa si un producto se queda sin stock?', a: 'Se desactiva automáticamente en la web hasta reponer inventario', href: '/owner/inventory' },
                    ].map((faq, i) => (
                        <Link key={i} href={faq.href} className="block bg-slate-50 hover:bg-orange-50 p-4 rounded-2xl transition-all group border border-transparent hover:border-orange-200">
                            <p className="font-black italic text-sm text-slate-900 mb-1 group-hover:text-orange-600 transition-colors">{faq.q}</p>
                            <p className="text-[10px] text-slate-400 font-bold italic flex items-center gap-1">
                                <ArrowRight size={10} className="text-orange-400" /> {faq.a}
                            </p>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Soporte */}
            <div className="bg-orange-500 rounded-[2rem] p-6 md:p-8 text-white shadow-xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-1">¿Necesitas Ayuda?</h2>
                        <p className="text-orange-100 text-sm font-bold italic">WhatsApp directo con Daniel — Soporte Técnico</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                            <Clock size={14} /> <span className="text-xs font-black uppercase tracking-widest">Lun-Sáb 10:00 - 20:30</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Version */}
            <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-300 italic">
                Lo Más Rico V3 — Manual Operativo v2.3.0 — Mayo 2026
            </p>
        </div>
    );
}
