"use client";

import { useEffect } from "react";
import { useOnborda } from "onborda";
import { hasCompletedTour } from "@/components/onboarding/tours";

/**
 * Automatically starts the dashboard welcome tour if the user hasn't completed it.
 * Place this component on the dashboard overview page.
 */
export function DashboardTourTrigger() {
  const { startOnborda, isOnbordaVisible } = useOnborda();

  useEffect(() => {
    // Don't start if tour is already visible or already completed
    if (isOnbordaVisible) return;

    const tourName = "dashboard-welcome";
    if (hasCompletedTour(tourName)) return;

    // Delay to let the dashboard stats cards render and animate in
    const timer = setTimeout(() => {
      startOnborda(tourName);
    }, 1500);

    return () => clearTimeout(timer);
    // Only run on mount — startOnborda is a stable callback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
