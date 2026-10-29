import { describe, expect, it } from "vitest";
import { DraftBeaconSchema } from "@/lib/validation-schemas";

const PROGRESS_ID = "3f1c2b8e-7a4d-4e9b-9c2a-1d5e6f7a8b9c";

describe("DraftBeaconSchema", () => {
  it("valid task body parses", () => {
    const result = DraftBeaconSchema.safeParse({
      kind: "task",
      progressId: PROGRESS_ID,
      draft: { description: "half-written answer", links: [] },
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      kind: "task",
      progressId: PROGRESS_ID,
      draft: { description: "half-written answer", links: [] },
    });
  });

  it("unknown kind rejected", () => {
    const result = DraftBeaconSchema.safeParse({
      kind: "meeting",
      data: { notes: "x" },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["kind"]);
  });

  it("non-uuid progressId rejected", () => {
    const result = DraftBeaconSchema.safeParse({
      kind: "task",
      progressId: "not-a-uuid",
      draft: {},
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["progressId"]);
  });

  it("extra top-level keys stripped", () => {
    const result = DraftBeaconSchema.safeParse({
      kind: "solo_report",
      data: { blockers: "none" },
      userId: "someone-else",
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      kind: "solo_report",
      data: { blockers: "none" },
    });
  });
});
