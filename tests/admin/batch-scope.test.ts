import { describe, expect, it } from "vitest";
import { parseBatchParam } from "@/lib/admin/batch-scope";
import { withBatch } from "@/hooks/use-batch-scope";

// Pure unit tests — no database access. The UI defaults to the open batch and
// writes `batch=current` for "All active", so the server must read that
// sentinel (and any other non-uuid) as null.
const UUID = "eb55d8e2-bfb2-4567-8678-420216293d78";

describe("parseBatchParam", () => {
  it("returns null when the param is missing", () => {
    expect(parseBatchParam(new URLSearchParams())).toBeNull();
  });

  it("treats the `current` sentinel as null (all active)", () => {
    expect(parseBatchParam(new URLSearchParams("batch=current"))).toBeNull();
  });

  it("returns the uuid for a batch id", () => {
    expect(parseBatchParam(new URLSearchParams(`batch=${UUID}`))).toBe(UUID);
  });

  it("returns null for anything that is not a uuid", () => {
    expect(parseBatchParam(new URLSearchParams("batch=nope"))).toBeNull();
    expect(parseBatchParam(new URLSearchParams("batch="))).toBeNull();
  });
});

describe("withBatch", () => {
  it("leaves the url alone for the all-active scope", () => {
    expect(withBatch("/api/x", null)).toBe("/api/x");
  });

  it("appends the batch with ? or & as needed", () => {
    expect(withBatch("/api/x", UUID)).toBe(`/api/x?batch=${UUID}`);
    expect(withBatch("/api/x?a=1", UUID)).toBe(`/api/x?a=1&batch=${UUID}`);
  });
});
