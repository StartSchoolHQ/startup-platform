// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { groupByDay } from "@/components/admin/activity/activity-list";
import type { ActivityRow } from "@/lib/activity/format";

const row = (id: string, occurred_at: string): ActivityRow => ({
  id,
  occurred_at,
  kind: "xp",
  subject_user_id: "u",
  subject_name: "Anna",
  actor_user_id: null,
  actor_name: null,
  team_name: null,
  object_title: null,
  amount_xp: 10,
  amount_points: 0,
  status: null,
  detail: null,
  ref_id: null,
  extra: {},
});

describe("groupByDay", () => {
  it("keeps newest-first order and groups rows of the same day together", () => {
    const groups = groupByDay([
      row("a", "2026-09-20T15:00:00Z"),
      row("b", "2026-09-20T09:00:00Z"),
      row("c", "2026-09-17T12:00:00Z"),
    ]);
    expect(groups.map(([, list]) => list.map((r) => r.id))).toEqual([
      ["a", "b"],
      ["c"],
    ]);
  });

  it("labels today's rows as Today", () => {
    const [[label]] = groupByDay([row("a", new Date().toISOString())]);
    expect(label).toBe("Today");
  });
});
