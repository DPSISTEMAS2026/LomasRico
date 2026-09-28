'use client';

export default function OverflowLock({ children }: { children: React.ReactNode }) {
    return <div className="min-w-0 max-w-full overflow-x-hidden">{children}</div>;
}
