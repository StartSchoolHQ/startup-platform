"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getISOWeekBoundaries } from "@/lib/week-utils";

export interface AvailableWeek {
  week_number: number;
  week_year: number;
  week_start: string;
  week_end: string;
  user_count?: number;
  team_count?: number;
}

type SnapshotTable = "leaderboard_snapshots" | "team_leaderboard_snapshots";

function withBoundaries<T extends { week_number: number; week_year: number }>(
  weeks: T[]
): (T & { week_start: string; week_end: string })[] {
  return weeks.map((week) => {
    const { weekStart, weekEnd } = getISOWeekBoundaries(
      week.week_year,
      week.week_number
    );

    return {
      ...week,
      week_start: weekStart.toISOString().split("T")[0],
      week_end: weekEnd.toISOString().split("T")[0],
    };
  });
}

async function fetchWeeks(
  table: SnapshotTable,
  countKey: "user_count" | "team_count"
): Promise<AvailableWeek[]> {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from(table)
    .select("week_number, week_year")
    .order("week_year", { ascending: false })
    .order("week_number", { ascending: false });

  if (error) throw error;

  const weekMap = new Map<string, AvailableWeek>();
  (data || []).forEach(
    (snapshot: { week_year: number; week_number: number }) => {
      const key = `${snapshot.week_year}-${snapshot.week_number}`;
      const existing = weekMap.get(key);
      if (!existing) {
        weekMap.set(key, {
          week_number: snapshot.week_number,
          week_year: snapshot.week_year,
          week_start: "",
          week_end: "",
          [countKey]: 1,
        });
      } else {
        existing[countKey] = (existing[countKey] ?? 0) + 1;
      }
    }
  );

  return withBoundaries(Array.from(weekMap.values()));
}

/** Weeks that have individual (member) leaderboard snapshots. */
export function useMemberAvailableWeeks(initialData: AvailableWeek[]) {
  return useQuery({
    queryKey: ["leaderboard", "availableWeeks"],
    queryFn: () => fetchWeeks("leaderboard_snapshots", "user_count"),
    initialData,
    staleTime: 60_000,
  });
}

/** Weeks that have team leaderboard snapshots. */
export function useTeamAvailableWeeks(initialData: AvailableWeek[]) {
  return useQuery({
    queryKey: ["leaderboard", "teamAvailableWeeks"],
    queryFn: () => fetchWeeks("team_leaderboard_snapshots", "team_count"),
    initialData,
    staleTime: 60_000,
  });
}
