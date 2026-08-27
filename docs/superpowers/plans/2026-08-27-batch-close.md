# Batch Close Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tag users/teams with a cohort batch, let an admin close a batch (archive + auth-ban its students, keep every row), and make past batches visible in the admin UI.

**Architecture:** Additive schema (`batch_id` on `users`/`teams` → `diploma_batches`, `closed_at` on batches) + three net-new SECURITY DEFINER RPCs (`get_batch_close_preview_v1`, `close_batch_v1`, `reopen_batch_v1`). API routes call the RPC first (DB is truth), then ban/unban auth accounts via `auth.admin.updateUserById({ ban_duration })` as a re-runnable side effect. UI hangs off the existing Diplomas → Setup batch cards; users/teams admin tables gain a batch filter.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres RPC via MCP `apply_migration`), supabase-js 2.57 admin API, TanStack Query, ShadCN, Vitest (service-role integration tests).

**Spec:** `docs/superpowers/specs/2026-08-27-batch-close-design.md`

## Global Constraints

- **Zero deletes.** No task may `DELETE` or drop anything in prod. Migrations are additive; RPCs only `UPDATE` `status`, `archived_at`, `batch_id`, `closed_at`, `updated_at`.
- Do **not** call `close_batch_v1` against `Mercury-Redstone` (`eb55d8e2-bfb2-4567-8678-420216293d78`). That is the user's manual step. Tests use their own `test_` batch.
- Mercury-Redstone id `eb55d8e2-bfb2-4567-8678-420216293d78`; Liga Letina id `c51d3c72-d2c7-4723-aee4-bf303e6cb4e2`; excluded admin teams: `[TEST] Test product`, `Janis - Test product`.
- V2 pattern: existing RPCs are not rewritten except two additive edits called out explicitly (`get_users_for_filter` param with default; `get_students_health_overview_v2` one-line filter). `get_teams_with_stats` gets a `_v2`.
- Prettier: double quotes, 80 cols, trailing commas es5. Files < ~200 lines. ShadCN only. Sonner toasts, no `alert/confirm`.
- Commit only when the user asks. Do not push.

---

### Task 1: Snapshot + schema + backfill (DB, via MCP `apply_migration`)

**Files:** none in repo (DB only). Record migration names in `CLAUDE.md` rollback section in Task 10.

**Interfaces:**
- Produces: `users.batch_id uuid`, `teams.batch_id uuid`, `diploma_batches.closed_at timestamptz`, backup table `public.batch_close_backup_20260827`.

- [x] **Step 1: Pre-flight counts (execute_sql)**

```sql
select (select count(*) from users where primary_role='user') as students,
       (select count(*) from users where primary_role='admin') as admins,
       (select count(*) from teams) as teams,
       (select count(*) from teams where status='archived') as archived_teams;
```
Expected: 69 / 6 / 43 / 7.

- [x] **Step 2: Snapshot table (apply_migration `batch_close_backup_20260827`)**

```sql
create table public.batch_close_backup_20260827 as
select 'users'::text as tbl, id, status::text as status, null::timestamptz as archived_at, updated_at as snapshot_updated_at
from public.users
union all
select 'teams', id, status::text, archived_at, null from public.teams;
revoke all on public.batch_close_backup_20260827 from anon, authenticated;
```
Verify: `select tbl, count(*) from batch_close_backup_20260827 group by 1` → users 75, teams 43.

- [x] **Step 3: Schema (apply_migration `batch_close_schema_v1`)**

```sql
alter table public.diploma_batches add column if not exists closed_at timestamptz;
alter table public.users add column if not exists batch_id uuid
  references public.diploma_batches(id) on delete restrict;
alter table public.teams add column if not exists batch_id uuid
  references public.diploma_batches(id) on delete restrict;
create index if not exists users_batch_id_idx on public.users(batch_id);
create index if not exists teams_batch_id_idx on public.teams(batch_id);
comment on column public.users.batch_id is 'Cohort. NULL = current cohort or staff. Set by close_batch_v1.';
comment on column public.teams.batch_id is 'Cohort. NULL = current cohort or admin test team. Set by close_batch_v1.';
```

- [x] **Step 4: Backfill (apply_migration `batch_close_backfill_mercury_redstone`)**

```sql
update public.teams set batch_id = 'eb55d8e2-bfb2-4567-8678-420216293d78'
where batch_id is null
  and id not in (
    select tm.team_id from public.team_members tm
    join public.users u on u.id = tm.user_id
    where u.primary_role = 'admin' and tm.left_at is null);

update public.users set batch_id = 'eb55d8e2-bfb2-4567-8678-420216293d78'
where batch_id is null
  and primary_role = 'user'
  and id <> 'c51d3c72-d2c7-4723-aee4-bf303e6cb4e2';
```

- [x] **Step 5: Verify**

```sql
select (select count(*) from users where batch_id is not null) as users_tagged,
       (select count(*) from users where batch_id is null) as users_null,
       (select count(*) from teams where batch_id is not null) as teams_tagged,
       (select string_agg(name, ', ') from teams where batch_id is null) as null_teams,
       (select count(*) from users where status='archived') as archived_users,
       (select count(*) from teams where status='archived') as archived_teams;
```
Expected: 68 / 7 / 41 / `[TEST] Test product, Janis - Test product` / 0 / 7. **Status counts must be unchanged.**

---

### Task 2: RPCs + admin read policy (DB, via MCP `apply_migration`)

**Interfaces (produces):**
- `public.is_admin_v1() returns boolean` — SECURITY DEFINER, STABLE.
- Policy `p_users_select_admin_all` on `users` FOR SELECT TO authenticated USING `is_admin_v1()`.
- `get_batch_close_preview_v1() returns jsonb` → `{ users: [{id,name,email,team_names: text[]}], teams: [{id,name,member_count,member_names: text[],has_admin_member: bool}] }`
- `close_batch_v1(p_batch_id uuid, p_user_ids uuid[], p_team_ids uuid[]) returns jsonb` → `{ users_archived int, teams_archived int }`
- `reopen_batch_v1(p_batch_id uuid) returns jsonb` → `{ users_reopened int, teams_reopened int }`
- `get_users_for_filter(p_include_archived boolean default false)` — same return.
- `get_teams_with_stats_v2()` — `get_teams_with_stats` columns + `batch_id uuid, batch_name text, archived_at timestamptz`.

- [x] **Step 1: apply_migration `batch_close_is_admin_and_users_admin_read`**

```sql
create or replace function public.is_admin_v1()
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (select 1 from public.users u
                 where u.id = auth.uid() and u.primary_role = 'admin');
$$;
revoke all on function public.is_admin_v1() from public;
grant execute on function public.is_admin_v1() to authenticated, service_role;

drop policy if exists p_users_select_admin_all on public.users;
create policy p_users_select_admin_all on public.users
  for select to authenticated using (public.is_admin_v1());
```

- [x] **Step 2: apply_migration `batch_close_rpcs_v1`**

```sql
-- Caller guard shared by the three RPCs: admin JWT or service_role.
create or replace function public.assert_admin_or_service_v1()
returns void language plpgsql stable security definer
set search_path = public, pg_temp as $$
begin
  if auth.role() = 'service_role' then return; end if;
  if not public.is_admin_v1() then
    raise exception 'Unauthorized: Admin access required' using errcode = '42501';
  end if;
end $$;
revoke all on function public.assert_admin_or_service_v1() from public;
grant execute on function public.assert_admin_or_service_v1() to authenticated, service_role;

create or replace function public.get_batch_close_preview_v1()
returns jsonb language plpgsql stable security definer
set search_path = public, pg_temp as $$
declare v_users jsonb; v_teams jsonb;
begin
  perform public.assert_admin_or_service_v1();
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', u.id, 'name', u.name, 'email', u.email,
    'team_names', coalesce((select array_agg(t.name order by t.name)
                            from team_members tm join teams t on t.id = tm.team_id
                            where tm.user_id = u.id and tm.left_at is null), '{}'::text[])
  ) order by u.name), '[]'::jsonb) into v_users
  from users u
  where u.status = 'active' and u.primary_role = 'user' and u.batch_id is null;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id, 'name', t.name, 'member_count', t.member_count,
    'member_names', coalesce((select array_agg(u.name order by u.name)
                              from team_members tm join users u on u.id = tm.user_id
                              where tm.team_id = t.id and tm.left_at is null), '{}'::text[]),
    'has_admin_member', exists (select 1 from team_members tm join users u on u.id = tm.user_id
                                where tm.team_id = t.id and tm.left_at is null and u.primary_role = 'admin')
  ) order by t.name), '[]'::jsonb) into v_teams
  from teams t where t.status = 'active';

  return jsonb_build_object('users', v_users, 'teams', v_teams);
end $$;

create or replace function public.close_batch_v1(p_batch_id uuid, p_user_ids uuid[], p_team_ids uuid[])
returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare v_users int; v_teams int; v_closed timestamptz;
begin
  perform public.assert_admin_or_service_v1();
  select closed_at into v_closed from diploma_batches where id = p_batch_id for update;
  if not found then raise exception 'Batch not found' using errcode = 'P0002'; end if;
  if v_closed is not null then raise exception 'Batch already closed' using errcode = 'P0001'; end if;
  if exists (select 1 from users where id = any(p_user_ids) and primary_role = 'admin') then
    raise exception 'Refusing to archive an admin account' using errcode = 'P0001';
  end if;

  update users set batch_id = p_batch_id, status = 'archived', updated_at = now()
  where id = any(p_user_ids) and status = 'active';
  get diagnostics v_users = row_count;

  update teams set batch_id = p_batch_id, status = 'archived', archived_at = now()
  where id = any(p_team_ids) and status = 'active';
  get diagnostics v_teams = row_count;

  update diploma_batches set closed_at = now() where id = p_batch_id;
  return jsonb_build_object('users_archived', v_users, 'teams_archived', v_teams);
end $$;

create or replace function public.reopen_batch_v1(p_batch_id uuid)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare v_users int; v_teams int; v_closed timestamptz;
begin
  perform public.assert_admin_or_service_v1();
  select closed_at into v_closed from diploma_batches where id = p_batch_id for update;
  if not found then raise exception 'Batch not found' using errcode = 'P0002'; end if;
  if v_closed is null then raise exception 'Batch is not closed' using errcode = 'P0001'; end if;

  update users set status = 'active', updated_at = now()
  where batch_id = p_batch_id and status = 'archived' and updated_at >= v_closed;
  get diagnostics v_users = row_count;

  update teams set status = 'active', archived_at = null
  where batch_id = p_batch_id and status = 'archived' and archived_at >= v_closed;
  get diagnostics v_teams = row_count;

  update diploma_batches set closed_at = null where id = p_batch_id;
  return jsonb_build_object('users_reopened', v_users, 'teams_reopened', v_teams);
end $$;

revoke all on function public.get_batch_close_preview_v1() from public;
revoke all on function public.close_batch_v1(uuid, uuid[], uuid[]) from public;
revoke all on function public.reopen_batch_v1(uuid) from public;
grant execute on function public.get_batch_close_preview_v1() to authenticated, service_role;
grant execute on function public.close_batch_v1(uuid, uuid[], uuid[]) to authenticated, service_role;
grant execute on function public.reopen_batch_v1(uuid) to authenticated, service_role;
```

Note `reopen` for users keys on `updated_at >= closed_at` (the close sets `updated_at = now()`; users have no `archived_at`).

- [x] **Step 3: apply_migration `batch_close_admin_read_rpcs`**

```sql
create or replace function public.get_teams_with_stats_v2()
returns table(id uuid, name text, status status_state, created_at timestamptz, total_points integer,
              member_count bigint, meetings_count bigint, tasks_completed bigint,
              batch_id uuid, batch_name text, archived_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_admin_or_service_v1();
  return query
  select t.id, t.name, t.status, t.created_at, t.team_points,
    count(distinct case when tm.left_at is null then tm.id end),
    count(distinct case when cm.status = 'completed' then cm.id end),
    count(distinct case when tp.status = 'completed' then tp.id end),
    t.batch_id, b.name, t.archived_at
  from teams t
  left join diploma_batches b on b.id = t.batch_id
  left join team_members tm on t.id = tm.team_id
  left join client_meetings cm on t.id = cm.team_id
  left join task_progress tp on t.id = tp.team_id
  group by t.id, t.name, t.status, t.created_at, t.team_points, t.batch_id, b.name, t.archived_at
  order by t.created_at desc;
end $$;
grant execute on function public.get_teams_with_stats_v2() to authenticated, service_role;

drop function if exists public.get_users_for_filter();
create or replace function public.get_users_for_filter(p_include_archived boolean default false)
returns table(id uuid, name text, email text) language plpgsql security definer as $$
begin
  if not exists (select 1 from public.users u where u.id = auth.uid() and u.primary_role = 'admin') then
    raise exception 'Unauthorized: Admin access required';
  end if;
  return query select u.id, u.name, u.email from public.users u
  where p_include_archived or u.status = 'active' order by u.name;
end $$;
```

Then edit `get_students_health_overview_v2`: retrieve def with `pg_get_functiondef`, change `WHERE u.primary_role = 'user'` → `WHERE u.primary_role = 'user' AND u.status = 'active'`, re-apply as migration `batch_close_health_overview_active_only`. First snapshot it: `create function get_students_health_overview_v2_backup_v1` with the same body (rename in def).

- [x] **Step 4: Regenerate types**

Run: `npx supabase gen types typescript --project-id ksoohvygoysofvtqdumz > src/types/database.ts` (or MCP `generate_typescript_types` and write the file). Verify `git diff --stat src/types/database.ts` shows only additions (batch_id, closed_at, new functions).

---

### Task 3: Integration tests for the RPCs

**Files:** Create `tests/batch-close.test.ts`

- [x] **Step 1: Write the tests**

```ts
/**
 * Integration tests for close_batch_v1 / reopen_batch_v1 /
 * get_batch_close_preview_v1 against the real project (service role).
 * Uses its own test_ batch; never touches Mercury-Redstone.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addTestTeamMember,
  createTestTeam,
  createTestUser,
  getAdminClient,
} from "./setup";

let batchId: string;

async function createTestBatch() {
  const { data, error } = await getAdminClient()
    .from("diploma_batches")
    .insert({ name: `test_batch_${Date.now()}`, number_prefix: "TST" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

beforeEach(async () => {
  batchId = await createTestBatch();
});

afterEach(async () => {
  const sb = getAdminClient();
  // Untag before the global cleanup deletes users/teams (FK restrict).
  await sb.from("users").update({ batch_id: null }).eq("batch_id", batchId);
  await sb.from("teams").update({ batch_id: null }).eq("batch_id", batchId);
  const { error } = await sb.from("diploma_batches").delete().eq("id", batchId);
  if (error) throw new Error(`batch cleanup failed: ${error.message}`);
});

describe("close_batch_v1", () => {
  it("archives exactly the given users/teams, tags batch, sets closed_at", async () => {
    const sb = getAdminClient();
    const a = await createTestUser();
    const b = await createTestUser();
    const team = await createTestTeam(a.id);
    const untouched = await createTestTeam(b.id);

    const { data, error } = await sb.rpc("close_batch_v1", {
      p_batch_id: batchId,
      p_user_ids: [a.id],
      p_team_ids: [team.id],
    });
    expect(error).toBeNull();
    expect(data).toEqual({ users_archived: 1, teams_archived: 1 });

    const { data: ua } = await sb.from("users").select("status,batch_id").eq("id", a.id).single();
    const { data: ub } = await sb.from("users").select("status,batch_id").eq("id", b.id).single();
    const { data: t1 } = await sb.from("teams").select("status,batch_id,archived_at").eq("id", team.id).single();
    const { data: t2 } = await sb.from("teams").select("status,batch_id").eq("id", untouched.id).single();
    const { data: batch } = await sb.from("diploma_batches").select("closed_at").eq("id", batchId).single();

    expect(ua).toEqual({ status: "archived", batch_id: batchId });
    expect(ub).toEqual({ status: "active", batch_id: null });
    expect(t1?.status).toBe("archived");
    expect(t1?.batch_id).toBe(batchId);
    expect(t1?.archived_at).not.toBeNull();
    expect(t2).toEqual({ status: "active", batch_id: null });
    expect(batch?.closed_at).not.toBeNull();
  });

  it("does not touch an already-archived team's archived_at", async () => {
    const sb = getAdminClient();
    const a = await createTestUser();
    const old = await createTestTeam(a.id, { status: "archived" });
    const before = "2026-01-01T00:00:00.000Z";
    await sb.from("teams").update({ archived_at: before }).eq("id", old.id);

    const { data } = await sb.rpc("close_batch_v1", {
      p_batch_id: batchId, p_user_ids: [], p_team_ids: [old.id],
    });
    expect(data).toEqual({ users_archived: 0, teams_archived: 0 });
    const { data: t } = await sb.from("teams").select("archived_at,batch_id").eq("id", old.id).single();
    expect(new Date(t!.archived_at!).toISOString()).toBe(before);
    expect(t?.batch_id).toBeNull();
  });

  it("refuses admin accounts and already-closed batches", async () => {
    const sb = getAdminClient();
    const admin = await createTestUser({ primary_role: "admin" });
    const { error: e1 } = await sb.rpc("close_batch_v1", {
      p_batch_id: batchId, p_user_ids: [admin.id], p_team_ids: [],
    });
    expect(e1?.message).toMatch(/admin/i);

    await sb.rpc("close_batch_v1", { p_batch_id: batchId, p_user_ids: [], p_team_ids: [] });
    const { error: e2 } = await sb.rpc("close_batch_v1", {
      p_batch_id: batchId, p_user_ids: [], p_team_ids: [],
    });
    expect(e2?.message).toMatch(/already closed/i);
  });
});

describe("reopen_batch_v1", () => {
  it("restores only rows archived by the close", async () => {
    const sb = getAdminClient();
    const a = await createTestUser();
    const team = await createTestTeam(a.id);
    const old = await createTestTeam(a.id, { status: "archived" });
    await sb.from("teams").update({ archived_at: "2026-01-01T00:00:00.000Z", batch_id: batchId }).eq("id", old.id);

    await sb.rpc("close_batch_v1", { p_batch_id: batchId, p_user_ids: [a.id], p_team_ids: [team.id] });
    const { data, error } = await sb.rpc("reopen_batch_v1", { p_batch_id: batchId });
    expect(error).toBeNull();
    expect(data).toEqual({ users_reopened: 1, teams_reopened: 1 });

    const { data: u } = await sb.from("users").select("status,batch_id").eq("id", a.id).single();
    const { data: t } = await sb.from("teams").select("status,archived_at").eq("id", team.id).single();
    const { data: o } = await sb.from("teams").select("status").eq("id", old.id).single();
    const { data: b } = await sb.from("diploma_batches").select("closed_at").eq("id", batchId).single();
    expect(u).toEqual({ status: "active", batch_id: batchId });
    expect(t).toEqual({ status: "active", archived_at: null });
    expect(o?.status).toBe("archived");
    expect(b?.closed_at).toBeNull();
  });
});

describe("get_batch_close_preview_v1", () => {
  it("lists untagged active students and active teams, flags admin teams", async () => {
    const sb = getAdminClient();
    const student = await createTestUser();
    const admin = await createTestUser({ primary_role: "admin" });
    const tagged = await createTestUser();
    await sb.from("users").update({ batch_id: batchId }).eq("id", tagged.id);
    const studentTeam = await createTestTeam(student.id);
    const adminTeam = await createTestTeam(admin.id);
    await addTestTeamMember(adminTeam.id, student.id);

    const { data, error } = await sb.rpc("get_batch_close_preview_v1");
    expect(error).toBeNull();
    const users = data.users as { id: string; team_names: string[] }[];
    const teams = data.teams as { id: string; has_admin_member: boolean }[];
    const s = users.find((u) => u.id === student.id);
    expect(s?.team_names.sort()).toEqual([adminTeam.name, studentTeam.name].sort());
    expect(users.find((u) => u.id === admin.id)).toBeUndefined();
    expect(users.find((u) => u.id === tagged.id)).toBeUndefined();
    expect(teams.find((t) => t.id === studentTeam.id)?.has_admin_member).toBe(false);
    expect(teams.find((t) => t.id === adminTeam.id)?.has_admin_member).toBe(true);
  });
});

describe("archived rows drop out of live surfaces", () => {
  it("leaderboard and missed-report check ignore archived", async () => {
    const sb = getAdminClient();
    const a = await createTestUser({ total_xp: 999999 });
    const team = await createTestTeam(a.id);
    await sb.rpc("close_batch_v1", { p_batch_id: batchId, p_user_ids: [a.id], p_team_ids: [team.id] });
    const { data: lb } = await sb.rpc("get_live_leaderboard_data");
    expect((lb as { id?: string; user_id?: string }[] | null)?.some((r) => (r.id ?? r.user_id) === a.id)).toBeFalsy();
    const { data: missed } = await sb.rpc("check_missed_weekly_reports_team_context");
    expect((missed as { team_id: string }[] | null)?.some((r) => r.team_id === team.id)).toBeFalsy();
  });
});
```

- [x] **Step 2: Run** `npx vitest run tests/batch-close.test.ts` — expected: all pass (RPCs exist from Task 2). If the leaderboard row shape differs, inspect one row and adjust the id accessor only.

---

### Task 4: Server data layer + validation

**Files:**
- Create `src/lib/batches/data.ts`
- Create `src/lib/batches/types.ts`
- Modify `src/lib/validation-schemas.ts` (append)

**Interfaces (produces):**
```ts
// types.ts
export interface BatchClosePreview {
  users: { id: string; name: string | null; email: string; team_names: string[] }[];
  teams: { id: string; name: string; member_count: number; member_names: string[]; has_admin_member: boolean }[];
}
export interface BanFailure { id: string; email: string | null; error: string }
export interface CloseBatchResult { users_archived: number; teams_archived: number; banned: number; banFailures: BanFailure[] }
export interface ReopenBatchResult { users_reopened: number; teams_reopened: number; unbanned: number; banFailures: BanFailure[] }
export interface RetryBansResult { banned: number; alreadyBanned: number; banFailures: BanFailure[] }
// data.ts
export const PERMANENT_BAN = "876000h";
export async function getClosePreview(): Promise<BatchClosePreview>
export async function closeBatch(batchId: string, userIds: string[], teamIds: string[]): Promise<CloseBatchResult>
export async function reopenBatch(batchId: string): Promise<ReopenBatchResult>
export async function retryBans(batchId: string): Promise<RetryBansResult>
// validation-schemas.ts
export const CloseBatchSchema = z.object({ userIds: z.array(z.string().uuid()).max(500), teamIds: z.array(z.string().uuid()).max(500) });
```

- [x] **Step 1: `src/lib/batches/types.ts`** — the interfaces above, verbatim.

- [x] **Step 2: `src/lib/batches/data.ts`**

```ts
// Batch close/reopen: DB is the source of truth (RPC first), auth ban is a
// re-runnable side effect. Server-only (admin client).
import { createAdminClient } from "@/lib/supabase/admin";
import type { BanFailure, BatchClosePreview, CloseBatchResult, ReopenBatchResult, RetryBansResult } from "./types";

export const PERMANENT_BAN = "876000h"; // ~100y; Supabase has no "forever"

const admin = () => createAdminClient();

export async function getClosePreview(): Promise<BatchClosePreview> {
  const { data, error } = await admin().rpc("get_batch_close_preview_v1");
  if (error) throw new Error(`preview failed: ${error.message}`);
  return data as unknown as BatchClosePreview;
}

async function setBan(userIds: string[], duration: string) {
  const supa = admin();
  const failures: BanFailure[] = [];
  let ok = 0;
  for (const id of userIds) {
    const { error } = await supa.auth.admin.updateUserById(id, { ban_duration: duration });
    if (error) {
      const { data } = await supa.from("users").select("email").eq("id", id).maybeSingle();
      failures.push({ id, email: data?.email ?? null, error: error.message });
    } else ok++;
  }
  return { ok, failures };
}

async function batchUserIds(batchId: string): Promise<string[]> {
  const { data, error } = await admin().from("users").select("id").eq("batch_id", batchId).eq("primary_role", "user");
  if (error) throw new Error(`batch users lookup failed: ${error.message}`);
  return (data ?? []).map((r) => r.id);
}

export async function closeBatch(batchId: string, userIds: string[], teamIds: string[]): Promise<CloseBatchResult> {
  const { data, error } = await admin().rpc("close_batch_v1", { p_batch_id: batchId, p_user_ids: userIds, p_team_ids: teamIds });
  if (error) throw new Error(error.message);
  const counts = data as unknown as { users_archived: number; teams_archived: number };
  const { ok, failures } = await setBan(userIds, PERMANENT_BAN);
  return { ...counts, banned: ok, banFailures: failures };
}

export async function reopenBatch(batchId: string): Promise<ReopenBatchResult> {
  const ids = await batchUserIds(batchId);
  const { data, error } = await admin().rpc("reopen_batch_v1", { p_batch_id: batchId });
  if (error) throw new Error(error.message);
  const counts = data as unknown as { users_reopened: number; teams_reopened: number };
  const { ok, failures } = await setBan(ids, "none");
  return { ...counts, unbanned: ok, banFailures: failures };
}

export async function retryBans(batchId: string): Promise<RetryBansResult> {
  const supa = admin();
  const ids = await batchUserIds(batchId);
  const { data: archived } = await supa.from("users").select("id").in("id", ids).eq("status", "archived");
  const targets = (archived ?? []).map((r) => r.id);
  let alreadyBanned = 0;
  const toBan: string[] = [];
  for (const id of targets) {
    const { data } = await supa.auth.admin.getUserById(id);
    const until = data?.user?.banned_until ? new Date(data.user.banned_until) : null;
    if (until && until > new Date()) alreadyBanned++; else toBan.push(id);
  }
  const { ok, failures } = await setBan(toBan, PERMANENT_BAN);
  return { banned: ok, alreadyBanned, banFailures: failures };
}
```

- [x] **Step 3: Append `CloseBatchSchema` to `src/lib/validation-schemas.ts`** (after `DiplomaStudentUpdateSchema`).

- [x] **Step 4: `npx tsc --noEmit -p tsconfig.json`** — expected: clean (types regenerated in Task 2 include the RPCs). If `ban_duration` type complains, check `node_modules/@supabase/auth-js/dist/module/lib/types.d.ts:363` — it's `ban_duration?: string | 'none'`.

---

### Task 5: API routes

**Files:** Create
- `src/app/api/admin/batches/preview/route.ts` (GET)
- `src/app/api/admin/batches/[id]/close/route.ts` (POST)
- `src/app/api/admin/batches/[id]/reopen/route.ts` (POST)
- `src/app/api/admin/batches/[id]/retry-bans/route.ts` (POST)

All use `requireAdmin()` from `@/lib/diplomas/auth` (diplomas is not seam-firewalled). Pattern (close):

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/diplomas/auth";
import { closeBatch } from "@/lib/batches/data";
import { CloseBatchSchema } from "@/lib/validation-schemas";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return NextResponse.json({ error: "Invalid batch id" }, { status: 400 });
  const body = await request.json().catch(() => null);
  const parsed = CloseBatchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "validation_failed", details: parsed.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json(await closeBatch(id, parsed.data.userIds, parsed.data.teamIds));
  } catch (e) {
    console.error("batches: close failed", e);
    const msg = e instanceof Error ? e.message : "Failed to close batch";
    const status = /already closed|not found|admin account/i.test(msg) ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
```
`reopen` and `retry-bans`: same shell, no body, call `reopenBatch(id)` / `retryBans(id)`. `preview`: GET → `getClosePreview()`.

- [x] Verify `npx tsc --noEmit` clean and `npm run lint -- src/app/api/admin/batches src/lib/batches` clean.

---

### Task 6: UI — hooks, CloseBatchDialog, BatchForm buttons, New batch

**Files:**
- Create `src/components/admin/batches/use-batch-close.ts`
- Create `src/components/admin/batches/close-batch-dialog.tsx`
- Create `src/components/admin/batches/close-batch-lists.tsx` (checkbox lists, keeps dialog < 200 lines)
- Create `src/components/diplomas/new-batch-form.tsx`
- Modify `src/components/diplomas/batch-form.tsx` (add Close/Reopen/Retry bans controls)
- Modify `src/components/diplomas/setup-tab.tsx` (render `NewBatchForm`)
- Modify `src/lib/diplomas/types.ts` (`BatchRow.closed_at: string | null`)

**Hooks** (`use-batch-close.ts`): `useBatchClosePreview(enabled)`, `useCloseBatch()`, `useReopenBatch()`, `useRetryBans()` — React Query, `retry: 0`, `onError` toast, invalidate `["admin-diplomas", "batches"]` + `["admin-batches"]`. Fetch helpers copied from `use-diplomas.ts` (`fetchJson`/`postJson`).

**Dialog** behaviour: opens from BatchForm; loads preview; users list all checked by default; teams checked unless `has_admin_member`; search box filters both lists; footer shows "Archive N users and M teams"; confirmation `Input` requires typing the batch name exactly; submit disabled until it matches; `isPending` spinner; on success shows result summary (`users_archived`, `teams_archived`, `banned`, failures table) with a **Retry bans** button when `banFailures.length > 0`; toast success/error.

**BatchForm**: under the dates: if `closed_at` → `Badge` "Closed {date}" + `Reopen` button (opens a small confirm `Dialog` with typed batch name, calls `useReopenBatch`) + `Retry bans`. Else → `Close batch…` button opening `CloseBatchDialog`.

**NewBatchForm**: name + prefix inputs → `useUpsertBatch` (already supports insert). Zod rules already on the route.

- [x] Implement, then `npm run lint` on the touched files and `npx tsc --noEmit`.

---

### Task 7: Admin users — route + table + modal

**Files:** Modify `src/app/api/admin/users/route.ts`, `src/components/admin/admin-users-table.tsx`, `src/components/admin/user-detail-modal.tsx`

- Route: fetch profiles with `createAdminClient()` (not RLS) and select `id, name, primary_role, total_xp, total_points, status, batch_id, batch:diploma_batches(name)`. Add `filter === "archived"` (profile.status === "archived") and `filter.startsWith("batch:")` (profile.batch_id === id). Response row gains `account_status: "active" | "archived"`, `batch_id`, `batch_name`; keep `status` (email-confirmed) as is for the Pending badge. Also `GET /api/admin/diplomas/batches` already lists batches for the filter dropdown.
- Table: `Select` items: All / Active / Pending / Archived / Admins / one `batch:<id>` per batch (`useBatches(true)` from `@/components/diplomas/use-diplomas`). Status cell: `account_status === "archived"` → `<Badge variant="outline">Archived{batch_name ? ` · ${batch_name}` : ""}</Badge>` else existing logic. Pass `batchName` and `accountStatus` to `UserDetailModal`.
- Modal: new optional props `batchName?: string | null; accountStatus?: string`; render a line under the title: `Batch: {batchName ?? "Current"} · {accountStatus}`.

---

### Task 8: Admin teams — route + table + detail

**Files:** Modify `src/app/api/admin/teams/route.ts` (rpc → `get_teams_with_stats_v2`), `src/components/admin/admin-teams-table.tsx`, `src/app/api/admin/teams/[id]/route.ts`, `src/components/admin/team-details-modal.tsx`

- Table: add `batch_id`, `batch_name`, `archived_at` to `Team`; add a `Select` filter above the table: All / Active / Archived / per batch; status cell shows `Archived · {batch_name}` when archived.
- Detail route: team select adds `batch_id, archived_at, batch:diploma_batches(name)`. Modal "Team Information" card adds `Batch:` and, when archived, `Archived:` rows.

---

### Task 9: Login message for banned accounts

**Files:** Modify `src/app/login/page.tsx:66-82`

Before the `Invalid login credentials` branch:
```ts
if (/banned/i.test(error.message)) {
  setError(
    "This account belongs to a completed programme batch and is no longer active. Contact StartSchool if you need something."
  );
}
```
(else-if chain continues as today.)

---

### Task 10: Docs + verification

- Add `docs/documentation/batches.md` (what a batch is, NULL semantics, close/reopen, ban side-effect, where the button lives, rollback).
- Append to `CLAUDE.md` "Rollback Reference": migrations applied in Tasks 1–2, backup table `batch_close_backup_20260827`, `get_students_health_overview_v2_backup_v1`, how to reverse (`reopen_batch_v1` + `ban_duration: 'none'`; `update ... from batch_close_backup_20260827` for status).
- Run: `npx tsc --noEmit`, `npm run lint`, `npx vitest run tests/batch-close.test.ts`, `node scripts/seam-audit.mjs`. All must pass. Report exact output.
- Prod verification SQL (no status changes expected yet):
  `select status, count(*) from users group by 1; select status, count(*) from teams group by 1;` → users active 75; teams active 36 / archived 7.
