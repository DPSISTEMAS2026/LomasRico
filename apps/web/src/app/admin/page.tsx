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
        router.replace('/');
    }, [router]);

    return (
        <div className="min-h-screen min-w-0 overflow-x-hidden flex items-center justify-center bg-slate-50">
            <Loader2 className="animate-spin text-orange-500" size={32} />
        </div>
    );
}
