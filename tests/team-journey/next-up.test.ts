import { describe, expect, it } from "vitest";
import { pickTeamNextUp } from "@/lib/team-journey/next-up";
import type { TeamDetailTask } from "@/lib/team-journey/detail-transforms";

const achievements = [
  { achievement_id: "val", achievement_name: "Idea Validation", sort_order: 3 },
  {
    achievement_id: "cust",
    achievement_name: "Customer Acquisition",
    sort_order: 1,
  },
  { achievement_id: "rec", achievement_name: "Recurring Tasks", sort_order: 4 },
];

function task(partial: Partial<TeamDetailTask> & { task_id: string }) {
  return {
    progress_id: null,
    is_confidential: false,
    title: partial.task_id,
    description: "",
    category: "general",
    difficulty_level: 1,
    base_xp_reward: 100,
    base_credits_reward: 10,
    status: "not_started",
    recurring_status: null,
    assigned_to_user_id: null,
    assignee_name: null,
    assignee_avatar_url: null,
    assigned_at: null,
    started_at: null,
    completed_at: null,
    is_available: true,
    achievement_id: null,
    achievement_name: null,
    is_recurring: false,
    cooldown_days: null,
    template_code: null,
    next_available_at: null,
    has_active_instance: false,
    detailed_instructions: null,
    learning_objectives: null,
    deliverables: null,
    resources: null,
    ...partial,
  } satisfies TeamDetailTask;
}

describe("pickTeamNextUp", () => {
  it("returns nothing for an empty team", () => {
    expect(pickTeamNextUp([], achievements, "me")).toEqual({
      inProgress: [],
      nextUp: null,
    });
  });

  it("lists open work newest first, finished and untouched tasks excluded", () => {
    const tasks = [
      task({ task_id: "a", status: "in_progress", started_at: "2026-10-01" }),
      task({ task_id: "b", status: "approved", started_at: "2026-10-02" }),
      task({
        task_id: "c",
        status: "pending_review",
        started_at: "2026-10-03",
      }),
      task({ task_id: "d", status: "rejected", started_at: null }),
      task({ task_id: "e", status: "not_started" }),
    ];
    const { inProgress } = pickTeamNextUp(tasks, achievements, "me");
    expect(inProgress.map((t) => t.task_id)).toEqual(["c", "a", "d"]);
  });

  it("picks the first untouched task in card order (Idea Validation first)", () => {
    const tasks = [
      task({ task_id: "r1", achievement_id: "rec" }),
      task({ task_id: "c1", achievement_id: "cust", status: "approved" }),
      task({ task_id: "c2", achievement_id: "cust" }),
      task({ task_id: "v1", achievement_id: "val" }),
    ];
    expect(pickTeamNextUp(tasks, achievements, "me").nextUp?.task_id).toBe(
      "v1"
    );
    const withoutValidation = tasks.filter((t) => t.achievement_id !== "val");
    expect(
      pickTeamNextUp(withoutValidation, achievements, "me").nextUp?.task_id
    ).toBe("c2");
  });

  it("prefers a task assigned to the viewer, then unassigned, then others", () => {
    const tasks = [
      task({
        task_id: "other",
        achievement_id: "val",
        assigned_to_user_id: "x",
      }),
      task({ task_id: "free", achievement_id: "val" }),
      task({
        task_id: "mine",
        achievement_id: "val",
        assigned_to_user_id: "me",
      }),
    ];
    expect(pickTeamNextUp(tasks, achievements, "me").nextUp?.task_id).toBe(
      "mine"
    );
    expect(
      pickTeamNextUp(tasks.slice(0, 2), achievements, "me").nextUp?.task_id
    ).toBe("free");
    expect(
      pickTeamNextUp(tasks.slice(0, 1), achievements, "me").nextUp?.task_id
    ).toBe("other");
  });

  it("treats a recurring task that is available again as untouched", () => {
    const tasks = [
      task({
        task_id: "r1",
        achievement_id: "rec",
        status: "approved",
        is_recurring: true,
        is_available: true,
      }),
      task({
        task_id: "r2",
        achievement_id: "rec",
        status: "cooldown",
        is_recurring: true,
        is_available: false,
      }),
    ];
    expect(pickTeamNextUp(tasks, achievements, "me").nextUp?.task_id).toBe(
      "r1"
    );
  });

  it("falls back to tasks without an achievement when the cards have none", () => {
    const tasks = [task({ task_id: "loose" })];
    expect(pickTeamNextUp(tasks, achievements, "me").nextUp?.task_id).toBe(
      "loose"
    );
  });
});
