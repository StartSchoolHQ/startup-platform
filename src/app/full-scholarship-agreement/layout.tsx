import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "StartSchool Full Scholarship Agreement",
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
