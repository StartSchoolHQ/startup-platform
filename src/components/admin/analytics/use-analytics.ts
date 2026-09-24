"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { AttentionRow } from "@/lib/analytics/attention";
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
  MilestonesData,
  MyJourneyData,
  OutcomesData,
  PulseData,
  ReviewQualityRow,
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

// ---------------------------------------------------------------------------
// Analytics v2 (2026-09-24): the new readers assert admin in SQL, so they are
// called straight from the browser client like the Inbox and Activity Log.
// `null` batch = "All active"; the generated types mark uuid args non-null.
// ---------------------------------------------------------------------------

const V2_STALE = 60 * 1000;
const batchArg = (batchId: string | null) => batchId as unknown as string;

function v2Key(name: string, ...rest: (string | null)[]) {
  return ["admin-analytics", name, ...rest.map((r) => r ?? "current")];
}

export function useAttention(batchId: string | null, enabled = true) {
  return useQuery({
    queryKey: v2Key("attention", batchId),
    enabled,
    staleTime: V2_STALE,
    queryFn: async (): Promise<AttentionRow[]> => {
      const { data, error } = await createClient().rpc(
        "get_analytics_attention_v1",
        { p_batch_id: batchArg(batchId) }
      );
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function usePulse(batchId: string | null, enabled = true) {
  return useQuery({
    queryKey: v2Key("pulse", batchId),
    enabled,
    staleTime: V2_STALE,
    queryFn: async (): Promise<PulseData> => {
      const { data, error } = await createClient().rpc(
        "get_analytics_pulse_v1",
        { p_batch_id: batchArg(batchId) }
      );
      if (error) throw new Error(error.message);
      return data as unknown as PulseData;
    },
  });
}

export function useMyJourneyAnalytics(batchId: string | null, enabled = true) {
  return useQuery({
    queryKey: v2Key("my-journey", batchId),
    enabled,
    staleTime: V2_STALE,
    queryFn: async (): Promise<MyJourneyData> => {
      const { data, error } = await createClient().rpc(
        "get_analytics_my_journey_v1",
        { p_batch_id: batchArg(batchId) }
      );
      if (error) throw new Error(error.message);
      return data as unknown as MyJourneyData;
    },
  });
}

export function useReviewQuality(batchId: string | null, enabled = true) {
  return useQuery({
    queryKey: v2Key("review-quality", batchId),
    enabled,
    staleTime: V2_STALE,
    queryFn: async (): Promise<ReviewQualityRow[]> => {
      const { data, error } = await createClient().rpc(
        "get_analytics_review_quality_v1",
        { p_batch_id: batchArg(batchId) }
      );
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useMilestones(batchId: string | null, enabled = true) {
  return useQuery({
    queryKey: v2Key("milestones", batchId),
    enabled,
    staleTime: V2_STALE,
    queryFn: async (): Promise<MilestonesData> => {
      const { data, error } = await createClient().rpc(
        "get_analytics_milestones_v1",
        { p_batch_id: batchArg(batchId) }
      );
      if (error) throw new Error(error.message);
      return data as unknown as MilestonesData;
    },
  });
}

export function useOutcomes(
  batchA: string | null,
  batchB: string | null,
  enabled = true
) {
  return useQuery({
    queryKey: v2Key("outcomes", batchA, batchB),
    enabled: enabled && !!batchA,
    staleTime: V2_STALE,
    queryFn: async (): Promise<OutcomesData> => {
      const { data, error } = await createClient().rpc(
        "get_analytics_outcomes_v1",
        {
          p_batch_a: batchA as string,
          ...(batchB ? { p_batch_b: batchB } : {}),
        }
      );
      if (error) throw new Error(error.message);
      return data as unknown as OutcomesData;
    },
  });
}

export function useOverviewV3(batchId: string | null, enabled = true) {
  return useQuery({
    queryKey: v2Key("overview-v3", batchId),
    enabled,
    staleTime: V2_STALE,
    queryFn: async (): Promise<OverviewWeek[]> => {
      const { data, error } = await createClient().rpc(
        "get_analytics_overview_v3",
        { p_batch_id: batchArg(batchId) }
      );
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as OverviewWeek[];
    },
  });
}

/** Dismiss a student from the attention list for `dismiss_days`. */
export function useDismissAttention() {
  const queryClient = useQueryClient();
  return useMutation({
    retry: 0,
    mutationFn: async (input: { userId: string; note: string }) => {
      const { data, error } = await createClient().rpc("analytics_dismiss_v1", {
        p_user_id: input.userId,
        p_note: input.note,
      });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: () => {
      toast.success(
        "Dismissed. They come back on the list when the period ends."
      );
      queryClient.invalidateQueries({
        queryKey: ["admin-analytics", "attention"],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics", "pulse"] });
    },
    onError: (error: Error) =>
      toast.error(`Couldn't dismiss — ${error.message}`),
  });
}
