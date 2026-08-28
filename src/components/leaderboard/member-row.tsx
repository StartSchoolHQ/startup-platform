"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Eye, ListChecks, Zap } from "lucide-react";
import { RankIcon } from "@/components/leaderboard/rank-icon";
import { ChangeIndicator } from "@/components/leaderboard/change-indicator";
import { ChangeValue } from "@/components/leaderboard/change-value";
import { StreakBadge } from "@/components/leaderboard/streak-badge";
import { LeaderboardEntry } from "@/types/leaderboard";
import { useCountUp } from "@/hooks/use-count-up";
import { leaderboardRowClass } from "@/components/leaderboard/row-styles";

export const MEMBER_GRID_COLUMNS = "80px 200px 1fr 1fr 1fr 1fr 100px";

/** Desktop row of the Team Journey members board. */
export function MemberRow({
  entry,
  index,
}: {
  entry: LeaderboardEntry;
  index: number;
}) {
  const animatedXP = useCountUp(entry.xp.current, 800);
  const animatedTasks = useCountUp(entry.tasks.current, 800);

  const isTop3 = entry.rank <= 3;

  return (
    <motion.div
      layout
      layoutId={`leaderboard-entry-${entry.user.userId}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        layout: { type: "spring", stiffness: 350, damping: 30 },
        opacity: { duration: 0.3, delay: index * 0.05 },
        y: { duration: 0.3, delay: index * 0.05 },
      }}
      className={leaderboardRowClass({
        highlighted: entry.user.isCurrentUser,
        rank: entry.rank,
      })}
      style={{
        gridTemplateColumns: MEMBER_GRID_COLUMNS,
        boxShadow: isTop3 ? "0 0 20px -10px rgba(0,0,0,0.1)" : "none",
      }}
    >
      {/* Rank */}
      <div className="flex items-center gap-2">
        <RankIcon type={entry.rankIcon || "none"} rank={entry.rank} />
      </div>

      {/* User */}
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={entry.user.avatar} alt={entry.user.name} />
          <AvatarFallback>
            {entry.user.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{entry.user.name}</span>
            {entry.user.isCurrentUser && (
              <Badge
                variant="secondary"
                className="bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300"
              >
                You
              </Badge>
            )}
          </div>
          <span className="text-muted-foreground text-xs">
            {entry.user.teams}
          </span>
        </div>
      </div>

      {/* Team XP */}
      <div>
        <div className="flex items-center gap-1">
          <Zap className="h-3.5 w-3.5 text-green-600" />
          <span className="text-sm font-semibold">
            {animatedXP.toLocaleString()}
          </span>
        </div>
        <ChangeValue value={entry.xp.change} color="green" />
      </div>

      {/* Tasks */}
      <div>
        <div className="flex items-center gap-1">
          <ListChecks className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-sm font-semibold">{animatedTasks}</span>
        </div>
      </div>

      {/* Peer Reviews */}
      <div>
        <div className="flex items-center gap-1">
          <Eye className="h-3.5 w-3.5 text-purple-600" />
          <span className="text-sm font-semibold">{entry.peerReviews}</span>
        </div>
      </div>

      {/* Streak */}
      <div>
        <StreakBadge days={entry.streak.days} type={entry.streak.type} />
      </div>

      {/* Change */}
      <div className="flex justify-center">
        {entry.change.isNew ? (
          <Badge
            variant="secondary"
            className="bg-green-100 text-xs text-green-700 dark:bg-green-900 dark:text-green-300"
          >
            NEW
          </Badge>
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
