import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { Providers } from "@/components/providers";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StartSchool Startup Module",
  description: "StartSchool learning platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Hotjar/ContentSquare Tracking Code - Production Only */}
        {process.env.NEXT_PUBLIC_HOTJAR_SCRIPT_URL &&
          process.env.NODE_ENV === "production" && (
            <Script
              id="hotjar"
              src={process.env.NEXT_PUBLIC_HOTJAR_SCRIPT_URL}
              strategy="beforeInteractive"
            />
          )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
          <Toaster />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
