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
        title: "XP Balance",
        content:
          "This is your Experience Points (XP) balance. You earn XP by completing tasks, attending meetings, and contributing to your team. XP reflects your overall activity and growth on the platform — the more you do, the more XP you earn!",
        selector: "#onborda-xp-balance",
        side: "bottom",
        showControls: true,
        pointerPadding: 8,
        pointerRadius: 12,
      },
      {
        icon: "💳",
        title: "Points Balance",
        content:
          "Points are your startup capital. You earn them alongside XP from tasks and team activities. Points can be spent on unlocking premium features, resources, and rewards within the platform. Think of them as your in-platform currency!",
        selector: "#onborda-points-balance",
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
