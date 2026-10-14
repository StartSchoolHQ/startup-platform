import { describe, expect, it } from "vitest";
import { rigaDate, runProgramAssistant } from "@/lib/program-assistant/run";

/**
 * Orchestrator with a scripted Supabase client and a scripted fetch.
 * No database, no network: every RPC call and every HTTP call is recorded.
 */

const CSV_HEADER =
  "User ID,Name,Login,Status,Email,Last Login,Cohort Name,Preseason Web,Preseason Data,Season 01 Arc 01,Season 02 Fullstack";

function csvWith(n: number): string {
  const lines = [CSV_HEADER];
  for (let i = 1; i <= n; i++) {
    lines.push(
      `${i},Student ${i},s${i},active,s${i}@startschool.org,2026-10-13 08:00:00 UTC,Triffid Nebula - Andromeda,${i},,,`
    );
  }
  return lines.join("\n") + "\n";
}

interface Rpc {
  fn: string;
  args: Record<string, unknown>;
}

function fakeAdmin(opts: {
  tracks?: Array<Record<string, unknown>>;
  settings?: Record<string, unknown>;
  failRpc?: string;
}) {
  const rpcs: Rpc[] = [];
  const uploads: string[] = [];
  const admin = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              value: {
                enabled: true,
                cohort: "Triffid Nebula",
                expected_cohort_rows: [2, 10],
                unmapped_fail_pct: 50,
                n8n_webhook_base: "https://n8n.test/webhook",
                ...(opts.settings ?? {}),
              },
            },
            error: null,
          }),
        }),
      }),
    }),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcs.push({ fn, args });
      if (fn === opts.failRpc)
        return { data: null, error: { message: "boom" } };
      switch (fn) {
        case "program_run_start_v1":
          return { data: "run-1", error: null };
        case "program_student_tracks_v1":
          return { data: opts.tracks ?? [], error: null };
        case "program_snapshot_upsert_v1":
          return {
            data: { upserted: (args.p_rows as unknown[]).length },
            error: null,
          };
        case "program_verdicts_write_v1":
          return {
            data: { written: 3, by_status: { "On pace": 3 } },
            error: null,
          };
        case "program_explain_inputs_v1":
          return { data: [], error: null };
        case "program_data_issue_replace_v1":
          return { data: (args.p_issues as unknown[]).length, error: null };
        case "program_request_sheet_refresh_v1":
          return { data: 42, error: null };
        default:
          return { data: null, error: null };
      }
    },
    storage: {
      from: () => ({
        upload: async (path: string) => {
          uploads.push(path);
          return { data: { path }, error: null };
        },
      }),
    },
  };
  return { admin: admin as never, rpcs, uploads };
}

function fakeFetch(opts: { csv: string; attendanceFails?: boolean }) {
  const posts: Array<{ url: string; body: unknown }> = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });
    if (url.startsWith("https://n8n.test/webhook/")) {
      posts.push({ url, body: JSON.parse(String(init?.body ?? "{}")) });
      if (url.endsWith("/program/attendance-sync") && opts.attendanceFails) {
        return json(500, { ok: false, error: "sheet unreachable" });
      }
      if (url.endsWith("/program/alert")) return json(200, { ok: true });
      return json(200, { ok: true, result: { matched: 90 } });
    }
    // Qwasar: sign_in → CAS → POST → ticket → export
    if (url.endsWith("/users/sign_in")) {
      return new Response("", {
        status: 302,
        headers: { location: "https://cas.test/login?service=svc" },
      });
    }
    if (url.startsWith("https://cas.test/login?")) {
      return new Response(
        '<form action="/login" method="post"><input type="hidden" name="lt" value="LT-1"/><input name="username"/><input type="password" name="password"/></form>',
        { status: 200, headers: { "set-cookie": "_appcas_session=c" } }
      );
    }
    if (url === "https://cas.test/login") {
      return new Response("", {
        status: 302,
        headers: {
          location: "https://upskill.us.qwasar.io/users/service?ticket=ST-1",
        },
      });
    }
    if (url.includes("/users/service?ticket=")) {
      return new Response("", {
        status: 200,
        headers: { "set-cookie": "_upskill_session=u" },
      });
    }
    if (url.includes("download_progress")) {
      return new Response(opts.csv, {
        status: 200,
        headers: { "content-type": "text/csv" },
      });
    }
    return new Response("nope", { status: 404 });
  }) as typeof fetch;
  return { fetchImpl, posts };
}

const env = { secret: "s3cret", qwasarUsername: "u", qwasarPassword: "p" };
const now = () => new Date("2026-10-14T05:00:00Z");

describe("rigaDate", () => {
  it("files the snapshot under the Riga calendar date", () => {
    expect(rigaDate(new Date("2026-10-14T22:30:00Z"))).toBe("2026-10-15");
    expect(rigaDate(new Date("2026-10-14T05:00:00Z"))).toBe("2026-10-14");
  });
});

describe("runProgramAssistant", () => {
  it("runs every step and finishes done", async () => {
    const { admin, rpcs, uploads } = fakeAdmin({
      tracks: [
        { qwasar_user_id: 1, sheet_status: "Active" },
        { qwasar_user_id: 2, sheet_status: "Active" },
        { qwasar_user_id: 3, sheet_status: "Dropout" },
      ],
    });
    const { fetchImpl, posts } = fakeFetch({ csv: csvWith(3) });
    const out = await runProgramAssistant(admin, {
      kind: "scheduled",
      env,
      fetchImpl,
      now,
    });
    expect(out.status).toBe("done");
    expect(out.snapshotDate).toBe("2026-10-14");
    expect(out.steps.map((s) => `${s.step}:${s.status}`)).toEqual([
      "attendance_sync:ok",
      "track_sync:ok",
      "import:ok",
      "store_csv:ok",
      "snapshot:ok",
      "verdicts:ok",
      "data_issues:ok",
      "explain:ok",
      "sheet_refresh:ok",
    ]);
    expect(posts.map((p) => p.url.split("/webhook")[1])).toEqual([
      "/program/attendance-sync",
      "/program/track-sync",
    ]);
    const snapshot = rpcs.find((r) => r.fn === "program_snapshot_upsert_v1")!;
    expect(snapshot.args.p_snapshot_date).toBe("2026-10-14");
    expect(snapshot.args.p_kind).toBe("scheduled");
    expect((snapshot.args.p_rows as unknown[]).length).toBe(3);
    const issues = rpcs.find((r) => r.fn === "program_data_issue_replace_v1")!;
    expect(
      (issues.args.p_issues as Array<{ kind: string }>).map((i) => i.kind)
    ).toEqual(["dropout_but_active"]);
    expect(uploads).toEqual(["qwasar/2026-10-14-run-1.csv"]);
    const finish = rpcs.find((r) => r.fn === "program_run_finish_v1")!;
    expect(finish.args.p_status).toBe("done");
    expect(String(finish.args.p_slack_message)).toContain("Qwasar pace check");
    expect(
      (issues.args.p_issues as Array<{ suggested_fix: string }>)[0]
        .suggested_fix
    ).toContain("Qwasar");
  });

  it("keeps going when a reader fails but stops and alerts when the cohort is wrong", async () => {
    const { admin, rpcs } = fakeAdmin({
      settings: { expected_cohort_rows: [50, 60] },
    });
    const { fetchImpl, posts } = fakeFetch({
      csv: csvWith(3),
      attendanceFails: true,
    });
    const out = await runProgramAssistant(admin, {
      kind: "adhoc",
      env,
      fetchImpl,
      now,
    });
    expect(out.status).toBe("failed");
    expect(out.error).toMatch(/^import: cohort has 3 active students/);
    expect(out.steps.map((s) => `${s.step}:${s.status}`)).toEqual([
      "attendance_sync:warning",
      "track_sync:ok",
      "import:failed",
    ]);
    expect(rpcs.some((r) => r.fn === "program_snapshot_upsert_v1")).toBe(false);
    const finish = rpcs.find((r) => r.fn === "program_run_finish_v1")!;
    expect(finish.args.p_status).toBe("failed");
    const alert = posts.find((p) => p.url.endsWith("/program/alert"))!;
    expect((alert.body as { subject: string }).subject).toContain(
      "failed at import"
    );
  });

  it("fails the run when the snapshot upsert errors", async () => {
    const { admin } = fakeAdmin({
      failRpc: "program_snapshot_upsert_v1",
      tracks: [1, 2, 3].map((id) => ({
        qwasar_user_id: id,
        sheet_status: "Active",
      })),
    });
    const { fetchImpl } = fakeFetch({ csv: csvWith(3) });
    const out = await runProgramAssistant(admin, {
      kind: "scheduled",
      env,
      fetchImpl,
      now,
    });
    expect(out.status).toBe("failed");
    expect(out.error).toContain("snapshot:");
  });
});
