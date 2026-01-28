"use client";

import { AppProvider } from "@/contexts/app-context";
import { DashboardLayoutClient } from "../../components/dashboard-layout-client";
import { ErrorBoundary } from "@/components/error-boundary";

export function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <AppProvider>
        <DashboardLayoutClient>{children}</DashboardLayoutClient>
      </AppProvider>
    </ErrorBoundary>
  );
}