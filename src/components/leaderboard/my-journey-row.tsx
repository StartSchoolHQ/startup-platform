"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Coins, ListChecks, Zap } from "lucide-react";
import { RankIcon } from "@/components/leaderboard/rank-icon";
import { YouBadge } from "@/components/leaderboard/you-badge";
import { MyJourneyLeaderboardEntry } from "@/types/leaderboard";
import { economyLabels } from "@/lib/economy-labels";
import { cn } from "@/lib/utils";
import { leaderboardRowClass } from "@/components/leaderboard/row-styles";

export const MY_JOURNEY_GRID_COLUMNS = "80px 220px 1fr 1fr 1fr";

type OpenProfile = (userId: string) => void;

function StudentCell({
  entry,
  onOpenProfile,
}: {
  entry: MyJourneyLeaderboardEntry;
  onOpenProfile?: OpenProfile;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpenProfile?.(entry.user.userId)}
      aria-label={`View ${entry.user.name}'s profile`}
      className="hover:bg-muted/60 -mx-1.5 -my-1 flex min-w-0 items-center gap-3 rounded-md px-1.5 py-1 text-left"
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={entry.user.avatar} alt={entry.user.name} />
        <AvatarFallback className="text-xs">
          {entry.user.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium">{entry.user.name}</span>
        {entry.user.isCurrentUser && <YouBadge />}
      </div>
    </button>
  );
}

function Metric({
  icon: Icon,
  value,
  muted,
}: {
  icon: typeof Zap;
  value: number | string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon
        className={cn(
          "h-3.5 w-3.5",
          muted ? "text-muted-foreground" : "text-primary"
        )}
      />
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

/** One My Journey leaderboard row — desktop grid on sm+, card below. */
export function MyJourneyRow({
  entry,
  onOpenProfile,
}: {
  entry: MyJourneyLeaderboardEntry;
  onOpenProfile?: OpenProfile;
}) {
  const labels = economyLabels("my_journey");
  return (
    <>
      {/* Desktop row (sm+) */}
      <div className="hidden sm:block">
        <div
          className={leaderboardRowClass({
            highlighted: entry.user.isCurrentUser,
            rank: entry.rank,
            minWidthClass: "min-w-[640px]",
          })}
          style={{ gridTemplateColumns: MY_JOURNEY_GRID_COLUMNS }}
        >
          <div className="flex items-center gap-2">
            <RankIcon type={entry.rankIcon || "none"} rank={entry.rank} />
          </div>
          <StudentCell entry={entry} onOpenProfile={onOpenProfile} />
          <Metric icon={Zap} value={entry.xp.toLocaleString()} />
          <Metric icon={Coins} value={entry.credits.toLocaleString()} />
          <Metric icon={ListChecks} value={entry.tasks} muted />
        </div>
      </div>

      {/* Mobile card (<sm) */}
      <div
        className={cn(
          "border-border flex items-center gap-3 border-b border-l-2 border-l-transparent p-3 sm:hidden",
          entry.user.isCurrentUser && "bg-primary/5 border-l-primary"
        )}
      >
        <div className="flex min-w-[40px] items-center gap-2">
          <RankIcon type={entry.rankIcon || "none"} rank={entry.rank} />
        </div>
        <div className="min-w-0 flex-1">
          <StudentCell entry={entry} onOpenProfile={onOpenProfile} />
          <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-xs">
            <span className="flex items-center gap-1">
              <Zap className="text-primary h-3 w-3" />
              {entry.xp.toLocaleString()} {labels.xp}
            </span>
            <span className="flex items-center gap-1">
              <Coins className="text-primary h-3 w-3" />
              {entry.credits.toLocaleString()} {labels.points}
            </span>
            <span className="flex items-center gap-1">
              <ListChecks className="h-3 w-3" />
              {entry.tasks} tasks
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
