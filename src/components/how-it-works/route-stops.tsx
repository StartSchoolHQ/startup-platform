import {
  CalendarClock,
  HelpCircle,
  KeyRound,
  Trophy,
  User,
  Users,
} from "lucide-react";
import type { JourneySettings } from "@/hooks/use-platform-settings";
import { economyLabels } from "@/lib/economy-labels";
import type { RouteStopData } from "@/components/how-it-works/route-stop";

const solo = economyLabels("my_journey");
const team = economyLabels("team");

/**
 * The programme as six stops, in the order a student meets them. Copy is
 * phase-aware: Team Journey reads as "later" while its switch is off, and
 * My Journey's own stop only appears while that phase is on.
 */
export function buildRouteStops(journeys: JourneySettings): RouteStopData[] {
  const stops: RouteStopData[] = [
    {
      id: "sign-in",
      icon: KeyRound,
      title: "Sign in with your StartSchool account",
      body: [
        "You sign in with Google using your @startschool.org address. There is no password to remember and no invitation to wait for.",
        "The first time in, you add your name and photo and answer four short questions about yourself. That becomes your founder card, which other students see on the leaderboard when they look you up.",
      ],
      links: [{ label: "Edit your profile", href: "/dashboard/account" }],
    },
  ];

  if (journeys.myJourney) {
    stops.push({
      id: "my-journey",
      icon: User,
      title: "Work through My Journey",
      body: [
        `My Journey is your solo preparation. It is a set of tasks grouped into phases. Open a task, do the work, write up what you did and submit it. An AI reviewer reads your submission against the task's criteria, usually within minutes, and either passes it or sends it back with feedback. You can resubmit as many times as it takes. Every approved task pays ${solo.xp}.`,
        "Phases open in order. Finish half of the tasks in a phase and the next one unlocks. The reading list is open from day one, so there is always something to pick up.",
      ],
      links: [{ label: "Open My Journey", href: "/dashboard/my-journey" }],
    });

    stops.push({
      id: "weekly-report",
      icon: CalendarClock,
      title: "File a short weekly report",
      body: [
        "Once a week you answer four questions: what you committed to, what got in the way, what you will do next week, and how aligned you feel with the programme. It takes a few minutes.",
        "The report is due Monday at 10:00 Riga time. From Friday a banner at the top of the page opens the form. There is no reward and no penalty attached to it. It exists so the people running the programme know how you are doing.",
      ],
    });
  }

  stops.push({
    id: "leaderboard",
    icon: Trophy,
    title: "See where you stand",
    body: [
      `The leaderboard ranks every student by ${solo.xp}. Open it to see how far along you are compared with the rest of the batch.`,
      "Click any row to open that student's founder card: their background, what energises them, the skills they bring and what they want a co-founder to cover. This is where you start finding the people you might build with.",
    ],
    links: [{ label: "Open the leaderboard", href: "/dashboard/leaderboard" }],
  });

  stops.push(
    journeys.teamJourney
      ? {
          id: "team-journey",
          icon: Users,
          title: "Build with your team",
          body: [
            `Team Journey is open. You work on team tasks with your team, review other teams' submissions in Peer Review, and earn ${team.xp} and ${team.points} together. ${team.xp} counts toward graduation.`,
          ],
          links: [
            { label: "All teams", href: "/dashboard/team-journey" },
            { label: "Peer Review", href: "/dashboard/peer-review" },
          ],
        }
      : {
          id: "team-journey",
          icon: Users,
          title: "Team Journey comes next",
          later: true,
          body: [
            `Later in the programme you form a team. From then on you take on team tasks, review other teams' work in Peer Review, and earn ${team.xp} and ${team.points} together. ${team.xp} counts toward graduation. Nothing to do here yet; it opens when the programme reaches that phase.`,
          ],
        }
  );

  stops.push({
    id: "support",
    icon: HelpCircle,
    title: "Stuck? Ask",
    body: [
      "If something is unclear, a task will not submit, or you simply do not know what to do next, write to us from the Support page. A real person reads it.",
    ],
    links: [{ label: "Go to Support", href: "/dashboard/support" }],
  });

  return stops;
}
