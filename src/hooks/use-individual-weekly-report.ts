"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
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
