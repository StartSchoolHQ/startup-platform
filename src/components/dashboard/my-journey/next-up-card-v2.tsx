import Link from "next/link";
import { ArrowRight, Compass, CreditCard, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { economyLabels } from "@/lib/economy-labels";
import { formatTaskCategory } from "@/lib/task-category-labels";
import { MyJourneyNextUpTask } from "@/types/dashboard";
import { SectionLabel } from "@/components/dashboard/my-journey/section-label";

const labels = economyLabels("my_journey");

interface NextUpCardProps {
  task: MyJourneyNextUpTask | null;
  totalTasks: number;
}

/**
 * The one task the student should pick up next — the focal card of the
 * row. The My Journey page has no task-preselect parameter, so the button
 * opens the list.
 */
export function NextUpCardV2({ task, totalTasks }: NextUpCardProps) {
  const category = formatTaskCategory(task?.category);

  return (
    <Card className="relative h-full gap-0 overflow-hidden py-0">
      {/* Soft accent glow — the one decorative element on the dashboard */}
      <div
        aria-hidden
        className="bg-primary/20 pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full blur-3xl"
      />

      <div className="relative flex h-full flex-col gap-5 p-5">
        <SectionLabel icon={Compass} title="Next up" />

        {task ? (
          <>
            <div className="flex flex-col gap-1.5">
              {category && (
                <span className="text-primary text-xs font-medium">
                  {category}
                </span>
              )}
              <h3 className="text-xl leading-snug font-semibold tracking-tight">
                {task.title}
              </h3>
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <RewardChip
                  icon={Zap}
                  value={task.xp_reward}
                  unit={labels.xp}
                />
                <RewardChip
                  icon={CreditCard}
                  value={task.points_reward}
                  unit={labels.points}
                />
              </div>
              <Button asChild size="sm" className="group">
                <Link href="/dashboard/my-journey">
                  Open My Journey
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground flex flex-1 items-center text-sm">
            {totalTasks === 0
              ? "Your first tasks will appear here soon."
              : "You've started everything that's available — nice work."}
          </p>
        )}
      </div>
    </Card>
  );
}

function RewardChip({
  icon: Icon,
  value,
  unit,
}: {
  icon: typeof Zap;
  value: number | null;
  unit: string;
}) {
  return (
    <span className="bg-muted/60 text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs">
      <Icon className="text-primary h-3.5 w-3.5" />
      <span className="text-foreground font-semibold tabular-nums">
        +{value ?? 0}
      </span>
      {unit}
    </span>
  );
}
