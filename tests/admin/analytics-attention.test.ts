import { describe, expect, it } from "vitest";
import {
  severityTone,
  splitDismissed,
  type AttentionRow,
} from "@/lib/analytics/attention";

const row = (patch: Partial<AttentionRow>): AttentionRow => ({
  user_id: "u",
  name: "Anna",
  team_name: null as unknown as string,
  last_active: "2026-09-20T00:00:00Z",
  severity: 1,
  reasons: ["Stuck on “X” for 12 days"],
  dismissed_until: null as unknown as string,
  ...patch,
});

describe("severityTone", () => {
  it("escalates with severity", () => {
    expect(severityTone(1)).toBe("neutral");
    expect(severityTone(2)).toBe("warning");
    expect(severityTone(3)).toBe("warning");
    expect(severityTone(4)).toBe("negative");
  });
});

describe("splitDismissed", () => {
  it("separates dismissed rows and keeps order", () => {
    const rows = [
      row({ user_id: "a", severity: 5 }),
      row({
        user_id: "b",
        severity: 3,
        dismissed_until: "2099-01-01T00:00:00Z",
      }),
      row({ user_id: "c", severity: 2 }),
    ];
    const { open, dismissed } = splitDismissed(rows);
    expect(open.map((r) => r.user_id)).toEqual(["a", "c"]);
    expect(dismissed.map((r) => r.user_id)).toEqual(["b"]);
  });
});
