'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Banner Carousel — muestra hasta 4 banners rotativos.
 * 
 * Lee desde: GET /promotions/active-banners
 * Cada banner tiene desktop + mobile URL.
 * Auto-rotate cada 5s, swipeable en mobile.
 */

const FALLBACK_DESKTOP = '/assets/BANNER VERANO.png';
const FALLBACK_MOBILE = '/assets/bannerceviche_1741146109LpxLw3.png';

interface BannerSlide {
  id: string;
  title: string;
  code?: string;
  desktopUrl: string | null;
  mobileUrl: string | null;
  discountValue?: number;
  discountType?: string;
}

export function BannerSection() {
  const [slides, setSlides] = useState<BannerSlide[]>([]);
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchBanners() {
      try {
        const res = await fetch(`${API_URL}/promotions/active-banners`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return;
        const data: BannerSlide[] = await res.json();
        if (data.length > 0) setSlides(data);
      } catch {
        // Fallback silencioso
      }
    }
    fetchBanners();
  }, []);

  // Auto-rotate cada 5 segundos
  const slideCount = slides.length || 1;
  const nextSlide = useCallback(() => {
    setCurrent(prev => (prev + 1) % slideCount);
  }, [slideCount]);

  useEffect(() => {
    if (slideCount <= 1) return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide, slideCount]);

  const prevSlide = () => setCurrent(prev => (prev - 1 + slideCount) % slideCount);

  const handleLoad = (id: string) => {
    setLoaded(prev => ({ ...prev, [id]: true }));
  };

  // Fallback: si no hay banners dinámicos, mostrar los locales
  if (slides.length === 0) {
    return (
      <div className="w-full relative">
        <div className="hidden md:block w-full overflow-hidden">
          <img src={FALLBACK_DESKTOP} alt="Lo Más Rico" className="w-full object-cover h-[400px] lg:h-[500px] xl:h-[550px]" />
        </div>
        <div className="block md:hidden w-full overflow-hidden">
          <img src={FALLBACK_MOBILE} alt="Lo Más Rico" className="w-full object-cover min-h-[200px] max-h-[320px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative group">
      {/* ═══ CAROUSEL CONTAINER ═══ */}
      <div className="relative overflow-hidden">
        <div 
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div key={slide.id} className="w-full shrink-0 relative">
              {/* Desktop */}
              <div className="hidden md:block w-full overflow-hidden">
                <img
                  src={slide.desktopUrl || FALLBACK_DESKTOP}
                  alt={slide.title}
                  className={`w-full object-cover h-[400px] lg:h-[500px] xl:h-[550px] transition-opacity duration-500 ${loaded[`d-${slide.id}`] ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => handleLoad(`d-${slide.id}`)}
                  onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_DESKTOP; }}
                />
              </div>

              {/* Mobile */}
              <div className="block md:hidden w-full overflow-hidden">
                <img
                  src={slide.mobileUrl || slide.desktopUrl || FALLBACK_MOBILE}
                  alt={slide.title}
                  className={`w-full object-cover min-h-[200px] max-h-[320px] transition-opacity duration-500 ${loaded[`m-${slide.id}`] ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => handleLoad(`m-${slide.id}`)}
                  onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_MOBILE; }}
                />
              </div>

              {/* Badge de código (si tiene) */}
              {slide.code && slide.discountValue && slide.discountValue > 0 && (
                <div className="absolute bottom-4 left-4 md:bottom-8 md:left-8 bg-black/70 backdrop-blur-md px-4 py-2 md:px-6 md:py-3 rounded-2xl border border-white/10">
                  <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-orange-400">
                    Código
                  </p>
                  <p className="text-sm md:text-xl font-black text-white tracking-wider">
                    {slide.code}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Loading skeleton */}
        {!loaded[`d-${slides[current]?.id}`] && (
          <div className="absolute inset-0 bg-gradient-to-r from-orange-100 via-amber-50 to-cyan-50 animate-pulse hidden md:block" />
        )}
        {!loaded[`m-${slides[current]?.id}`] && (
          <div className="absolute inset-0 bg-gradient-to-r from-orange-100 via-amber-50 to-cyan-50 animate-pulse block md:hidden" />
        )}
      </div>

      {/* ═══ ARROWS (solo si hay >1 slide) ═══ */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 backdrop-blur-sm text-white p-2 md:p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
            aria-label="Banner anterior"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 backdrop-blur-sm text-white p-2 md:p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
            aria-label="Banner siguiente"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* ═══ DOTS ═══ */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 md:bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full transition-all duration-300 ${i === current ? 'bg-white w-6 md:w-8' : 'bg-white/40 hover:bg-white/70'}`}
              aria-label={`Banner ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
