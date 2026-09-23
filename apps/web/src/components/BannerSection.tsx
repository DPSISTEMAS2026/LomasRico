'use client';

import { useState } from 'react';

const DESKTOP = '/assets/reabrimos-desktop.jpg?v=3';
const MOBILE = '/assets/reabrimos-mobile.jpg?v=2';

export function BannerSection() {
  const [loaded, setLoaded] = useState({ desktop: false, mobile: false });

  const handleLoad = (id: 'desktop' | 'mobile', ev: React.SyntheticEvent<HTMLImageElement>) => {
    setLoaded((prev) => ({ ...prev, [id]: true }));
    const img = ev.currentTarget;
    // #region agent log
    fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'banner-size',hypothesisId:'H-STRETCH',location:'BannerSection.tsx:onLoad',message:'banner render size',data:{id,naturalW:img.naturalWidth,naturalH:img.naturalHeight,clientW:img.clientWidth,clientH:img.clientHeight,scale:img.naturalWidth?Number((img.clientWidth/img.naturalWidth).toFixed(2)):null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
