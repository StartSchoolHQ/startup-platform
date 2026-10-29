import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";
import type { ExternalUrl } from "@/components/tasks/submission-fields";

/** What a task submission draft stores: text and links, never files. */
export interface TaskDraftBody {
  description?: string;
  external_urls: ExternalUrl[];
  [key: string]: unknown;
}

export interface TaskDraft {
  draft: TaskDraftBody;
  updated_at: string;
}

export const taskDraftKeys = {
  one: (progressId: string) => ["task-draft", progressId] as const,
};

function draftError(message: string): Error {
  if (message.includes("task_draft_status_locked"))
    return new Error("This task was already submitted.");
  if (message.includes("task_draft_denied"))
    return new Error("You can't edit this task.");
  return new Error(message);
}

/** The caller's saved draft for a progress row (solo or team), or null. */
export async function getTaskSubmissionDraft(
  progressId: string
): Promise<TaskDraft | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_task_submission_draft_v1", {
    p_progress_id: progressId,
  });
  if (error) throw draftError(error.message);
  if (!data) return null;
  const row = data as unknown as { draft: Partial<TaskDraftBody> | null };
  const body = row.draft ?? {};
  return {
    updated_at: (data as unknown as TaskDraft).updated_at,
    draft: {
      ...body,
      external_urls: Array.isArray(body.external_urls)
        ? body.external_urls
        : [],
    },
  };
}

/** Upserts the draft. Throws with a student-facing message on failure. */
export async function saveTaskSubmissionDraft(
  progressId: string,
  draft: TaskDraftBody
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("save_task_submission_draft_v1", {
    p_progress_id: progressId,
    p_draft: draft as unknown as Json,
  });
  if (error) throw draftError(error.message);
}

/** Removes the draft after a successful submit. Swallows nothing. */
export async function deleteTaskSubmissionDraft(
  progressId: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("delete_task_submission_draft_v1", {
    p_progress_id: progressId,
  });
  if (error) throw draftError(error.message);
}
