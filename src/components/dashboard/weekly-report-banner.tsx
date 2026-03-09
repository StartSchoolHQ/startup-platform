"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/contexts/app-context";
import { createClient } from "@/lib/supabase/client";
import {
  hasUserSubmittedThisWeek,
  getCurrentWeekBoundaries,
} from "@/lib/weekly-reports";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

interface TeamMembership {
  team_id: string;
  teams: { id: string; name: string } | null;
}

async function getUserUnsubmittedTeams(userId: string) {
  const supabase = createClient();

  // Get user's active team memberships
  const { data: memberships, error } = await supabase
    .from("team_members")
    .select("team_id, teams!inner(id, name)")
    .eq("user_id", userId)
    .is("left_at", null)
    .eq("teams.status", "active");

  if (error || !memberships?.length) return [];

  // Check submission status for each team
  const results = await Promise.all(
    (memberships as unknown as TeamMembership[]).map(async (m) => {
      const submitted = await hasUserSubmittedThisWeek(userId, m.team_id);
      return {
        teamId: m.team_id,
        teamName: m.teams?.name || "Unknown Team",
        submitted,
      };
    })
  );

  return results.filter((r) => !r.submitted);
}

export function WeeklyReportBanner() {
  const { user } = useAppContext();

  const { data: unsubmittedTeams = [] } = useQuery({
    queryKey: ["dashboard", "weeklyReportBanner", user?.id],
    queryFn: () => getUserUnsubmittedTeams(user!.id),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const { data: weekBoundaries } = useQuery({
    queryKey: ["weekBoundaries"],
    queryFn: () => getCurrentWeekBoundaries(),
    staleTime: 10 * 60 * 1000,
  });

  // Only show banner from Friday through Monday 10:00 Riga time.
  // After Monday 10:00, get_riga_week_boundaries flips to the new week
  // and hasUserSubmittedThisWeek checks the new week (nobody submitted yet).
  // We avoid false alarms by checking if we're past Thursday in Riga time.
  const shouldShowBanner = (() => {
    if (!weekBoundaries) return false;
    // week_start is always a Monday. Calculate Friday = week_start + 4 days.
    const friday = new Date(weekBoundaries.week_start);
    friday.setDate(friday.getDate() + 4);
    return new Date() >= friday;
  })();

  if (!unsubmittedTeams.length || !shouldShowBanner) return null;

  const weekLabel = weekBoundaries
    ? `Week ${weekBoundaries.week_number} (${new Date(weekBoundaries.week_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(weekBoundaries.week_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })})`
    : "";

  return (
    <div className="px-4 pt-2">
      {unsubmittedTeams.map((team) => (
        <Alert
          key={team.teamId}
          className="mb-2 border-amber-500/50 bg-amber-500/10"
        >
          <Clock className="h-4 w-4 !text-amber-600 dark:!text-amber-400" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm">
              <span className="font-semibold text-amber-700 dark:text-amber-300">
                Weekly report not submitted
              </span>{" "}
              for <span className="font-medium">{team.teamName}</span>
              {weekLabel && (
                <span className="text-muted-foreground"> — {weekLabel}</span>
              )}
              . Deadline:{" "}
              <span className="font-semibold">Monday 10:00 Riga time</span>.
              Missing it costs each team member 100 points!
            </span>
            <Link
              href={`/dashboard/team-journey/${team.teamId}`}
              className="ml-3 inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700"
            >
              Submit Now
              <ArrowRight className="h-3 w-3" />
            </Link>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
