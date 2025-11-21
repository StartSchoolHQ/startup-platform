"use client";

import { AppProvider } from "@/contexts/app-context";
import { DashboardLayoutClient } from "../../components/dashboard-layout-client";

export function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProvider>
      <DashboardLayoutClient>{children}</DashboardLayoutClient>
    </AppProvider>
  );
}
