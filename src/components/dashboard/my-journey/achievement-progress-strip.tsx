import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MyJourneyAchievementProgress } from "@/types/dashboard";

const STATUS_BORDER: Record<MyJourneyAchievementProgress["status"], string> = {
  completed: "border-emerald-500/40",
  "in-progress": "border-amber-500/40",
  "not-started": "border-border",
};

/**
 * Horizontal strip of achievement completion. Each card deep-links into the
 * My Journey page with that achievement preselected, so the student lands on
 * the tasks that move the bar.
 */
export function AchievementProgressStrip({
  achievements,
}: {
  achievements: MyJourneyAchievementProgress[];
}) {
  if (achievements.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">Achievement progress</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {achievements.map((achievement) => {
          const percent =
            achievement.total_tasks > 0
              ? Math.round(
                  (achievement.completed_tasks / achievement.total_tasks) * 100
                )
              : 0;

          return (
            <Link
              key={achievement.achievement_id}
              href={`/dashboard/my-journey?achievement=${achievement.achievement_id}`}
              className="w-52 shrink-0"
            >
              <Card
                className={`h-full transition-shadow hover:shadow-md ${
                  STATUS_BORDER[achievement.status] ??
                  STATUS_BORDER["not-started"]
                }`}
              >
                <CardContent className="space-y-2 px-4">
                  <p className="line-clamp-2 text-sm font-medium">
                    {achievement.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {achievement.completed_tasks} of {achievement.total_tasks}{" "}
                    tasks
                  </p>
                  <Progress value={percent} />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
