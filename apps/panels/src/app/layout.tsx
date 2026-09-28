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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
    ],
    apple: { url: "/apple-icon.png", sizes: "180x180" },
  },
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
