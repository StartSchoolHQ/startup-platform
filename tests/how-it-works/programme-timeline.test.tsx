// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgrammeTimeline } from "@/components/how-it-works/timeline/programme-timeline";
import {
  PHASES,
  READINGS,
  RECURRING,
  TASKS,
} from "@/components/how-it-works/timeline/timeline-data";

describe("ProgrammeTimeline", () => {
  it("draws every phase, task, reading and recurring row", () => {
    render(<ProgrammeTimeline today="2026-09-30" />);
    for (const p of PHASES)
      expect(screen.getByText(p.name, { exact: false })).toBeTruthy();
    for (const t of TASKS)
      expect(screen.getAllByText(t.title).length).toBeGreaterThan(0);
    for (const r of READINGS) expect(screen.getByText(r.title)).toBeTruthy();
    for (const r of RECURRING) expect(screen.getByText(r.title)).toBeTruthy();
  });

  it("labels the gate with the app's real unlock rule", () => {
    render(<ProgrammeTimeline today="2026-09-30" />);
    expect(screen.getByText(/9 of 11 Phase 1 tasks approved/)).toBeTruthy();
  });

  it("marks today only while the programme is running", () => {
    const { unmount } = render(<ProgrammeTimeline today="2026-10-20" />);
    expect(screen.getByText(/Today/)).toBeTruthy();
    unmount();
    render(<ProgrammeTimeline today="2027-02-01" />);
    expect(screen.queryByText(/Today/)).toBeNull();
  });
});
