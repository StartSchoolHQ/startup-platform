import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

vi.mock("@/lib/ai-review/evidence", () => ({
  buildEvidence: vi.fn(async () => ({
    items: [],
    manifest: [
      {
        id: "description",
        source: "description",
        url: null,
        label: "Student description (a claim, not proof)",
        status: "text",
      },
    ],
  })),
}));
vi.mock("@/lib/ai-review/review", () => ({ reviewWithModel: vi.fn() }));

import { runReview, runReviewOnSnapshot } from "@/lib/ai-review/run-review";
import { reviewWithModel } from "@/lib/ai-review/review";
import type {
  AiReviewSettings,
  CriteriaSnapshot,
  NormalizedSubmission,
} from "@/lib/ai-review/types";

const settings: AiReviewSettings = {
  enabled: true,
  mode: "ai",
  model: "gpt-5.4",
  confidenceThreshold: 0.75,
  workerUrl: "",
  maxFileMb: 25,
  maxPdfPages: 40,
  attemptFlagThreshold: 5,
};

const snapshot: NormalizedSubmission = {
  description: "done",
  links: [],
  files: [],
};

const criteria: CriteriaSnapshot = {
  criteria: [
    { category: "What to evaluate:**", points: ["1. Has a screenshot"] },
  ],
  review_instructions: null,
  deliverables: [],
  title: "Task",
  description: null,
};

const REVIEW_ID = "11111111-1111-4111-8111-111111111111";

function modelReview(confidence: number) {
  return {
    result: {
      decision: true,
      confidence,
      criteria: [
        { id: "E1", label: "Has a screenshot", passed: true, evidence: "img" },
      ],
      reject_rules_triggered: [],
      unverifiable_evidence: false,
      feedback: "Nice work.",
    },
    raw: { id: "resp_1" },
    usage: { input: 1200, output: 240 },
    costUsd: 0.0066,
    model: "gpt-5.4-2026",
    promptVersion: "test-prompt",
  };
}

/** Minimal Supabase stand-in that records every call in order. */
function makeAdmin() {
  const log: string[] = [];
  const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const updates: Array<{ table: string; patch: Record<string, unknown> }> = [];
  const client = {
    rpc: (fn: string, args: Record<string, unknown> = {}) => {
      log.push(`rpc:${fn}`);
      rpcCalls.push({ fn, args });
      if (fn === "ai_review_claim_v1") {
        return Promise.resolve({
          data: [
            {
              id: REVIEW_ID,
              criteria_snapshot: criteria,
              submission_snapshot: snapshot,
            },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: { success: true }, error: null });
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: {
                value: {
                  enabled: true,
                  mode: "ai",
                  model: settings.model,
                  confidence_threshold: settings.confidenceThreshold,
                  max_file_mb: settings.maxFileMb,
                  max_pdf_pages: settings.maxPdfPages,
                },
              },
              error: null,
            }),
        }),
      }),
      update: (patch: Record<string, unknown>) => {
        log.push(`update:${Object.keys(patch).join(",")}`);
        updates.push({ table, patch });
        return { eq: () => Promise.resolve({ data: null, error: null }) };
      },
    }),
  };
  return {
    admin: client as unknown as SupabaseClient<Database>,
    log,
    rpcCalls,
    updates,
  };
}

describe("runReviewOnSnapshot — zero-criteria guard", () => {
  it("throws task_has_no_criteria when criteria is an empty array, before any evidence/model call", async () => {
    await expect(
      runReviewOnSnapshot(
        snapshot,
        {
          criteria: [],
          review_instructions: null,
          deliverables: [],
          title: "Task",
          description: null,
        },
        settings
      )
    ).rejects.toThrow("task_has_no_criteria");
  });

  it("throws task_has_no_criteria when every category has zero points", async () => {
    await expect(
      runReviewOnSnapshot(
        snapshot,
        {
          criteria: [
            { category: "What to evaluate", points: [] },
            { category: "Reject if", points: [] },
          ],
          review_instructions: null,
          deliverables: [],
          title: "Task",
          description: null,
        },
        settings
      )
    ).rejects.toThrow("task_has_no_criteria");
  });
});

describe("runReview — orchestration", () => {
  beforeEach(() => {
    vi.mocked(reviewWithModel).mockReset();
  });

  it("applies an approval for a confident true and writes the manifest before the model call", async () => {
    vi.mocked(reviewWithModel).mockResolvedValue(modelReview(0.93));
    const { admin, log, rpcCalls } = makeAdmin();

    const out = await runReview(admin, REVIEW_ID);

    expect(out?.outcome).toBe("approved");
    const apply = rpcCalls.find(
      (c) => c.fn === "ai_review_apply_decision_v1"
    ) as { args: Record<string, unknown> };
    expect(apply).toBeTruthy();
    expect(apply.args.p_review_id).toBe(REVIEW_ID);
    expect(apply.args.p_outcome).toBe("approved");
    const payload = apply.args.p_payload as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(
      [
        "confidence",
        "cost_usd",
        "criteria_results",
        "decided_by",
        "decision",
        "feedback",
        "input_tokens",
        "model",
        "output_tokens",
        "prompt_version",
        "raw_response",
        "reject_reason",
      ].sort()
    );
    expect(payload).toMatchObject({
      decision: true,
      confidence: 0.93,
      feedback: "Nice work.",
      reject_reason: null,
      model: "gpt-5.4-2026",
      prompt_version: "test-prompt",
      input_tokens: 1200,
      output_tokens: 240,
      cost_usd: 0.0066,
      decided_by: "ai",
    });

    // Manifest is persisted before the decision is applied.
    expect(log).toContain("update:evidence_manifest");
    expect(log.indexOf("update:evidence_manifest")).toBeLessThan(
      log.indexOf("rpc:ai_review_apply_decision_v1")
    );
  });

  it("rejects a low-confidence true as low_confidence", async () => {
    vi.mocked(reviewWithModel).mockResolvedValue(modelReview(0.4));
    const { admin, rpcCalls } = makeAdmin();

    const out = await runReview(admin, REVIEW_ID);

    expect(out?.outcome).toBe("rejected");
    expect(out?.rejectReason).toBe("low_confidence");
    const apply = rpcCalls.find(
      (c) => c.fn === "ai_review_apply_decision_v1"
    ) as { args: Record<string, unknown> };
    expect(apply.args.p_outcome).toBe("rejected");
    const payload = apply.args.p_payload as Record<string, unknown>;
    expect(payload.reject_reason).toBe("low_confidence");
    // The model's pass-flavoured feedback is never shown on a rejection.
    expect(payload.feedback).not.toContain("Nice work.");
  });
});
