import type { Tables } from "@/types/database";

export type SupportMode = "problem" | "suggest";
export type TicketStatus = "open" | "resolved";
export type SuggestionStatus = "pending" | "accepted" | "declined";

export interface TicketAttachment {
  path: string;
  name: string;
  size: number;
  type: string;
}

/** support_tickets row + the joined reporter, as the admin tables read it. */
export type SupportTicketRow = Omit<
  Tables<"support_tickets">,
  "attachments" | "status" | "priority"
> & {
  attachments: TicketAttachment[];
  status: TicketStatus;
  priority: "low" | "medium" | "high" | "critical";
  users: { name: string | null; email: string } | null;
};

/** task_suggestions row + joined student and phase name. */
export type TaskSuggestionRow = Omit<Tables<"task_suggestions">, "status"> & {
  status: SuggestionStatus;
  users: { name: string | null; email: string } | null;
  achievements: { name: string } | null;
};

export interface MyJourneyPhaseOption {
  id: string;
  name: string;
}
