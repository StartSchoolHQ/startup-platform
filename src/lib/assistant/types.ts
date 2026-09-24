export type ReasoningEffort = "low" | "medium" | "high";

/** Parsed `platform_settings.assistant` (camelCase; the DB row is snake_case). */
export interface AssistantSettings {
  enabled: boolean;
  model: string;
  dailyLimit: number;
  historyTurns: number;
  reasoningEffort: ReasoningEffort;
}

/** What the widget knows about where the student is when they ask. */
export interface PageContext {
  route: string;
  taskId?: string;
}
