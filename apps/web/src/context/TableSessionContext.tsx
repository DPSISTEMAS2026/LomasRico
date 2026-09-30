'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { API_URL } from '../services/api';

export type TableGuestSession = {
    tableNumber: string;
    id: string;
    name: string;
    claimToken: string;
};

export type SessionEnd = { reason: 'PAID' | 'REPLACED' | 'GONE'; name?: string } | null;

const STORAGE = 'lr_table_session';

type TableSessionContextType = {
    session: TableGuestSession | null;
    ready: boolean;
    sessionEnd: SessionEnd;
    save: (next: TableGuestSession) => void;
    clear: () => void;
    leaveTable: () => void;
};

const TableSessionContext = createContext<TableSessionContextType | undefined>(undefined);

export function TableSessionProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<TableGuestSession | null>(null);
    const [ready, setReady] = useState(false);
    const [sessionEnd, setSessionEnd] = useState<SessionEnd>(null);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.id && parsed?.tableNumber && parsed?.claimToken) {
                    setSession(parsed);
                }
            }
        } catch {
            localStorage.removeItem(STORAGE);
        }
        setReady(true);
    }, []);

    useEffect(() => {
        if (!session) return;
        fetch(`${API_URL}/public/tables/guests/${session.id}/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ claimToken: session.claimToken }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (!data.valid) {
                    setSessionEnd({ reason: data.reason || 'GONE', name: data.name });
                    setSession(null);
                    localStorage.removeItem(STORAGE);
                }
            })
            .catch(() => {});
    }, [session?.id, session?.claimToken]);

    const save = (next: TableGuestSession) => {
        setSessionEnd(null);
        setSession(next);
        localStorage.setItem(STORAGE, JSON.stringify(next));
    };

    const clear = () => {
        setSession(null);
        localStorage.removeItem(STORAGE);
    };

    const leaveTable = () => {
        setSessionEnd(null);
        clear();
        if (typeof window !== 'undefined') {
            window.location.href = '/';
        }
    };

    return (
        <TableSessionContext.Provider value={{ session, ready, sessionEnd, save, clear, leaveTable }}>
            {children}
        </TableSessionContext.Provider>
    );
}

export function useTableSession() {
    const context = useContext(TableSessionContext);
    if (!context) throw new Error('useTableSession must be used within a TableSessionProvider');
    return context;
}
