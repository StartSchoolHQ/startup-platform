export interface NormalizedLink {
  url: string;
  title: string;
}
export interface NormalizedFile {
  url: string;
  name: string;
  size: number | null;
  type: string | null;
}
export interface NormalizedSubmission {
  description: string;
  links: NormalizedLink[];
  files: NormalizedFile[];
}
export type EvidenceKind =
  | "text"
  | "image"
  | "pdf"
  | "unsupported"
  | "unreachable"
  | "too_large"
  | "unverifiable";
export interface EvidenceItem {
  id: string;
  kind: EvidenceKind;
  source: "file" | "link" | "description";
  url: string | null;
  label: string;
  text?: string;
  imageUrl?: string;
  pdfBase64?: string;
  pdfFilename?: string;
  note?: string;
  chars?: number;
  bytes?: number;
}
export interface EvidenceManifestEntry {
  id: string;
  source: "file" | "link" | "description";
  url: string | null;
  label: string;
  status: EvidenceKind;
  chars?: number;
  bytes?: number;
  note?: string;
}
export interface CriteriaSnapshot {
  criteria: Array<{ category: string; points: string[] }>;
  review_instructions: string | null;
  deliverables: string[];
  title: string;
  description: string | null;
  /** tasks.detailed_instructions — the task's Requirements / Evidence Required. */
  detailed_instructions: string | null;
  is_recurring: boolean;
  /** Up to 3 prior submission descriptions, newest first; only for recurring tasks. */
  previous_submissions: string[];
}
export interface AiReviewSettings {
  enabled: boolean;
  mode: "ai" | "auto_approve";
  model: string;
  confidenceThreshold: number;
  workerUrl: string;
  maxFileMb: number;
  maxPdfPages: number;
  attemptFlagThreshold: number;
}
export type ReviewOutcome = "approved" | "rejected" | "failed";
export type RejectReason =
  | "criteria"
  | "low_confidence"
  | "unverifiable_evidence"
  | "technical_failure";
