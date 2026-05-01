'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    BookOpen, LayoutDashboard, ChefHat, MonitorSmartphone, Package,
    Layers, ClipboardList, Flame, BarChart3, Users, MessageSquare,
    User, ExternalLink, ArrowRight, Zap, ShieldCheck, HelpCircle,
    Clock, ChevronRight
} from 'lucide-react';

interface ActionItem { label: string; desc: string; href: string }

interface Section {
    id: string;
    title: string;
    icon: React.ElementType;
    color: string;
    href: string;
    intro: string;
    actions: ActionItem[];
}

const sections: Section[] = [
    {
        id: 'dashboard', title: 'Resumen', icon: LayoutDashboard, color: '#f97316',
        href: '/owner', intro: 'Vista ejecutiva del estado del negocio: ingresos, órdenes activas, alertas de stock, canales de venta, productos top y distribución horaria.',
        actions: [
            { label: 'Ingresos del día y mes', desc: 'Ventas totales con tendencia %', href: '/owner' },
            { label: 'Órdenes activas en cocina', desc: 'Pedidos en preparación', href: '/kitchen' },
            { label: 'Alertas de stock bajo', desc: 'Insumos que necesitan reposición', href: '/owner/inventory' },
            { label: 'Canales de venta', desc: 'Distribución Web, POS, WhatsApp, Uber', href: '/owner' },
            { label: 'Top 5 productos', desc: 'Ranking de más vendidos', href: '/owner' },
            { label: 'Horas peak', desc: 'Demanda por hora del día', href: '/owner' },
        ]
    },
    {
        id: 'catalog', title: 'Catálogo', icon: Package, color: '#3b82f6',
        href: '/owner/catalog', intro: 'Gestione todos los productos: crear, editar, activar/desactivar, subir fotos y organizar por categorías dinámicas.',
        actions: [
            { label: 'Crear producto', desc: 'Nombre, precio, categoría, foto', href: '/owner/catalog' },
            { label: 'Editar producto', desc: 'Click → modificar → Guardar', href: '/owner/catalog' },
            { label: 'Activar / Desactivar', desc: 'Toggle de disponibilidad', href: '/owner/catalog' },
            { label: 'Subir foto', desc: 'Click en imagen → seleccionar archivo', href: '/owner/catalog' },
            { label: 'Ordenar', desc: 'Categorías dinámicas desde BD', href: '/owner/catalog' },
        ]
    },
    {
        id: 'modifiers', title: 'Modificadores', icon: Layers, color: '#8b5cf6',
        href: '/owner/modifiers', intro: 'Opciones de personalización: proteínas, extras, ingredientes removibles con precios y límites.',
        actions: [
            { label: 'Grupos', desc: '"Proteínas", "Extras", "Sin ingredientes"', href: '/owner/modifiers' },
            { label: 'Opciones con precio', desc: 'Salmón, Reineta, Camarón...', href: '/owner/modifiers' },
            { label: 'Límites mín/máx', desc: 'Ej: mín 1, máx 3 proteínas', href: '/owner/modifiers' },
            { label: 'Reordenar por producto', desc: 'Orden personalizado con flechas', href: '/owner/modifiers' },
        ]
    },
    {
        id: 'inventory', title: 'Inventario', icon: ClipboardList, color: '#22c55e',
        href: '/owner/inventory', intro: 'Control total de stock con rendimiento, merma, reposición y ajustes manuales. Descuento automático por receta.',
        actions: [
            { label: 'Nuevo insumo', desc: 'Nombre, categoría, rol, tipo, unidad, rendimiento', href: '/owner/inventory' },
            { label: 'Reponer stock', desc: 'Compra con cantidad, costo y rendimiento %', href: '/owner/inventory' },
            { label: 'Ajustar stock', desc: 'Corregir tras inventario físico', href: '/owner/inventory' },
            { label: 'Registrar merma', desc: 'Pérdida por vencimiento o daño', href: '/owner/inventory' },
            { label: 'Editar insumo', desc: 'Nombre, rol, tipo, costo, umbral', href: '/owner/inventory' },
        ]
    },
    {
        id: 'recipes', title: 'Recetas', icon: Flame, color: '#ef4444',
        href: '/owner/recipes', intro: 'Ingeniería de producto: ingredientes, gramajes, costos y márgenes de utilidad en tiempo real.',
        actions: [
            { label: 'Platos finales', desc: 'Recetas de productos de venta', href: '/owner/recipes' },
            { label: 'Bases & Preps', desc: 'Sub-recetas (salsas, bases)', href: '/owner/recipes' },
            { label: 'Editor de receta', desc: 'Agregar ingredientes y cantidades', href: '/owner/recipes' },
            { label: 'Análisis económico', desc: 'Costo, precio, margen %', href: '/owner/recipes' },
        ]
    },
    {
        id: 'pos', title: 'Punto de Venta', icon: MonitorSmartphone, color: '#475569',
        href: '/pos', intro: 'Venta presencial en el local. Seleccionar productos, personalizar, procesar pagos y gestionar turnos de caja.',
        actions: [
            { label: 'Crear venta', desc: 'Seleccionar → personalizar → pagar', href: '/pos' },
            { label: 'Métodos de pago', desc: 'Efectivo, tarjeta, transferencia, MP', href: '/pos' },
            { label: 'Abrir caja', desc: 'Iniciar turno con monto inicial', href: '/pos' },
            { label: 'Cerrar caja', desc: 'Resumen de ventas del turno', href: '/pos' },
        ]
    },
    {
        id: 'kitchen', title: 'Cocina (KDS)', icon: ChefHat, color: '#f59e0b',
        href: '/kitchen', intro: 'Pantalla de cocina con pedidos en tiempo real de todos los canales: Web, POS, WhatsApp y Uber Eats.',
        actions: [
            { label: 'Pedidos entrantes', desc: 'Llegan de todos los canales', href: '/kitchen' },
            { label: 'Aceptar → Preparando', desc: 'Iniciar preparación', href: '/kitchen' },
            { label: 'Listo → Entrega', desc: 'Marcar para despacho', href: '/kitchen' },
            { label: 'Imprimir comanda', desc: 'Con gramajes y personalizaciones', href: '/kitchen' },
        ]
    },
    {
        id: 'banners', title: 'Marketing', icon: MonitorSmartphone, color: '#ec4899',
        href: '/owner/banners', intro: 'Banners promocionales de la web. Subir, reordenar y activar/desactivar.',
        actions: [
            { label: 'Subir banner', desc: 'Imagen 1200×400px JPG/PNG', href: '/owner/banners' },
            { label: 'Reordenar', desc: 'Arrastrar y soltar', href: '/owner/banners' },
            { label: 'Activar / Desactivar', desc: 'Toggle de visibilidad', href: '/owner/banners' },
        ]
    },
    {
        id: 'reports', title: 'Reportes', icon: BarChart3, color: '#06b6d4',
        href: '/owner/reports', intro: 'Informes de ventas por período, canal, productos top e historial de transacciones.',
        actions: [
            { label: 'Ventas por período', desc: 'Día, semana, mes', href: '/owner/reports' },
            { label: 'Por canal de venta', desc: 'Web, POS, WhatsApp, Uber', href: '/owner/reports' },
            { label: 'Historial', desc: 'Transacciones detalladas', href: '/owner/reports' },
        ]
    },
    {
        id: 'customers', title: 'Clientes', icon: Users, color: '#14b8a6',
        href: '/owner/customers', intro: 'Base de clientes con datos de contacto e historial de pedidos.',
        actions: [
            { label: 'Base de clientes', desc: 'Nombre, teléfono, email', href: '/owner/customers' },
            { label: 'Historial de pedidos', desc: 'Compras anteriores', href: '/owner/customers' },
        ]
    },
    {
        id: 'whatsapp', title: 'WhatsApp Bot', icon: MessageSquare, color: '#10b981',
        href: '/owner/inbox/whatsapp', intro: 'Maxi: asistente IA que atiende clientes, toma pedidos y genera links de pago por WhatsApp.',
        actions: [
            { label: 'Conversaciones activas', desc: 'Chats del bot en tiempo real', href: '/owner/inbox/whatsapp' },
            { label: 'Pedidos del bot', desc: 'Órdenes generadas por Maxi', href: '/owner/inbox/whatsapp' },
        ]
    },
    {
        id: 'staff', title: 'Personal', icon: User, color: '#6366f1',
        href: '/owner/cashiers', intro: 'Gestión de usuarios del sistema: crear, asignar roles, módulos y resetear contraseñas.',
        actions: [
            { label: 'Crear usuario', desc: 'Nombre, email, contraseña, rol', href: '/owner/cashiers' },
            { label: 'Asignar rol', desc: 'Owner, Admin, Cashier, Kitchen', href: '/owner/cashiers' },
            { label: 'Módulos individuales', desc: 'Secciones visibles por usuario', href: '/owner/cashiers' },
            { label: 'Resetear contraseña', desc: 'Botón de reseteo', href: '/owner/cashiers' },
        ]
    },
];

export default function ManualPage() {
    const [active, setActive] = useState('dashboard');
    const current = sections.find(s => s.id === active)!;
    const Icon = current.icon;

    return (
        <div className="animate-in fade-in duration-500 h-[calc(100vh-80px)] flex flex-col overflow-hidden">
            {/* Header compacto */}
            <div className="flex items-center justify-between mb-4 shrink-0 px-1">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-200">
                        <BookOpen size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                            MANUAL <span className="text-orange-500">OPERATIVO</span>
                        </h1>
                        <p className="text-slate-400 font-bold uppercase text-[8px] tracking-widest mt-0.5">
                            Seleccione un módulo → Haga click en una acción para ir directo
                        </p>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-300 italic">
                    <Clock size={12} /> v2.3.0 · Mayo 2026
                </div>
            </div>

            {/* Layout principal: tabs izquierda + contenido derecha */}
            <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
                {/* Tabs laterales */}
                <div className="w-44 md:w-52 shrink-0 flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex-1 overflow-y-auto no-scrollbar py-2">
                        {sections.map(s => {
                            const SIcon = s.icon;
                            const isActive = active === s.id;
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => setActive(s.id)}
                                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-all duration-200 ${
                                        isActive
                                            ? 'bg-slate-900 text-white'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                                >
                                    <SIcon size={16} style={isActive ? { color: s.color } : undefined} className="shrink-0" />
                                    <span className="text-[10px] font-black uppercase tracking-tight italic truncate">{s.title}</span>
                                </button>
                            );
                        })}
                    </div>
                    {/* Info rápida al fondo */}
                    <div className="border-t border-slate-100 p-3 space-y-1.5 shrink-0">
                        <a href="https://lomasrico.cl" target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-orange-500 transition-colors">
                            <ExternalLink size={10} /> lomasrico.cl
                        </a>
                        <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-slate-300">
                            <HelpCircle size={10} /> Soporte: Lun-Sáb 10-20:30
                        </div>
                    </div>
                </div>

                {/* Panel de contenido */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* Cabecera del módulo activo */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 md:p-6 mb-4 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
                        style={{ borderBottom: `3px solid ${current.color}` }}>
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="p-3 rounded-xl text-white shadow-lg shrink-0" style={{ backgroundColor: current.color }}>
                                <Icon size={24} />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">{current.title}</h2>
                                <p className="text-[10px] text-slate-400 font-bold italic mt-1 leading-snug">{current.intro}</p>
                            </div>
                        </div>
                        <Link href={current.href}
                            className="px-5 py-3 text-white rounded-xl font-black uppercase text-[10px] tracking-widest italic shadow-md hover:opacity-90 transition-all flex items-center gap-2 active:scale-95 shrink-0"
                            style={{ backgroundColor: current.color }}>
                            Ir al módulo <ArrowRight size={14} />
                        </Link>
                    </div>

                    {/* Acciones del módulo */}
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {current.actions.map((action, i) => (
                                <Link key={i} href={action.href}
                                    className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md transition-all group flex items-center justify-between gap-3 active:scale-[0.98]">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-2 h-2 rounded-full shrink-0 group-hover:scale-150 transition-transform" style={{ backgroundColor: current.color }} />
                                        <div className="min-w-0">
                                            <p className="font-black italic uppercase text-xs tracking-tight text-slate-900 group-hover:text-orange-600 transition-colors truncate">{action.label}</p>
                                            <p className="text-[9px] text-slate-400 font-bold italic truncate">{action.desc}</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-200 group-hover:text-slate-900 shrink-0 group-hover:translate-x-0.5 transition-all" />
                                </Link>
                            ))}
                        </div>

                        {/* Sección extra contextual */}
                        {active === 'dashboard' && (
                            <div className="mt-4 bg-slate-900 rounded-xl p-5 text-white">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3 italic flex items-center gap-2">
                                    <Zap size={12} className="text-orange-500" /> Integraciones Activas
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {['Uber Eats', 'MercadoPago', 'PedidosYa', 'Google Maps'].map(name => (
                                        <div key={name} className="bg-white/5 border border-white/10 px-3 py-2 rounded-lg text-center">
                                            <p className="text-[9px] font-black uppercase italic tracking-tight">{name}</p>
                                            <p className="text-[8px] text-green-400 font-bold mt-0.5">● Activo</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {active === 'inventory' && (
                            <div className="mt-4 bg-green-50 border border-green-100 rounded-xl p-5">
                                <p className="text-[9px] font-black uppercase tracking-widest text-green-600 mb-2 italic flex items-center gap-2">
                                    <ShieldCheck size={12} /> Sistema de Rendimiento
                                </p>
                                <p className="text-[10px] text-green-700 font-bold italic leading-relaxed">
                                    Al reponer stock, configure el rendimiento (%). Ej: 10 kg salmón a $8.000/kg con 80% rendimiento = 8 kg útiles, costo real $10.000/kg. El sistema calcula automáticamente.
                                </p>
                            </div>
                        )}

                        {active === 'kitchen' && (
                            <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-5">
                                <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-2 italic">Flujo de estados</p>
                                <div className="flex items-center gap-2 text-xs font-black italic text-amber-700">
                                    <span className="bg-amber-100 px-3 py-1.5 rounded-lg">📥 Entrante</span>
                                    <ArrowRight size={14} />
                                    <span className="bg-amber-100 px-3 py-1.5 rounded-lg">🔥 Preparando</span>
                                    <ArrowRight size={14} />
                                    <span className="bg-amber-100 px-3 py-1.5 rounded-lg">✅ Entrega</span>
                                </div>
                            </div>
                        )}

                        {active === 'pos' && (
                            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-5">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 italic">Flujo de venta</p>
                                <p className="text-[10px] text-slate-600 font-bold italic leading-relaxed">
                                    Seleccionar productos → Personalizar → Agregar al carrito → Pagar → Se descuenta inventario automáticamente → Aparece en Cocina
                                </p>
                            </div>
                        )}

                        {active === 'recipes' && (
                            <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-5">
                                <p className="text-[9px] font-black uppercase tracking-widest text-red-600 mb-2 italic">Análisis Maestro</p>
                                <p className="text-[10px] text-red-700 font-bold italic leading-relaxed">
                                    Cada receta muestra costo de producción, precio de venta y margen de utilidad en tiempo real. Margen verde (&gt;50%) o rojo (&lt;50%).
                                </p>
                            </div>
                        )}

                        {active === 'staff' && (
                            <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-5">
                                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 mb-2 italic">Roles del sistema</p>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {[
                                        { role: 'OWNER', desc: 'Todo el sistema', who: 'Oscar' },
                                        { role: 'ADMIN', desc: 'Todo el sistema', who: 'Encargado' },
                                        { role: 'CASHIER', desc: 'POS + Cocina', who: 'Cajero' },
                                        { role: 'KITCHEN', desc: 'Solo cocina', who: 'Cocina' },
                                    ].map(r => (
                                        <div key={r.role} className="bg-white px-3 py-2 rounded-lg border border-indigo-100">
                                            <span className="text-[9px] font-black text-indigo-600">{r.role}</span>
                                            <span className="text-[9px] text-slate-400 font-bold ml-2">{r.desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
