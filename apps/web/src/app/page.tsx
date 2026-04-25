'use client';

import { useState, useEffect } from 'react';
import { ProductGrid } from '../components/catalog/ProductGrid';
import { useCart, CartProvider } from '../context/CartContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import CheckoutModal from '../components/modals/CheckoutModal';
import OrdersModal from '../components/modals/OrdersModal';
import AuthModal from '../components/modals/AuthModal';
import { ShoppingBag, User as UserIcon, LogIn } from 'lucide-react';

const Header = ({ onCartOpen, onOrdersOpen, onAuthOpen }: { onCartOpen: () => void, onOrdersOpen: () => void, onAuthOpen: () => void }) => {
  const { items } = useCart();
  const { user, isLoggedIn, logout } = useAuth();

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 px-4 md:px-6 py-3 md:py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Logo Section */}
        <div className="flex items-center gap-2 md:gap-4">
          <img src="/assets/Logo Restaurante.png" alt="LoMasRico Logo" className="h-[50px] w-[50px] md:h-[70px] md:w-[70px] object-contain drop-shadow-sm" />
          <div className="hidden sm:block">
            <h1 className="text-xl md:text-3xl font-[900] italic tracking-[-0.05em] uppercase leading-[0.7] text-slate-900">
              LO MÁS RICO
            </h1>
            <span className="text-[8px] md:text-[11px] font-black uppercase tracking-[0.3em] text-[#f2642e]">Premium Cevichería</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-6">
          <div className="flex items-center gap-2 md:gap-4">
            {isLoggedIn ? (
              <div className="flex items-center gap-2 md:gap-4">
                {/* Loyalty Info - Hidden on mobile, shown on md+ */}
                <div className="hidden sm:flex flex-col items-end px-3 md:px-4 py-1.5 bg-orange-50 rounded-2xl border border-orange-100">
                  <p className="text-[8px] md:text-[9px] font-black uppercase text-orange-400 tracking-widest leading-none">Club Puntos</p>
                  <p className="text-xs md:text-sm font-black text-orange-900 leading-tight">{(user as any)?.loyaltyPoints?.toLocaleString() || 0} pts</p>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                  <a href="/profile" className="flex items-center gap-2 md:gap-3 group bg-white p-1 md:pr-4 rounded-full border border-slate-100 hover:border-slate-900 transition-all shadow-sm">
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-slate-900 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                      {user?.avatarUrl ? <img src={user.avatarUrl} alt={user.name} /> : <><UserIcon size={14} className="text-white md:hidden" /><UserIcon size={18} className="text-white hidden md:block" /></>}
                    </div>
                    <div className="text-left hidden md:block">
                      <p className="text-[10px] font-black uppercase text-slate-900 leading-none truncate max-w-[80px]">{user?.name?.split(' ')[0]}</p>
                      <p className="text-[8px] font-bold uppercase text-slate-400 tracking-wider">Mi Perfil</p>
                    </div>
                  </a>

                  {/* Mobile Loyalty Badge - Tiny pill for mobile */}
                  <div className="sm:hidden flex items-center px-2 py-1 bg-orange-100 rounded-full border border-orange-200">
                    <span className="text-[9px] font-black text-orange-900">{(user as any)?.loyaltyPoints?.toLocaleString() || 0}</span>
                  </div>

                  <div className="hidden md:flex gap-2">
                    <button
                      onClick={onOrdersOpen}
                      className="p-2.5 bg-slate-100 hover:bg-slate-900 text-slate-400 hover:text-white rounded-full transition-all group"
                      title="Mis Pedidos"
                    >
                      <ShoppingBag size={18} />
                    </button>

                    <button
                      onClick={logout}
                      className="p-2.5 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-full transition-all"
                      title="Salir"
                    >
                      <LogIn size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={onAuthOpen}
                className="bg-slate-900 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-full font-black uppercase text-[10px] md:text-xs tracking-widest hover:bg-black transition-all shadow-lg truncate max-w-[120px] md:max-w-none"
              >
                Ingresar
              </button>
            )}
          </div>

          <button
            onClick={onCartOpen}
            className="relative group p-1.5 md:p-2"
          >
            <div className="absolute -top-1 -right-1 bg-orange-600 text-white w-4 h-4 md:w-5 md:h-5 rounded-full text-[8px] md:text-[10px] font-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              {items.length}
            </div>
            <ShoppingBag className="text-slate-900 group-hover:text-orange-600 transition-colors h-6 w-6 md:h-7 md:w-7" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
};

function HomeContent() {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { total } = useCart();

  useEffect(() => {
    (window as any).openAuthModal = () => setIsAuthOpen(true);

    const handleOpenCheckout = () => setIsCheckoutOpen(true);
    window.addEventListener('open-checkout', handleOpenCheckout);

    return () => {
      (window as any).openAuthModal = undefined;
      window.removeEventListener('open-checkout', handleOpenCheckout);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col page-transition">
      <Header
        onCartOpen={() => setIsCheckoutOpen(true)}
        onOrdersOpen={() => setIsOrdersOpen(true)}
        onAuthOpen={() => setIsAuthOpen(true)}
      />

      <main className="flex-grow bg-slate-50/50">
        {/* === SECCIÓN DE BANNERS === */}
        <div className="w-full">
          {/* 1. Banner Desktop (Visible solo en pantallas medianas y grandes) */}
          {/* Dimensiones recomendadas: 1920px ancho x 600px alto (o hasta 800px de alto) */}
          <div className="hidden md:block w-full">
            <img 
              src="/assets/banner-desktop.jpg" 
              alt="Banner Principal" 
              className="w-full object-cover min-h-[400px] max-h-[600px] bg-slate-200"
              onError={(e) => {
                // Placeholder temporal si no existe la imagen
                (e.target as HTMLImageElement).src = 'https://placehold.co/1920x600/f8fafc/94a3b8?text=Banner+Desktop+(1920x600)';
              }}
            />
          </div>

          {/* 2. Banner Mobile (Visible solo en celulares) */}
          {/* Dimensiones recomendadas: 1080px ancho x 1080px alto (Cuadrado 1:1) o 1080x1350px (Formato 4:5) */}
          <div className="block md:hidden w-full">
            <img 
              src="/assets/banner-mobile.jpg" 
              alt="Banner Móvil" 
              className="w-full object-cover min-h-[350px] aspect-square bg-slate-200"
              onError={(e) => {
                // Placeholder temporal si no existe la imagen
                (e.target as HTMLImageElement).src = 'https://placehold.co/1080x1080/f8fafc/94a3b8?text=Banner+Mobile+(1080x1080)';
              }}
            />
          </div>
        </div>

        <ProductGrid />
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-100 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 opacity-50 grayscale hover:grayscale-0 transition-all">
            <img src="/assets/Logo Restaurante.png" alt="Logo" className="h-10 w-10" />
            <span className="font-black italic text-sm tracking-tighter">LO MÁS RICO &copy; 2026</span>
          </div>
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            <a href="/legal/terms" className="hover:text-orange-600 transition-colors">Terminos</a>
            <a href="/legal/privacy" className="hover:text-orange-600 transition-colors">Privacidad</a>
            <a href="#" className="hover:text-orange-600 transition-colors">Soporte</a>
          </div>
        </div>
      </footer>

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        total={total}
      />

      <OrdersModal
        isOpen={isOrdersOpen}
        onClose={() => setIsOrdersOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <CartProvider>
        <HomeContent />
      </CartProvider>
    </AuthProvider>
  );
}
