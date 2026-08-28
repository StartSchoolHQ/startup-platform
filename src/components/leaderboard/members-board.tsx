"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LeaderboardSkeleton } from "@/components/leaderboard/leaderboard-skeleton";
import { LeaderboardMobileRow } from "@/components/leaderboard/leaderboard-mobile-rows";
import {
  MemberRow,
  MEMBER_GRID_COLUMNS,
} from "@/components/leaderboard/member-row";
import {
  convertToLeaderboardEntry,
  type StreakMap,
} from "@/components/leaderboard/mappers";
import { LeaderboardEntry } from "@/types/leaderboard";
import { type LeaderboardEntry as DBLeaderboardEntry } from "@/lib/leaderboard-server";
import { createClient } from "@/lib/supabase/client";
import { economyLabels } from "@/lib/economy-labels";

interface MembersBoardProps {
  initialData: DBLeaderboardEntry[];
  selectedWeek: string;
  currentUserId?: string;
}

/**
 * Team Journey → Members board. Current week comes from the live Team economy
 * RPC; past weeks come from the weekly snapshots (which hold Team XP).
 */
export function MembersBoard({
  initialData,
  selectedWeek,
  currentUserId,
}: MembersBoardProps) {
  const supabase = createClient();
  const labels = economyLabels("team");

  const { data: rawDbData = initialData, isPending: loading } = useQuery({
    queryKey: ["leaderboard", "members", selectedWeek],
    queryFn: async () => {
      if (selectedWeek === "current") {
        // Live Team economy board (real-time, no snapshots)
        const { data, error } = await (supabase as any).rpc(
          "get_live_team_members_leaderboard_v1",
          { p_limit: null } // null = show all students (admins excluded in RPC)
        );
        if (error) throw error;
        return data || [];
      }
      // Snapshot RPC for historical weeks
      const [year, week] = selectedWeek.split("-").map(Number);
      const { data, error } = await (supabase as any).rpc(
        "get_leaderboard_data",
        { p_limit: null, p_week_number: week, p_week_year: year }
      );
      if (error) throw error;
      return data || [];
    },
    initialData: selectedWeek === "current" ? initialData : undefined,
    staleTime: 60_000,
  });

  // Stable string key for streak user IDs (avoids a new array every render)
  const streakUserIds = useMemo(
    () => rawDbData?.map((e: any) => e.user_id)?.join(",") ?? "",
    [rawDbData]
  );

  const { data: userStreaks = new Map(), isPending: streaksLoading } = useQuery(
    {
      queryKey: ["leaderboard", "streaks", streakUserIds],
      queryFn: async () => {
        const userIds = streakUserIds.split(",").filter(Boolean);
        if (userIds.length === 0) return new Map();

        const response = await fetch("/api/leaderboard/streaks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds }),
        });

        if (!response.ok) throw new Error("Failed to fetch streaks");

        const { streaks } = await response.json();
        return new Map(Object.entries(streaks));
      },
      enabled: rawDbData.length > 0,
      staleTime: 60_000,
    }
  );

  const entries = useMemo(
    () =>
      rawDbData.map((entry: DBLeaderboardEntry) =>
        convertToLeaderboardEntry(
          entry,
          currentUserId,
          userStreaks as StreakMap
        )
      ),
    [rawDbData, currentUserId, userStreaks]
  );

  const emptyState =
    selectedWeek === "current" ? (
      <p>No leaderboard data available yet.</p>
    ) : (
      <>
        <p>No data available for this week.</p>
        <p className="mt-1 text-sm">
          Weekly snapshots will be generated automatically.
        </p>
      </>
    );

  return (
    <Card className="border-none shadow-none">
      <CardContent className="p-0">
        {streaksLoading && (
          <div className="flex items-center justify-end gap-2 pb-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        )}

        {/* Desktop table (sm+) */}
        <div className="hidden overflow-x-auto sm:block">
          <div
            className="border-border text-muted-foreground grid min-w-[700px] gap-4 border-b p-4 text-sm font-medium"
            style={{ gridTemplateColumns: MEMBER_GRID_COLUMNS }}
          >
            <div>Rank</div>
            <div>Student</div>
            <div>{labels.xp}</div>
            <div>Tasks</div>
            <div>Reviews</div>
            <div>Streak</div>
            <div className="text-center">Change</div>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="skeleton"
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
                key="data"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <AnimatePresence mode="popLayout">
                  {entries.map((item: LeaderboardEntry, index: number) => (
                    <MemberRow
                      key={`${item.user.name}-${item.rank}`}
                      entry={item}
                      index={index}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-muted-foreground p-8 text-center"
              >
                {emptyState}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile cards (<sm) */}
        <div className="block sm:hidden">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="skeleton-mobile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6"
              >
                <LeaderboardSkeleton />
              </motion.div>
            ) : entries.length > 0 ? (
              <motion.div
                key="data-mobile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AnimatePresence mode="popLayout">
                  {entries.map((item: LeaderboardEntry, index: number) => (
                    <LeaderboardMobileRow
                      key={`mobile-${item.user.name}-${item.rank}`}
                      entry={item}
                      index={index}
                      economy="team"
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="empty-mobile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-muted-foreground p-8 text-center"
              >
                <p>No leaderboard data available yet.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
