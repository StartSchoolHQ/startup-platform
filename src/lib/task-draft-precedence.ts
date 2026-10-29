import type { TaskDraft } from "@/lib/data/task-drafts";
import type { TaskSubmissionInitialData } from "@/components/tasks/task-submission-modal";

/**
 * Which values the submission form opens with. A saved draft wins only when
 * it was written after the last submission (or there never was one);
 * otherwise the rejected submission's prefill (if any) is used.
 */
export function pickTaskSeed({
  draft,
  rejected,
  submittedAt,
}: {
  draft: TaskDraft | null;
  rejected: TaskSubmissionInitialData | undefined;
  submittedAt: string | null | undefined;
}): {
  seed: TaskSubmissionInitialData | undefined;
  restoredFromDraft: boolean;
} {
  const draftWins =
    !!draft &&
    (!submittedAt || Date.parse(draft.updated_at) > Date.parse(submittedAt));
  if (draft && draftWins) {
    return {
      seed: {
        description: draft.draft.description,
        external_urls: draft.draft.external_urls,
      },
      restoredFromDraft: true,
    };
  }
  return { seed: rejected, restoredFromDraft: false };
}
