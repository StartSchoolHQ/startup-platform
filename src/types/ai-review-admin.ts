/** Shared shape for the admin AI reviews audit page (Task 15). */
export interface AiReviewAdminRow {
  id: string;
  attempt: number;
  status: string;
  reject_reason: string | null;
  decision: boolean | null;
  confidence: number | null;
  feedback: string | null;
  criteria_results: unknown;
  evidence_manifest: unknown;
  submission_snapshot: unknown;
  model: string | null;
  decided_by: string | null;
  cost_usd: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  error: string | null;
  created_at: string;
  finished_at: string | null;
  task: { id: string; title: string } | null;
  student: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
  attempts_for_progress: number;
}

export interface AiReviewAdminSummary {
  today: number;
  approval_rate: number;
  reject_reasons: Record<string, number>;
  failures: number;
  cost_usd: number;
}

export interface AiReviewAdminResponse {
  data: AiReviewAdminRow[];
  total: number;
  page: number;
  limit: number;
  summary: AiReviewAdminSummary;
}
