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
};

import { AuthProvider } from "../context/AuthContext";
import { TableSessionProvider } from "../context/TableSessionContext";
import CookieBanner from "../components/common/CookieBanner";
import ComingSoonGate from "../components/common/ComingSoonGate";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${outfit.variable} font-sans antialiased bg-white`}>
        <AuthProvider>
          <TableSessionProvider>
            <ComingSoonGate>
              {children}
              <CookieBanner />
            </ComingSoonGate>
          </TableSessionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
