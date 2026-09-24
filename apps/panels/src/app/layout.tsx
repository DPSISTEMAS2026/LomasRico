import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "LomasRico PRO | Gestión Unificada",
  description: "Terminal de operaciones, cocina y auditoría estratégica.",
};

import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../context/ToastContext";
import OverflowLock from "../components/common/OverflowLock";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${outfit.variable} font-sans antialiased bg-white overflow-x-hidden`}>
        <AuthProvider>
          <ToastProvider>
            <OverflowLock>
              {children}
            </OverflowLock>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
