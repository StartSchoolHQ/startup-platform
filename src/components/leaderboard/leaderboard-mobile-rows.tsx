"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, ListChecks, Zap } from "lucide-react";
import { RankIcon } from "@/components/leaderboard/rank-icon";
import { YouBadge } from "@/components/leaderboard/you-badge";
import { ChangeIndicator } from "@/components/leaderboard/change-indicator";
import { StreakBadge } from "@/components/leaderboard/streak-badge";
import { LeaderboardEntry, TeamLeaderboardEntry } from "@/types/leaderboard";
import { economyLabels, type Economy } from "@/lib/economy-labels";

export function LeaderboardMobileRow({
  entry,
  index,
  economy,
}: {
  entry: LeaderboardEntry;
  index: number;
  /** Which economy the totals belong to — drives the unit label. */
  economy: Economy;
}) {
  const labels = economyLabels(economy);
  const isFirst = entry.rank === 1;

  const getBgClass = () => {
    if (entry.user.isCurrentUser) return " bg-primary/5 border-l-primary";
    if (isFirst) return " bg-amber-500/[0.06]";
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
      className={`border-border flex items-center gap-3 border-b border-l-2 border-l-transparent p-3${getBgClass()}`}
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
          {entry.user.isCurrentUser && <YouBadge />}
        </div>
        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-0.5">
            <Zap className="text-primary h-3 w-3" />{" "}
            {entry.xp.current.toLocaleString()} {labels.xp}
          </span>
          <span className="flex items-center gap-0.5">
            <ListChecks className="text-muted-foreground h-3 w-3" />{" "}
            {entry.tasks.current} tasks
          </span>
          <span className="flex items-center gap-0.5">
            <Eye className="text-muted-foreground h-3 w-3" />{" "}
            {entry.peerReviews}
          </span>
          <StreakBadge days={entry.streak.days} type={entry.streak.type} />
        </div>
      </div>
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
  const labels = economyLabels("team");
  const isFirst = entry.rank === 1;

  const getBgClass = () => {
    if (entry.team.isCurrentUserTeam) return " bg-primary/5 border-l-primary";
    if (isFirst) return " bg-amber-500/[0.06]";
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
      className={`border-border flex items-center gap-3 border-b border-l-2 border-l-transparent p-3${getBgClass()}`}
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
          {entry.team.isCurrentUserTeam && <YouBadge label="Your team" />}
        </div>
        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-0.5">
            <Zap className="text-primary h-3 w-3" />{" "}
            {entry.xp.current.toLocaleString()} {labels.xp}
          </span>
          <span className="flex items-center gap-0.5">
            <ListChecks className="text-muted-foreground h-3 w-3" />{" "}
            {entry.tasks.current} tasks
          </span>
          <span>
            {entry.team.memberCount}{" "}
            {entry.team.memberCount === 1 ? "member" : "members"}
          </span>
        </div>
      </div>
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
    </motion.div>
  );
}
