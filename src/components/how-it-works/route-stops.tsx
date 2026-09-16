import { CalendarClock, MessageSquarePlus, Trophy, User } from "lucide-react";
import type { JourneySettings } from "@/hooks/use-platform-settings";
import type { RouteStopData } from "@/components/how-it-works/route-stop";

/**
 * The programme as stops, in the order a student meets them. Copy is
 * owned by the programme team (2026-09-16 version); the two My Journey
 * stops only appear while that phase is on.
 */
export function buildRouteStops(journeys: JourneySettings): RouteStopData[] {
  const stops: RouteStopData[] = [];

  if (journeys.myJourney) {
    stops.push({
      id: "my-journey",
      icon: User,
      title: "Work through My Journey",
      body: [
        "Explore your My Journey tasks, develop your individual skills, and track your progress throughout the programme.",
      ],
      links: [{ label: "Open My Journey", href: "/dashboard/my-journey" }],
    });

    stops.push({
      id: "weekly-report",
      icon: CalendarClock,
      title: "Submit your Weekly Report",
      body: [
        "Submit your mandatory weekly report to reflect on what you've accomplished, identify your main focus areas, and recognise any challenges or bottlenecks. It's an opportunity to understand your progress and make the most of your journey.",
        "Due every Monday at 10:00 (Riga time). A banner opens the form from Friday onward.",
      ],
    });
  }

  stops.push({
    id: "leaderboard",
    icon: Trophy,
    title: "Track your progress on the Leaderboard",
    body: [
      "Check the leaderboard to see how your progress compares with your peers. Earn points, move up the rankings, and get closer to unlocking rewards.",
    ],
    links: [{ label: "Open Leaderboard", href: "/dashboard/leaderboard" }],
  });

  stops.push({
    id: "feedback",
    icon: MessageSquarePlus,
    highlight: true,
    title: "Help Us Improve the Platform!",
    body: [
      "Your ideas can make a difference. Suggest new tasks you'd like to see in My Journey, report bugs, or share your ideas for improving the user experience.",
      "If your suggestion is implemented, you'll earn additional points that bring you closer to unlocking rewards.",
    ],
    links: [{ label: "Submit Your Feedback", href: "/dashboard/support" }],
  });

  return stops;
}
