'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Banner responsive: desktop (panorámico) y mobile (cuadrado).
 * 
 * Prioridad:
 * 1. Busca banners dinámicos desde la API (/banners)
 * 2. Fallback: usa las imágenes locales de /assets/banners/
 * 
 * Para cambiar banners:
 * - Desde el panel admin → Marketing → Banners → Upload
 * - O reemplaza los archivos en public/assets/banners/
 */

// Fallback images (archivos locales en public/assets/)
const FALLBACK_DESKTOP = '/assets/BANNER VERANO.png';
const FALLBACK_MOBILE = '/assets/banners/1772586143454-493404764.png';

interface BannerData {
  name: string;
  url: string;
}

export function BannerSection() {
  const [desktopBanner, setDesktopBanner] = useState<string>(FALLBACK_DESKTOP);
  const [mobileBanner, setMobileBanner] = useState<string>(FALLBACK_MOBILE);
  const [loaded, setLoaded] = useState({ desktop: false, mobile: false });

  useEffect(() => {
    // Try to fetch dynamic banners from API
    async function fetchBanners() {
      try {
        const res = await fetch(`${API_URL}/banners`, { 
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return;
        
        const banners: BannerData[] = await res.json();
        
        if (banners.length >= 2) {
          // Convention: first = mobile/square, second = desktop/panoramic
          // Sort by size — larger one is desktop
          const sorted = [...banners].sort((a, b) => {
            // If name contains 'desktop' or 'mobile', use that
            const aIsDesktop = a.name.toLowerCase().includes('desktop') || a.name.toLowerCase().includes('panoram');
            const bIsDesktop = b.name.toLowerCase().includes('desktop') || b.name.toLowerCase().includes('panoram');
            if (aIsDesktop) return -1;
            if (bIsDesktop) return 1;
            return 0;
          });
          
          // Use larger file as desktop (panoramic), smaller as mobile
          setDesktopBanner(sorted[1]?.url || sorted[0]?.url || FALLBACK_DESKTOP);
          setMobileBanner(sorted[0]?.url || FALLBACK_MOBILE);
        } else if (banners.length === 1) {
          // Single banner — use for both
          setDesktopBanner(banners[0].url);
          setMobileBanner(banners[0].url);
        }
      } catch {
        // Silently fall back to local images
      }
    }

    fetchBanners();
  }, []);

  return (
    <div className="w-full">
      {/* ═══ DESKTOP BANNER (md+) ═══ */}
      {/* Dimensiones ideales: 1920x600px (panorámico) */}
      <div className="hidden md:block w-full overflow-hidden">
        <img
          src={desktopBanner}
          alt="Lo Más Rico — Premium Cevichería"
          className={`
            w-full object-cover h-[400px] lg:h-[500px] xl:h-[550px]
            transition-opacity duration-700
            ${loaded.desktop ? 'opacity-100' : 'opacity-0'}
          `}
          onLoad={() => setLoaded(prev => ({ ...prev, desktop: true }))}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (img.src !== FALLBACK_DESKTOP) {
              img.src = FALLBACK_DESKTOP;
            }
          }}
        />
        {!loaded.desktop && (
          <div className="absolute inset-0 bg-gradient-to-r from-orange-100 via-amber-50 to-cyan-50 animate-pulse" />
        )}
      </div>

      {/* ═══ MOBILE BANNER (<md) ═══ */}
      {/* Dimensiones ideales: 1080x1080px (cuadrado) o 1080x600px (landscape corto) */}
      <div className="block md:hidden w-full overflow-hidden">
        <img
          src={mobileBanner}
          alt="Lo Más Rico — Premium Cevichería"
          className={`
            w-full object-cover min-h-[200px] max-h-[320px]
            transition-opacity duration-700
            ${loaded.mobile ? 'opacity-100' : 'opacity-0'}
          `}
          onLoad={() => setLoaded(prev => ({ ...prev, mobile: true }))}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (img.src !== FALLBACK_MOBILE) {
              img.src = FALLBACK_MOBILE;
            }
          }}
        />
        {!loaded.mobile && (
          <div className="absolute inset-0 bg-gradient-to-r from-orange-100 via-amber-50 to-cyan-50 animate-pulse" />
        )}
      </div>
    </div>
  );
}
