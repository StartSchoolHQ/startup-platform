import Link from "next/link";
import { ArrowRight, Compass, CreditCard, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { economyLabels } from "@/lib/economy-labels";
import { formatTaskCategory } from "@/lib/task-category-labels";
import { MyJourneyNextUpTask } from "@/types/dashboard";
import { CardTitleRow } from "@/components/dashboard/my-journey/card-title-row";

const labels = economyLabels("my_journey");

interface NextUpCardProps {
  task: MyJourneyNextUpTask | null;
  totalTasks: number;
}

/**
 * The one task the student should pick up next. The My Journey page has no
 * task-preselect parameter, so the button simply opens it.
 */
export function NextUpCard({ task, totalTasks }: NextUpCardProps) {
  const category = formatTaskCategory(task?.category);

  return (
    <Card className="h-full">
      <CardTitleRow
        icon={Compass}
        title="Next up"
        aside={category ?? undefined}
      />
      <CardContent className="flex h-full flex-col">
        {task ? (
          <div className="bg-primary/5 flex flex-1 flex-col justify-between gap-4 rounded-lg border px-4 py-3">
            <p className="text-base leading-snug font-semibold">{task.title}</p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-muted-foreground flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <Zap className="text-primary h-4 w-4" />
                  <span className="text-foreground font-semibold">
                    +{task.xp_reward ?? 0}
                  </span>
                  {labels.xp}
                </span>
                <span className="flex items-center gap-1.5">
                  <CreditCard className="text-primary h-4 w-4" />
                  <span className="text-foreground font-semibold">
                    +{task.points_reward ?? 0}
                  </span>
                  {labels.points}
                </span>
              </div>
              <Button asChild size="sm">
                <Link href="/dashboard/my-journey">
                  Open My Journey
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            {totalTasks === 0
              ? "Your first tasks will appear here soon."
              : "You've started everything that's available — nice work."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
