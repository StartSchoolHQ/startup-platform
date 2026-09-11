"use client";

import { useQuery } from "@tanstack/react-query";
import { withBatch } from "@/hooks/use-batch-scope";
import type {
  EconomyAnalytics,
  MeetingsAnalytics,
  OverviewWeek,
  RetentionAnalytics,
  StrikesAnalytics,
  StudentDetailRow,
  StudentRow,
  TaskFrictionAnalytics,
  TasksAnalytics,
  TeamDetailRow,
  TeamWeekRow,
  WeekDetailRow,
} from "./types";
import type { AdminWeeklyReportRow } from "@/components/admin/admin-weekly-report-view-modal";

const STALE_TIME = 5 * 60 * 1000;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return res.json();
}

/**
 * Every aggregate hook takes the batch scope (`null` = current cohort) and
 * forwards it as `?batch=`; the routes pass it to the `_v2` RPCs. The
 * per-entity detail hooks (team, student, report) are already scoped by id.
 */
function scoped<T>(key: string, path: string, batchId: string | null) {
  return {
    queryKey: ["admin-analytics", key, batchId ?? "current"],
    queryFn: () =>
      fetchJson<T>(withBatch(`/api/admin/analytics/${path}`, batchId)),
    staleTime: STALE_TIME,
  };
}

export function useAnalyticsOverview(enabled: boolean, batchId: string | null) {
  return useQuery({
    ...scoped<OverviewWeek[]>("overview", "overview", batchId),
    enabled,
  });
}

export function useAnalyticsTeams(enabled: boolean, batchId: string | null) {
  return useQuery({
    ...scoped<TeamWeekRow[]>("teams", "teams", batchId),
    enabled,
  });
}

export function useAnalyticsTeamDetail(teamId: string | null) {
  return useQuery({
    queryKey: ["admin-analytics", "team-detail", teamId],
    queryFn: () =>
      fetchJson<TeamDetailRow[]>(
        `/api/admin/analytics/team-detail?teamId=${teamId}`
      ),
    staleTime: STALE_TIME,
    enabled: !!teamId,
  });
}

export function useAnalyticsStudents(enabled: boolean, batchId: string | null) {
  return useQuery({
    ...scoped<StudentRow[]>("students", "students", batchId),
    enabled,
  });
}

export function useAnalyticsStudentDetail(userId: string | null) {
  return useQuery({
    queryKey: ["admin-analytics", "student-detail", userId],
    queryFn: () =>
      fetchJson<StudentDetailRow[]>(
        `/api/admin/analytics/student-detail?userId=${userId}`
      ),
    staleTime: STALE_TIME,
    enabled: !!userId,
  });
}

export function useAnalyticsWeekDetail(
  weekStart: string | null,
  batchId: string | null
) {
  return useQuery({
    queryKey: [
      "admin-analytics",
      "week-detail",
      weekStart,
      batchId ?? "current",
    ],
    queryFn: () =>
      fetchJson<WeekDetailRow[]>(
        withBatch(
          `/api/admin/analytics/week-detail?weekStart=${weekStart}`,
          batchId
        )
      ),
    staleTime: STALE_TIME,
    enabled: !!weekStart,
  });
}

export function useAnalyticsTasks(enabled: boolean, batchId: string | null) {
  return useQuery({
    ...scoped<TasksAnalytics>("tasks", "tasks", batchId),
    enabled,
  });
}

export function useAnalyticsMeetings(enabled: boolean, batchId: string | null) {
  return useQuery({
    ...scoped<MeetingsAnalytics>("meetings", "meetings", batchId),
    enabled,
  });
}

export function useAnalyticsRetention(
  enabled: boolean,
  batchId: string | null
) {
  return useQuery({
    ...scoped<RetentionAnalytics>("retention", "retention", batchId),
    enabled,
  });
}

export function useAnalyticsStrikes(enabled: boolean, batchId: string | null) {
  return useQuery({
    ...scoped<StrikesAnalytics>("strikes", "strikes", batchId),
    enabled,
  });
}

export function useAnalyticsTaskFriction(
  enabled: boolean,
  batchId: string | null
) {
  return useQuery({
    ...scoped<TaskFrictionAnalytics>("task-friction", "task-friction", batchId),
    enabled,
  });
}

export function useAnalyticsEconomy(enabled: boolean, batchId: string | null) {
  return useQuery({
    ...scoped<EconomyAnalytics>("economy", "economy", batchId),
    enabled,
  });
}

export function useFullReport(reportId: string | null) {
  return useQuery({
    queryKey: ["admin-analytics", "report", reportId],
    queryFn: () =>
      fetchJson<AdminWeeklyReportRow>(
        `/api/admin/analytics/report?id=${reportId}`
      ),
    staleTime: STALE_TIME,
    enabled: !!reportId,
  });
}
