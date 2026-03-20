"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Eye, ListChecks, Zap } from "lucide-react";
import { RankIcon } from "@/components/leaderboard/rank-icon";
import { ChangeIndicator } from "@/components/leaderboard/change-indicator";
import { StreakBadge } from "@/components/leaderboard/streak-badge";
import { LeaderboardEntry, TeamLeaderboardEntry } from "@/types/leaderboard";

export function LeaderboardMobileRow({
  entry,
  index,
}: {
  entry: LeaderboardEntry;
  index: number;
}) {
  const isTop3 = entry.rank <= 3;
  const isFirst = entry.rank === 1;

  const getBgClass = () => {
    if (entry.user.isCurrentUser) return " bg-blue-50 dark:bg-blue-950/50";
    if (isFirst)
      return " bg-gradient-to-r from-yellow-50/50 to-transparent dark:from-yellow-950/20";
    if (isTop3)
      return " bg-gradient-to-r from-slate-50/50 to-transparent dark:from-slate-900/20";
    return "";
  };

  return (
    <motion.div
      layout
      layoutId={`leaderboard-mobile-${entry.user.userId}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        layout: { type: "spring", stiffness: 350, damping: 30 },
        opacity: { duration: 0.3, delay: index * 0.05 },
        y: { duration: 0.3, delay: index * 0.05 },
      }}
      className={`border-border flex items-center gap-3 border-b p-3${getBgClass()}`}
    >
      <div className="flex min-w-[40px] items-center gap-2">
        <RankIcon type={entry.rankIcon || "none"} rank={entry.rank} />
      </div>
      <Avatar className="h-8 w-8">
        <AvatarImage src={entry.user.avatar} alt={entry.user.name} />
        <AvatarFallback>
          {entry.user.name
            .split(" ")
            .map((n: string) => n[0])
            .join("")}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {entry.user.name}
          </span>
          {entry.user.isCurrentUser && (
            <Badge
              variant="secondary"
              className="px-1.5 py-0 text-[10px] dark:bg-blue-900 dark:text-blue-300"
            >
              You
            </Badge>
          )}
        </div>
        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-0.5">
            <Zap className="h-3 w-3 text-green-600" />{" "}
            {entry.xp.current.toLocaleString()} XP
          </span>
          <span className="flex items-center gap-0.5">
            <ListChecks className="h-3 w-3 text-emerald-600" />{" "}
            {entry.tasks.current} tasks
          </span>
          <span className="flex items-center gap-0.5">
            <Eye className="h-3 w-3 text-purple-600" /> {entry.peerReviews}
          </span>
          <StreakBadge days={entry.streak.days} type={entry.streak.type} />
        </div>
      </div>
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
    </motion.div>
  );
}

export function TeamLeaderboardMobileRow({
  entry,
  index,
}: {
  entry: TeamLeaderboardEntry;
  index: number;
}) {
  const isTop3 = entry.rank <= 3;
  const isFirst = entry.rank === 1;

  const getBgClass = () => {
    if (entry.team.isCurrentUserTeam) return " bg-blue-50 dark:bg-blue-950/50";
    if (isFirst)
      return " bg-gradient-to-r from-yellow-50/50 to-transparent dark:from-yellow-950/20";
    if (isTop3)
      return " bg-gradient-to-r from-slate-50/50 to-transparent dark:from-slate-900/20";
    return "";
  };

  return (
    <motion.div
      layout
      layoutId={`team-mobile-${entry.team.teamId}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        layout: { type: "spring", stiffness: 350, damping: 30 },
        opacity: { duration: 0.3, delay: index * 0.05 },
        y: { duration: 0.3, delay: index * 0.05 },
      }}
      className={`border-border flex items-center gap-3 border-b p-3${getBgClass()}`}
    >
      <div className="flex min-w-[40px] items-center gap-2">
        <RankIcon type={entry.rankIcon || "none"} rank={entry.rank} />
      </div>
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
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {entry.team.name}
          </span>
          {entry.team.isCurrentUserTeam && (
            <Badge
              variant="secondary"
              className="px-1.5 py-0 text-[10px] dark:bg-blue-900 dark:text-blue-300"
            >
              Your Team
            </Badge>
          )}
        </div>
        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-0.5">
            <Zap className="h-3 w-3 text-green-600" />{" "}
            {entry.xp.current.toLocaleString()} XP
          </span>
          <span className="flex items-center gap-0.5">
            <ListChecks className="h-3 w-3 text-emerald-600" />{" "}
            {entry.tasks.current} tasks
          </span>
          <span>
            {entry.team.memberCount}{" "}
            {entry.team.memberCount === 1 ? "member" : "members"}
          </span>
        </div>
      </div>
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
    </motion.div>
  );
}
