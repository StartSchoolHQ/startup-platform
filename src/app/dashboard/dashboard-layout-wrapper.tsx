"use client";

import { AppProvider } from "@/contexts/app-context";
import { DashboardLayoutClient } from "../../components/dashboard-layout-client";
import { ErrorBoundary } from "@/components/error-boundary";
// Onborda disabled temporarily — uncomment to re-enable
// import { OnbordaProvider, Onborda } from "onborda";
// import { TOURS } from "@/components/onboarding/tours";
// import { TourCard } from "@/components/onboarding/tour-card";

export function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <AppProvider>
        {/* Onborda disabled temporarily — unwrap to re-enable */}
        <DashboardLayoutClient>{children}</DashboardLayoutClient>
      </AppProvider>
    </ErrorBoundary>
  );
}