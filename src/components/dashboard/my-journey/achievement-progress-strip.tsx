import Link from "next/link";
import { Check, ChevronRight, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MyJourneyAchievementProgress } from "@/types/dashboard";
import { CardTitleRow } from "@/components/dashboard/my-journey/card-title-row";

const RING_SIZE = 40;
const RING_STROKE = 3.5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ProgressRing({
  percent,
  completed,
}: {
  percent: number;
  completed: boolean;
}) {
  const offset = RING_CIRCUMFERENCE * (1 - Math.min(percent, 100) / 100);

  return (
    <div
      className="relative shrink-0"
      style={{ width: RING_SIZE, height: RING_SIZE }}
    >
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={RING_STROKE}
          className="stroke-muted"
        />
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          className={cn(
            "transition-[stroke-dashoffset] duration-500",
            completed ? "stroke-green-500" : "stroke-primary"
          )}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums">
        {completed ? (
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
        ) : (
          `${percent}%`
        )}
      </span>
    </div>
  );
}

/**
 * Achievement completion for the solo economy. Each row deep-links into the
 * My Journey page with that achievement preselected, so the student lands on
 * the tasks that move the ring.
 */
export function AchievementProgressStrip({
  achievements,
}: {
  achievements: MyJourneyAchievementProgress[];
}) {
  if (achievements.length === 0) return null;

  const unlocked = achievements.filter((a) => a.status === "completed").length;

  return (
    <Card>
      <CardTitleRow
        icon={Trophy}
        title="Achievement progress"
        aside={`${unlocked} of ${achievements.length} unlocked`}
      />
      <CardContent>
        <ul className="grid gap-2 md:grid-cols-2">
          {achievements.map((achievement) => {
            const completed = achievement.status === "completed";
            const percent =
              achievement.total_tasks > 0
                ? Math.round(
                    (achievement.completed_tasks / achievement.total_tasks) *
                      100
                  )
                : 0;

            return (
              <li key={achievement.achievement_id}>
                <Link
                  href={`/dashboard/my-journey?achievement=${achievement.achievement_id}`}
                  className="group hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-primary flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <ProgressRing percent={percent} completed={completed} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {achievement.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {completed
                        ? "Unlocked"
                        : `${achievement.completed_tasks} of ${achievement.total_tasks} tasks`}
                    </p>
                  </div>
                  <ChevronRight className="text-muted-foreground group-hover:text-primary h-4 w-4 shrink-0 transition-all group-hover:translate-x-0.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
