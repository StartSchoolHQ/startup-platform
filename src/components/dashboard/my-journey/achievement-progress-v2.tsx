import Link from "next/link";
import { Check, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MyJourneyAchievementProgress } from "@/types/dashboard";
import { SectionLabel } from "@/components/dashboard/my-journey/section-label";

const RING_SIZE = 56;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function PhaseRing({
  percent,
  completed,
  active,
}: {
  percent: number;
  completed: boolean;
  active: boolean;
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
            "transition-[stroke-dashoffset] duration-700 ease-out",
            completed ? "stroke-green-500" : "stroke-primary"
          )}
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums",
          !completed && !active && "text-muted-foreground"
        )}
      >
        {completed ? (
          <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
        ) : (
          `${percent}%`
        )}
      </span>
    </div>
  );
}

/**
 * The six My Journey phases as a track, in programme order. Each phase is a
 * link into the My Journey page with that achievement preselected. The
 * first phase with unfinished tasks is the "active" one and reads darker.
 */
export function AchievementProgressV2({
  achievements,
}: {
  achievements: MyJourneyAchievementProgress[];
}) {
  if (achievements.length === 0) return null;

  const unlocked = achievements.filter((a) => a.status === "completed").length;
  const activeIndex = achievements.findIndex((a) => a.status !== "completed");

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-5 p-5">
        <SectionLabel
          icon={Trophy}
          title="Achievement progress"
          aside={`${unlocked} of ${achievements.length} unlocked`}
        />

        <ol className="grid grid-cols-2 gap-x-2 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
          {achievements.map((achievement, index) => {
            const completed = achievement.status === "completed";
            const active = index === activeIndex;
            const percent =
              achievement.total_tasks > 0
                ? Math.round(
                    (achievement.completed_tasks / achievement.total_tasks) *
                      100
                  )
                : 0;

            return (
              <li key={achievement.achievement_id} className="relative">
                {/* Track segment to the next phase (hidden on the last one and
                    when the grid wraps below lg). */}
                {index < achievements.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-7 left-1/2 hidden h-0.5 w-full -translate-y-1/2 lg:block",
                      completed ? "bg-green-500/60" : "bg-border"
                    )}
                    style={{ marginLeft: RING_SIZE / 2 }}
                  />
                )}
                <Link
                  href={`/dashboard/my-journey?achievement=${achievement.achievement_id}`}
                  className="group focus-visible:ring-primary relative flex flex-col items-center gap-2.5 rounded-xl text-center focus-visible:ring-2 focus-visible:outline-none"
                >
                  <div className="bg-card rounded-full p-0.5 transition-transform group-hover:scale-105">
                    <PhaseRing
                      percent={percent}
                      completed={completed}
                      active={active}
                    />
                  </div>
                  <div className="min-w-0 px-1">
                    <p
                      className={cn(
                        "line-clamp-2 text-xs leading-tight font-medium",
                        !completed && !active && "text-muted-foreground"
                      )}
                    >
                      {achievement.name}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-[11px] tabular-nums">
                      {completed
                        ? "Unlocked"
                        : `${achievement.completed_tasks}/${achievement.total_tasks} tasks`}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </Card>
  );
}
