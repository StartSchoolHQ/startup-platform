"use client";

import { Fragment } from "react";
import { AchievementCard } from "@/components/my-journey/achievement-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Economy } from "@/lib/economy-labels";

export type AchievementCardStatus = "in-progress" | "finished" | "not-started";

export interface AchievementsGridItem {
  achievement_id: string;
  achievement_name: string;
  status: string;
  points_reward: number;
  xp_reward: number;
  completed_tasks?: number;
  total_tasks?: number;
}

/** Per-card copy/status tweaks a page needs (Team Journey's "Recurring Tasks"). */
export interface AchievementCardOverride {
  description?: string;
  status?: AchievementCardStatus;
}

interface AchievementsGridProps {
  achievements: AchievementsGridItem[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  economy: Economy;
  emptyText: string;
  /** Locks every card: not selectable, dimmed, `lockedTooltip` on hover. */
  locked?: boolean;
  lockedTooltip?: string;
  lockedDescription?: string;
  cardOverride?: (
    achievement: AchievementsGridItem
  ) => AchievementCardOverride | undefined;
  /** Team Journey ships its own filter toolbar, so it hides the banner. */
  showFilterBanner?: boolean;
}

const GRID_CLASS = "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4";

function toCardStatus(status: string): AchievementCardStatus {
  return status === "completed"
    ? "finished"
    : (status as AchievementCardStatus);
}

function AchievementsGridSkeleton() {
  return (
    <div className={GRID_CLASS}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-lg border p-4">
          <Skeleton className="h-5 w-20 rounded-full" />
          <div className="flex items-start gap-2">
            <Skeleton className="h-12 w-12 shrink-0 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Achievement cards shared by My Journey and Team Journey: skeleton, empty
 * state, the selectable card grid and the "Showing tasks for" filter banner.
 */
export function AchievementsGrid({
  achievements,
  loading,
  selectedId,
  onSelect,
  economy,
  emptyText,
  locked = false,
  lockedTooltip,
  lockedDescription,
  cardOverride,
  showFilterBanner = true,
}: AchievementsGridProps) {
  if (loading) {
    return <AchievementsGridSkeleton />;
  }

  if (achievements.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">{emptyText}</div>
    );
  }

  const toggle = (achievementId: string) => {
    if (locked) return;
    onSelect(selectedId === achievementId ? null : achievementId);
  };

  const selectedName = achievements.find(
    (a) => a.achievement_id === selectedId
  )?.achievement_name;

  return (
    <div className="space-y-4">
      <div className={GRID_CLASS}>
        {achievements.map((achievement) => {
          const override = cardOverride?.(achievement);
          const isSelected =
            !locked && selectedId === achievement.achievement_id;

          const card = (
            <div
              onClick={() => toggle(achievement.achievement_id)}
              role={locked ? undefined : "button"}
              tabIndex={locked ? undefined : 0}
              onKeyDown={
                locked
                  ? undefined
                  : (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggle(achievement.achievement_id);
                      }
                    }
              }
              className={`rounded-xl transition-all duration-200 ${
                locked
                  ? "cursor-not-allowed opacity-60"
                  : "hover:ring-primary/30 focus-visible:ring-primary cursor-pointer hover:scale-[1.02] hover:ring-2 focus-visible:ring-2 focus-visible:outline-none"
              }`}
            >
              <AchievementCard
                economy={economy}
                title={achievement.achievement_name}
                description={
                  locked
                    ? (lockedDescription ?? "Locked")
                    : (override?.description ??
                      (isSelected
                        ? "Click to show all tasks"
                        : "Click to filter tasks"))
                }
                status={
                  locked
                    ? "not-started"
                    : (override?.status ?? toCardStatus(achievement.status))
                }
                points={achievement.points_reward}
                xp={achievement.xp_reward}
                completedTasks={achievement.completed_tasks}
                totalTasks={achievement.total_tasks}
                selected={isSelected}
              />
            </div>
          );

          if (locked && lockedTooltip) {
            return (
              <TooltipProvider key={achievement.achievement_id}>
                <Tooltip>
                  <TooltipTrigger asChild>{card}</TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">{lockedTooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }

          return <Fragment key={achievement.achievement_id}>{card}</Fragment>;
        })}
      </div>

      {showFilterBanner && !locked && selectedId && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-800">
              <span className="font-medium">Showing tasks for:</span>{" "}
              {selectedName}
            </div>
            <button
              onClick={() => onSelect(null)}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Show All Tasks
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
