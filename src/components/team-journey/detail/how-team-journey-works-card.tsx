import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/dashboard/my-journey/section-label";
import { economyLabels } from "@/lib/economy-labels";
import { MEETINGS_TO_UNLOCK } from "@/hooks/use-team-detail";
import { CalendarClock, Handshake, Info, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * "How Team Journey works" — the team twin of HowMyJourneyWorksCard.
 * Answers Sasha's SMP-14: a first visit could not tell team tasks from
 * team activities, or Team XP from Team Points.
 */
export function HowTeamJourneyWorksCard() {
  const team = economyLabels("team");

  const steps: { icon: LucideIcon; title: string; text: string }[] = [
    {
      icon: Zap,
      title: "Tasks and activities",
      text: `Team tasks pay ${team.xp} and ${team.points} to the whole team. Meetings and weekly reports pay too. ${team.points} are what a team spends; ${team.xp} only grows.`,
    },
    {
      icon: Handshake,
      title: "Meetings open the tasks",
      text: `Log ${MEETINGS_TO_UNLOCK} client meetings and the task phases unlock. Until then, talk to customers.`,
    },
    {
      icon: CalendarClock,
      title: "Report every Monday",
      text: "Each member sends the team weekly report by Monday 10:00 Riga time. A missed report is a strike.",
    },
  ];

  return (
    <Card className="h-full gap-0 py-0">
      <div className="flex h-full flex-col gap-4 p-5">
        <SectionLabel icon={Info} title="How Team Journey works" />
        <ol className="grid flex-1 gap-2 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="bg-muted/40 flex flex-col gap-2 rounded-xl p-3"
            >
              <span className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-full">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <p className="text-sm leading-tight font-medium">{title}</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {text}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}
