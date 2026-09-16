import { describe, expect, it } from "vitest";
import { buildMyJourneyTasks } from "@/lib/my-journey-tasks";

const owner = { name: "Test Student", avatarUrl: null };
const NOW = Date.parse("2026-09-16T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function visible(taskId: string, status: string | null, progressId?: string) {
  return {
    task_id: taskId,
    progress_id: progressId ?? null,
    task_title: `Task ${taskId}`,
    task_description: null,
    difficulty_level: 2,
    base_xp_reward: 35,
    base_points_reward: 28,
    progress_status: status ?? "not_started",
    is_available: !status || status === "not_started",
    phase_locked: false,
    achievement_id: "recurring",
    assigned_at: status && status !== "not_started" ? "2026-09-01" : null,
  };
}

function recurringRow(
  taskId: string,
  overrides: Partial<{
    last_completion: string | null;
    next_available: string | null;
    recurring_status: string;
    has_active_instance: boolean;
  }> = {}
) {
  return {
    task_id: taskId,
    cooldown_days: 28,
    last_completion: null,
    next_available: null,
    recurring_status: "never_completed",
    has_active_instance: false,
    ...overrides,
  };
}

describe("buildMyJourneyTasks — recurring overlay", () => {
  it("leaves non-recurring rows untouched", () => {
    const [row] = buildMyJourneyTasks([visible("a", null)], [], owner, [], NOW);
    expect(row.isRecurring).toBeUndefined();
    expect(row.status).toBe("Not Started");
  });

  it("marks a never-completed recurring task as plain Not Started", () => {
    const [row] = buildMyJourneyTasks(
      [visible("a", null)],
      [],
      owner,
      [recurringRow("a")],
      NOW
    );
    expect(row.isRecurring).toBe(true);
    expect(row.cooldownHours).toBe(28 * 24);
    expect(row.status).toBe("Not Started");
    expect(row.nextAvailableAt).toBeNull();
    expect(row.recurringStatus).toBe("never_completed");
  });

  it("shows Cooldown with a countdown while the window is open", () => {
    const next = new Date(NOW + 10 * DAY).toISOString();
    const [row] = buildMyJourneyTasks(
      [visible("a", "approved", "p1")],
      [],
      owner,
      [
        recurringRow("a", {
          last_completion: new Date(NOW - 18 * DAY).toISOString(),
          next_available: next,
          recurring_status: "cooldown",
        }),
      ],
      NOW
    );
    expect(row.status).toBe("Cooldown");
    expect(row.action).toBe("done");
    expect(row.isAvailable).toBe(false);
    expect(row.nextAvailableAt).toBe(next);
  });

  it("keeps Cooldown but drops the countdown once the window has passed but the row is not yet reset", () => {
    const [row] = buildMyJourneyTasks(
      [visible("a", "approved", "p1")],
      [],
      owner,
      [
        recurringRow("a", {
          last_completion: new Date(NOW - 30 * DAY).toISOString(),
          next_available: new Date(NOW - 2 * DAY).toISOString(),
          recurring_status: "cooldown",
        }),
      ],
      NOW
    );
    // No "Start again" before the cron sweep archives the last submission.
    expect(row.status).toBe("Cooldown");
    expect(row.nextAvailableAt).toBeNull();
  });

  it("offers Start again once the row has been reset", () => {
    const past = new Date(NOW - 2 * DAY).toISOString();
    const [row] = buildMyJourneyTasks(
      [visible("a", "not_started", "p1")],
      [],
      owner,
      [
        recurringRow("a", {
          last_completion: new Date(NOW - 30 * DAY).toISOString(),
          next_available: past,
          recurring_status: "available",
        }),
      ],
      NOW
    );
    expect(row.status).toBe("Available");
    expect(row.action).toBe("restart");
    expect(row.nextAvailableAt).toBe(past);
    expect(row.responsible).toBeUndefined();
    expect(row.isAvailable).toBe(true);
  });

  it("keeps an in-progress second cycle as In Progress", () => {
    const [row] = buildMyJourneyTasks(
      [visible("a", "in_progress", "p1")],
      [],
      owner,
      [
        recurringRow("a", {
          last_completion: new Date(NOW - 30 * DAY).toISOString(),
          next_available: new Date(NOW - 2 * DAY).toISOString(),
          recurring_status: "available",
          has_active_instance: true,
        }),
      ],
      NOW
    );
    expect(row.status).toBe("In Progress");
    expect(row.hasActiveInstance).toBe(true);
    expect(row.nextAvailableAt).toBeNull();
  });
});
