'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const ADMIN_KEY = 'lr_coming_soon_preview';

export default function AdminPreviewPage() {
    const router = useRouter();

    useEffect(() => {
        localStorage.setItem(ADMIN_KEY, '1');
        sessionStorage.setItem(ADMIN_KEY, '1');
        // #region agent log
        fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'coming-soon',hypothesisId:'H-ADMIN',location:'admin/page.tsx',message:'admin preview unlocked',data:{path:'/admin'},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        router.replace('/');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="animate-spin text-orange-500" size={32} />
        </div>
    );
}
