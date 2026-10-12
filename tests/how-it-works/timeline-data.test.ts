import { describe, it, expect } from "vitest";
import {
  CURRICULUM_MONTHS,
  GATES,
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
    expect(GATES.map((g) => g.label)).toEqual([
      "75% done (9/11) · Phase 2 unlocks Oct 13",
      "75% done (12/15) · Phase 3 unlocks Nov 2",
      "75% done (9/12) · Phase 4 unlocks Nov 26",
      "75% done (8/10)",
    ]);
    // The first three gates sit on the day the next phase is planned to open.
    for (const g of GATES.slice(0, 3)) {
      expect(g.date).toBe(PHASES[g.phase].start);
    }
    expect(inRange(GATES[3].date)).toBe(true);
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
      // Mindset runs at your own pace to the deadline; everything else
      // ends with its phase.
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
    const [momTest, mindset] = READINGS;
    // The Mom Test fills the first two weeks; Mindset starts the day after
    // and runs at your own pace to the deadline.
    expect(momTest.start).toBe(PHASES[0].start);
    expect(dayIndex(momTest.end) - dayIndex(momTest.start)).toBe(13);
    expect(dayIndex(mindset.start)).toBe(dayIndex(momTest.end) + 1);
    expect(mindset.end).toBe(READING_DEADLINE);
    for (const r of READINGS) {
      expect(inRange(r.start) && inRange(r.end), r.title).toBe(true);
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
