"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TeamLeaderboardMobileRow } from "@/components/leaderboard/leaderboard-mobile-rows";
import { LeaderboardBoardShell } from "@/components/leaderboard/leaderboard-board-shell";
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

  return (
    <LeaderboardBoardShell
      gridColumns={TEAM_GRID_COLUMNS}
      loading={teamLoading}
      isEmpty={entries.length === 0}
      headerCells={
        <>
          <div>Rank</div>
          <div>Team</div>
          <div>{labels.xp}</div>
          <div>{labels.points}</div>
          <div>Tasks</div>
          <div>Meetings</div>
          <div className="text-center">Change</div>
        </>
      }
      desktopRows={entries.map((item: TeamLeaderboardEntry, index: number) => (
        <TeamRow
          key={`${item.team.name}-${item.rank}`}
          entry={item}
          index={index}
        />
      ))}
      mobileRows={entries.map((item: TeamLeaderboardEntry, index: number) => (
        <TeamLeaderboardMobileRow
          key={`team-mobile-${item.team.name}-${item.rank}`}
          entry={item}
          index={index}
        />
      ))}
      desktopEmpty={
        selectedWeek === "current" ? (
          <p>No team leaderboard data available yet.</p>
        ) : (
          <>
            <p>No team data available for this week.</p>
            <p className="mt-1 text-sm">
              Weekly snapshots will be generated automatically.
            </p>
          </>
        )
      }
      mobileEmpty={<p>No team leaderboard data available yet.</p>}
    />
  );
}
