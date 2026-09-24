'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function OverflowLock({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    useEffect(() => {
        const measure = () => {
            const doc = document.documentElement;
            const main = document.querySelector('main');
            const overflow = doc.scrollWidth > doc.clientWidth + 2;
            const mainOverflow = !!main && main.scrollWidth > main.clientWidth + 2;
            // #region agent log
            fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'site-xscroll',hypothesisId:mainOverflow?'H-TABLE':'H-X',location:'OverflowLock.tsx:panels',message:'panels page overflow',data:{path:pathname,scrollW:doc.scrollWidth,clientW:doc.clientWidth,innerW:window.innerWidth,overflow,mainClientW:main?.clientWidth||0,mainScrollW:main?.scrollWidth||0,mainOverflow},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
        };
        measure();
        const id = requestAnimationFrame(measure);
        window.addEventListener('resize', measure);
        return () => {
            cancelAnimationFrame(id);
            window.removeEventListener('resize', measure);
        };
    }, [pathname]);

    return <div className="min-w-0 max-w-full overflow-x-hidden">{children}</div>;
}
