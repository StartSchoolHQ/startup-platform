import type { Database } from "@/types/database";

export type AssistantThreadRow =
  Database["public"]["Tables"]["assistant_threads"]["Row"];
export type AssistantMessageRow =
  Database["public"]["Tables"]["assistant_messages"]["Row"];

/** One bubble in the widget: persisted rows plus in-flight optimistic ones. */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** True while the reply is still streaming in. */
  pending?: boolean;
}

export interface ThreadSummary {
  id: string;
  title: string;
  updatedAt: string;
}
