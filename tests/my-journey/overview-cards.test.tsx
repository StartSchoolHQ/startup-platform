// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContinueCardV2 } from "@/components/dashboard/my-journey/continue-card-v2";
import { NextUpCardV2 } from "@/components/dashboard/my-journey/next-up-card-v2";
import { AchievementProgressV2 } from "@/components/dashboard/my-journey/achievement-progress-v2";
import { MY_JOURNEY_TASKS_ANCHOR } from "@/lib/my-journey-anchors";

const phases = [
  {
    achievement_id: "a1",
    name: "Know Yourself & Experiment",
    completed_tasks: 3,
    total_tasks: 11,
    status: "in_progress",
  },
  {
    achievement_id: "a2",
    name: "Get Outside the Building",
    completed_tasks: 0,
    total_tasks: 15,
    status: "not_started",
  },
] as never[];

describe("My Journey overview cards", () => {
  it("Continue empty state sends the student to the task list, not the page they are on", () => {
    render(<ContinueCardV2 tasks={[]} />);
    const link = screen.getByRole("link", { name: /pick your first task/i });
    expect(link.getAttribute("href")).toBe(
      `/dashboard/my-journey#${MY_JOURNEY_TASKS_ANCHOR}`
    );
  });

  it("Next up button also points at the task list", () => {
    render(
      <NextUpCardV2
        task={{
          task_id: "t1",
          title: "Write your founder story",
          category: "founder-mindset",
          xp_reward: 50,
          points_reward: 0,
        }}
        totalTasks={60}
      />
    );
    const link = screen.getByRole("link", { name: /see tasks/i });
    expect(link.getAttribute("href")).toBe(
      `/dashboard/my-journey#${MY_JOURNEY_TASKS_ANCHOR}`
    );
  });

  it("phase rings are read-only: no links, nothing to click", () => {
    render(<AchievementProgressV2 achievements={phases} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByText("Know Yourself & Experiment")).toBeTruthy();
    expect(screen.getByText("27%")).toBeTruthy();
  });
});
