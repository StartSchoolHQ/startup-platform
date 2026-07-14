"use client";

import { useQuery } from "@tanstack/react-query";
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

export function useAnalyticsOverview(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-analytics", "overview"],
    queryFn: () => fetchJson<OverviewWeek[]>("/api/admin/analytics/overview"),
    staleTime: STALE_TIME,
    enabled,
  });
}

export function useAnalyticsTeams(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-analytics", "teams"],
    queryFn: () => fetchJson<TeamWeekRow[]>("/api/admin/analytics/teams"),
    staleTime: STALE_TIME,
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

export function useAnalyticsStudents(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-analytics", "students"],
    queryFn: () => fetchJson<StudentRow[]>("/api/admin/analytics/students"),
    staleTime: STALE_TIME,
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

export function useAnalyticsWeekDetail(weekStart: string | null) {
  return useQuery({
    queryKey: ["admin-analytics", "week-detail", weekStart],
    queryFn: () =>
      fetchJson<WeekDetailRow[]>(
        `/api/admin/analytics/week-detail?weekStart=${weekStart}`
      ),
    staleTime: STALE_TIME,
    enabled: !!weekStart,
  });
}

export function useAnalyticsTasks(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-analytics", "tasks"],
    queryFn: () => fetchJson<TasksAnalytics>("/api/admin/analytics/tasks"),
    staleTime: STALE_TIME,
    enabled,
  });
}

export function useAnalyticsMeetings(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-analytics", "meetings"],
    queryFn: () =>
      fetchJson<MeetingsAnalytics>("/api/admin/analytics/meetings"),
    staleTime: STALE_TIME,
    enabled,
  });
}

export function useAnalyticsRetention(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-analytics", "retention"],
    queryFn: () =>
      fetchJson<RetentionAnalytics>("/api/admin/analytics/retention"),
    staleTime: STALE_TIME,
    enabled,
  });
}

export function useAnalyticsStrikes(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-analytics", "strikes"],
    queryFn: () => fetchJson<StrikesAnalytics>("/api/admin/analytics/strikes"),
    staleTime: STALE_TIME,
    enabled,
  });
}

export function useAnalyticsTaskFriction(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-analytics", "task-friction"],
    queryFn: () =>
      fetchJson<TaskFrictionAnalytics>("/api/admin/analytics/task-friction"),
    staleTime: STALE_TIME,
    enabled,
  });
}

export function useAnalyticsEconomy(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-analytics", "economy"],
    queryFn: () => fetchJson<EconomyAnalytics>("/api/admin/analytics/economy"),
    staleTime: STALE_TIME,
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
