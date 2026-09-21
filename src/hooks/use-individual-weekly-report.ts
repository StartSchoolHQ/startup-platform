"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useApp } from "@/contexts/app-context";
import { useMyJourneyOverview } from "@/hooks/use-my-journey-overview";
import { usePlatformSettings } from "@/hooks/use-platform-settings";
import { createClient } from "@/lib/supabase/client";
import { mapIndividualReportRpcError } from "@/lib/individual-weekly-report";
import type { Json } from "@/types/database";
import type {
  IndividualWeeklyReportData,
  IndividualWeeklyReportStatus,
} from "@/types/weekly-report";

export const individualWeeklyReportKeys = {
  status: (userId?: string) =>
    ["weekly-reports", "individual", "status", userId] as const,
};

/**
 * Mode rule, mirrored from `send_individual_weekly_report_reminders_v1`:
 * the solo form applies while My Journey is on, unless Team Journey is on
 * AND the student sits in an active team (they get the team form then).
 * Callers that already hold the overview pass `hasActiveTeam`; otherwise it
 * is fetched, and only when both journeys are on — the flag is irrelevant
 * while Team Journey is off, so the heavier RPC stays untouched.
 */
export function useSoloWeeklyReportMode(hasActiveTeam?: boolean): {
  soloMode: boolean;
  userId: string | undefined;
} {
  const { user } = useApp();
  const { data: journeys } = usePlatformSettings();
  const needsOverview =
    hasActiveTeam === undefined && journeys.myJourney && journeys.teamJourney;
  const { data: overview } = useMyJourneyOverview(
    needsOverview ? user?.id : undefined
  );
  const inActiveTeam = hasActiveTeam ?? overview?.has_active_team;
  const soloMode =
    journeys.myJourney && (!journeys.teamJourney || inActiveTeam === false);
  return { soloMode, userId: user?.id };
}

export interface SubmitIndividualReportVars {
  data: IndividualWeeklyReportData;
  asDraft: boolean;
}

export interface SubmitIndividualReportResult {
  report_id: string;
  status: "draft" | "submitted";
  week_number: number;
  week_year: number;
  week_start: string;
  week_end: string;
}

/** One round trip for card, banner and history. Self-only on the DB side. */
export function useIndividualWeeklyReportStatus(userId?: string) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: individualWeeklyReportKeys.status(userId),
    queryFn: async (): Promise<IndividualWeeklyReportStatus> => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc(
        "get_individual_weekly_report_status_v1"
      );
      if (error) throw new Error(error.message);
      return data as unknown as IndividualWeeklyReportStatus;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
  return { data, isLoading, isError, refetch };
}

export function useSubmitIndividualWeeklyReport(
  userId?: string
): UseMutationResult<
  SubmitIndividualReportResult,
  Error,
  SubmitIndividualReportVars
> {
  const queryClient = useQueryClient();

  return useMutation<
    SubmitIndividualReportResult,
    Error,
    SubmitIndividualReportVars
  >({
    mutationFn: async ({ data, asDraft }) => {
      const supabase = createClient();
      const { data: result, error } = await supabase.rpc(
        "submit_individual_weekly_report_v1",
        { p_submission_data: data as unknown as Json, p_as_draft: asDraft }
      );
      if (error) throw new Error(mapIndividualReportRpcError(error.message));
      return result as unknown as SubmitIndividualReportResult;
    },
    retry: 0,
    onSuccess: (_result, vars) => {
      toast.success(
        vars.asDraft
          ? "Draft saved! You can continue later."
          : "Weekly report submitted!"
      );
      queryClient.invalidateQueries({
        queryKey: individualWeeklyReportKeys.status(userId),
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard", "my-journey", userId],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
