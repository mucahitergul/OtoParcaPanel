import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import AppLayout from "../components/AppLayout";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Oto Yedek Parça Panel",
  description: "Otomotiv yedek parça stok ve fiyat takip sistemi",
  keywords: "oto yedek parça, stok takip, fiyat karşılaştırma, otomotiv",
  authors: [{ name: "Oto Parça Panel" }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full">
      <body className={`${inter.variable} font-sans h-full antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <AppLayout>
              {children}
            </AppLayout>
            <Toaster 
              position="top-right" 
              richColors 
              closeButton
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'hsl(var(--background))',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))',
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
