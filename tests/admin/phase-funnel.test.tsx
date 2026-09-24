// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PhaseFunnel } from "@/components/admin/analytics/my-journey/phase-funnel";

const funnel = [
  { phase_order: 1, phase_name: "Know Yourself & Experiment", students: 12 },
  { phase_order: 2, phase_name: "Get Outside the Building", students: 5 },
  { phase_order: 3, phase_name: "Become a Builder", students: 1 },
  { phase_order: 4, phase_name: "Think Like a Founder", students: 0 },
];

describe("PhaseFunnel", () => {
  it("renders one bar per phase with the student count", () => {
    render(<PhaseFunnel funnel={funnel} total={18} />);
    for (const p of funnel) {
      expect(screen.getByText(p.phase_name)).toBeTruthy();
    }
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.getAllByRole("meter")).toHaveLength(4);
  });

  it("names what fills it when the cohort is empty", () => {
    render(
      <PhaseFunnel
        funnel={funnel.map((p) => ({ ...p, students: 0 }))}
        total={0}
      />
    );
    expect(screen.getByText(/Fills in when a student starts/)).toBeTruthy();
  });
});
