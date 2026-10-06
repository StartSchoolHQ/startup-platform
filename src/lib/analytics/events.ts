import posthog from "posthog-js";

/**
 * Product events the browser sends to PostHog, in one place so the taxonomy
 * is greppable. Names are snake_case verbs in the past tense; properties are
 * flat and snake_case. Add a new event here before capturing it anywhere.
 *
 * Events captured directly with `posthog.capture` elsewhere (auth, teams,
 * weekly reports, AI review) predate this file and keep their names.
 */
export interface ProductEvents {
  /** The student opened a solo task page (once per visit). */
  individual_task_viewed: {
    task_id: string;
    task_title: string;
    status: string | null;
    category: string | null;
  };
  /** The student pressed Start on a solo task and the row was created. */
  individual_task_started: { task_id: string; task_title: string };
  /** The Startie panel was opened from the floating button. */
  startie_opened: { page: string };
  /** A student message reached the server and the reply finished streaming. */
  startie_message_sent: { page: string; new_thread: boolean; chars: number };
  /** The chat request failed or was refused (limit, disabled, server error). */
  startie_reply_failed: { page: string; status: number };
  /** The student pressed thumbs-down on a reply. */
  startie_reply_flagged: Record<string, never>;
  support_ticket_submitted: { priority: string; attachments: number };
  task_suggestion_submitted: Record<string, never>;
}

export type ProductEventName = keyof ProductEvents;

/** Fire-and-forget; safe when PostHog is not loaded (tests, dev without key). */
export function track<E extends ProductEventName>(
  event: E,
  properties: ProductEvents[E]
): void {
  try {
    if (typeof posthog?.capture !== "function") return;
    posthog.capture(event, properties);
  } catch {
    // Analytics must never break a user action.
  }
}
