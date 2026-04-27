'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

// ─── Types ─────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration: number;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (message: string, type?: ToastType, duration?: number) => void;
    removeToast: (id: string) => void;
}

// ─── Context ───────────────────────────────────────────────

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
};

// ─── Provider ──────────────────────────────────────────────

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        setToasts(prev => [...prev, { id, type, message, duration }]);
        setTimeout(() => removeToast(id), duration);
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={removeToast} />
        </ToastContext.Provider>
    );
};

// ─── Render ────────────────────────────────────────────────

const ICONS: Record<ToastType, string> = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
};

const COLORS: Record<ToastType, string> = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
};

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 max-w-sm">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-lg backdrop-blur-md animate-in slide-in-from-right fade-in duration-300 cursor-pointer ${COLORS[toast.type]}`}
                    onClick={() => onDismiss(toast.id)}
                    role="alert"
                >
                    <span className="text-lg shrink-0 mt-0.5">{ICONS[toast.type]}</span>
                    <p className="text-sm font-bold leading-snug">{toast.message}</p>
                </div>
            ))}
        </div>
    );
}
