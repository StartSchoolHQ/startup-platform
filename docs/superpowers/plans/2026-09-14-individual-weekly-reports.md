# Individual (My Journey) Weekly Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give My Journey (solo) students a 4-question weekly report — new RPCs, dashboard card, banner, reminders, admin filter — without touching the Team Journey weekly report.

**Architecture:** One additive migration adds a partial unique index and three RPCs (`submit_individual_weekly_report_v1`, `get_individual_weekly_report_status_v1`, `send_individual_weekly_report_reminders_v1`) plus two cron jobs. The frontend gets a small `individual/` component folder (modal, questions, history), one hook, one dashboard card, one banner; the mode rule (team form if Team Journey on **and** in an active team, else solo) is evaluated from `usePlatformSettings()` + `get_my_journey_overview_v1().has_active_team` in the UI and in SQL for reminders. The 976-line team modal, its RPCs, cron jobs and the strikes edge function are **never edited**.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, TanStack Query, Zod, ShadCN/UI, Supabase (Postgres + pg_cron) via MCP, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-14-individual-weekly-reports-design.md`

## Global Constraints

- Purely additive DB work. Do not `CREATE OR REPLACE` any existing function, do not alter jobs 2, 5, 7 in `cron.job`, do not touch `weekly-report-modal.tsx`.
- Supabase project id `ksoohvygoysofvtqdumz`. Apply the migration with the MCP `apply_migration` tool, name `weekly_reports_individual_v1`; the repo file must be byte-identical to what was applied.
- Take a manual Supabase backup before applying the migration (Database Changes Safety Protocol in `CLAUDE.md`).
- Every DB row a test or a verification step creates is deleted in the same run and the deletion is verified.
- Prettier: `printWidth 80`, double quotes, `trailingComma: "es5"`; ESLint runs via lint-staged. Files ≤ ~200 lines. `"use client"` only on interactive components.
- Student-facing unit labels never say bare "XP"/"Points"; this feature shows none.
- Payload keys are exactly: `commitments`, `blockers`, `nextWeekCommitments`, `alignmentScore`, `alignmentReason`, `submittedAt`.
- RPC error codes the UI maps: `MY_JOURNEY_DISABLED`, `ALREADY_SUBMITTED`.
- Notification types reused: `weekly_report_reminder_2day`, `weekly_report_reminder_1day`, with `data.context = 'individual'`.
- Commits: one per task, explicit paths only (the working tree has unrelated untracked files — never `git add .`). No push until the user says so. Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Branch: `feature/individual-weekly-reports` created from the current HEAD, which must equal `origin/develop` (verify in Task 0).

---

## File structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20260914100000_weekly_reports_individual_v1.sql` | index + 3 RPCs + 2 cron jobs |
| `tests/weekly-reports/individual-rpcs.test.ts` | DB round-trip for submit/status RPCs as a signed-in test student; asserts cleanup |
| `src/types/weekly-report.ts` | payload, status and history TS types |
| `src/lib/individual-weekly-report.ts` | pure helpers: `normalizeIndividualReport`, `mapIndividualReportRpcError`, `emptyIndividualReportForm` |
| `src/lib/validation-schemas.ts` | `IndividualWeeklyReportSchema` (append) |
| `src/lib/weekly-reports.ts` | add `isWeeklyReportBannerWindow`; delete two dead solo helpers |
| `tests/weekly-reports/individual-schema.test.ts` | Zod + helper unit tests (no DB) |
| `src/hooks/use-individual-weekly-report.ts` | status query + submit mutation |
| `src/components/weekly-reports/individual/commitments-field.tsx` | Q1 repeatable commitments with status |
| `src/components/weekly-reports/individual/individual-report-questions.tsx` | Q1–Q4 composed, controlled |
| `src/components/weekly-reports/individual/individual-weekly-report-modal.tsx` | dialog shell, draft prefill, submit/draft actions |
| `src/components/weekly-reports/individual/individual-weekly-report-history.tsx` | past reports dialog |
| `src/components/dashboard/my-journey/weekly-report-card.tsx` | dashboard card (solo mode only) |
| `src/components/dashboard/individual-weekly-report-banner.tsx` | Friday→Monday banner (solo mode only) |
| `src/components/dashboard/my-journey-overview.tsx` | mount the card |
| `src/components/dashboard-layout-client.tsx` | mount the banner |
| `src/components/notification-center.tsx` | solo reminder deep link → `/dashboard` |
| `src/app/api/admin/weekly-reports/route.ts` | `context` query param |
| `src/components/admin/admin-weekly-reports-table.tsx` | Context filter + Solo badge |
| `src/components/admin/admin-weekly-report-view-modal.tsx` | context badge in header |
| deleted: `src/components/weekly-reports/individual-weekly-report-modal.tsx`, `src/components/weekly-reports/individual-weekly-reports-table.tsx`, `src/types/my-journey.ts` | dead code |
| docs: `economies.md`, `team-journey.md`, `dashboard.md`, `notifications.md`, `docs/pages/admin/weekly-reports.md`, `CLAUDE.md` | documentation + rollback entry |

---

### Task 0: Branch

**Files:** none

- [ ] **Step 1: Confirm HEAD is develop**

```bash
git fetch origin && git rev-parse HEAD origin/develop
```
Expected: two identical hashes. If they differ, stop and ask the user.

- [ ] **Step 2: Create the branch without touching the working tree**

```bash
git switch -c feature/individual-weekly-reports
git status --short | head
```
Expected: branch created; the pre-existing untracked files (`.pdfpreview/`, CSV, `reports/`, …) are still listed and stay untracked for the whole plan.

---

### Task 1: Migration — index, RPCs, cron

**Files:**
- Create: `supabase/migrations/20260914100000_weekly_reports_individual_v1.sql`
- Test: `tests/weekly-reports/individual-rpcs.test.ts`

**Interfaces:**
- Produces: `submit_individual_weekly_report_v1(p_submission_data jsonb, p_as_draft boolean default false) returns jsonb` → `{report_id, status, week_number, week_year, week_start, week_end}`; raises `MY_JOURNEY_DISABLED`, `ALREADY_SUBMITTED`, or a verbatim validation sentence.
- Produces: `get_individual_weekly_report_status_v1() returns jsonb` → `{week:{week_start,week_end,week_number,week_year}, submitted, submitted_at, draft, history[]}`.
- Produces: `send_individual_weekly_report_reminders_v1(p_kind text) returns integer` (service_role).

- [ ] **Step 1: Write the failing DB test**

`tests/weekly-reports/individual-rpcs.test.ts`:

```ts
/**
 * DB round-trip for the solo weekly-report RPCs. Creates ONE auth user
 * (test_iwr_*@test.local), submits as that student through the anon client,
 * and deletes every row it created. Runs against the production project.
 * Skips the write tests when My Journey is switched off (the RPC refuses).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const EMAIL = `test_iwr_${Date.now()}@test.local`;
const PASSWORD = `Test-${crypto.randomUUID()}`;

let admin: SupabaseClient;
let student: SupabaseClient;
let userId: string;
let myJourneyOn = true;

const validReport = {
  commitments: [
    { text: "Finish customer interview script", status: "completed", explanation: "" },
    { text: "", status: "completed", explanation: "" },
  ],
  blockers: "",
  nextWeekCommitments: ["Run five interviews", "   "],
  alignmentScore: 8,
  alignmentReason: "Clear plan for the week",
  ignoredKey: "must be dropped",
};

async function purgeOrphans(): Promise<void> {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  for (const u of data.users.filter((x) => x.email?.startsWith("test_iwr_"))) {
    await admin.from("weekly_reports").delete().eq("user_id", u.id);
    await admin.from("notifications").delete().eq("user_id", u.id);
    await admin.from("users").delete().eq("id", u.id);
    const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
    if (delErr) throw delErr;
  }
}

beforeAll(async () => {
  admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await purgeOrphans();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  userId = created.user.id;
  const { error: upsertErr } = await admin.from("users").upsert({
    id: userId,
    name: "test_iwr_student",
    email: EMAIL,
    primary_role: "user",
    status: "active",
  });
  if (upsertErr) throw upsertErr;

  const { data: settings } = await admin
    .from("platform_settings")
    .select("value")
    .eq("key", "journeys")
    .single();
  myJourneyOn =
    (settings?.value as { my_journey?: boolean } | null)?.my_journey !== false;

  student = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInErr } = await student.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (signInErr) throw signInErr;
}, 30000);

afterAll(async () => {
  const { error: wrErr } = await admin
    .from("weekly_reports")
    .delete()
    .eq("user_id", userId);
  if (wrErr) throw wrErr;
  await admin.from("notifications").delete().eq("user_id", userId);
  const { error: userErr } = await admin.from("users").delete().eq("id", userId);
  if (userErr) throw userErr;
  const { error: authErr } = await admin.auth.admin.deleteUser(userId);
  if (authErr) throw authErr;
  const { count } = await admin
    .from("weekly_reports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  expect(count).toBe(0);
}, 30000);

describe("get_individual_weekly_report_status_v1", () => {
  it("returns the current week and no report for a fresh student", async () => {
    const { data, error } = await student.rpc(
      "get_individual_weekly_report_status_v1"
    );
    expect(error).toBeNull();
    expect(data.week.week_number).toBeGreaterThan(0);
    expect(data.submitted).toBe(false);
    expect(data.draft).toBeNull();
    expect(data.history).toEqual([]);
  });
});

describe("submit_individual_weekly_report_v1", () => {
  it.skipIf(!myJourneyOn)("saves a draft without validating", async () => {
    const { data, error } = await student.rpc(
      "submit_individual_weekly_report_v1",
      { p_submission_data: { commitments: [], alignmentReason: "x" }, p_as_draft: true }
    );
    expect(error).toBeNull();
    expect(data.status).toBe("draft");

    const { data: status } = await student.rpc(
      "get_individual_weekly_report_status_v1"
    );
    expect(status.submitted).toBe(false);
    expect(status.draft.alignmentReason).toBe("x");
    expect(status.draft.submittedAt).toBeUndefined();
  });

  it.skipIf(!myJourneyOn)("rejects a submit with no commitments", async () => {
    const { error } = await student.rpc("submit_individual_weekly_report_v1", {
      p_submission_data: { ...validReport, commitments: [] },
    });
    expect(error?.message).toContain("At least one commitment is required");
  });

  it.skipIf(!myJourneyOn)("rejects an alignment score of 11", async () => {
    const { error } = await student.rpc("submit_individual_weekly_report_v1", {
      p_submission_data: { ...validReport, alignmentScore: 11 },
    });
    expect(error?.message).toContain("between 1 and 10");
  });

  it.skipIf(!myJourneyOn)(
    "submits over the draft, normalises the payload, then refuses a second submit",
    async () => {
      const { data, error } = await student.rpc(
        "submit_individual_weekly_report_v1",
        { p_submission_data: validReport }
      );
      expect(error).toBeNull();
      expect(data.status).toBe("submitted");

      const { data: rows } = await admin
        .from("weekly_reports")
        .select("id, context, team_id, status, submission_data")
        .eq("user_id", userId);
      expect(rows).toHaveLength(1); // draft row was upgraded, not duplicated
      const row = rows![0];
      expect(row.context).toBe("individual");
      expect(row.team_id).toBeNull();
      expect(row.status).toBe("submitted");
      const sd = row.submission_data as Record<string, unknown>;
      expect(Object.keys(sd).sort()).toEqual(
        [
          "alignmentReason",
          "alignmentScore",
          "blockers",
          "commitments",
          "nextWeekCommitments",
          "submittedAt",
        ].sort()
      );
      expect(sd.commitments).toHaveLength(1); // blank row dropped
      expect(sd.nextWeekCommitments).toEqual(["Run five interviews"]);

      const { data: status } = await student.rpc(
        "get_individual_weekly_report_status_v1"
      );
      expect(status.submitted).toBe(true);
      expect(status.draft).toBeNull();
      expect(status.history).toHaveLength(1);

      const { error: again } = await student.rpc(
        "submit_individual_weekly_report_v1",
        { p_submission_data: validReport }
      );
      expect(again?.message).toContain("ALREADY_SUBMITTED");
    }
  );

  it("refuses anonymous callers", async () => {
    const anon = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await anon.rpc("submit_individual_weekly_report_v1", {
      p_submission_data: validReport,
    });
    expect(error).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npx vitest run tests/weekly-reports/individual-rpcs.test.ts
```
Expected: FAIL — `Could not find the function public.get_individual_weekly_report_status_v1` (PostgREST 404 in `error.message`).

- [ ] **Step 3: Write the migration file**

`supabase/migrations/20260914100000_weekly_reports_individual_v1.sql`:

```sql
-- Individual (My Journey) weekly reports (2026-09-14). Purely additive.
-- Spec: docs/superpowers/specs/2026-09-14-individual-weekly-reports-design.md
--
--   uq_weekly_reports_individual_submitted_week : one submitted solo report
--                                                 per student per ISO week.
--   submit_individual_weekly_report_v1          : validated upsert (draft or
--                                                 submit) for auth.uid().
--   get_individual_weekly_report_status_v1      : one read for card/banner/
--                                                 history.
--   send_individual_weekly_report_reminders_v1  : Friday ('2day') / Sunday
--                                                 ('1day') reminders for solo
--                                                 students; service_role only.
--   cron: weekly-report-reminder-{friday,sunday}-individual (new jobs; the
--         team jobs 5 and 7 are untouched).

create unique index if not exists uq_weekly_reports_individual_submitted_week
  on public.weekly_reports (user_id, week_year, week_number)
  where context = 'individual' and status = 'submitted';

-- ---------------------------------------------------------------------------
create or replace function public.submit_individual_weekly_report_v1(
  p_submission_data jsonb,
  p_as_draft boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_uid uuid := auth.uid();
  v_week record;
  v_commitments jsonb;
  v_next jsonb;
  v_score numeric;
  v_reason text;
  v_blockers text;
  v_data jsonb;
  v_existing_id uuid;
  v_existing_status text;
  v_id uuid;
  v_status text;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if not public.journey_enabled_v1('my_journey') then
    raise exception 'MY_JOURNEY_DISABLED';
  end if;
  if p_submission_data is null
     or jsonb_typeof(p_submission_data) <> 'object' then
    raise exception 'Submission must be a JSON object';
  end if;

  select * into v_week from public.get_riga_week_boundaries(now());

  -- Q1: commitments — keep only rows with text, whitelist keys, default status.
  select coalesce(jsonb_agg(jsonb_build_object(
           'text', btrim(c->>'text'),
           'status', case when c->>'status' in ('completed','in_progress','not_done')
                          then c->>'status' else 'completed' end,
           'explanation', coalesce(c->>'explanation', '')
         ) order by ord), '[]'::jsonb)
    into v_commitments
  from jsonb_array_elements(
         case when jsonb_typeof(p_submission_data->'commitments') = 'array'
              then p_submission_data->'commitments' else '[]'::jsonb end
       ) with ordinality as t(c, ord)
  where jsonb_typeof(c) = 'object'
    and length(btrim(coalesce(c->>'text', ''))) > 0;

  -- Q3: next-week commitments — drop blanks, trim.
  select coalesce(jsonb_agg(to_jsonb(btrim(n)) order by ord), '[]'::jsonb)
    into v_next
  from jsonb_array_elements_text(
         case when jsonb_typeof(p_submission_data->'nextWeekCommitments') = 'array'
              then p_submission_data->'nextWeekCommitments' else '[]'::jsonb end
       ) with ordinality as t(n, ord)
  where length(btrim(coalesce(n, ''))) > 0;

  v_blockers := coalesce(p_submission_data->>'blockers', '');
  v_reason   := coalesce(p_submission_data->>'alignmentReason', '');
  begin
    v_score := (p_submission_data->>'alignmentScore')::numeric;
  exception when others then
    v_score := null;
  end;

  if not p_as_draft then
    if jsonb_array_length(v_commitments) = 0 then
      raise exception 'At least one commitment is required';
    end if;
    if exists (select 1 from jsonb_array_elements(v_commitments) c
               where length(c->>'text') < 5) then
      raise exception 'Commitment must be at least 5 characters';
    end if;
    if jsonb_array_length(v_next) = 0 then
      raise exception 'At least one commitment for next week is required';
    end if;
    if exists (select 1 from jsonb_array_elements_text(v_next) n
               where length(n) < 5) then
      raise exception 'Next week commitment must be at least 5 characters';
    end if;
    if v_score is null or v_score <> trunc(v_score)
       or v_score < 1 or v_score > 10 then
      raise exception 'Alignment score must be a whole number between 1 and 10';
    end if;
    if length(btrim(v_reason)) < 5 then
      raise exception 'Alignment reason must be at least 5 characters';
    end if;
  end if;

  v_data := jsonb_build_object(
    'commitments', v_commitments,
    'blockers', v_blockers,
    'nextWeekCommitments', v_next,
    'alignmentScore', case when v_score is null then null else v_score::int end,
    'alignmentReason', v_reason
  );
  if not p_as_draft then
    v_data := v_data || jsonb_build_object('submittedAt', now());
  end if;

  select id, status into v_existing_id, v_existing_status
  from public.weekly_reports
  where user_id = v_uid
    and context = 'individual'
    and week_year = v_week.week_year
    and week_number = v_week.week_number
  order by (status = 'submitted') desc, created_at desc
  limit 1;

  if v_existing_status = 'submitted' then
    raise exception 'ALREADY_SUBMITTED';
  end if;

  v_status := case when p_as_draft then 'draft' else 'submitted' end;

  if v_existing_id is not null then
    update public.weekly_reports
       set submission_data = v_data,
           status = v_status,
           submitted_at = case when p_as_draft then null else now() end,
           updated_at = now()
     where id = v_existing_id
     returning id into v_id;
  else
    begin
      insert into public.weekly_reports (
        user_id, team_id, context, week_start_date, week_end_date,
        week_number, week_year, submission_data, status, submitted_at
      ) values (
        v_uid, null, 'individual', v_week.week_start, v_week.week_end,
        v_week.week_number, v_week.week_year, v_data, v_status,
        case when p_as_draft then null else now() end
      )
      returning id into v_id;
    exception when unique_violation then
      raise exception 'ALREADY_SUBMITTED';
    end;
  end if;

  return jsonb_build_object(
    'report_id', v_id,
    'status', v_status,
    'week_number', v_week.week_number,
    'week_year', v_week.week_year,
    'week_start', v_week.week_start,
    'week_end', v_week.week_end
  );
end;
$function$;

revoke all on function public.submit_individual_weekly_report_v1(jsonb, boolean)
  from public, anon;
grant execute on function public.submit_individual_weekly_report_v1(jsonb, boolean)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
create or replace function public.get_individual_weekly_report_status_v1()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  with w as (
    select * from public.get_riga_week_boundaries(now())
  ),
  cur as (
    select wr.status, wr.submitted_at, wr.submission_data
    from public.weekly_reports wr, w
    where wr.user_id = auth.uid()
      and wr.context = 'individual'
      and wr.week_year = w.week_year
      and wr.week_number = w.week_number
    order by (wr.status = 'submitted') desc, wr.created_at desc
    limit 1
  ),
  hist as (
    select wr.id, wr.week_number, wr.week_year, wr.week_start_date,
           wr.week_end_date, wr.submitted_at, wr.submission_data
    from public.weekly_reports wr
    where wr.user_id = auth.uid()
      and wr.context = 'individual'
      and wr.status = 'submitted'
    order by wr.week_year desc, wr.week_number desc
    limit 8
  )
  select jsonb_build_object(
    'week', (select jsonb_build_object(
               'week_start', w.week_start, 'week_end', w.week_end,
               'week_number', w.week_number, 'week_year', w.week_year)
             from w),
    'submitted', coalesce((select status = 'submitted' from cur), false),
    'submitted_at', (select submitted_at from cur where status = 'submitted'),
    'draft', (select submission_data from cur where status = 'draft'),
    'history', coalesce((select jsonb_agg(to_jsonb(h)
                                order by h.week_year desc, h.week_number desc)
                         from hist h), '[]'::jsonb)
  );
$function$;

revoke all on function public.get_individual_weekly_report_status_v1()
  from public, anon;
grant execute on function public.get_individual_weekly_report_status_v1()
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
create or replace function public.send_individual_weekly_report_reminders_v1(
  p_kind text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_week record;
  v_type text;
  v_title text;
  v_message text;
  v_count integer := 0;
  v_team_journey boolean;
begin
  if p_kind not in ('2day', '1day') then
    raise exception 'p_kind must be ''2day'' or ''1day''';
  end if;
  -- Solo weekly reports are a My Journey feature: no reminders while it is off.
  if not public.journey_enabled_v1('my_journey') then
    return 0;
  end if;

  v_team_journey := public.journey_enabled_v1('team_journey');
  select * into v_week from public.get_riga_week_boundaries(now());

  if p_kind = '2day' then
    v_type := 'weekly_report_reminder_2day';
    v_title := 'Weekly report reminder';
    v_message := 'Don''t forget to submit your My Journey weekly report before Monday 10:00!';
  else
    v_type := 'weekly_report_reminder_1day';
    v_title := 'Last chance — weekly report due tomorrow!';
    v_message := 'Submit your My Journey weekly report before Monday 10:00!';
  end if;

  insert into public.notifications (user_id, type, title, message, data)
  select u.id, v_type, v_title, v_message,
         jsonb_build_object(
           'context', 'individual',
           'week_number', v_week.week_number,
           'week_year', v_week.week_year)
  from public.users u
  join auth.users au on au.id = u.id
  where u.status = 'active'
    and coalesce(u.primary_role, 'user') = 'user'
    and au.email_confirmed_at is not null
    -- Mode rule: a member of an active team gets the TEAM form while Team
    -- Journey is on, so no solo reminder for them.
    and not (v_team_journey and exists (
      select 1
      from public.team_members tm
      join public.teams t on t.id = tm.team_id
      where tm.user_id = u.id and tm.left_at is null and t.status = 'active'))
    and not exists (
      select 1 from public.weekly_reports wr
      where wr.user_id = u.id
        and wr.context = 'individual'
        and wr.status = 'submitted'
        and wr.week_year = v_week.week_year
        and wr.week_number = v_week.week_number)
    and not exists (
      select 1 from public.notifications n
      where n.user_id = u.id
        and n.type = v_type
        and n.data->>'context' = 'individual'
        and n.created_at >= v_week.week_start::timestamptz);

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

revoke all on function public.send_individual_weekly_report_reminders_v1(text)
  from public, anon, authenticated;
grant execute on function public.send_individual_weekly_report_reminders_v1(text)
  to service_role;

-- ---------------------------------------------------------------------------
do $do$
begin
  if not exists (select 1 from cron.job
                 where jobname = 'weekly-report-reminder-friday-individual') then
    perform cron.schedule(
      'weekly-report-reminder-friday-individual',
      '0 10 * * 5',
      $c$select public.send_individual_weekly_report_reminders_v1('2day');$c$);
  end if;
  if not exists (select 1 from cron.job
                 where jobname = 'weekly-report-reminder-sunday-individual') then
    perform cron.schedule(
      'weekly-report-reminder-sunday-individual',
      '0 10 * * 0',
      $c$select public.send_individual_weekly_report_reminders_v1('1day');$c$);
  end if;
end
$do$;
```

- [ ] **Step 4: Backup, then apply via MCP**

Ask the user to confirm a manual Supabase backup exists for today (Dashboard → Database → Backups), then call MCP `apply_migration` with `name: "weekly_reports_individual_v1"` and `query` = the exact file contents above.

- [ ] **Step 5: Verify the objects exist (MCP `execute_sql`)**

```sql
select p.proname, pg_get_function_identity_arguments(p.oid) args, p.prosecdef
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in (
  'submit_individual_weekly_report_v1',
  'get_individual_weekly_report_status_v1',
  'send_individual_weekly_report_reminders_v1');
select indexname from pg_indexes
where tablename = 'weekly_reports'
  and indexname = 'uq_weekly_reports_individual_submitted_week';
select jobid, jobname, schedule, command from cron.job
where jobname like 'weekly-report-reminder-%-individual';
select version, name from supabase_migrations.schema_migrations
order by version desc limit 1;
```
Expected: 3 functions (`prosecdef = true`), 1 index, 2 cron rows, last migration `name = weekly_reports_individual_v1`. If the recorded version differs from `20260914100000`, rename the repo file to match the recorded version (same convention as commit `a5cacaa`).

- [ ] **Step 6: Verify the reminder function with cleanup (MCP `execute_sql`)**

First the dry run — the exact target set the function will notify:

```sql
select u.id, u.name
from public.users u join auth.users au on au.id = u.id
where u.status = 'active' and coalesce(u.primary_role,'user') = 'user'
  and au.email_confirmed_at is not null
  and not (public.journey_enabled_v1('team_journey') and exists (
    select 1 from team_members tm join teams t on t.id = tm.team_id
    where tm.user_id = u.id and tm.left_at is null and t.status = 'active'));
```
Expected today: 2 rows (Liga Letina, Eliass Test). Then run and immediately clean:

```sql
select public.send_individual_weekly_report_reminders_v1('2day') as inserted;
select public.send_individual_weekly_report_reminders_v1('2day') as inserted_again; -- dedupe → 0
delete from public.notifications
where type = 'weekly_report_reminder_2day'
  and data->>'context' = 'individual'
  and created_at > now() - interval '10 minutes'
returning user_id;
```
Expected: `inserted = 2`, `inserted_again = 0`, delete returns 2 rows. (The rows exist for a few seconds; one belongs to the user's own test account, one to Liga Letina.)

- [ ] **Step 7: Run the DB test**

```bash
npx vitest run tests/weekly-reports/individual-rpcs.test.ts
```
Expected: all PASS. Then confirm nothing is left behind (MCP):

```sql
select count(*) from public.weekly_reports where context = 'individual';
select count(*) from auth.users where email like 'test_iwr_%';
```
Expected: `0` and `0`.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260914100000_weekly_reports_individual_v1.sql tests/weekly-reports/individual-rpcs.test.ts
git commit -m "feat(db): individual weekly report RPCs, index and reminder cron

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Types, Zod schema, pure helpers

**Files:**
- Create: `src/types/weekly-report.ts`
- Create: `src/lib/individual-weekly-report.ts`
- Modify: `src/lib/validation-schemas.ts` (append after `WeeklyReportFormData`, line 138)
- Modify: `src/lib/weekly-reports.ts` (add `isWeeklyReportBannerWindow`)
- Test: `tests/weekly-reports/individual-schema.test.ts`

**Interfaces:**
- Produces: types `CommitmentStatus`, `ReportCommitment`, `IndividualWeeklyReportData`, `IndividualWeeklyReportForm`, `IndividualWeeklyReportHistoryEntry`, `IndividualWeeklyReportStatus`.
- Produces: `IndividualWeeklyReportSchema`, `emptyIndividualReportForm(): IndividualWeeklyReportForm`, `normalizeIndividualReport(form): IndividualWeeklyReportData`, `mapIndividualReportRpcError(message: string): string`, `isWeeklyReportBannerWindow(week: WeekBoundaries, now?: Date): boolean`.

- [ ] **Step 1: Write the failing tests**

`tests/weekly-reports/individual-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { IndividualWeeklyReportSchema } from "@/lib/validation-schemas";
import {
  emptyIndividualReportForm,
  mapIndividualReportRpcError,
  normalizeIndividualReport,
} from "@/lib/individual-weekly-report";
import { isWeeklyReportBannerWindow } from "@/lib/weekly-reports";

const valid = {
  commitments: [{ text: "Interview five users", status: "completed" as const, explanation: "" }],
  blockers: "",
  nextWeekCommitments: ["Write the summary"],
  alignmentScore: 7,
  alignmentReason: "Good momentum",
};

describe("IndividualWeeklyReportSchema", () => {
  it("accepts a valid report", () => {
    expect(IndividualWeeklyReportSchema.safeParse(valid).success).toBe(true);
  });
  it("requires at least one commitment", () => {
    const r = IndividualWeeklyReportSchema.safeParse({ ...valid, commitments: [] });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("At least one commitment is required");
  });
  it("requires a 5-char alignment reason", () => {
    const r = IndividualWeeklyReportSchema.safeParse({ ...valid, alignmentReason: "ok" });
    expect(r.success).toBe(false);
  });
  it("rejects a score outside 1-10", () => {
    expect(IndividualWeeklyReportSchema.safeParse({ ...valid, alignmentScore: 0 }).success).toBe(false);
    expect(IndividualWeeklyReportSchema.safeParse({ ...valid, alignmentScore: 11 }).success).toBe(false);
  });
  it("blockers are optional", () => {
    const { blockers: _b, ...noBlockers } = valid;
    expect(IndividualWeeklyReportSchema.safeParse(noBlockers).success).toBe(true);
  });
});

describe("normalizeIndividualReport", () => {
  it("drops blank rows and trims", () => {
    const form = emptyIndividualReportForm();
    form.commitments = [
      { text: "  Ship landing page ", status: "in_progress", explanation: " late " },
      { text: "   ", status: "completed", explanation: "" },
    ];
    form.nextWeekCommitments = ["Call investors", "  ", ""];
    form.alignmentReason = " fine ";
    const out = normalizeIndividualReport(form);
    expect(out.commitments).toEqual([
      { text: "Ship landing page", status: "in_progress", explanation: "late" },
    ]);
    expect(out.nextWeekCommitments).toEqual(["Call investors"]);
    expect(out.alignmentReason).toBe("fine");
  });
  it("starts with one empty row each and score 5", () => {
    const form = emptyIndividualReportForm();
    expect(form.commitments).toHaveLength(1);
    expect(form.nextWeekCommitments).toEqual([""]);
    expect(form.alignmentScore).toBe(5);
  });
});

describe("mapIndividualReportRpcError", () => {
  it("maps the two codes and passes other messages through", () => {
    expect(mapIndividualReportRpcError("ALREADY_SUBMITTED")).toMatch(/already submitted/i);
    expect(mapIndividualReportRpcError("MY_JOURNEY_DISABLED")).toMatch(/My Journey is switched off/);
    expect(mapIndividualReportRpcError("Alignment reason must be at least 5 characters")).toBe(
      "Alignment reason must be at least 5 characters"
    );
  });
});

describe("isWeeklyReportBannerWindow", () => {
  const week = { week_start: "2026-09-14", week_end: "2026-09-20", week_number: 38, week_year: 2026 };
  // `week_start` is a date-only string, parsed as UTC midnight; in Riga that
  // is 03:00 local, so the window opens Friday ~03:00 (same as the team
  // banner). Use midday timestamps to stay clear of that edge.
  it("is closed on Thursday and open from Friday", () => {
    expect(isWeeklyReportBannerWindow(week, new Date("2026-09-17T12:00:00"))).toBe(false);
    expect(isWeeklyReportBannerWindow(week, new Date("2026-09-18T12:00:00"))).toBe(true);
    expect(isWeeklyReportBannerWindow(week, new Date("2026-09-20T23:00:00"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run tests/weekly-reports/individual-schema.test.ts
```
Expected: FAIL — cannot resolve `@/lib/individual-weekly-report` / missing exports.

- [ ] **Step 3: Create `src/types/weekly-report.ts`**

```ts
import type { WeekBoundaries } from "@/lib/weekly-reports";

export type CommitmentStatus = "completed" | "in_progress" | "not_done";

export interface ReportCommitment {
  text: string;
  status: CommitmentStatus;
  explanation: string;
}

/** Exactly what `submit_individual_weekly_report_v1` stores in submission_data. */
export interface IndividualWeeklyReportData {
  commitments: ReportCommitment[];
  blockers: string;
  nextWeekCommitments: string[];
  alignmentScore: number | null;
  alignmentReason: string;
  submittedAt?: string;
}

/** Form state: same shape, score always set, blank rows allowed while typing. */
export interface IndividualWeeklyReportForm {
  commitments: ReportCommitment[];
  blockers: string;
  nextWeekCommitments: string[];
  alignmentScore: number;
  alignmentReason: string;
}

export interface IndividualWeeklyReportHistoryEntry {
  id: string;
  week_number: number;
  week_year: number;
  week_start_date: string;
  week_end_date: string;
  submitted_at: string | null;
  submission_data: IndividualWeeklyReportData | null;
}

/** Return shape of `get_individual_weekly_report_status_v1`. */
export interface IndividualWeeklyReportStatus {
  week: WeekBoundaries;
  submitted: boolean;
  submitted_at: string | null;
  draft: Partial<IndividualWeeklyReportData> | null;
  history: IndividualWeeklyReportHistoryEntry[];
}
```

- [ ] **Step 4: Append the Zod schema to `src/lib/validation-schemas.ts`**

Insert directly after `export type WeeklyReportFormData = z.infer<typeof WeeklyReportSchema>;`:

```ts
/**
 * Individual (My Journey) weekly report — the four questions kept from the
 * team form (#1, #2, #6, #8). Callers strip blank rows with
 * `normalizeIndividualReport` before parsing; the RPC re-validates with the
 * same rules and messages.
 */
export const IndividualWeeklyReportSchema = z.object({
  commitments: z
    .array(
      z.object({
        text: z.string().min(5, "Commitment must be at least 5 characters"),
        status: z.enum(["completed", "in_progress", "not_done"]),
        explanation: z.string().optional(),
      })
    )
    .min(1, "At least one commitment is required"),
  blockers: z.string().optional(),
  nextWeekCommitments: z
    .array(
      z.string().min(5, "Next week commitment must be at least 5 characters")
    )
    .min(1, "At least one commitment for next week is required"),
  alignmentScore: z
    .number()
    .int()
    .min(1, "Alignment score must be a whole number between 1 and 10")
    .max(10, "Alignment score must be a whole number between 1 and 10"),
  alignmentReason: z
    .string()
    .min(5, "Alignment reason must be at least 5 characters"),
});

export type IndividualWeeklyReportFormData = z.infer<
  typeof IndividualWeeklyReportSchema
>;
```

- [ ] **Step 5: Create `src/lib/individual-weekly-report.ts`**

```ts
import type {
  IndividualWeeklyReportData,
  IndividualWeeklyReportForm,
} from "@/types/weekly-report";

export function emptyIndividualReportForm(): IndividualWeeklyReportForm {
  return {
    commitments: [{ text: "", status: "completed", explanation: "" }],
    blockers: "",
    nextWeekCommitments: [""],
    alignmentScore: 5,
    alignmentReason: "",
  };
}

/** Restores a saved draft into form state, padding to one row per list. */
export function draftToForm(
  draft: Partial<IndividualWeeklyReportData>
): IndividualWeeklyReportForm {
  const base = emptyIndividualReportForm();
  const commitments = (draft.commitments ?? []).map((c) => ({
    text: c.text ?? "",
    status: c.status ?? "completed",
    explanation: c.explanation ?? "",
  }));
  const next = (draft.nextWeekCommitments ?? []).filter(
    (c) => typeof c === "string"
  );
  return {
    commitments: commitments.length ? commitments : base.commitments,
    blockers: draft.blockers ?? "",
    nextWeekCommitments: next.length ? next : base.nextWeekCommitments,
    alignmentScore:
      typeof draft.alignmentScore === "number"
        ? draft.alignmentScore
        : base.alignmentScore,
    alignmentReason: draft.alignmentReason ?? "",
  };
}

/** Trims text and drops blank rows — what we validate and what we send. */
export function normalizeIndividualReport(
  form: IndividualWeeklyReportForm
): IndividualWeeklyReportData {
  return {
    commitments: form.commitments
      .map((c) => ({
        text: c.text.trim(),
        status: c.status,
        explanation: c.explanation.trim(),
      }))
      .filter((c) => c.text.length > 0),
    blockers: form.blockers.trim(),
    nextWeekCommitments: form.nextWeekCommitments
      .map((c) => c.trim())
      .filter((c) => c.length > 0),
    alignmentScore: form.alignmentScore,
    alignmentReason: form.alignmentReason.trim(),
  };
}

export function hasIndividualReportContent(
  form: IndividualWeeklyReportForm
): boolean {
  return (
    form.commitments.some((c) => c.text.trim()) ||
    form.blockers.trim().length > 0 ||
    form.nextWeekCommitments.some((c) => c.trim()) ||
    form.alignmentReason.trim().length > 0
  );
}

/** WHAT failed + WHY + HOW to fix, for the two stable RPC codes. */
export function mapIndividualReportRpcError(message: string): string {
  if (message.includes("ALREADY_SUBMITTED")) {
    return "This week's report is already submitted — one report per week. Open Past reports to read it.";
  }
  if (message.includes("MY_JOURNEY_DISABLED")) {
    return "Weekly reports are closed because My Journey is switched off. Try again once the programme phase is on.";
  }
  return message;
}
```

- [ ] **Step 6: Add the banner-window helper to `src/lib/weekly-reports.ts`**

Insert after `formatWeekPeriod` (before the `// Individual context functions` comment):

```ts
/**
 * Banner window: Friday 00:00 through Monday 10:00 Riga. `week_start` is
 * always a Monday, so Friday = week_start + 4 days. After Monday 10:00
 * `get_riga_week_boundaries` flips to the new week, whose Friday is ahead,
 * so the banner closes by itself.
 */
export function isWeeklyReportBannerWindow(
  week: WeekBoundaries,
  now: Date = new Date()
): boolean {
  const friday = new Date(week.week_start);
  friday.setDate(friday.getDate() + 4);
  return now >= friday;
}
```

- [ ] **Step 7: Run the tests**

```bash
npx vitest run tests/weekly-reports/individual-schema.test.ts
```
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add src/types/weekly-report.ts src/lib/individual-weekly-report.ts src/lib/validation-schemas.ts src/lib/weekly-reports.ts tests/weekly-reports/individual-schema.test.ts
git commit -m "feat(weekly-reports): individual report types, schema and helpers

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Regenerate DB types + data hook

**Files:**
- Modify: `src/types/database.ts` (regenerated, never hand-edited)
- Create: `src/hooks/use-individual-weekly-report.ts`

**Interfaces:**
- Consumes: RPC names from Task 1; types/helpers from Task 2.
- Produces: `individualWeeklyReportKeys.status(userId)`, `useIndividualWeeklyReportStatus(userId?: string)` → `{ data?: IndividualWeeklyReportStatus, isLoading, isError, refetch }`, `useSubmitIndividualWeeklyReport(userId?: string)` → `UseMutationResult<SubmitResult, Error, { data: IndividualWeeklyReportData; asDraft: boolean }>`.

- [ ] **Step 1: Regenerate types (Git Bash, not PowerShell — avoid a BOM)**

```bash
npx supabase gen types typescript --project-id ksoohvygoysofvtqdumz --schema public > src/types/database.ts && npx prettier --write src/types/database.ts && grep -c "submit_individual_weekly_report_v1\|get_individual_weekly_report_status_v1\|send_individual_weekly_report_reminders_v1" src/types/database.ts
```
Expected: count ≥ 3. If the CLI is not logged in, use the MCP `generate_typescript_types` tool and write its output to the file, then run prettier.

- [ ] **Step 2: Create the hook**

`src/hooks/use-individual-weekly-report.ts`:

```ts
"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { mapIndividualReportRpcError } from "@/lib/individual-weekly-report";
import type {
  IndividualWeeklyReportData,
  IndividualWeeklyReportStatus,
} from "@/types/weekly-report";

export const individualWeeklyReportKeys = {
  status: (userId?: string) =>
    ["weekly-reports", "individual", "status", userId] as const,
};

export interface SubmitIndividualReportVars {
  data: IndividualWeeklyReportData;
  asDraft: boolean;
}

export interface SubmitIndividualReportResult {
  report_id: string;
  status: "draft" | "submitted";
  week_number: number;
  week_year: number;
  week_start: string;
  week_end: string;
}

/** One round trip for card, banner and history. Self-only on the DB side. */
export function useIndividualWeeklyReportStatus(userId?: string) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: individualWeeklyReportKeys.status(userId),
    queryFn: async (): Promise<IndividualWeeklyReportStatus> => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc(
        "get_individual_weekly_report_status_v1"
      );
      if (error) throw new Error(error.message);
      return data as unknown as IndividualWeeklyReportStatus;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
  return { data, isLoading, isError, refetch };
}

export function useSubmitIndividualWeeklyReport(
  userId?: string
): UseMutationResult<
  SubmitIndividualReportResult,
  Error,
  SubmitIndividualReportVars
> {
  const queryClient = useQueryClient();

  return useMutation<
    SubmitIndividualReportResult,
    Error,
    SubmitIndividualReportVars
  >({
    mutationFn: async ({ data, asDraft }) => {
      const supabase = createClient();
      const { data: result, error } = await supabase.rpc(
        "submit_individual_weekly_report_v1",
        { p_submission_data: data, p_as_draft: asDraft }
      );
      if (error) throw new Error(mapIndividualReportRpcError(error.message));
      return result as unknown as SubmitIndividualReportResult;
    },
    retry: 0,
    onSuccess: (_result, vars) => {
      toast.success(
        vars.asDraft
          ? "Draft saved! You can continue later."
          : "Weekly report submitted!"
      );
      queryClient.invalidateQueries({
        queryKey: individualWeeklyReportKeys.status(userId),
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard", "my-journey", userId],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -v "^$" | head -20
```
Expected: no errors mentioning `use-individual-weekly-report` (pre-existing unrelated errors, if any, are reported to the user, not fixed here). If `supabase.rpc("submit_individual_weekly_report_v1", …)` errors on the `p_submission_data` type, cast the args: `{ p_submission_data: data as unknown as Json, p_as_draft: asDraft }` with `import type { Json } from "@/types/database";`.

- [ ] **Step 4: Commit**

```bash
git add src/types/database.ts src/hooks/use-individual-weekly-report.ts
git commit -m "feat(weekly-reports): individual report hook + regenerated db types

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Question components

**Files:**
- Create: `src/components/weekly-reports/individual/commitments-field.tsx`
- Create: `src/components/weekly-reports/individual/individual-report-questions.tsx`

**Interfaces:**
- Consumes: `IndividualWeeklyReportForm`, `ReportCommitment`, `CommitmentStatus` from `@/types/weekly-report`.
- Produces: `CommitmentsField({ value: ReportCommitment[], onChange })`, `IndividualReportQuestions({ value: IndividualWeeklyReportForm, onChange })`.

- [ ] **Step 1: `commitments-field.tsx` (Q1, mirrors the team form's block)**

```tsx
"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CommitmentStatus, ReportCommitment } from "@/types/weekly-report";

interface CommitmentsFieldProps {
  value: ReportCommitment[];
  onChange: (next: ReportCommitment[]) => void;
}

/**
 * Q1 of the solo report — same rows, statuses and conditional explanation
 * as the team form, so the admin viewer renders both identically.
 */
export function CommitmentsField({ value, onChange }: CommitmentsFieldProps) {
  const update = (index: number, patch: Partial<ReportCommitment>) =>
    onChange(value.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">
        1. What were your top commitments this week?{" "}
        <span className="text-red-500">*</span>
      </Label>
      <p className="text-muted-foreground text-sm">
        Provide status. Explanation is optional (shown only for incomplete
        items).
      </p>

      {value.map((commitment, index) => (
        <div key={index} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <Label htmlFor={`solo-commitment-${index}`}>
              Commitment #{index + 1}
            </Label>
            {value.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                aria-label={`Remove commitment ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Textarea
            id={`solo-commitment-${index}`}
            placeholder={`Describe commitment #${index + 1}...`}
            value={commitment.text}
            onChange={(e) => update(index, { text: e.target.value })}
            rows={2}
          />
          <div className="flex items-center gap-2">
            <Label className="text-sm">Status:</Label>
            <Select
              value={commitment.status}
              onValueChange={(v) =>
                update(index, {
                  status: v as CommitmentStatus,
                  explanation: v === "completed" ? "" : commitment.explanation,
                })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">✅ Completed</SelectItem>
                <SelectItem value="in_progress">🔄 In Progress</SelectItem>
                <SelectItem value="not_done">❌ Not Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {commitment.status !== "completed" && (
            <Input
              placeholder="Brief explanation (optional)..."
              value={commitment.explanation}
              onChange={(e) => update(index, { explanation: e.target.value })}
            />
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([
            ...value,
            { text: "", status: "completed", explanation: "" },
          ])
        }
      >
        <Plus className="mr-1 h-4 w-4" />
        Add commitment
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: `individual-report-questions.tsx` (Q1–Q4)**

```tsx
"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CommitmentsField } from "@/components/weekly-reports/individual/commitments-field";
import type { IndividualWeeklyReportForm } from "@/types/weekly-report";

const MIN_TEXT_LENGTH = 5;

interface Props {
  value: IndividualWeeklyReportForm;
  onChange: (next: IndividualWeeklyReportForm) => void;
}

/**
 * The four solo questions: team questions #1, #2, #6 and #8, renumbered.
 * Controlled — the modal owns the state and the submit.
 */
export function IndividualReportQuestions({ value, onChange }: Props) {
  const set = <K extends keyof IndividualWeeklyReportForm>(
    key: K,
    next: IndividualWeeklyReportForm[K]
  ) => onChange({ ...value, [key]: next });

  const shortReason =
    value.alignmentReason.trim().length > 0 &&
    value.alignmentReason.trim().length < MIN_TEXT_LENGTH;

  return (
    <div className="space-y-6">
      <CommitmentsField
        value={value.commitments}
        onChange={(next) => set("commitments", next)}
      />

      {/* Q2: Blockers (optional) */}
      <div className="space-y-3">
        <Label htmlFor="solo-blockers" className="text-base font-semibold">
          2. What blockers or challenges did you face? (optional)
        </Label>
        <Textarea
          id="solo-blockers"
          placeholder="What happened and why it happened..."
          value={value.blockers}
          onChange={(e) => set("blockers", e.target.value)}
          rows={3}
        />
      </div>

      {/* Q3: Next week */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          3. Commitments for next week <span className="text-red-500">*</span>
        </Label>
        <p className="text-muted-foreground text-sm">
          What are you committing to accomplish next week?
        </p>
        {value.nextWeekCommitments.map((commitment, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor={`solo-next-${index}`} className="text-sm">
                Commitment #{index + 1}
              </Label>
              <Input
                id={`solo-next-${index}`}
                placeholder={`Next week commitment #${index + 1}...`}
                value={commitment}
                onChange={(e) =>
                  set(
                    "nextWeekCommitments",
                    value.nextWeekCommitments.map((c, i) =>
                      i === index ? e.target.value : c
                    )
                  )
                }
                className={
                  commitment.trim().length > 0 &&
                  commitment.trim().length < MIN_TEXT_LENGTH
                    ? "border-red-500"
                    : ""
                }
              />
            </div>
            {value.nextWeekCommitments.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-5 h-7 w-7 p-0 text-red-500 hover:text-red-700"
                onClick={() =>
                  set(
                    "nextWeekCommitments",
                    value.nextWeekCommitments.filter((_, i) => i !== index)
                  )
                }
                aria-label={`Remove next week commitment ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            set("nextWeekCommitments", [...value.nextWeekCommitments, ""])
          }
        >
          <Plus className="mr-1 h-4 w-4" />
          Add commitment
        </Button>
      </div>

      {/* Q4: Alignment / motivation */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          4. On a scale of 1–10, how aligned and motivated do you feel?{" "}
          <span className="text-red-500">*</span>
        </Label>
        <div className="flex items-center gap-4">
          <Label className="text-sm">Score:</Label>
          <Select
            value={value.alignmentScore.toString()}
            onValueChange={(v) => set("alignmentScore", parseInt(v, 10))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => (
                <SelectItem key={score} value={score.toString()}>
                  {score}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Textarea
          placeholder="Why do you feel this way?"
          value={value.alignmentReason}
          onChange={(e) => set("alignmentReason", e.target.value)}
          rows={2}
          className={shortReason ? "border-red-500" : ""}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Lint the two files**

```bash
npx eslint src/components/weekly-reports/individual/ && npx prettier --check src/components/weekly-reports/individual/
```
Expected: clean (run `npx prettier --write` on the folder if formatting differs).

- [ ] **Step 4: Commit**

```bash
git add src/components/weekly-reports/individual/commitments-field.tsx src/components/weekly-reports/individual/individual-report-questions.tsx
git commit -m "feat(weekly-reports): solo report question components

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Modal + history dialog

**Files:**
- Create: `src/components/weekly-reports/individual/individual-weekly-report-modal.tsx`
- Create: `src/components/weekly-reports/individual/individual-weekly-report-history.tsx`

**Interfaces:**
- Consumes: `IndividualReportQuestions` (Task 4); `useSubmitIndividualWeeklyReport`, `useIndividualWeeklyReportStatus` (Task 3); helpers (Task 2); `useApp` from `@/contexts/app-context`; `formatWeekPeriod` from `@/lib/weekly-reports`.
- Produces: `IndividualWeeklyReportModal({ open, onOpenChange })`, `IndividualWeeklyReportHistory({ open, onOpenChange, entries })`.

- [ ] **Step 1: Modal**

`individual-weekly-report-modal.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";
import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApp } from "@/contexts/app-context";
import {
  useIndividualWeeklyReportStatus,
  useSubmitIndividualWeeklyReport,
} from "@/hooks/use-individual-weekly-report";
import {
  draftToForm,
  emptyIndividualReportForm,
  hasIndividualReportContent,
  normalizeIndividualReport,
} from "@/lib/individual-weekly-report";
import { IndividualWeeklyReportSchema } from "@/lib/validation-schemas";
import { formatWeekPeriod } from "@/lib/weekly-reports";
import { IndividualReportQuestions } from "@/components/weekly-reports/individual/individual-report-questions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Solo (My Journey) weekly report. Drafts live in the DB row for the current
 * week (no localStorage): when the dialog opens with a saved draft, the form
 * is prefilled from it.
 */
export function IndividualWeeklyReportModal({ open, onOpenChange }: Props) {
  const { user } = useApp();
  const { data: status } = useIndividualWeeklyReportStatus(user?.id);
  const submit = useSubmitIndividualWeeklyReport(user?.id);
  const [form, setForm] = useState(emptyIndividualReportForm());
  const [restoredDraft, setRestoredDraft] = useState(false);

  // Prefill ONLY when the dialog opens. Depending on `status.draft` here
  // would reset the form mid-typing whenever the status query refetches
  // (window focus), so the draft is read once per open on purpose.
  useEffect(() => {
    if (!open) return;
    if (status?.draft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(draftToForm(status.draft));
      setRestoredDraft(true);
    } else {
      setForm(emptyIndividualReportForm());
      setRestoredDraft(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const hasContent = hasIndividualReportContent(form);
  const weekLabel = status ? formatWeekPeriod(status.week) : "";

  const close = () => {
    onOpenChange(false);
    setForm(emptyIndividualReportForm());
  };

  const handleSaveDraft = () => {
    const data = normalizeIndividualReport(form);
    submit.mutate(
      { data, asDraft: true },
      {
        onSuccess: (result) => {
          posthog.capture("individual_weekly_report_draft_saved", {
            week_number: result.week_number,
            week_year: result.week_year,
          });
          close();
        },
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = normalizeIndividualReport(form);
    const parsed = IndividualWeeklyReportSchema.safeParse(data);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    submit.mutate(
      { data, asDraft: false },
      {
        onSuccess: (result) => {
          posthog.capture("individual_weekly_report_submitted", {
            week_number: result.week_number,
            week_year: result.week_year,
            commitments_count: data.commitments.length,
            commitments_completed: data.commitments.filter(
              (c) => c.status === "completed"
            ).length,
            has_blockers: data.blockers.length > 0,
            alignment_score: data.alignmentScore,
            next_week_commitments_count: data.nextWeekCommitments.length,
            was_draft: restoredDraft,
          });
          close();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Submit My Journey weekly report
            {restoredDraft && (
              <span className="text-muted-foreground bg-muted rounded px-2 py-0.5 text-xs font-normal">
                Draft restored
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {weekLabel
              ? `${weekLabel}. Deadline: Monday 10:00 Riga time.`
              : "Deadline: Monday 10:00 Riga time."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <IndividualReportQuestions value={form} onChange={setForm} />

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {hasContent && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setForm(emptyIndividualReportForm())}
                className="text-muted-foreground hover:text-destructive mr-auto"
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Clear form
              </Button>
            )}
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={submit.isPending || !hasContent}
              className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            >
              <Save className="mr-1 h-4 w-4" />
              {submit.isPending && submit.variables?.asDraft
                ? "Saving..."
                : "Save as Draft"}
            </Button>
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending && !submit.variables?.asDraft
                ? "Submitting..."
                : "Submit Report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: History dialog**

`individual-weekly-report-history.tsx`:

```tsx
"use client";

import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type {
  CommitmentStatus,
  IndividualWeeklyReportHistoryEntry,
} from "@/types/weekly-report";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: IndividualWeeklyReportHistoryEntry[];
}

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusIcon({ status }: { status: CommitmentStatus }) {
  if (status === "completed")
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />;
  if (status === "in_progress")
    return <Clock className="h-4 w-4 shrink-0 text-amber-600" />;
  return <XCircle className="h-4 w-4 shrink-0 text-red-600" />;
}

/** Read-only list of the student's last submitted solo reports. */
export function IndividualWeeklyReportHistory({
  open,
  onOpenChange,
  entries,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Past weekly reports</DialogTitle>
          <DialogDescription>
            Your last {entries.length} submitted My Journey reports.
          </DialogDescription>
        </DialogHeader>

        {entries.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No reports submitted yet.
          </p>
        ) : (
          <div className="space-y-6">
            {entries.map((entry, i) => {
              const d = entry.submission_data;
              return (
                <div key={entry.id} className="space-y-3">
                  {i > 0 && <Separator />}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      Week {entry.week_number}
                    </span>
                    <Badge variant="secondary" className="font-normal">
                      {formatDate(entry.week_start_date)} –{" "}
                      {formatDate(entry.week_end_date)}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      Submitted {formatDate(entry.submitted_at)}
                    </span>
                  </div>

                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs font-semibold">
                      Commitments
                    </p>
                    <ul className="mt-1 space-y-1">
                      {(d?.commitments ?? []).map((c, j) => (
                        <li key={j} className="flex items-start gap-2">
                          <StatusIcon status={c.status} />
                          <span>
                            {c.text}
                            {c.explanation && (
                              <span className="text-muted-foreground">
                                {" "}
                                — {c.explanation}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {d?.blockers && (
                    <div className="text-sm">
                      <p className="text-muted-foreground text-xs font-semibold">
                        Blockers
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{d.blockers}</p>
                    </div>
                  )}

                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs font-semibold">
                      Next week
                    </p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">
                      {(d?.nextWeekCommitments ?? []).map((c, j) => (
                        <li key={j}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-sm">
                    <span className="text-muted-foreground text-xs font-semibold">
                      Alignment
                    </span>{" "}
                    <span className="font-semibold tabular-nums">
                      {d?.alignmentScore ?? "—"}/10
                    </span>
                    {d?.alignmentReason && (
                      <span className="text-muted-foreground">
                        {" "}
                        — {d.alignmentReason}
                      </span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Lint + type-check**

```bash
npx prettier --write src/components/weekly-reports/individual/ && npx eslint src/components/weekly-reports/individual/ && npx tsc --noEmit -p tsconfig.json 2>&1 | grep "weekly-reports/individual" ; echo "tsc done"
```
Expected: no output lines before `tsc done`.

- [ ] **Step 4: Commit**

```bash
git add src/components/weekly-reports/individual/individual-weekly-report-modal.tsx src/components/weekly-reports/individual/individual-weekly-report-history.tsx
git commit -m "feat(weekly-reports): solo report modal and history dialog

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Dashboard card

**Files:**
- Create: `src/components/dashboard/my-journey/weekly-report-card.tsx`
- Modify: `src/components/dashboard/my-journey-overview.tsx:62-72` (mount)

**Interfaces:**
- Consumes: `usePlatformSettings`, `useApp`, `useIndividualWeeklyReportStatus`, modal + history (Task 5), `SectionLabel`, `formatWeekPeriod`.
- Produces: `WeeklyReportCard({ hasActiveTeam: boolean })` — renders `null` unless solo mode.

- [ ] **Step 1: Card**

`weekly-report-card.tsx`:

```tsx
"use client";

import { useState } from "react";
import { CalendarClock, CheckCircle2, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/contexts/app-context";
import { useIndividualWeeklyReportStatus } from "@/hooks/use-individual-weekly-report";
import { usePlatformSettings } from "@/hooks/use-platform-settings";
import { formatWeekPeriod } from "@/lib/weekly-reports";
import { SectionLabel } from "@/components/dashboard/my-journey/section-label";
import { IndividualWeeklyReportModal } from "@/components/weekly-reports/individual/individual-weekly-report-modal";
import { IndividualWeeklyReportHistory } from "@/components/weekly-reports/individual/individual-weekly-report-history";

/**
 * This week's solo report at a glance. Mode rule: a student in an active
 * team while Team Journey is on gets the TEAM form elsewhere, so this card
 * steps aside for them (mirrors send_individual_weekly_report_reminders_v1).
 */
export function WeeklyReportCard({ hasActiveTeam }: { hasActiveTeam: boolean }) {
  const { user } = useApp();
  const { data: journeys } = usePlatformSettings();
  const soloMode = journeys.myJourney && !(journeys.teamJourney && hasActiveTeam);
  const { data, isLoading, isError, refetch } = useIndividualWeeklyReportStatus(
    soloMode ? user?.id : undefined
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!soloMode) return null;

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-4 p-5">
        <SectionLabel
          icon={CalendarClock}
          title="Weekly report"
          aside={data ? formatWeekPeriod(data.week) : undefined}
        />

        {isLoading && <Skeleton className="h-10 w-full" />}

        {isError && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              Couldn&apos;t load your weekly report status.
            </span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}

        {data && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              {data.submitted ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Submitted this week</span>
                </>
              ) : data.draft ? (
                <>
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                    Draft saved
                  </Badge>
                  <span className="text-muted-foreground">
                    Finish before Monday 10:00 Riga time.
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">
                  Not submitted yet. Deadline: Monday 10:00 Riga time.
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistoryOpen(true)}
                disabled={data.history.length === 0}
              >
                <History className="mr-1 h-4 w-4" />
                Past reports
              </Button>
              {!data.submitted && (
                <Button size="sm" onClick={() => setModalOpen(true)}>
                  {data.draft ? "Continue draft" : "Submit weekly report"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <IndividualWeeklyReportModal open={modalOpen} onOpenChange={setModalOpen} />
      <IndividualWeeklyReportHistory
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        entries={data?.history ?? []}
      />
    </Card>
  );
}
```

- [ ] **Step 2: Mount in `my-journey-overview.tsx`**

Add the import next to the other card imports:

```tsx
import { WeeklyReportCard } from "@/components/dashboard/my-journey/weekly-report-card";
```

and in `content`, directly after `<MyJourneyStatCards data={data} />`:

```tsx
      <WeeklyReportCard hasActiveTeam={data.has_active_team} />
```

- [ ] **Step 3: Run the app and look**

```bash
npm run dev
```
Open `/dashboard` as the user's test student (Eliass Test) or the admin account. Expected: the card appears under the stat cards with "Not submitted yet"; "Submit weekly report" opens the modal; a Save as Draft round-trips to "Draft saved" + "Continue draft"; Submit flips to "Submitted this week" and enables "Past reports". Then delete the test rows (MCP):

```sql
delete from public.weekly_reports where context = 'individual' returning user_id, status;
```
Expected: exactly the rows you just created.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/my-journey/weekly-report-card.tsx src/components/dashboard/my-journey-overview.tsx
git commit -m "feat(dashboard): My Journey weekly report card

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Banner, layout mount, notification deep link

**Files:**
- Create: `src/components/dashboard/individual-weekly-report-banner.tsx`
- Modify: `src/components/dashboard-layout-client.tsx:100` (mount after `<WeeklyReportBanner />`)
- Modify: `src/components/notification-center.tsx:175-188`

**Interfaces:**
- Consumes: `useMyJourneyOverview` (`src/hooks/use-my-journey-overview.ts`), `useIndividualWeeklyReportStatus`, `isWeeklyReportBannerWindow`, modal (Task 5).

- [ ] **Step 1: Banner**

`individual-weekly-report-banner.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ArrowRight, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppContext } from "@/contexts/app-context";
import { useIndividualWeeklyReportStatus } from "@/hooks/use-individual-weekly-report";
import { useMyJourneyOverview } from "@/hooks/use-my-journey-overview";
import { usePlatformSettings } from "@/hooks/use-platform-settings";
import { formatWeekPeriod, isWeeklyReportBannerWindow } from "@/lib/weekly-reports";
import { IndividualWeeklyReportModal } from "@/components/weekly-reports/individual/individual-weekly-report-modal";

/**
 * Solo twin of WeeklyReportBanner: Friday → Monday 10:00 Riga, only while
 * My Journey is on, only for students who resolve to the solo form, and
 * only until this week's report is submitted. Opens the modal in place.
 */
export function IndividualWeeklyReportBanner() {
  const { user } = useAppContext();
  const { data: journeys } = usePlatformSettings();
  const { data: overview } = useMyJourneyOverview(
    journeys.myJourney ? user?.id : undefined
  );
  const soloMode =
    journeys.myJourney &&
    overview !== undefined &&
    !(journeys.teamJourney && overview.has_active_team);
  const { data: status } = useIndividualWeeklyReportStatus(
    soloMode ? user?.id : undefined
  );
  const [open, setOpen] = useState(false);

  if (!soloMode || !status || status.submitted) return null;
  if (!isWeeklyReportBannerWindow(status.week)) return null;

  return (
    <div className="px-4 pt-2">
      <Alert className="mb-2 border-amber-500/50 bg-amber-500/10">
        <Clock className="h-4 w-4 !text-amber-600 dark:!text-amber-400" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-sm">
            <span className="font-semibold text-amber-700 dark:text-amber-300">
              My Journey weekly report not submitted
            </span>
            <span className="text-muted-foreground">
              {" "}
              — {formatWeekPeriod(status.week)}
            </span>
            . Deadline:{" "}
            <span className="font-semibold">Monday 10:00 Riga time</span>.
          </span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="ml-3 inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700"
          >
            {status.draft ? "Continue draft" : "Submit Now"}
            <ArrowRight className="h-3 w-3" />
          </button>
        </AlertDescription>
      </Alert>
      <IndividualWeeklyReportModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
```

- [ ] **Step 2: Mount in `dashboard-layout-client.tsx`**

Add the import beside `WeeklyReportBanner`'s import, then change

```tsx
            <WeeklyReportBanner />
```
to
```tsx
            <WeeklyReportBanner />
            <IndividualWeeklyReportBanner />
```

- [ ] **Step 3: Fix the solo deep link in `notification-center.tsx`**

Replace the `else` branch inside the `weekly_report_reminder_2day` / `_1day` case:

```tsx
        } else {
          // Solo reminder — the card on the dashboard opens the form.
          router.push("/dashboard");
        }
```

- [ ] **Step 4: Verify in the browser**

With the dev server running and today's date (2026-09-14, Monday) the banner window is closed — temporarily verify the window logic by checking the schema test from Task 2 already passed, then confirm no banner renders today and no console errors appear on `/dashboard`. Lint:

```bash
npx prettier --write src/components/dashboard/individual-weekly-report-banner.tsx src/components/dashboard-layout-client.tsx src/components/notification-center.tsx && npx eslint src/components/dashboard/individual-weekly-report-banner.tsx src/components/dashboard-layout-client.tsx src/components/notification-center.tsx
```
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/individual-weekly-report-banner.tsx src/components/dashboard-layout-client.tsx src/components/notification-center.tsx
git commit -m "feat(dashboard): solo weekly report banner and reminder deep link

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Admin — context filter and badges

**Files:**
- Modify: `src/app/api/admin/weekly-reports/route.ts:33-36, 59-61`
- Modify: `src/components/admin/admin-weekly-reports-table.tsx` (state, params, filter, cell)
- Modify: `src/components/admin/admin-weekly-report-view-modal.tsx:172-174`

- [ ] **Step 1: Route — accept `context`**

After `const status = url.searchParams.get("status");` add:

```ts
    const context = url.searchParams.get("context"); // team | individual | all
```
After `if (status && status !== "all") query = query.eq("status", status);` add:

```ts
    if (context === "team" || context === "individual") {
      query = query.eq("context", context);
    }
```

- [ ] **Step 2: Table — state, request, filter UI, Solo badge**

Below `const [status, setStatus] = useState<string>("all");` add:

```ts
  const [context, setContext] = useState<string>("all");
```
In the reports-loading effect, after `if (status !== "all") params.set("status", status);` add `if (context !== "all") params.set("context", context);` and add `context` to that effect's dependency array **and** to the page-reset effect's dependency array. Extend `hasFilters` with `|| context !== "all"` and `clearFilters` with `setContext("all");`.

Add a Select after the Status select:

```tsx
        <Select value={context} onValueChange={setContext}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Context" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All contexts</SelectItem>
            <SelectItem value="team">Team</SelectItem>
            <SelectItem value="individual">Solo</SelectItem>
          </SelectContent>
        </Select>
```

Replace the Team cell body:

```tsx
                    <TableCell className="text-sm">
                      {r.team?.name ? (
                        r.team.name
                      ) : r.context === "individual" ? (
                        <Badge variant="outline">Solo</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
```

- [ ] **Step 3: View modal — header badge**

Replace

```tsx
            <Badge variant="outline" className="font-normal">
              {teamName}
            </Badge>
```
with
```tsx
            <Badge variant="outline" className="font-normal">
              {report.context === "individual" ? "Solo · My Journey" : teamName}
            </Badge>
```

- [ ] **Step 4: Check the page**

Open `/dashboard/admin/weekly-reports`. Expected: a Context select; "Solo" filter returns 0 rows today (no individual rows in prod); "Team" returns the same list as before; Clear resets it. Lint the three files with `npx eslint <paths>`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/weekly-reports/route.ts src/components/admin/admin-weekly-reports-table.tsx src/components/admin/admin-weekly-report-view-modal.tsx
git commit -m "feat(admin): weekly reports context filter and solo badge

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Remove dead solo code

**Files:**
- Delete: `src/components/weekly-reports/individual-weekly-report-modal.tsx`
- Delete: `src/components/weekly-reports/individual-weekly-reports-table.tsx`
- Delete: `src/types/my-journey.ts`
- Modify: `src/lib/weekly-reports.ts` — remove `hasUserSubmittedThisWeekIndividual` and `getUserIndividualWeeklyReports` (the whole block after `// Individual context functions`).

- [ ] **Step 1: Prove nothing imports them**

```bash
grep -rn "individual-weekly-report-modal\|individual-weekly-reports-table\|types/my-journey\|hasUserSubmittedThisWeekIndividual\|getUserIndividualWeeklyReports" src tests | grep -v "weekly-reports/individual-weekly-report"
```
Expected: no output (the only hits are inside the files being deleted). If anything else appears, stop and report it.

- [ ] **Step 2: Delete and trim**

```bash
git rm src/components/weekly-reports/individual-weekly-report-modal.tsx src/components/weekly-reports/individual-weekly-reports-table.tsx src/types/my-journey.ts
```
Then in `src/lib/weekly-reports.ts` delete from the line `// Individual context functions` to the end of the file.

- [ ] **Step 3: Type-check + tests**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | head -20 && npx vitest run tests/weekly-reports
```
Expected: no new type errors; both weekly-reports test files PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/weekly-reports.ts
git commit -m "refactor(weekly-reports): drop unused 5-question solo modal and helpers

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Documentation + rollback entry

**Files:**
- Modify: `docs/documentation/economies.md:13-15` (phase table), `:93-100` (readers table)
- Modify: `docs/documentation/team-journey.md:286` (§ Weekly Reports intro)
- Modify: `docs/documentation/dashboard.md:158-176`
- Modify: `docs/documentation/notifications.md:127`, `:324`
- Modify: `docs/pages/admin/weekly-reports.md` ("What it does" filters list, API route line)
- Modify: `CLAUDE.md` — new Rollback Reference entry above `### 2026-09-11 — Admin batch scope`

- [ ] **Step 1: economies.md**

Phase table row for My Journey: change `| No |` to `| Solo weekly report (4 questions, reminders only — no strikes/penalty) |`; Team Journey row stays `Yes`. Below the table add:

```markdown
**Which weekly report form a student gets:** Team Journey on **and** active
team membership → the team form on the Team Journey page. Otherwise, My
Journey on → the solo form (dashboard card + banner). One report per week,
never both. Same rule in SQL: `send_individual_weekly_report_reminders_v1`.
Feature doc: `docs/superpowers/specs/2026-09-14-individual-weekly-reports-design.md`.
```

Readers table: add a row
`| \`WeeklyReportCard\`, \`IndividualWeeklyReportBanner\` | hidden unless My Journey on and the student is not in an active team while Team Journey is on |`.

- [ ] **Step 2: team-journey.md**

At the top of `## Weekly Reports` add one paragraph:

```markdown
> This section is the **team** report (8 questions, Team Journey only). The
> **solo** My Journey report (questions #1, #2, #6, #8 of this template,
> `weekly_reports.context = 'individual'`, RPC
> `submit_individual_weekly_report_v1`) is specified in
> `docs/superpowers/specs/2026-09-14-individual-weekly-reports-design.md`.
```

- [ ] **Step 3: dashboard.md**

In the `MyJourneyOverview` bullet, after "solo-economy stat cards," insert "weekly-report card (`WeeklyReportCard`, solo form: 4 questions, DB drafts, past-reports dialog),". Replace item 3:

```markdown
3. **Weekly Report Banners** — rendered by the dashboard layout above the
   page content, not by this page. `WeeklyReportBanner` (team): unsubmitted
   teams, Friday–Monday 10:00 Riga, only while Team Journey is on.
   `IndividualWeeklyReportBanner` (solo): same window, only while My Journey
   is on and the student resolves to the solo form; opens the modal in place.
```

- [ ] **Step 4: notifications.md**

Trigger table row → `| Weekly report reminder | pg_cron jobs 5/7 (team: \`send_weekly_report_reminders[_sunday]\`) and \`weekly-report-reminder-{friday,sunday}-individual\` (solo: \`send_individual_weekly_report_reminders_v1\`) | \`weekly_report_reminder_2day\` / \`weekly_report_reminder_1day\`; \`data.context\` is \`team\` or \`individual\` |`.
In the data-shape block, change the `context?` comment to `// "team" (deep-links to the team page) or "individual" (deep-links to /dashboard)`.

- [ ] **Step 5: docs/pages/admin/weekly-reports.md**

Change "Four filters" to "Five filters" and add `- \`Context\` — All / Team / Solo (\`weekly_reports.context\`). Solo rows show a "Solo" badge in the Team column and "Solo · My Journey" in the modal header.` Update the API route line to list `context` among the filters.

- [ ] **Step 6: CLAUDE.md rollback entry**

Insert above `### 2026-09-11 — Admin batch scope …`:

```markdown
### 2026-09-14 — Individual (My Journey) weekly reports (migration: `weekly_reports_individual_v1`; repo file `20260914100000_weekly_reports_individual_v1.sql`)

**What it added:** partial unique index `uq_weekly_reports_individual_submitted_week` (`context='individual' AND status='submitted'`), RPCs `submit_individual_weekly_report_v1(jsonb, boolean)` + `get_individual_weekly_report_status_v1()` (authenticated, `auth.uid()` only) and `send_individual_weekly_report_reminders_v1(text)` (service_role), cron jobs `weekly-report-reminder-friday-individual` (Fri 10:00 UTC) / `weekly-report-reminder-sunday-individual` (Sun 10:00 UTC). Purely additive — the team RPCs, jobs 5/7, the strikes edge function and `weekly-report-modal.tsx` are untouched. Mode rule: Team Journey on + active team → team form; else My Journey on → solo form (4 questions: commitments, blockers, next week, alignment). No reward, no strike, no penalty. Spec: `docs/superpowers/specs/2026-09-14-individual-weekly-reports-design.md`.

**Rollback:** `select cron.unschedule('weekly-report-reminder-friday-individual'); select cron.unschedule('weekly-report-reminder-sunday-individual'); drop function public.send_individual_weekly_report_reminders_v1(text), public.get_individual_weekly_report_status_v1(), public.submit_individual_weekly_report_v1(jsonb, boolean); drop index public.uq_weekly_reports_individual_submitted_week;` — data, only if wanted: `delete from weekly_reports where context = 'individual';`. Then revert the app code (git). Reminder notifications are `type in ('weekly_report_reminder_2day','weekly_report_reminder_1day') and data->>'context' = 'individual'`.
```

- [ ] **Step 7: Commit**

```bash
git add docs/documentation/economies.md docs/documentation/team-journey.md docs/documentation/dashboard.md docs/documentation/notifications.md docs/pages/admin/weekly-reports.md CLAUDE.md docs/superpowers/specs/2026-09-14-individual-weekly-reports-design.md docs/superpowers/plans/2026-09-14-individual-weekly-reports.md
git commit -m "docs: individual weekly reports spec, plan, feature docs and rollback

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Full verification

**Files:** none

- [ ] **Step 1: Lint, tests, build**

```bash
npm run lint && npm run test && npm run build
```
Expected: lint passes (or only the ~66 pre-existing legacy errors already tracked — report the exact count), all tests pass, build succeeds. Paste the tail of each output in the report.

- [ ] **Step 2: Confirm prod is clean**

MCP `execute_sql`:

```sql
select count(*) as solo_rows from public.weekly_reports where context = 'individual';
select count(*) as test_auth_users from auth.users where email like 'test_iwr_%';
select count(*) as stray_solo_reminders from public.notifications
where type like 'weekly_report_reminder_%' and data->>'context' = 'individual';
```
Expected: `0`, `0`, `0`.

- [ ] **Step 3: Hand off**

Report to the user: branch name, commit list (`git log --oneline origin/develop..HEAD`), what was verified, and the two things left for them: push + Vercel preview click-through (card → draft → submit → banner on Friday; admin Context filter), and the manual backup confirmation from Task 1 if it was skipped. Do not push.
