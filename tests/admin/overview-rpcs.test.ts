import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

// Read-only checks against the admin overview RPCs. No rows are written.
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe("admin overview RPCs", () => {
  it("get_admin_program_health_v3 counts only active students", async () => {
    const { data, error } = await admin.rpc("get_admin_program_health_v3");
    expect(error).toBeNull();
    const row = (data as Record<string, number>[])[0];

    const { count } = await admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("primary_role", "user")
      .eq("status", "active");

    expect(Number(row.total_students)).toBe(count);
    expect(
      Number(row.students_active) +
        Number(row.students_slowing) +
        Number(row.students_at_risk)
    ).toBeLessThanOrEqual(count ?? 0);
  });

  it("get_admin_task_pipeline_v1 aggregates active users/teams in SQL", async () => {
    const { data, error } = await admin.rpc("get_admin_task_pipeline_v1");
    expect(error).toBeNull();
    const rows = data as {
      activity_type: string;
      status: string;
      count: number;
    }[];
    const total = rows.reduce((sum, r) => sum + Number(r.count), 0);

    const { count } = await admin
      .from("task_progress")
      .select("id", { count: "exact", head: true });

    // Grouped in SQL, so the 1000-row client cap cannot apply. Archived
    // users/teams are excluded, so the total is lower than the raw row count.
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(count ?? 0);
    for (const r of rows) {
      expect(["individual", "team"]).toContain(r.activity_type);
    }
  });
});
