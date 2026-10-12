import type { PeerReviewHistory } from "@/lib/validation-schemas";
import type { TeamTask } from "@/types/team-journey";

export interface TimelineReviewer {
  name: string;
  avatar_url?: string;
}

export interface TimelineEvent {
  timestamp: string;
  type:
    | "assigned"
    | "started"
    | "submitted_for_review"
    | "reviewer_assigned"
    | "review_completed";
  title: string;
  description?: string;
  reviewer?: TimelineReviewer;
  decision?: "approved" | "rejected";
  feedback?: string;
}

/**
 * The reviewer's feedback: the dedicated column, or the legacy
 * "Peer Review: …" tail of submission_notes from before it existed.
 */
export function reviewFeedback(task: TeamTask): string | null {
  if (task.review_feedback) return task.review_feedback;
  const notes = task.submission_notes;
  if (notes && notes.includes("Peer Review:")) {
    return notes.split("Peer Review:").pop()?.trim() || null;
  }
  return null;
}

/**
 * Every lifecycle event of a team task, newest first: assignment, start,
 * then the peer review history, or the legacy completed/reviewed columns
 * when no history was recorded.
 */
export function buildTaskTimeline(
  task: TeamTask,
  history: PeerReviewHistory
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  if (task.assigned_at) {
    events.push({
      timestamp: task.assigned_at,
      type: "assigned",
      title: "Task assigned",
      description: task.assignee_name
        ? `Assigned to ${task.assignee_name}`
        : undefined,
    });
  }
  if (task.started_at) {
    events.push({
      timestamp: task.started_at,
      type: "started",
      title: "Work started",
    });
  }

  if (history.length > 0) {
    for (const event of history) {
      if (event.event_type === "submitted_for_review") {
        events.push({
          timestamp: event.timestamp,
          type: "submitted_for_review",
          title: "Submitted for peer review",
        });
      } else if (event.event_type === "reviewer_assigned") {
        events.push({
          timestamp: event.timestamp,
          type: "reviewer_assigned",
          title: "Reviewer assigned",
          reviewer: {
            name: event.reviewer_name || "Reviewer",
            avatar_url: event.reviewer_avatar_url || undefined,
          },
        });
      } else if (event.event_type === "review_completed") {
        events.push({
          timestamp: event.timestamp,
          type: "review_completed",
          title: `Peer review ${event.decision || "completed"}`,
          reviewer: {
            name: event.reviewer_name || "Reviewer",
            avatar_url: event.reviewer_avatar_url || undefined,
          },
          decision:
            event.decision === "approved" || event.decision === "rejected"
              ? event.decision
              : undefined,
          feedback: event.feedback || undefined,
        });
      }
    }
  } else {
    if (task.completed_at) {
      events.push({
        timestamp: task.completed_at,
        type: "submitted_for_review",
        title: "Submitted for peer review",
      });
    }
    if (
      (task.status === "approved" || task.status === "rejected") &&
      task.reviewer_name
    ) {
      events.push({
        timestamp:
          task.updated_at || task.completed_at || new Date().toISOString(),
        type: "review_completed",
        title: `Peer review ${task.status}`,
        reviewer: {
          name: task.reviewer_name,
          avatar_url: task.reviewer_avatar_url,
        },
        decision: task.status,
        feedback: reviewFeedback(task) ?? undefined,
      });
    }
  }

  return events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
