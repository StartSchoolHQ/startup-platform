import Link from "next/link";
import { Compass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { economyLabels } from "@/lib/economy-labels";
import { MyJourneyNextUpTask } from "@/types/dashboard";

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
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Compass className="text-primary h-5 w-5" />
        <CardTitle className="text-lg">Next up</CardTitle>
      </CardHeader>
      <CardContent>
        {task ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm font-medium">{task.title}</p>
            {task.category && (
              <Badge variant="secondary">{task.category}</Badge>
            )}
            <p className="text-muted-foreground text-xs">
              +{task.xp_reward ?? 0} {labels.xp} · +{task.points_reward ?? 0}{" "}
              {labels.points}
            </p>
            <Button asChild size="sm">
              <Link href="/dashboard/my-journey">Open My Journey</Link>
            </Button>
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
