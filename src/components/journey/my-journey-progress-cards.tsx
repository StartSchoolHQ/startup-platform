import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/dashboard/my-journey/section-label";
import { economyLabels } from "@/lib/economy-labels";
import { Info, Sparkles, TrendingUp, Users, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface MyJourneyProgressCardsProps {
  completed: number;
  total: number;
}

/**
 * "Progress" + "How My Journey works" under the My Journey stats grid, in the
 * same visual language as the dashboard's Next up / Continue cards: quiet
 * label, one big focal number, soft accent glow, small tiles for the steps.
 */
export function MyJourneyProgressCards({
  completed,
  total,
}: MyJourneyProgressCardsProps) {
  const solo = economyLabels("my_journey");
  const team = economyLabels("team");
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = Math.max(total - completed, 0);

  const steps: { icon: LucideIcon; title: string; text: string }[] = [
    {
      icon: Zap,
      title: "Earn as you go",
      text: `Every solo task you finish pays out ${solo.xp} and ${solo.points}.`,
    },
    {
      icon: TrendingUp,
      title: "Your pace, your order",
      text: "Pick any task, finish it, and the phase rings above fill up.",
    },
    {
      icon: Users,
      title: "Team Journey comes later",
      text: `It opens later in the programme. The ${team.xp} you earn there counts toward graduation.`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="gap-0 py-0">
        <div className="flex h-full flex-col gap-5 p-5">
          <SectionLabel
            icon={Sparkles}
            title="Progress"
            aside={`${percent}% complete`}
          />

          <div className="flex flex-1 items-end gap-2">
            <span className="text-4xl leading-none font-semibold tracking-tight tabular-nums">
              {completed}
            </span>
            <span className="text-muted-foreground pb-0.5 text-sm">
              of {total} solo tasks finished
            </span>
          </div>

          <div className="space-y-2">
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              {remaining === 0 && total > 0
                ? "Everything finished — nice work."
                : `${remaining} to go.`}
            </p>
          </div>
        </div>
      </Card>

      <Card className="gap-0 py-0">
        <div className="flex h-full flex-col gap-4 p-5">
          <SectionLabel icon={Info} title="How My Journey works" />
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
    </div>
  );
}
