'use client';

import { useEffect, useState } from 'react';

/** v=5: mismo tamaño en píxeles, JPEG más liviano. El navegador pide una sola por vez. */
const V = '5';

const SLIDES = [
  {
    id: 'acevichado',
    alt: 'Acevichado Lo Más Rico — ¡Un roll lleno de sabor!',
    desktop: `/assets/banners/acevichado-desktop.jpg?v=${V}`,
    mobile: `/assets/banners/acevichado-mobile.jpg?v=${V}`,
  },
  {
    id: 'ceviche',
    alt: 'Ceviche Tradicional — ¡Frescura que se disfruta!',
    desktop: `/assets/banners/ceviche-desktop.jpg?v=${V}`,
    mobile: `/assets/banners/ceviche-mobile.jpg?v=${V}`,
  },
  {
    id: 'gohan',
    alt: '¡Elige tu Gohan! — Tu próximo antojo está aquí',
    desktop: `/assets/banners/gohan-desktop.jpg?v=${V}`,
    mobile: `/assets/banners/gohan-mobile.jpg?v=${V}`,
  },
] as const;

const INTERVAL_MS = 5000;

export function BannerSection() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const slide = SLIDES[index];

  useEffect(() => {
    if (paused || SLIDES.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    const next = SLIDES[(index + 1) % SLIDES.length];
    const desktop = window.matchMedia('(min-width: 768px)').matches;
    const img = new Image();
    img.src = desktop ? next.desktop : next.mobile;
  }, [index]);

  return (
    <div
      className="w-full relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Una sola foto: la del tamaño de la pantalla y la que está en vista. */}
      <div className="w-full aspect-[3/2] md:aspect-[3/1] overflow-hidden bg-[#fff6ea] relative">
        <picture key={slide.id}>
          <source media="(min-width: 768px)" srcSet={slide.desktop} />
          <img
            src={slide.mobile}
            alt={slide.alt}
            width={1536}
            height={1024}
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 w-full h-full object-cover object-center animate-in fade-in duration-700"
          />
        </picture>
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
