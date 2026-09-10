import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Medal,
  Zap,
} from "lucide-react";
import { economyLabels, type Economy } from "@/lib/economy-labels";

interface AchievementCardProps {
  title: string;
  /** Optional supporting line under the title. */
  description?: string;
  status: "in-progress" | "finished" | "not-started";
  points: number;
  xp: number;
  /** Which economy the rewards belong to — drives the reward labels. */
  economy: Economy;
  selected?: boolean;
  completedTasks?: number;
  totalTasks?: number;
  /**
   * Footer call-to-action ("Show tasks"). Omit for cards that can't be
   * clicked (locked) so the footer disappears with the affordance.
   */
  actionLabel?: string;
  /** `achievements.color_theme` — gives each phase its own tile colour. */
  colorTheme?: string | null;
}

/** Tile colours per `achievements.color_theme`; anything unknown is neutral. */
const THEME_TILE: Record<string, string> = {
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  green: "bg-green-500/10 text-green-600 dark:text-green-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  teal: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
};

const STATUS_TEXT = {
  "in-progress": {
    text: "In progress",
    className: "text-orange-600 dark:text-orange-400",
  },
  finished: {
    text: "Finished",
    className: "text-green-600 dark:text-green-400",
  },
  "not-started": { text: "Not started", className: "text-muted-foreground" },
} as const;

export function AchievementCard({
  title,
  description,
  status,
  points,
  xp,
  economy,
  selected = false,
  completedTasks,
  totalTasks,
  actionLabel,
  colorTheme,
}: AchievementCardProps) {
  const labels = economyLabels(economy);
  const statusMeta = STATUS_TEXT[status];
  // A finished achievement reads as complete even if its recurring tasks
  // (which cycle back after their cooldown) are not all approved right now.
  const finished = status === "finished";
  const hasProgress = totalTasks != null && totalTasks > 0;
  const percent = finished
    ? 100
    : hasProgress
      ? Math.round(((completedTasks ?? 0) / totalTasks) * 100)
      : 0;
  const tileClass = finished
    ? "bg-green-500/10 text-green-600 dark:text-green-400"
    : (THEME_TILE[colorTheme ?? ""] ?? "bg-muted text-foreground");
  const Icon = finished ? CheckCircle2 : Medal;

  return (
    <Card
      className={cn(
        "group bg-card relative flex h-full flex-col gap-0 overflow-hidden p-0 transition-all duration-200",
        selected
          ? "border-primary ring-primary/20 shadow-md ring-2"
          : "hover:border-primary/40 hover:shadow-sm"
      )}
    >
      <div className="flex flex-1 flex-col px-4 pt-4 pb-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              tileClass
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base leading-tight font-semibold">{title}</h3>
            <p className={cn("mt-1 text-xs font-medium", statusMeta.className)}>
              {statusMeta.text}
              {hasProgress &&
                !finished &&
                ` · ${completedTasks ?? 0} of ${totalTasks} tasks`}
            </p>
          </div>
        </div>

        {description && (
          <p className="text-muted-foreground mt-3 line-clamp-2 text-sm">
            {description}
          </p>
        )}

        {hasProgress && (
          <div className="bg-muted mt-4 h-1.5 w-full overflow-hidden rounded-full">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                finished ? "bg-green-500" : "bg-primary"
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
        )}

        <div className="text-muted-foreground mt-auto flex items-center gap-4 pt-4 text-xs">
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            <span className="text-foreground font-semibold tabular-nums">
              {xp}
            </span>
            {labels.xp}
          </span>
          <span className="flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            <span className="text-foreground font-semibold tabular-nums">
              {points}
            </span>
            {labels.points}
          </span>
        </div>
      </div>

      {actionLabel && (
        <div
          className={cn(
            "flex items-center justify-between border-t px-4 py-2.5 text-sm font-medium transition-colors",
            selected
              ? "bg-primary text-primary-foreground border-primary"
              : "text-muted-foreground group-hover:text-primary group-hover:bg-primary/5"
          )}
        >
          {actionLabel}
          <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </div>
      )}
    </Card>
  );
}
