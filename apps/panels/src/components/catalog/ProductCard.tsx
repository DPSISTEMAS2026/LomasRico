'use client';

import { useRef } from 'react';
import { Product } from '../../types';
import { Plus } from 'lucide-react';

interface ProductCardProps {
    product: Product;
    onAdd: (product: Product) => void;
}

export const ProductCard = ({ product, onAdd }: ProductCardProps) => {
    // We use the imageUrl from the catalog which now points to the real filename
    const displayImage = product.imageUrl || `/assets/Logo Restaurante.png`;

    // Check if product has a dynamic video from DB, or legacy local video
    const legacyVideoNames = ['Ceviche LoMASRico 350g', 'Ceviche LoMASRico 500g', 'Ceviche LoMASRico 750g'];
    const hasVideo = !!product.hoverVideoUrl || legacyVideoNames.includes(product.name);
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
            className="bg-white rounded-[2.5rem] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all duration-500 group border border-slate-50 hover:border-orange-100 flex flex-col h-full animate-in fade-in zoom-in duration-700"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Image Container - Focused on Product */}
            <div className="relative aspect-square overflow-hidden bg-slate-50">
                <img
                    src={displayImage}
                    alt={product.name}
                    className={`w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 ${hasVideo ? 'group-hover:opacity-0' : ''}`}
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
                {product.category === 'PROMOS' && (
                    <div className="absolute top-6 left-6 bg-[#f2642e] text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-xl shadow-orange-500/30">
                        PROMO
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="p-6 flex flex-col flex-grow">
                <div className="flex-grow">
                    <h3 className="font-black text-xl italic tracking-tighter uppercase leading-[0.9] text-slate-800 mb-3 group-hover:text-[#f2642e] transition-colors">
                        {product.name}
                    </h3>

                    <p className="text-slate-400 text-sm font-medium leading-relaxed mb-6">
                        {product.description}
                    </p>
                </div>

                <div className="flex items-center justify-between mt-auto">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#f2642e] mb-0.5">Precio</span>
                        <span className="text-slate-900 font-black text-2xl tracking-tighter leading-none">
                            ${(product.price || 0).toLocaleString('es-CL')}
                        </span>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent card clicks if we implement detail view later
                            onAdd(product);
                        }}
                        className="w-11 h-11 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-[#f2642e] transition-all duration-500 shadow-lg shadow-slate-200 active:scale-90 group/btn transform hover:rotate-90"
                    >
                        <Plus size={22} className="stroke-[3]" />
                    </button>
                </div>
            </div>
        </div>
    );
};
