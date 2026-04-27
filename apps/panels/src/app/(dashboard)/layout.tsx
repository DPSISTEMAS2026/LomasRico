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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

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
            : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900 font-bold'
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

    // Auto-collapse sidebar on kitchen page
    useEffect(() => {
        if (pathname === '/kitchen') {
            setIsCollapsed(true);
        }
    }, [pathname]);

    const menuItems = [
        { href: '/owner', icon: LayoutDashboard, label: 'Resumen', moduleId: 'dashboard', roles: ['OWNER', 'ADMIN'] },
        { href: '/kitchen', icon: ChefHat, label: 'Cocina', moduleId: 'kitchen', roles: ['OWNER', 'ADMIN', 'KITCHEN', 'CASHIER'] },
        { href: '/pos', icon: MonitorSmartphone, label: 'Punto de Venta', moduleId: 'pos', roles: ['OWNER', 'ADMIN', 'CASHIER'] },
        { href: '/owner/catalog', icon: Package, label: 'Catálogo', moduleId: 'catalog', roles: ['OWNER', 'ADMIN'] },
        { href: '/owner/modifiers', icon: Layers, label: 'Modificadores', moduleId: 'modifiers', roles: ['OWNER', 'ADMIN'] },
        { href: '/owner/banners', icon: MonitorSmartphone, label: 'Marketing', moduleId: 'banners', roles: ['OWNER', 'ADMIN'] },
        { href: '/owner/inventory', icon: ClipboardList, label: 'Inventario', moduleId: 'inventory', roles: ['OWNER', 'ADMIN'] },
        { href: '/owner/recipes', icon: Flame, label: 'Recetas', moduleId: 'recipes', roles: ['OWNER', 'ADMIN'] },
        { href: '/owner/reports', icon: BarChart3, label: 'Reportes', moduleId: 'reports', roles: ['OWNER', 'ADMIN'] },
        { href: '/owner/customers', icon: Users, label: 'Clientes', moduleId: 'customers', roles: ['OWNER', 'ADMIN'] },
        { href: '/owner/inbox/whatsapp', icon: MessageSquare, label: 'WhatsApp Bot', moduleId: 'whatsapp', roles: ['OWNER', 'ADMIN'] },
        { href: '/owner/cashiers', icon: User, label: 'Personal', moduleId: 'cashiers', roles: ['OWNER', 'ADMIN'] },
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
    const filteredMenu = menuItems.filter(item => {
        // OWNER y ADMIN siempre ven todo
        if (isOwnerOrAdmin) return true;
        // Si tiene módulos individuales definidos, usarlos
        if (userModules.length > 0) return userModules.includes(item.moduleId);
        // Fallback: usar permisos por rol base
        return user?.role && item.roles.includes(user.role);
    });

    // Check if user has permission for current path
    const currentItem = menuItems.find(item => item.href === pathname);
    const hasPermission = !currentItem || isOwnerOrAdmin ||
        (userModules.length > 0
            ? userModules.includes(currentItem.moduleId)
            : user?.role && currentItem.roles.includes(user.role));

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

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
                    <p className="text-sm font-bold text-slate-400 uppercase italic mb-8">No tienes permisos para visualizar esta sección del ecosistema.</p>
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

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            {/* Mobile Menu Button */}
            <button
                onClick={toggleSidebar}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-md"
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
                <div className={`flex items-center justify-between ${isCollapsed ? 'p-3' : 'p-6 pb-4'}`}>
                    {!isCollapsed && (
                        <div>
                            <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">
                                LO MÁS RICO <span className="text-orange-500">PRO</span>
                            </h1>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Gestión Unificada</p>
                        </div>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:flex p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
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
                            active={pathname === item.href}
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
                                <span className="text-[10px] text-slate-400 uppercase font-black tracking-tight">{user?.role || 'Personal'}</span>
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

                    {!isCollapsed && (
                        <div className="mt-3 italic font-black text-[10px] text-slate-300 uppercase tracking-widest text-center">
                            v2.3.0
                        </div>
                    )}
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
            <main className={`flex-1 w-full relative ${isPos || isKitchen ? 'overflow-hidden h-screen' : 'overflow-y-auto'}`}>
                {/* Background Decoration */}
                {!isKitchen && (
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 blur-[120px] rounded-full -z-10 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                )}

                <div className={`min-h-full flex flex-col w-full ${
                    isPos ? 'p-0 max-w-none h-full' :
                    isKitchen ? 'p-0 max-w-none h-full' :
                    'max-w-7xl mx-auto p-4 md:p-10'
                }`}>
                    <div className="animate-in fade-in duration-300">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
