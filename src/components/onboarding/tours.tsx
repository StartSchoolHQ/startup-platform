import type { Step } from "onborda";

interface Tour {
  tour: string;
  steps: Step[];
}

export const TOURS: Tour[] = [
  {
    tour: "dashboard-welcome",
    steps: [
      {
        icon: "⚡",
        title: "My Journey",
        content:
          "Your solo balance: My Journey XP and My Journey Credits, both earned by finishing solo tasks on your own.",
        selector: "#onborda-my-journey-balance",
        side: "bottom",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
      },
      {
        icon: "💳",
        title: "Team Journey",
        content:
          "Your startup balance: Team XP counts toward the 8,000 you need to graduate, and Team Points are the capital your team spends on its costs.",
        selector: "#onborda-team-journey-balance",
        side: "bottom",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
      },
    ],
  },
];

export const ONBOARDING_STORAGE_KEY = "onborda-completed-tours";

export function hasCompletedTour(tourName: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const completed = JSON.parse(
      localStorage.getItem(ONBOARDING_STORAGE_KEY) || "[]"
    );
    return completed.includes(tourName);
  } catch {
    return false;
  }
}

export function markTourCompleted(tourName: string): void {
  if (typeof window === "undefined") return;
  try {
    const completed = JSON.parse(
      localStorage.getItem(ONBOARDING_STORAGE_KEY) || "[]"
    );
    if (!completed.includes(tourName)) {
      completed.push(tourName);
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(completed));
    }
  } catch {
    // Silently fail if localStorage is unavailable
  }
}
