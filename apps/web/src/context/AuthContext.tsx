'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

import {
    loginWithGoogle as apiLoginWithGoogle,
    loginWithEmail as apiLoginWithEmail,
    registerUser as apiRegisterUser,
    updateUserProfile,
    verifyEmail as apiVerifyEmail,
    changeUserPassword
} from '../services/api';

// Claves EXCLUSIVAS para la web de clientes.
// Son intencionalmente distintas a las del panel interno (lr_user / lr_token)
// para evitar que el login del staff se "cuele" en la sesión del cliente.
const STORAGE_KEY_USER = 'web_customer_user';
const STORAGE_KEY_TOKEN = 'web_customer_token';

interface AuthContextType {
    user: User | null;
    isLoggedIn: boolean;
    loginWithGoogle: (token: string) => Promise<void>;
    loginWithEmail: (data: any) => Promise<void>;
    register: (data: any) => Promise<any>;
    verifyEmail: (email: string, code: string) => Promise<void>;
    updateProfile: (data: any) => Promise<void>;
    changePassword: (data: any) => Promise<void>;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // LIMPIEZA DE SEGURIDAD: Borrar cualquier sesión del panel interno que 
        // haya quedado guardada en el navegador (lr_user / lr_token).
        // La web de clientes usa claves propias (web_customer_*) para estar aislada.
        localStorage.removeItem('lr_user');
        localStorage.removeItem('lr_token');

        // Leer SOLO desde las claves propias de la web
        const storedUser = localStorage.getItem(STORAGE_KEY_USER);
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem(STORAGE_KEY_USER);
            }
        }
        setLoading(false);

        // Load Google Identity Services script
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const loginWithGoogle = async (token: string) => {
        try {
            const { user: dbUser, accessToken } = await apiLoginWithGoogle(token);
            setUser(dbUser);
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(dbUser));
            localStorage.setItem(STORAGE_KEY_TOKEN, accessToken);
        } catch (error) {
            console.error('Auth Error:', error);
            throw error;
        }
    };

    const loginWithEmail = async (data: any) => {
        try {
            const { user: dbUser, accessToken } = await apiLoginWithEmail(data);
            setUser(dbUser);
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(dbUser));
            localStorage.setItem(STORAGE_KEY_TOKEN, accessToken);
        } catch (error) {
            throw error;
        }
    };

    const register = async (data: any) => {
        try {
            const response = await apiRegisterUser(data);
            if (response.requiresVerification) {
                return { requiresVerification: true, email: data.email };
            }
            const { user: dbUser, accessToken } = response;
            setUser(dbUser);
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(dbUser));
            localStorage.setItem(STORAGE_KEY_TOKEN, accessToken);
            return { requiresVerification: false };
        } catch (error) {
            throw error;
        }
    };

    const verifyEmail = async (email: string, code: string) => {
        try {
            await apiVerifyEmail(email, code);
        } catch (error) {
            throw error;
        }
    };

    const updateProfile = async (data: any) => {
        try {
            const token = localStorage.getItem(STORAGE_KEY_TOKEN);
            if (!token) throw new Error('No auth token');

            const updatedUser = await updateUserProfile(token, data);
            const newUser = { ...user!, ...updatedUser };
            setUser(newUser);
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
        } catch (error) {
            throw error;
        }
    };

    const changePassword = async (data: any) => {
        try {
            const token = localStorage.getItem(STORAGE_KEY_TOKEN);
            if (!token) throw new Error('No auth token');
            await changeUserPassword(token, data);
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY_USER);
        localStorage.removeItem(STORAGE_KEY_TOKEN);
    };

    return (
        <AuthContext.Provider value={{
            user,
            isLoggedIn: !!user,
            loginWithGoogle,
            loginWithEmail,
            register,
            verifyEmail,
            updateProfile,
            changePassword,
            logout,
            loading
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
