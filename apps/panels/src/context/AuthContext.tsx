'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '../types';

import {
    loginWithGoogle as apiLoginWithGoogle,
    loginWithEmail as apiLoginWithEmail,
    registerUser as apiRegisterUser,
    updateUserProfile,
    verifyEmail as apiVerifyEmail,
    API_URL
} from '../services/api';

interface AuthContextType {
    user: User | null;
    isLoggedIn: boolean;
    isInitialized: boolean;
    loginWithGoogle: (token: string) => Promise<void>;
    loginWithEmail: (data: any) => Promise<void>;
    loginWithPin: (pin: string) => Promise<void>;
    register: (data: any) => Promise<any>;
    verifyEmail: (email: string, code: string) => Promise<void>;
    updateProfile: (data: any) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const storedUser = localStorage.getItem('lr_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setIsInitialized(true);

        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (clientId) {
            // Load Google Identity Services script
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            document.body.appendChild(script);

            return () => {
                document.body.removeChild(script);
            };
        }
    }, []);

    const loginWithGoogle = async (token: string) => {
        try {
            const { user: dbUser, accessToken } = await apiLoginWithGoogle(token);
            setUser(dbUser);
            localStorage.setItem('lr_user', JSON.stringify(dbUser));
            localStorage.setItem('lr_token', accessToken);
        } catch (error) {
            console.error('Auth Error:', error);
            throw error;
        }
    };

    const loginWithEmail = async (data: any) => {
        try {
            const { user: dbUser, accessToken } = await apiLoginWithEmail(data);
            setUser(dbUser);
            localStorage.setItem('lr_user', JSON.stringify(dbUser));
            localStorage.setItem('lr_token', accessToken);
        } catch (error) {
            throw error;
        }
    };

    const loginWithPin = async (pin: string) => {
        try {
            const res = await fetch(`${API_URL}/auth/pin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin })
            });

            if (!res.ok) throw new Error('PIN incorrecto');

            const { user: dbUser, accessToken } = await res.json();
            setUser(dbUser);
            localStorage.setItem('lr_user', JSON.stringify(dbUser));
            localStorage.setItem('lr_token', accessToken);
        } catch (error) {
            throw error;
        }
    };

    const register = async (data: any) => {
        try {
            // Register returns { user, accessToken, requiresVerification }
            const response = await apiRegisterUser(data);
            if (response.requiresVerification) {
                // Do not login yet, just return success
                return { requiresVerification: true, email: data.email };
            }
            // Auto login if no verification needed (legacy or optional)
            const { user: dbUser, accessToken } = response;
            setUser(dbUser);
            localStorage.setItem('lr_user', JSON.stringify(dbUser));
            localStorage.setItem('lr_token', accessToken);
            return { requiresVerification: false };
        } catch (error) {
            throw error;
        }
    };

    const verifyEmail = async (email: string, code: string) => {
        try {
            const { user: dbUser } = await apiVerifyEmail(email, code);
            // After verify, we assume we need to re-login or better yet, the API returns a fresh token?
            // For MVP, if verify returns user, let's allow "soft" login or ask user to login.
            // But let's check if the API returns a token on verification.
            // Our backend `verifyEmail` currently only returns { success: true, user: updated }.
            // So we might need to ask the user to login now or just auto-login if we stored the temp token?
            // Simplest UX: "Verified! Please login." 
            // Or better: update backend verify to return token. Let's assume we ask user to login for security.
        } catch (error) {
            throw error;
        }
    };

    const updateProfile = async (data: any) => {
        try {
            const token = localStorage.getItem('lr_token');
            if (!token) throw new Error('No auth token');

            const updatedUser = await updateUserProfile(token, data);
            // Merge response (API might return full user or just updated fields)
            const newUser = { ...user!, ...updatedUser };
            setUser(newUser);
            localStorage.setItem('lr_user', JSON.stringify(newUser));
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('lr_user');
        localStorage.removeItem('lr_token');
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, isLoggedIn: !!user, isInitialized, loginWithGoogle, loginWithEmail, loginWithPin, register, verifyEmail, updateProfile, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
