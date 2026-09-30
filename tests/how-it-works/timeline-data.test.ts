import { describe, it, expect } from "vitest";
import {
  CURRICULUM_MONTHS,
  PHASES,
  READINGS,
  RECURRING,
  TASKS,
} from "@/components/how-it-works/timeline/timeline-data";
import {
  RANGE_END,
  RANGE_START,
  dayIndex,
  formatEffort,
} from "@/components/how-it-works/timeline/timeline-scale";

const inRange = (iso: string) =>
  dayIndex(iso) >= dayIndex(RANGE_START) &&
  dayIndex(iso) <= dayIndex(RANGE_END);

describe("timeline data", () => {
  it("has the four phases in programme order with the live task counts", () => {
    expect(PHASES.map((p) => p.number)).toEqual([1, 2, 3, 4]);
    expect(PHASES.map((p) => p.taskCount)).toEqual([11, 15, 12, 10]);
    for (let i = 1; i < PHASES.length; i++) {
      expect(dayIndex(PHASES[i].start)).toBeGreaterThan(
        dayIndex(PHASES[i - 1].start)
      );
    }
  });

  it("lists exactly the tasks each phase counts", () => {
    for (const phase of PHASES) {
      const tasks = TASKS.filter((t) => t.phase === phase.number);
      expect(tasks, `phase ${phase.number}`).toHaveLength(phase.taskCount);
    }
  });

  it("keeps every task inside its phase window and the board range", () => {
    for (const task of TASKS) {
      const phase = PHASES.find((p) => p.number === task.phase)!;
      expect(dayIndex(task.start), task.title).toBeLessThanOrEqual(
        dayIndex(task.end)
      );
      expect(dayIndex(task.start), task.title).toBeGreaterThanOrEqual(
        dayIndex(phase.start)
      );
      expect(dayIndex(task.end), task.title).toBeLessThanOrEqual(
        dayIndex(phase.end)
      );
      expect(inRange(task.start) && inRange(task.end), task.title).toBe(true);
    }
  });

  it("keeps readings and recurring dates inside the board range", () => {
    for (const r of READINGS) {
      expect(inRange(r.start) && inRange(r.end), r.title).toBe(true);
    }
    expect(RECURRING).toHaveLength(5);
    for (const r of RECURRING) {
      for (const d of r.dates) expect(inRange(d), r.title).toBe(true);
    }
  });

  it("covers September to December in the curriculum lane", () => {
    expect(CURRICULUM_MONTHS.map((m) => m.month)).toEqual([9, 10, 11, 12]);
    for (const m of CURRICULUM_MONTHS) {
      expect(m.goals.length).toBeGreaterThan(0);
      expect(m.topics.length).toBeGreaterThan(0);
    }
  });
});

describe("formatEffort", () => {
  it("shows minutes under an hour and hours otherwise", () => {
    expect(formatEffort(0.25)).toBe("15 min");
    expect(formatEffort(0.5)).toBe("30 min");
    expect(formatEffort(1)).toBe("1h");
    expect(formatEffort(1.5)).toBe("1.5h");
    expect(formatEffort(16)).toBe("16h");
  });
});
