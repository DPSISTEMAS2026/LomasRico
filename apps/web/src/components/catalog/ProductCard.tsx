'use client';

import { useRef } from 'react';
import { Product } from '../../types';
import { Plus, AlertTriangle } from 'lucide-react';

interface ProductCardProps {
    product: Product;
    onAdd: (product: Product) => void;
}

export const ProductCard = ({ product, onAdd }: ProductCardProps) => {
    // We use the imageUrl from the catalog which now points to the real filename
    const displayImage = product.imageUrl || `/assets/Logo Restaurante.png`;
    const isOutOfStock = product.available === false;
    const isLowStock = product.available !== false && product.maxQuantity != null && product.maxQuantity > 0 && product.maxQuantity <= 5;

    // Check if product has a dynamic video from DB, or legacy local video
    const legacyVideoNames = ['Ceviche LoMASRico 350g', 'Ceviche LoMASRico 500g', 'Ceviche LoMASRico 750g'];
    const hasVideo = !isOutOfStock && (!!product.hoverVideoUrl || legacyVideoNames.includes(product.name));
    const videoSrc = product.hoverVideoUrl || `/assets/videos/${product.name}.mp4`;
    
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleMouseEnter = () => {
        if (hasVideo && videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(e => console.log('Video play failed', e));
        }
    };

    const handleMouseLeave = () => {
        if (hasVideo && videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    };

    return (
        <div
            className={`bg-white rounded-[2.5rem] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.04)] transition-all duration-500 group border flex flex-col h-full animate-in fade-in zoom-in duration-700
                ${isOutOfStock
                    ? 'border-slate-200 opacity-60 grayscale-[30%] cursor-not-allowed'
                    : 'border-slate-50 hover:border-orange-100 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)]'
                }`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Image Container - Focused on Product */}
            <div className="relative aspect-square overflow-hidden bg-slate-50">
                <img
                    src={displayImage}
                    alt={product.name}
                    className={`w-full h-full object-cover transition-transform duration-1000 ${isOutOfStock ? '' : 'group-hover:scale-110'} ${hasVideo ? 'group-hover:opacity-0' : ''}`}
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        // Silently fallback to logo if images fail
                        if (!target.src.includes('Logo')) {
                            target.src = '/assets/Logo Restaurante.png';
                            target.className = "w-full h-full object-contain p-8 opacity-20";
                        }
                    }}
                />

                {/* Video Overlay on Hover */}
                {hasVideo && (
                    <video
                        ref={videoRef}
                        src={videoSrc}
                        className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                        muted
                        loop
                        playsInline
                    />
                )}

                {/* Hot Tag for Promos */}
                {product.category === 'PROMOS' && !isOutOfStock && (
                    <div className="absolute top-6 left-6 bg-[#f2642e] text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-xl shadow-orange-500/30">
                        PROMO
                    </div>
                )}

                {/* AGOTADO Overlay */}
                {isOutOfStock && (
                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center backdrop-blur-[1px]">
                        <div className="bg-white/95 backdrop-blur-xl px-6 py-3 rounded-2xl shadow-2xl border border-slate-200 flex items-center gap-2.5 animate-in zoom-in duration-300">
                            <AlertTriangle size={16} className="text-red-500" strokeWidth={3} />
                            <span className="text-sm font-black uppercase italic tracking-[0.15em] text-slate-800">Agotado</span>
                        </div>
                    </div>
                )}

                {/* Low Stock Badge */}
                {isLowStock && (
                    <div className="absolute top-6 right-6 bg-amber-500 text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-[0.15em] shadow-lg shadow-amber-500/30 animate-pulse">
                        ¡Últim{product.maxQuantity === 1 ? 'o' : 'os'} {product.maxQuantity}!
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="p-6 flex flex-col flex-grow bg-white text-center">
                <div className="flex-grow">
                    <h3 className={`font-black text-xl italic tracking-tighter uppercase leading-[0.9] mb-2.5 transition-colors
                        ${isOutOfStock ? 'text-slate-400' : 'text-slate-900 group-hover:text-[#f2642e]'}`}>
                        {product.name}
                    </h3>

                    <p className="text-slate-400 text-xs font-semibold leading-relaxed mb-6 line-clamp-2">
                        {product.description}
                    </p>
                </div>

                <div className="mt-auto pt-6 border-t border-slate-50">
                    <div className="flex flex-col gap-4 items-center">
                        <div className="flex flex-col gap-0.5 items-center">
                            <span className="text-[8px] font-black uppercase tracking-widest text-[#f2642e]/60">Precio unitario</span>
                            <div className="flex items-baseline gap-0.5 justify-center">
                                <span className={`text-sm font-black ${isOutOfStock ? 'text-slate-300' : 'text-slate-900'}`}>$</span>
                                <span className={`text-3xl font-[950] tracking-tighter leading-none ${isOutOfStock ? 'text-slate-300' : 'text-slate-900'}`}>
                                    {Number(product.price || 0).toLocaleString('es-CL')}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!isOutOfStock) onAdd(product);
                            }}
                            disabled={isOutOfStock}
                            className={`w-full h-12 rounded-2xl font-black uppercase italic text-[11px] tracking-[0.2em] transition-all duration-300 shadow-xl active:scale-95 flex items-center justify-center gap-2
                                ${isOutOfStock
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                    : 'bg-slate-900 text-white shadow-slate-100 hover:bg-[#f2642e]'
                                }`}
                        >
                            {isOutOfStock ? (
                                <>
                                    <AlertTriangle size={14} strokeWidth={3} />
                                    NO DISPONIBLE
                                </>
                            ) : (
                                <>
                                    <Plus size={16} strokeWidth={4} />
                                    AGREGAR
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
