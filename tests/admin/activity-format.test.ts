import { describe, expect, it } from "vitest";
import {
  ACTIVITY_KINDS,
  formatActivity,
  type ActivityRow,
} from "@/lib/activity/format";

const base: ActivityRow = {
  id: "task_progress:1",
  occurred_at: "2026-09-24T10:00:00Z",
  kind: "task_submitted",
  subject_user_id: "u1",
  subject_name: "Anna Bērziņa",
  actor_user_id: null,
  actor_name: null,
  team_name: null,
  object_title: "Interview 3 users",
  amount_xp: null,
  amount_points: null,
  status: null,
  detail: null,
  ref_id: "t1",
  extra: {},
};

const row = (patch: Partial<ActivityRow>): ActivityRow => ({
  ...base,
  ...patch,
});

describe("formatActivity", () => {
  it("writes a plain sentence for a submitted task", () => {
    expect(formatActivity(base).text).toBe(
      "Anna Bērziņa submitted “Interview 3 users” for review"
    );
  });

  it("names the AI reviewer only when the decision came from ai_task_reviews", () => {
    expect(
      formatActivity(
        row({ kind: "task_approved", actor_name: null, extra: {} })
      ).text
    ).toBe("A reviewer approved “Interview 3 users” for Anna Bērziņa");
    const f = formatActivity(
      row({
        kind: "task_approved",
        amount_xp: 150,
        actor_name: null,
        extra: { decided_by: "ai", attempt: 1 },
      })
    );
    expect(f.text).toBe(
      "AI reviewer approved “Interview 3 users” for Anna Bērziņa, +150 XP"
    );
    expect(f.tone).toBe("positive");
  });

  it("names the human reviewer when there is one", () => {
    expect(
      formatActivity(
        row({
          kind: "task_rejected",
          actor_name: "Jānis Ozols",
          detail: "No evidence of a real conversation.",
        })
      ).text
    ).toBe("Jānis Ozols sent “Interview 3 users” back to Anna Bērziņa");
  });

  it("describes XP in the economy's own words", () => {
    expect(
      formatActivity(
        row({
          kind: "xp",
          amount_xp: 50,
          amount_points: 25,
          extra: { economy: "team" },
          detail: "Completed client meeting: Lovat SIA",
        })
      ).text
    ).toBe("Anna Bērziņa earned 50 Team XP and 25 Team Points");
    expect(
      formatActivity(
        row({
          kind: "xp",
          amount_xp: -100,
          amount_points: 0,
          extra: { economy: "team" },
        })
      ).text
    ).toBe("Anna Bērziņa lost 100 Team XP");
  });

  it("covers strikes, meetings, reports and achievements", () => {
    expect(
      formatActivity(
        row({
          kind: "strike_issued",
          object_title: "Missed weekly report",
          team_name: "Lovat",
        })
      ).text
    ).toBe("Anna Bērziņa got a strike: Missed weekly report (Lovat)");
    expect(
      formatActivity(
        row({ kind: "strike_resolved", actor_name: "Jānis Ozols" })
      ).text
    ).toBe("Jānis Ozols resolved Anna Bērziņa's strike");
    expect(
      formatActivity(
        row({
          kind: "meeting_logged",
          object_title: "Lovat SIA",
          team_name: "Lovat",
        })
      ).text
    ).toBe("Anna Bērziņa logged a client meeting with Lovat SIA (Lovat)");
    expect(
      formatActivity(
        row({
          kind: "weekly_report",
          team_name: null,
          extra: { week_number: 39 },
        })
      ).text
    ).toBe("Anna Bērziņa submitted their solo weekly report for week 39");
    expect(
      formatActivity(
        row({
          kind: "achievement",
          object_title: "Know Yourself & Experiment",
          amount_xp: 100,
        })
      ).text
    ).toBe(
      "Anna Bērziņa completed the phase “Know Yourself & Experiment”, +100 XP"
    );
  });

  it("covers account and team membership changes from the audit log", () => {
    expect(formatActivity(row({ kind: "account_joined" })).text).toBe(
      "Anna Bērziņa joined the platform"
    );
    expect(
      formatActivity(
        row({
          kind: "account_status",
          status: "archived",
          actor_name: "Jānis Ozols",
        })
      ).text
    ).toBe("Jānis Ozols set Anna Bērziņa's account to archived");
    expect(
      formatActivity(
        row({ kind: "account_status", status: "archived", actor_name: null })
      ).text
    ).toBe("Anna Bērziņa's account was set to archived");
    expect(
      formatActivity(row({ kind: "team_joined", team_name: "Lovat" })).text
    ).toBe("Anna Bērziņa joined the team Lovat");
  });

  it("never throws on an unknown kind and still shows who it was about", () => {
    const f = formatActivity(
      row({ kind: "something_new" as ActivityRow["kind"] })
    );
    expect(f.text).toContain("Anna Bērziņa");
    expect(f.badge).toBe("Other");
  });

  it("has a label for every known kind", () => {
    for (const kind of ACTIVITY_KINDS) {
      const f = formatActivity(row({ kind }));
      expect(f.badge.length).toBeGreaterThan(0);
      expect(f.text.length).toBeGreaterThan(0);
    }
  });
});
