"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  emptyTeamReportForm,
  hasTeamReportContent,
  teamDraftToForm,
} from "@/lib/team-weekly-report";
import { getCurrentWeekBoundaries } from "@/lib/weekly-reports";
import type { TeamWeeklyReportForm } from "@/types/weekly-report";

interface Options {
  open: boolean;
  teamId: string;
  userId: string;
}

/**
 * Draft plumbing for the team form, unchanged from V1: on open, load this
 * week's DB draft row (status = draft); if there is none, offer a
 * localStorage draft left by an earlier session; while open, mirror the
 * form to localStorage every 500 ms so a closed tab loses nothing.
 */
export function useTeamReportDraft({ open, teamId, userId }: Options) {
  const [form, setFormState] = useState(emptyTeamReportForm());
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [existingDraftId, setExistingDraftId] = useState<string | null>(null);
  const [pendingLocalDraft, setPendingLocalDraft] =
    useState<TeamWeeklyReportForm | null>(null);
  const [restoredFromDb, setRestoredFromDb] = useState(false);
  // True once this open's draft lookup has finished (so a re-render does not
  // reload over the student's edits); cleared on close.
  const [initialized, setInitialized] = useState(false);
  const DRAFT_KEY = `weekly-report-draft-${teamId}-${userId}`;

  const clearLocal = useCallback(
    () => localStorage.removeItem(DRAFT_KEY),
    [DRAFT_KEY]
  );

  const reset = useCallback(() => {
    setFormState(emptyTeamReportForm());
    setExistingDraftId(null);
    setRestoredFromDb(false);
  }, []);

  // Closing resets the form so the next open starts from the DB draft again.
  // Done during render (adjust-state-on-prop-change) rather than in an effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setInitialized(false);
      setFormState(emptyTeamReportForm());
      setExistingDraftId(null);
      setRestoredFromDb(false);
    }
  }

  useEffect(() => {
    if (!open || initialized) return;
    let cancelled = false;
    (async () => {
      setIsLoadingDraft(true);
      try {
        const week = await getCurrentWeekBoundaries();
        if (!week) return;
        const supabase = createClient();
        const { data } = await supabase
          .from("weekly_reports")
          .select("id, submission_data")
          .eq("user_id", userId)
          .eq("team_id", teamId)
          .eq("context", "team")
          .eq("week_number", week.week_number)
          .eq("week_year", week.week_year)
          .eq("status", "draft")
          .maybeSingle();
        if (cancelled) return;
        if (data?.submission_data) {
          setExistingDraftId(data.id);
          setFormState(
            teamDraftToForm(
              data.submission_data as Partial<TeamWeeklyReportForm>
            )
          );
          setRestoredFromDb(true);
        } else {
          const local = localStorage.getItem(DRAFT_KEY);
          if (local) {
            try {
              setPendingLocalDraft(JSON.parse(local));
            } catch {
              clearLocal();
            }
          }
        }
      } catch (err) {
        console.error("Error loading draft:", err);
      } finally {
        if (!cancelled) {
          setInitialized(true);
          setIsLoadingDraft(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, initialized, teamId, userId, DRAFT_KEY, clearLocal]);

  useEffect(() => {
    if (!open || !initialized || isLoadingDraft) return;
    const id = setTimeout(() => {
      if (hasTeamReportContent(form))
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    }, 500);
    return () => clearTimeout(id);
  }, [form, open, initialized, isLoadingDraft, DRAFT_KEY]);

  return {
    form,
    setFormState,
    isLoadingDraft,
    existingDraftId,
    restoredFromDb,
    pendingLocalDraft,
    restoreLocalDraft: () => {
      if (pendingLocalDraft) setFormState(pendingLocalDraft);
      setPendingLocalDraft(null);
    },
    discardLocalDraft: () => {
      clearLocal();
      setPendingLocalDraft(null);
    },
    clearLocal,
    reset,
  };
}
