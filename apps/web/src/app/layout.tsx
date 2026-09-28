import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "LoMasRico | Cevichería & Más",
  description: "Los mejores ceviches y empanadas preparados al momento.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
    ],
    apple: { url: "/apple-icon.png", sizes: "180x180" },
  },
};

import { AuthProvider } from "../context/AuthContext";
import { TableSessionProvider } from "../context/TableSessionContext";
import CookieBanner from "../components/common/CookieBanner";
import ComingSoonGate from "../components/common/ComingSoonGate";
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
          <TableSessionProvider>
            <OverflowLock>
              <ComingSoonGate>
                {children}
                <CookieBanner />
              </ComingSoonGate>
            </OverflowLock>
          </TableSessionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
