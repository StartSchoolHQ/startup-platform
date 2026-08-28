"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { LeaderboardSkeleton } from "@/components/leaderboard/leaderboard-skeleton";
import { TeamLeaderboardMobileRow } from "@/components/leaderboard/leaderboard-mobile-rows";
import { TeamRow, TEAM_GRID_COLUMNS } from "@/components/leaderboard/team-row";
import { convertToTeamLeaderboardEntry } from "@/components/leaderboard/mappers";
import { TeamLeaderboardEntry } from "@/types/leaderboard";
import { type TeamLeaderboardEntry as DBTeamLeaderboardEntry } from "@/lib/leaderboard-server";
import { createClient } from "@/lib/supabase/client";
import { economyLabels } from "@/lib/economy-labels";

interface TeamsBoardProps {
  initialData: DBTeamLeaderboardEntry[];
  selectedWeek: string;
  userTeamIds?: string[];
}

/** Team Journey → Teams board (unchanged behaviour: live RPC + snapshots). */
export function TeamsBoard({
  initialData,
  selectedWeek,
  userTeamIds,
}: TeamsBoardProps) {
  const supabase = createClient();
  const labels = economyLabels("team");

  const { data: rawTeamDbData = initialData, isPending: teamLoading } =
    useQuery({
      queryKey: ["leaderboard", "teams", selectedWeek],
      queryFn: async () => {
        if (selectedWeek === "current") {
          // Use live RPC for current week (real-time, no snapshots)
          const { data, error } = await (supabase as any).rpc(
            "get_live_team_leaderboard_data",
            { p_limit: 50 }
          );
          if (error) throw error;
          return data || [];
        }
        // Use snapshot RPC for historical weeks
        const [year, week] = selectedWeek.split("-").map(Number);
        const { data, error } = await (supabase as any).rpc(
          "get_team_leaderboard_data",
          { p_limit: 50, p_week_number: week, p_week_year: year }
        );
        if (error) throw error;
        return data || [];
      },
      initialData: selectedWeek === "current" ? initialData : undefined,
      staleTime: 60_000,
    });

  const entries = useMemo(
    () =>
      rawTeamDbData.map((entry: DBTeamLeaderboardEntry) =>
        convertToTeamLeaderboardEntry(entry, userTeamIds)
      ),
    [rawTeamDbData, userTeamIds]
  );

  const emptyState =
    selectedWeek === "current" ? (
      <p>No team leaderboard data available yet.</p>
    ) : (
      <>
        <p>No team data available for this week.</p>
        <p className="mt-1 text-sm">
          Weekly snapshots will be generated automatically.
        </p>
      </>
    );

  return (
    <Card className="border-none shadow-none">
      <CardContent className="p-0">
        {/* Desktop table (sm+) */}
        <div className="hidden overflow-x-auto sm:block">
          <div
            className="border-border text-muted-foreground grid min-w-[700px] gap-4 border-b p-4 text-sm font-medium"
            style={{ gridTemplateColumns: TEAM_GRID_COLUMNS }}
          >
            <div>Rank</div>
            <div>Team</div>
            <div>{labels.xp}</div>
            <div>{labels.points}</div>
            <div>Tasks</div>
            <div>Meetings</div>
            <div className="text-center">Change</div>
          </div>

          <AnimatePresence mode="wait">
            {teamLoading ? (
              <motion.div
                key="team-skeleton"
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
                key="team-data"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <AnimatePresence mode="popLayout">
                  {entries.map((item: TeamLeaderboardEntry, index: number) => (
                    <TeamRow
                      key={`${item.team.name}-${item.rank}`}
                      entry={item}
                      index={index}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="team-empty"
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
            {teamLoading ? (
              <motion.div
                key="team-skeleton-mobile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6"
              >
                <LeaderboardSkeleton />
              </motion.div>
            ) : entries.length > 0 ? (
              <motion.div
                key="team-data-mobile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AnimatePresence mode="popLayout">
                  {entries.map((item: TeamLeaderboardEntry, index: number) => (
                    <TeamLeaderboardMobileRow
                      key={`team-mobile-${item.team.name}-${item.rank}`}
                      entry={item}
                      index={index}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="team-empty-mobile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-muted-foreground p-8 text-center"
              >
                <p>No team leaderboard data available yet.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
