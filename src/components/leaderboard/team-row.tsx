"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Gem, Handshake, ListChecks, Zap } from "lucide-react";
import { RankIcon } from "@/components/leaderboard/rank-icon";
import { YouBadge } from "@/components/leaderboard/you-badge";
import { ChangeIndicator } from "@/components/leaderboard/change-indicator";
import { ChangeValue } from "@/components/leaderboard/change-value";
import { TeamLeaderboardEntry } from "@/types/leaderboard";
import { useCountUp } from "@/hooks/use-count-up";
import { economyLabels } from "@/lib/economy-labels";
import { leaderboardRowClass } from "@/components/leaderboard/row-styles";

export const TEAM_GRID_COLUMNS = "80px 200px 1fr 1fr 1fr 1fr 100px";

/** Desktop row of the teams board. */
export function TeamRow({
  entry,
  index,
}: {
  entry: TeamLeaderboardEntry;
  index: number;
}) {
  const animatedXP = useCountUp(entry.xp.current, 800);
  const animatedPts = useCountUp(entry.points.current, 800);
  const animatedTasks = useCountUp(entry.tasks.current, 800);
  const animatedMeetings = useCountUp(entry.meetings.current, 800);

  return (
    <motion.div
      layout
      layoutId={`team-leaderboard-entry-${entry.team.teamId}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        layout: { type: "spring", stiffness: 350, damping: 30 },
        opacity: { duration: 0.3, delay: index * 0.05 },
        y: { duration: 0.3, delay: index * 0.05 },
      }}
      className={leaderboardRowClass({
        highlighted: entry.team.isCurrentUserTeam,
        rank: entry.rank,
      })}
      style={{
        gridTemplateColumns: TEAM_GRID_COLUMNS,
      }}
    >
      {/* Rank */}
      <div className="flex items-center gap-2">
        <RankIcon type={entry.rankIcon || "none"} rank={entry.rank} />
      </div>

      {/* Team */}
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          {entry.team.logoUrl ? (
            <AvatarImage
              src={entry.team.logoUrl}
              alt={entry.team.name}
              className="object-cover"
            />
          ) : null}
          <AvatarFallback className="bg-muted text-xs">
            {entry.team.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <span className="max-w-[140px] truncate text-sm font-medium">
              {entry.team.name}
            </span>
            {entry.team.isCurrentUserTeam && <YouBadge label="Your team" />}
          </div>
          <span className="text-muted-foreground text-xs">
            {entry.team.memberCount}{" "}
            {entry.team.memberCount === 1 ? "member" : "members"}
            {entry.team.xpPerMember != null &&
              ` · ~${Math.round(entry.team.xpPerMember).toLocaleString()} ${
                economyLabels("team").xp
              }/member`}
          </span>
        </div>
      </div>

      {/* Team XP */}
      <div>
        <div className="flex items-center gap-1">
          <Zap className="text-primary h-3.5 w-3.5" />
          <span className="text-sm font-semibold tabular-nums">
            {animatedXP.toLocaleString()}
          </span>
        </div>
        <ChangeValue value={entry.xp.change} />
      </div>

      {/* Team Points */}
      <div>
        <div className="flex items-center gap-1">
          <Gem className="text-primary h-3.5 w-3.5" />
          <span className="text-sm font-semibold tabular-nums">
            {animatedPts.toLocaleString()}
          </span>
        </div>
        <ChangeValue value={entry.points.change} />
      </div>

      {/* Tasks */}
      <div>
        <div className="flex items-center gap-1">
          <ListChecks className="text-muted-foreground h-3.5 w-3.5" />
          <span className="text-sm font-semibold tabular-nums">
            {animatedTasks}
          </span>
        </div>
        <ChangeValue value={entry.tasks.change} />
      </div>

      {/* Meetings */}
      <div>
        <div className="flex items-center gap-1">
          <Handshake className="text-muted-foreground h-3.5 w-3.5" />
          <span className="text-sm font-semibold tabular-nums">
            {animatedMeetings}
          </span>
        </div>
        <ChangeValue value={entry.meetings.change} />
      </div>

      {/* Change */}
      <div className="flex justify-center">
        {entry.change.isNew ? (
          <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:text-green-400">
            New
          </span>
        ) : (
          <ChangeIndicator
            direction={entry.change.direction}
            amount={entry.change.amount}
          />
        )}
      </div>
    </motion.div>
  );
}
