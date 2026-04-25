'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ChefHat,
    MonitorSmartphone,
    Package,
    Settings,
    BarChart3,
    MessageSquare,
    User,
    Menu,
    X,
    LogOut,
    ClipboardList,
    Flame,
    Users,
    Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface SidebarItemProps {
    href: string;
    icon: React.ElementType;
    label: string;
    active: boolean;
    onClick?: () => void;
}

const SidebarItem = ({ href, icon: Icon, label, active, onClick }: SidebarItemProps) => (
    <Link
        href={href}
        onClick={onClick}
        className={`flex items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-300 ${active
            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 font-black'
            : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900 font-bold'
            }`}
    >
        <Icon size={20} className={active ? 'scale-110' : ''} />
        <span className="text-sm uppercase italic tracking-tighter">{label}</span>
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

    useEffect(() => {
        if (isInitialized && !user) {
            router.push('/login');
        }
    }, [user, isInitialized, router]);

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
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] italic leading-none">LomasRico PRO v2.2.0-unified</p>
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
                fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-8">
                    <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">
                        LO MÁS RICO <span className="text-orange-500">PRO</span>
                    </h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gestión Unificada</p>
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                    {filteredMenu.map((item) => (
                        <SidebarItem
                            key={item.href}
                            href={item.href}
                            icon={item.icon}
                            label={item.label}
                            active={pathname === item.href}
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center gap-3 px-4 py-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold uppercase">
                            {user?.name?.[0] || 'U'}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-black italic truncate">{user?.name || 'Usuario'}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-tight">{user?.role || 'Personal'}</span>
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-6 py-4 rounded-2xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-all font-bold"
                    >
                        <LogOut size={20} />
                        <span className="text-sm uppercase italic tracking-tighter text-red-600">Cerrar Sesión</span>
                    </button>

                    <div className="mt-4 italic font-black text-[10px] text-slate-300 uppercase tracking-widest text-center">
                        v2.2.0-unified
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
            <main className={`flex-1 w-full relative ${pathname.includes('/pos') ? 'overflow-hidden h-screen' : 'overflow-y-auto'}`}>
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 blur-[120px] rounded-full -z-10 translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                <div className={`min-h-full flex flex-col w-full ${pathname.includes('/pos') ? 'p-0 max-w-none h-full' : 'max-w-7xl mx-auto p-4 md:p-10'}`}>
                    {children}
                </div>
            </main>
        </div>
    );
}
