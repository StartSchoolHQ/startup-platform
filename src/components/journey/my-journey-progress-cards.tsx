import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { economyLabels } from "@/lib/economy-labels";
import { Info, Trophy } from "lucide-react";

interface MyJourneyProgressCardsProps {
  completed: number;
  total: number;
}

/** "Progress" + "How My Journey works" cards under the My Journey stats grid. */
export function MyJourneyProgressCards({
  completed,
  total,
}: MyJourneyProgressCardsProps) {
  const solo = economyLabels("my_journey");
  const team = economyLabels("team");
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
              <Trophy className="h-4 w-4 text-black dark:text-white" />
            </div>
            <CardTitle className="text-lg font-semibold">Progress</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">
              {completed}/{total}
            </span>
            <span className="text-muted-foreground text-sm">
              {percent}% complete
            </span>
          </div>
          <Progress value={percent} />
          <p className="text-muted-foreground text-xs">
            Solo tasks completed so far.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
              <Info className="h-4 w-4 text-black dark:text-white" />
            </div>
            <CardTitle className="text-lg font-semibold">
              How My Journey works
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-sm">
            <li>
              Every solo task you finish pays out {solo.xp} and {solo.points}.
            </li>
            <li>
              Team Journey opens later in the programme — the {team.xp} you earn
              there is what counts toward graduation.
            </li>
            <li>
              No weekly reports live here; reporting starts once Team Journey
              opens.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
