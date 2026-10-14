"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type {
  DataIssueRow,
  ProgramAssistantLatest,
} from "@/types/program-assistant";

export const PROGRAM_ASSISTANT_KEY = ["program-assistant", "latest"];

const EMPTY: ProgramAssistantLatest = {
  latest_run: null,
  run: null,
  stale_days: null,
  settings: null,
  verdicts: [],
  data_issues: [],
  timeline: [],
};

/** Admin-only reader; polls every 5 s while a run is in progress. */
export function useProgramAssistantLatest() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const query = useQuery({
    queryKey: PROGRAM_ASSISTANT_KEY,
    queryFn: async () => {
      const { data, error } = await createClient().rpc(
        "get_program_assistant_latest_v1"
      );
      if (error) throw new Error(error.message);
      return (data ?? EMPTY) as unknown as ProgramAssistantLatest;
    },
    enabled: mounted,
    staleTime: 60 * 1000,
    refetchInterval: (q) =>
      q.state.data?.latest_run?.status === "running" ? 5000 : false,
  });

  return {
    data: query.data ?? EMPTY,
    isLoading: query.isLoading || !mounted,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useResolveDataIssue() {
  const queryClient = useQueryClient();
  return useMutation<DataIssueRow, Error, { id: number; resolved: boolean }>({
    mutationFn: async ({ id, resolved }) => {
      const { data, error } = await createClient().rpc(
        "program_data_issue_resolve_v1",
        { p_id: id, p_resolved: resolved }
      );
      if (error) throw new Error(error.message);
      return data as unknown as DataIssueRow;
    },
    retry: 0,
    onSuccess: (row) => {
      toast.success(row.resolved_at ? "Marked as fixed" : "Reopened");
      queryClient.invalidateQueries({ queryKey: PROGRAM_ASSISTANT_KEY });
    },
    onError: (e) => {
      toast.error(`Could not update the data issue — ${e.message}`);
    },
  });
}

/** "Run now": the admin route kicks a run through the database, like cron. */
export function useRunProgramAssistantNow() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const res = await fetch("/api/admin/program-assistant/run", {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
    },
    retry: 0,
    onSuccess: () => {
      toast.success("Run started — results appear here in a minute or two");
      setTimeout(
        () =>
          queryClient.invalidateQueries({ queryKey: PROGRAM_ASSISTANT_KEY }),
        3000
      );
    },
    onError: (e) => {
      toast.error(`Could not start the run — ${e.message}`);
    },
  });
}
