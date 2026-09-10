"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Coins, ListChecks, Zap } from "lucide-react";
import { RankIcon } from "@/components/leaderboard/rank-icon";
import { LeaderboardSkeleton } from "@/components/leaderboard/leaderboard-skeleton";
import { LEADERBOARD_HEADER_CLASS } from "@/components/leaderboard/leaderboard-board-shell";
import { YouBadge } from "@/components/leaderboard/you-badge";
import { convertToMyJourneyEntry } from "@/components/leaderboard/mappers";
import { MyJourneyLeaderboardEntry } from "@/types/leaderboard";
import { type MyJourneyLeaderboardRow as DBMyJourneyEntry } from "@/lib/leaderboard-server";
import { createClient } from "@/lib/supabase/client";
import { economyLabels } from "@/lib/economy-labels";
import { cn } from "@/lib/utils";
import { leaderboardRowClass } from "@/components/leaderboard/row-styles";

const GRID_COLUMNS = "80px 220px 1fr 1fr 1fr";

function StudentCell({ entry }: { entry: MyJourneyLeaderboardEntry }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
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
    </div>
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

function MyJourneyRow({ entry }: { entry: MyJourneyLeaderboardEntry }) {
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
          style={{ gridTemplateColumns: GRID_COLUMNS }}
        >
          <div className="flex items-center gap-2">
            <RankIcon type={entry.rankIcon || "none"} rank={entry.rank} />
          </div>
          <StudentCell entry={entry} />
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
          <StudentCell entry={entry} />
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

/** My Journey (solo economy) board — live only, no weekly snapshots. */
export function MyJourneyBoard({
  initialData,
  currentUserId,
}: {
  initialData: DBMyJourneyEntry[];
  currentUserId?: string;
}) {
  const supabase = createClient();
  const labels = economyLabels("my_journey");

  const { data: rawData = initialData, isPending: loading } = useQuery({
    queryKey: ["leaderboard", "myJourney"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc(
        "get_live_my_journey_leaderboard_v1",
        { p_limit: null } // null = show all students (admins excluded in RPC)
      );
      if (error) throw error;
      return data || [];
    },
    initialData,
    staleTime: 60_000,
  });

  const entries = useMemo(
    () =>
      (rawData as DBMyJourneyEntry[]).map((entry) =>
        convertToMyJourneyEntry(entry, currentUserId)
      ),
    [rawData, currentUserId]
  );

  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <div className="overflow-x-auto">
        <div
          className={`${LEADERBOARD_HEADER_CLASS} hidden min-w-[640px] sm:grid`}
          style={{ gridTemplateColumns: GRID_COLUMNS }}
        >
          <div>Rank</div>
          <div>Student</div>
          <div>{labels.xp}</div>
          <div>{labels.points}</div>
          <div>Tasks done</div>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="my-journey-skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              <LeaderboardSkeleton />
            </motion.div>
          ) : entries.length > 0 ? (
            <motion.div
              key="my-journey-data"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {entries.map((item) => (
                <MyJourneyRow key={item.user.userId} entry={item} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="my-journey-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-muted-foreground p-8 text-center"
            >
              <p>No {labels.xp} earned yet.</p>
              <p className="mt-1 text-sm">
                The board fills up as students complete their solo tasks.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
