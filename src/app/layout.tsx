import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { Providers } from "@/components/providers";
import { HotjarScript } from "@/components/analytics/HotjarScript";
import { PostHogRouteGate } from "@/components/analytics/PostHogRouteGate";
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
          <Toaster />
          <Analytics />
          {/* Trackers are route-gated: NO_TRACK_PREFIXES (e.g. scholarship
              agreement pages) suppresses Hotjar load and forces PostHog
              opt-out. See `src/lib/analytics/no-track-routes.ts`. */}
          <HotjarScript />
          <PostHogRouteGate />
        </Providers>
      </body>
    </html>
  );
}
