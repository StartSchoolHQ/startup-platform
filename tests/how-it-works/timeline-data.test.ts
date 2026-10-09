import { describe, it, expect } from "vitest";
import {
  CURRICULUM_MONTHS,
  HACKATHON,
  HOLIDAY_BUFFER,
  PHASES,
  READINGS,
  READING_DEADLINE,
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

  it("states the 75% gate with the numbers the app uses", () => {
    expect(PHASES.map((p) => p.opensAt)).toEqual([
      undefined,
      "Opens at 9 of 11 Phase 1 tasks approved (75%)",
      "Opens at 12 of 15 Phase 2 tasks approved (75%)",
      "Opens at 9 of 12 Phase 3 tasks approved (75%)",
    ]);
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
      // Books run at your own pace to the deadline; everything else ends
      // with its phase.
      const latest = task.reading ? READING_DEADLINE : phase.end;
      expect(dayIndex(task.end), task.title).toBeLessThanOrEqual(
        dayIndex(latest)
      );
      expect(inRange(task.start) && inRange(task.end), task.title).toBe(true);
    }
  });

  it("waits only after the work, and never past the phase", () => {
    const waiting = TASKS.filter((t) => t.waitsUntil);
    expect(waiting).toHaveLength(6);
    for (const task of waiting) {
      const phase = PHASES.find((p) => p.number === task.phase)!;
      expect(dayIndex(task.waitsUntil!), task.title).toBeGreaterThan(
        dayIndex(task.end)
      );
      expect(dayIndex(task.waitsUntil!), task.title).toBeLessThanOrEqual(
        dayIndex(phase.end)
      );
    }
  });

  it("keeps readings, milestones and recurring dates inside the board range", () => {
    expect(READINGS.map((r) => r.title)).toEqual(["The Mom Test", "Mindset"]);
    for (const r of READINGS) {
      expect(inRange(r.start), r.title).toBe(true);
      expect(r.end).toBe(READING_DEADLINE);
    }
    for (const m of [HOLIDAY_BUFFER, ...HACKATHON]) {
      expect(inRange(m.start) && inRange(m.end), m.label).toBe(true);
    }
    expect(HACKATHON.map((m) => m.start.slice(0, 7))).toEqual([
      "2027-01",
      "2027-01",
    ]);
    expect(RECURRING).toHaveLength(4);
    for (const r of RECURRING) {
      for (const d of r.dates) expect(inRange(d), r.title).toBe(true);
    }
  });

  it("covers September to January in the curriculum lane", () => {
    expect(CURRICULUM_MONTHS.map((m) => m.month)).toEqual([9, 10, 11, 12, 1]);
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
