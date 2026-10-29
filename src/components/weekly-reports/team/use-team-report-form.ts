"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import posthog from "posthog-js";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  emptyTeamReportForm,
  hasTeamReportContent,
  normalizeTeamReport,
} from "@/lib/team-weekly-report";
import { WeeklyReportSchema } from "@/lib/validation-schemas";
import {
  fieldErrorsFromIssues,
  type FieldErrors,
} from "@/lib/weekly-report-form-errors";
import type { TeamWeeklyReportForm } from "@/types/weekly-report";
import {
  saveTeamReportDraft,
  useTeamReportDraft,
} from "@/components/weekly-reports/team/use-team-report-draft";

interface Options {
  open: boolean;
  teamId: string;
  userId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * The team modal's behaviour: drafts restore and autosave via
 * `useTeamReportDraft`; "Save and close" goes through
 * `save_weekly_report_draft` with a toast; submit inserts (or upgrades the
 * draft row) directly in `weekly_reports`, reusing the week fetched on open.
 * Validation returns per-question errors instead of a toast.
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

  const missingWeek = () =>
    new Error(
      "Couldn't load this week's dates. Close and reopen the report, then try again."
    );

  const finish = (message: string) => {
    toast.success(message);
    draft.autosave.cancel();
    onClose();
    draft.reset();
    setErrors({});
  };

  // Save what is on screen before the form is reset and the dialog closes.
  const close = async () => {
    await draft.autosave.flush();
    onClose();
    draft.reset();
    setErrors({});
  };

  const saveDraft = useMutation({
    retry: 0,
    mutationFn: async () => {
      if (!draft.week) throw missingWeek();
      // Let a pending autosave land first so it cannot overwrite this save.
      await draft.autosave.flush();
      draft.autosave.cancel();
      await saveTeamReportDraft({ userId, teamId, week: draft.week, form });
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
      const week = draft.week;
      if (!week) throw missingWeek();
      // cancel() drops the pending debounce; flush() then only waits for a
      // save already in flight, so a just-created draft row is upgraded
      // instead of a second row being inserted beside it.
      draft.autosave.cancel();
      await draft.autosave.flush();
      const draftId = draft.getDraftId();
      const supabase = createClient();
      const submission = { ...data, submittedAt: new Date().toISOString() };
      const now = new Date().toISOString();
      const { error } = draftId
        ? await supabase
            .from("weekly_reports")
            .update({
              submission_data: submission as never,
              status: "submitted",
              submitted_at: now,
              updated_at: now,
            })
            .eq("id", draftId)
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
      return { week, data, wasDraft: Boolean(draftId) };
    },
    onSuccess: ({ week, data, wasDraft }) => {
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
        was_draft: wasDraft,
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
    draft.autosave.cancel();
    submit.mutate(data);
    return {};
  };

  return {
    form,
    setForm,
    errors,
    isLoadingDraft: draft.isLoadingDraft,
    loadError: draft.loadError,
    retryLoad: draft.retryLoad,
    restoredFromDb: draft.restoredFromDb,
    savedAt: draft.savedAt,
    autosave: draft.autosave,
    // Keeps existingDraftId, so the autosave writes the empty draft.
    clearForm: () => {
      draft.setFormState(emptyTeamReportForm());
      setErrors({});
    },
    close,
    saveDraft: () => saveDraft.mutate(),
    trySubmit,
    isSavingDraft: saveDraft.isPending,
    isSubmitting: submit.isPending,
    hasContent: hasTeamReportContent(form),
  };
}
