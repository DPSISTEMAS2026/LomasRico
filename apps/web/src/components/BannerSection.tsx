'use client';

import { useState } from 'react';

const DESKTOP = '/assets/reabrimos-desktop.jpg?v=3';
const MOBILE = '/assets/reabrimos-mobile.jpg?v=2';

export function BannerSection() {
  const [loaded, setLoaded] = useState({ desktop: false, mobile: false });

  const handleLoad = (id: 'desktop' | 'mobile', ev: React.SyntheticEvent<HTMLImageElement>) => {
    setLoaded((prev) => ({ ...prev, [id]: true }));
    const img = ev.currentTarget;
  };

  return (
    <div className="w-full relative">
      <div className="hidden md:block w-full aspect-[1920/640] overflow-hidden bg-[#fff6ea]">
        <img
          src={DESKTOP}
          alt="Reabrimos"
          width={1920}
          height={640}
          className={`w-full h-full object-cover object-center transition-opacity duration-500 ${loaded.desktop ? 'opacity-100' : 'opacity-0'}`}
          onLoad={(e) => handleLoad('desktop', e)}
        />
      </div>
      <div className="block md:hidden w-full aspect-[1080/720] overflow-hidden bg-[#fff6ea]">
        <img
          src={MOBILE}
          alt="Reabrimos"
          width={1080}
          height={720}
          className={`w-full h-full object-cover object-center transition-opacity duration-500 ${loaded.mobile ? 'opacity-100' : 'opacity-0'}`}
          onLoad={(e) => handleLoad('mobile', e)}
        />
      </div>
    </div>
  );
}
