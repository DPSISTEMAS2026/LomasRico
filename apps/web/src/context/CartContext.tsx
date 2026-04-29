'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CartItem } from '../types';

interface CartContextType {
    items: CartItem[];
    addToCart: (item: Omit<CartItem, 'tempId'>) => void;
    removeFromCart: (tempId: string) => void;
    updateQuantity: (tempId: string, quantity: number) => void;
    clearCart: () => void;
    total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [items, setItems] = useState<CartItem[]>([]);

    const addToCart = (newItem: Omit<CartItem, 'tempId'>) => {
        const tempId = Math.random().toString(36).substring(7);
        setItems(prev => [...prev, { ...newItem, tempId }]);
    };

    const removeFromCart = (tempId: string) => {
        setItems(prev => prev.filter(i => i.tempId !== tempId));
    };

    const updateQuantity = (tempId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(tempId);
            return;
        }
        setItems(prev => prev.map(item =>
            item.tempId === tempId ? { ...item, quantity } : item
        ));
    };

    const clearCart = () => {
        setItems([]);
    };

    const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    return (
        <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, total }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within a CartProvider');
    return context;
};
