"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import posthog from "posthog-js";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  hasTeamReportContent,
  normalizeTeamReport,
} from "@/lib/team-weekly-report";
import { WeeklyReportSchema } from "@/lib/validation-schemas";
import {
  fieldErrorsFromIssues,
  type FieldErrors,
} from "@/lib/weekly-report-form-errors";
import { getCurrentWeekBoundaries } from "@/lib/weekly-reports";
import type { TeamWeeklyReportForm } from "@/types/weekly-report";
import { useTeamReportDraft } from "@/components/weekly-reports/team/use-team-report-draft";

interface Options {
  open: boolean;
  teamId: string;
  userId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * The team modal's behaviour, unchanged from V1: drafts via
 * `useTeamReportDraft`, "Save as draft" through `save_weekly_report_draft`,
 * submit inserts (or upgrades the draft row) directly in `weekly_reports`,
 * same PostHog events. Only the error surface is new: validation returns
 * per-question errors instead of a toast.
 */
export function useTeamReportForm({
  open,
  teamId,
  userId,
  onClose,
  onSuccess,
}: Options) {
  const draft = useTeamReportDraft({ open, teamId, userId });
  const { form, setFormState } = draft;
  const [errors, setErrors] = useState<FieldErrors>({});

  const setForm = (next: TeamWeeklyReportForm) => {
    setErrors((prev) => {
      const kept = { ...prev };
      for (const key of Object.keys(next) as (keyof TeamWeeklyReportForm)[]) {
        if (form[key] !== next[key]) delete kept[key];
      }
      return kept;
    });
    setFormState(next);
  };

  const finish = (message: string) => {
    toast.success(message);
    draft.clearLocal();
    onClose();
    draft.reset();
    setErrors({});
  };

  const saveDraft = useMutation({
    retry: 0,
    mutationFn: async () => {
      const supabase = createClient();
      const week = await getCurrentWeekBoundaries();
      if (!week) throw new Error("Failed to get current week boundaries");
      const { data, error } = await supabase.rpc("save_weekly_report_draft", {
        p_user_id: userId,
        p_team_id: teamId,
        p_week_start_date: week.week_start,
        p_week_end_date: week.week_end,
        p_week_number: week.week_number,
        p_week_year: week.week_year,
        p_submission_data: normalizeTeamReport(form) as never,
      });
      if (error) throw new Error(`Failed to save draft: ${error.message}`);
      const result = data as { success?: boolean; error?: string } | null;
      if (!result?.success)
        throw new Error(result?.error || "Failed to save draft");
    },
    onSuccess: () => {
      posthog.capture("weekly_report_draft_saved", {
        team_id: teamId,
        has_commitments: form.commitments.some((c) => c.text.trim()),
        has_blockers: Boolean(form.blockers),
        has_achievements: Boolean(form.biggestAchievement),
      });
      finish("Draft saved! You can continue later.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const submit = useMutation({
    retry: 0,
    mutationFn: async (data: ReturnType<typeof normalizeTeamReport>) => {
      const supabase = createClient();
      const week = await getCurrentWeekBoundaries();
      if (!week) throw new Error("Failed to get current week boundaries");
      const submission = { ...data, submittedAt: new Date().toISOString() };
      const now = new Date().toISOString();
      const { error } = draft.existingDraftId
        ? await supabase
            .from("weekly_reports")
            .update({
              submission_data: submission as never,
              status: "submitted",
              submitted_at: now,
              updated_at: now,
            })
            .eq("id", draft.existingDraftId)
        : await supabase.from("weekly_reports").insert({
            user_id: userId,
            team_id: teamId,
            context: "team",
            week_start_date: week.week_start,
            week_end_date: week.week_end,
            week_number: week.week_number,
            week_year: week.week_year,
            submission_data: submission as never,
            status: "submitted",
            submitted_at: now,
          });
      if (error) throw new Error(`Failed to submit report: ${error.message}`);
      return { week, data };
    },
    onSuccess: ({ week, data }) => {
      posthog.capture("weekly_report_submitted", {
        team_id: teamId,
        week_number: week.week_number,
        week_year: week.week_year,
        commitments_count: data.commitments.length,
        commitments_completed: data.commitments.filter(
          (c) => c.status === "completed"
        ).length,
        has_blockers: Boolean(data.blockers),
        meetings_held: data.meetingsHeld,
        alignment_score: data.alignmentScore,
        next_week_commitments_count: data.nextWeekCommitments.length,
        was_draft: Boolean(draft.existingDraftId),
      });
      finish("Weekly report submitted!");
      onSuccess?.();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  /** Validates; returns the errors (empty when it submitted). */
  const trySubmit = (): FieldErrors => {
    const data = normalizeTeamReport(form);
    const parsed = WeeklyReportSchema.safeParse(data);
    if (!parsed.success) {
      const next = fieldErrorsFromIssues(parsed.error.issues);
      setErrors(next);
      return next;
    }
    submit.mutate(data);
    return {};
  };

  return {
    form,
    setForm,
    errors,
    isLoadingDraft: draft.isLoadingDraft,
    restoredFromDb: draft.restoredFromDb,
    pendingLocalDraft: draft.pendingLocalDraft,
    restoreLocalDraft: draft.restoreLocalDraft,
    discardLocalDraft: draft.discardLocalDraft,
    clearForm: () => {
      draft.clearLocal();
      draft.reset();
      setErrors({});
    },
    saveDraft: () => saveDraft.mutate(),
    trySubmit,
    isSavingDraft: saveDraft.isPending,
    isSubmitting: submit.isPending,
    hasContent: hasTeamReportContent(form),
  };
}
