'use client';

import { useEffect, useState } from 'react';

const SLIDES = [
  {
    id: 'acevichado',
    alt: 'Acevichado Lo Más Rico — ¡Un roll lleno de sabor!',
    desktop: '/assets/banners/acevichado-desktop.jpg',
    mobile: '/assets/banners/acevichado-mobile.jpg',
  },
  {
    id: 'ceviche',
    alt: 'Ceviche Tradicional — ¡Frescura que se disfruta!',
    desktop: '/assets/banners/ceviche-desktop.jpg',
    mobile: '/assets/banners/ceviche-mobile.jpg',
  },
  {
    id: 'gohan',
    alt: '¡Elige tu Gohan! — Tu próximo antojo está aquí',
    desktop: '/assets/banners/gohan-desktop.jpg',
    mobile: '/assets/banners/gohan-mobile.jpg',
  },
] as const;

const INTERVAL_MS = 5000;

export function BannerSection() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || SLIDES.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [paused]);

  return (
    <div
      className="w-full relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Escritorio */}
      <div className="hidden md:block w-full aspect-[3/1] overflow-hidden bg-[#fff6ea] relative">
        {SLIDES.map((slide, i) => (
          <img
            key={`d-${slide.id}`}
            src={slide.desktop}
            alt={slide.alt}
            width={1920}
            height={640}
            decoding={i === 0 ? 'sync' : 'async'}
            fetchPriority={i === 0 ? 'high' : 'low'}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ${
              i === index ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          />
        ))}
      </div>

      {/* Móvil / web */}
      <div className="block md:hidden w-full aspect-[3/2] overflow-hidden bg-[#fff6ea] relative">
        {SLIDES.map((slide, i) => (
          <img
            key={`m-${slide.id}`}
            src={slide.mobile}
            alt={slide.alt}
            width={1080}
            height={720}
            decoding={i === 0 ? 'sync' : 'async'}
            fetchPriority={i === 0 ? 'high' : 'low'}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ${
              i === index ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          />
        ))}
      </div>

      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-10">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            aria-label={`Banner ${i + 1}: ${slide.alt}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
            className={`h-2 rounded-full transition-all ${
              i === index ? 'w-6 bg-[#f2642e]' : 'w-2 bg-white/80 hover:bg-white'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
