import { describe, expect, it } from "vitest";
import {
  isPhaseLockedError,
  phaseLocks,
  requiredForHalf,
} from "@/lib/my-journey-phase-lock";

const rows = [
  {
    achievement_id: "p1",
    achievement_name: "Know Yourself & Experiment",
    sort_order: 11,
    total_tasks: 11,
    completed_tasks: 4,
    is_unlocked: true,
    always_unlocked: false,
  },
  {
    achievement_id: "p2",
    achievement_name: "Get Outside the Building",
    sort_order: 12,
    total_tasks: 15,
    completed_tasks: 0,
    is_unlocked: false,
    always_unlocked: false,
  },
  {
    achievement_id: "p3",
    achievement_name: "Become a Builder",
    sort_order: 13,
    total_tasks: 12,
    completed_tasks: 0,
    is_unlocked: false,
    always_unlocked: false,
  },
  {
    achievement_id: "read",
    achievement_name: "Founder Reading List",
    sort_order: 15,
    total_tasks: 7,
    completed_tasks: 1,
    is_unlocked: true,
    always_unlocked: true,
  },
];

describe("my journey phase lock helpers", () => {
  it("needs the ceiling of half the tasks", () => {
    expect(requiredForHalf(11)).toBe(6);
    expect(requiredForHalf(12)).toBe(6);
    expect(requiredForHalf(15)).toBe(8);
    expect(requiredForHalf(0)).toBe(0);
  });

  it("explains a locked phase with the previous phase's numbers", () => {
    const locks = phaseLocks(rows);
    expect(locks.get("p1")).toEqual({ locked: false });
    expect(locks.get("read")).toEqual({ locked: false });
    expect(locks.get("p2")?.locked).toBe(true);
    expect(locks.get("p2")?.description).toBe(
      "Locked. Finish 6 of 11 tasks in Know Yourself & Experiment to open this phase (4 done)."
    );
    expect(locks.get("p3")?.description).toContain(
      "8 of 15 tasks in Get Outside the Building"
    );
  });

  it("skips always-open phases when looking for the gate", () => {
    const withReadingFirst = [
      { ...rows[3], sort_order: 10 },
      { ...rows[0], sort_order: 11, is_unlocked: false },
    ];
    // Nothing gated before p1 → generic "Locked" rather than a reading-list rule.
    expect(phaseLocks(withReadingFirst).get("p1")).toEqual({
      locked: true,
      description: "Locked",
    });
  });

  it("treats rows without the flag as unlocked (V1 payloads)", () => {
    const legacy = [{ achievement_id: "x", achievement_name: "X" }];
    expect(phaseLocks(legacy).get("x")).toEqual({ locked: false });
  });

  it("recognises the trigger's error text", () => {
    expect(
      isPhaseLockedError(
        new Error(
          'Failed to start task: my_journey_phase_locked: "Become a Builder" is locked'
        )
      )
    ).toBe(true);
    expect(isPhaseLockedError(new Error("network down"))).toBe(false);
    expect(isPhaseLockedError("string")).toBe(false);
  });
});
