'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ChefHat,
    MonitorSmartphone,
    Package,
    BarChart3,
    MessageSquare,
    User,
    Menu,
    X,
    LogOut,
    ClipboardList,
    Flame,
    Users,
    Layers,
    PanelLeftClose,
    PanelLeftOpen,
    BookOpen,
    Mail,
    MessageCircle,
    ShieldCheck,
    Bike,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { isModulePaused } from '../../config/features';

interface SidebarItemProps {
    href: string;
    icon: React.ElementType;
    label: string;
    active: boolean;
    collapsed: boolean;
    onClick?: () => void;
}

const SidebarItem = ({ href, icon: Icon, label, active, collapsed, onClick }: SidebarItemProps) => (
    <Link
        href={href}
        prefetch={true}
        onClick={onClick}
        title={collapsed ? label : undefined}
        className={`flex items-center gap-3 rounded-2xl transition-all duration-300 ${
            collapsed ? 'justify-center px-3 py-3' : 'px-5 py-3.5'
        } ${active
            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 font-black'
            : 'text-slate-800 hover:bg-slate-50 hover:text-slate-900 font-bold'
        }`}
    >
        <Icon size={20} className={`shrink-0 ${active ? 'scale-110' : ''}`} />
        {!collapsed && <span className="text-sm uppercase italic tracking-tighter whitespace-nowrap">{label}</span>}
    </Link>
);

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isInitialized, logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Auto-collapse sidebar on kitchen / driver
    useEffect(() => {
        if (pathname === '/kitchen' || pathname === '/driver') {
            setIsCollapsed(true);
        }
    }, [pathname]);

    // Repartidor solo ve /driver
    useEffect(() => {
        if (user?.role === 'DRIVER' && pathname !== '/driver') {
            router.replace('/driver');
        }
    }, [user?.role, pathname, router]);

    const menuItems = [
        { href: '/owner', icon: LayoutDashboard, label: 'Resumen', moduleId: 'dashboard', roles: ['OWNER', 'ADMIN'] },
        { href: '/kitchen', icon: ChefHat, label: 'Cocina', moduleId: 'kitchen', roles: ['OWNER', 'ADMIN', 'KITCHEN', 'CASHIER', 'WAITER'] },
        { href: '/salon', icon: Users, label: 'Salón', moduleId: 'salon', roles: ['OWNER', 'ADMIN', 'CASHIER', 'WAITER'] },
        { href: '/pos', icon: MonitorSmartphone, label: 'Caja / Retiro', moduleId: 'pos', roles: ['OWNER', 'ADMIN', 'CASHIER'] },
        { href: '/driver', icon: Bike, label: 'Reparto', moduleId: 'driver', roles: ['OWNER', 'ADMIN', 'DRIVER'] },
        { href: '/owner/catalog', icon: Package, label: 'Catálogo', moduleId: 'catalog', roles: ['OWNER', 'ADMIN'] },
        { href: '/owner/modifiers', icon: Layers, label: 'Modificadores', moduleId: 'modifiers', roles: ['OWNER', 'ADMIN'] },
        { href: '/owner/banners', icon: MonitorSmartphone, label: 'Marketing', moduleId: 'banners', roles: ['OWNER', 'ADMIN'] },
        { href: '/owner/inventory', icon: ClipboardList, label: 'Inventario', moduleId: 'inventory', roles: ['OWNER', 'ADMIN'] },
        { href: '/owner/recipes', icon: Flame, label: 'Recetas', moduleId: 'recipes', roles: ['OWNER', 'ADMIN'] },
        { href: '/owner/reports', icon: BarChart3, label: 'Reportes', moduleId: 'reports', roles: ['OWNER', 'ADMIN'] },
        { href: '/owner/customers', icon: Users, label: 'Clientes', moduleId: 'customers', roles: ['OWNER', 'ADMIN'] },
        { href: '/owner/inbox/whatsapp', icon: MessageSquare, label: 'WhatsApp Bot', moduleId: 'whatsapp', roles: ['OWNER', 'ADMIN'] },
        { href: '/owner/cashiers', icon: User, label: 'Personal', moduleId: 'cashiers', roles: ['OWNER', 'ADMIN'] },
        { href: '/owner/audit', icon: ShieldCheck, label: 'Registro', moduleId: 'audit', roles: ['OWNER', 'ADMIN'] },
        { href: '/owner/manual', icon: BookOpen, label: 'Manual', moduleId: 'manual', roles: ['OWNER', 'ADMIN'] },
    ];

    // Parsear módulos individuales del usuario
    const userModules: string[] = (() => {
        const raw = (user as any)?.modules;
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        try { return JSON.parse(raw); } catch { return []; }
    })();

    const isOwnerOrAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';

    // Filter items based on user role + individual module permissions
    // El rol fija el máximo; los módulos individuales solo restringen dentro de él.
    const canSee = (item: (typeof menuItems)[number]) => {
        if (isOwnerOrAdmin) return true;
        if (!user?.role || !item.roles.includes(user.role)) return false;
        return userModules.length === 0 || userModules.includes(item.moduleId);
    };

    const filteredMenu = menuItems.filter(item => !isModulePaused(item.moduleId) && canSee(item));

    const currentItem = menuItems.find(item => item.href === pathname);
    const hasPermission = !currentItem || canSee(currentItem);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (isInitialized && !user) {
            router.push('/login');
        }
    }, [isInitialized, user, router]);

    useEffect(() => {
        if (currentItem && isModulePaused(currentItem.moduleId)) {
            router.replace('/owner');
        }
    }, [currentItem, router]);

    if (!isInitialized || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900 border-b-8 border-b-orange-500">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-orange-500 border-t-white rounded-full animate-spin mx-auto mb-8 scale-150 shadow-2xl shadow-orange-500/20" />
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white mb-2">AUTENTICANDO...</h2>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] italic leading-none">LomasRico PRO v2.3.0</p>
                </div>
            </div>
        );
    }

    if (!hasPermission) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-white">
                <div className="text-center p-10 max-w-md">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <X size={32} />
                    </div>
                    <h1 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 mb-2">ACCESO RESTRINGIDO</h1>
                    <p className="text-sm font-bold text-slate-800 uppercase italic mb-8">No tienes permisos para visualizar esta sección del ecosistema.</p>
                    <button
                        onClick={() => router.push(filteredMenu[0]?.href || '/')}
                        className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase italic text-xs tracking-widest shadow-xl"
                    >
                        Volver a mi Panel
                    </button>
                </div>
            </div>
        );
    }

    const isKitchen = pathname === '/kitchen';
    const isPos = pathname.includes('/pos');
    const isSalon = pathname.startsWith('/salon');
    const isFullBleed = isPos || isKitchen || isSalon;

    return (
        <div className="flex h-dvh max-h-dvh overflow-hidden bg-slate-50">
            <button
                onClick={toggleSidebar}
                data-mobile-menu-btn
                className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-white rounded-xl shadow-md"
            >
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200 flex flex-col shrink-0 transition-all duration-300 ease-in-out lg:static
                ${isCollapsed ? 'w-[72px]' : 'w-72'}
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Logo */}
                <div className={`relative flex flex-col items-center ${isCollapsed ? 'p-3 gap-2' : 'p-6 pb-4'}`}>
                    <img
                        src="/assets/Logo Restaurante.png"
                        alt="Lo Más Rico"
                        className={`object-contain ${isCollapsed ? 'w-10 h-10' : 'w-28 h-28'}`}
                    />
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`hidden lg:flex p-2 rounded-xl hover:bg-slate-100 text-slate-800 hover:text-slate-600 transition-colors ${isCollapsed ? '' : 'absolute top-4 right-3'}`}
                        title={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
                    >
                        {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                    </button>
                </div>

                {/* Nav */}
                <nav className={`flex-1 space-y-1.5 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-3'}`}>
                    {filteredMenu.map((item) => (
                        <SidebarItem
                            key={item.href}
                            href={item.href}
                            icon={item.icon}
                            label={item.label}
                            active={item.href === '/salon' ? pathname.startsWith('/salon') : pathname === item.href}
                            collapsed={isCollapsed}
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    ))}
                </nav>

                {/* Footer */}
                <div className={`border-t border-slate-100 ${isCollapsed ? 'p-2' : 'p-4'}`}>
                    {!isCollapsed && (
                        <div className="flex items-center gap-3 px-3 py-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold uppercase shrink-0">
                                {user?.name?.[0] || 'U'}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-black italic truncate">{user?.name || 'Usuario'}</span>
                                <span className="text-[10px] text-slate-800 uppercase font-black tracking-tight">{user?.role || 'Personal'}</span>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={logout}
                        title={isCollapsed ? 'Cerrar Sesión' : undefined}
                        className={`flex items-center gap-3 rounded-2xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-all font-bold w-full ${
                            isCollapsed ? 'justify-center px-3 py-3' : 'px-5 py-3'
                        }`}
                    >
                        <LogOut size={20} />
                        {!isCollapsed && <span className="text-sm uppercase italic tracking-tighter text-red-600">Cerrar Sesión</span>}
                    </button>

                    <div className={`mt-3 grid gap-2 ${isCollapsed ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        <a
                            href="mailto:contacto@dpsistemas.cl"
                            title="contacto@dpsistemas.cl"
                            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors"
                        >
                            <Mail size={16} />
                            {!isCollapsed && 'Correo'}
                        </a>
                        <a
                            href="https://wa.me/56974342276"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="+56 9 7434 2276"
                            className="flex items-center justify-center gap-2 rounded-xl bg-green-600 text-white py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-colors"
                        >
                            <MessageCircle size={16} />
                            {!isCollapsed && 'WhatsApp'}
                        </a>
                    </div>
                </div>
            </aside>

            {/* Backdrop for mobile */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Main Area */}
            <main className={`flex-1 min-w-0 min-h-0 w-full relative ${isFullBleed ? 'overflow-hidden flex flex-col' : 'overflow-y-auto overflow-x-hidden overscroll-y-contain'}`}>
                {/* Background Decoration */}
                {!isKitchen && (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden>
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
                    </div>
                )}

                <div className={`w-full max-w-none min-w-0 ${
                    isFullBleed ? 'p-0 flex-1 min-h-0 flex flex-col overflow-hidden' : 'min-h-full flex flex-col p-4 md:px-6 lg:px-8 md:py-8'
                }`}>
                    <div className={`w-full max-w-none min-w-0 animate-in fade-in duration-300 max-lg:[&_h1]:text-right lg:[&_h1]:text-left ${isFullBleed ? 'flex-1 min-h-0 overflow-hidden flex flex-col' : ''}`}>
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
