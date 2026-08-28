# Two Economies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate My Journey (solo) and Team Journey (startup) into two visible economies with an admin-controlled phase switch, matching leaderboards, and a My Journey page that mirrors Team Journey with a single Tasks tab.

**Architecture:** `platform_settings` row + admin toggles drive visibility everywhere (nav, pages, boards, dashboard cards, weekly-report/strike guards). Four new balance columns on `users` are maintained by one `transactions` trigger keyed on `activity_type`; reward RPCs stay untouched. Leaderboard gets My Journey / Team Journey boards with new read RPCs and a V2 snapshot generator. My Journey page is rebuilt from the Team Journey components.

**Tech Stack:** Supabase (MCP `apply_migration`), Next.js 16 App Router, TanStack Query, ShadCN (`Switch`, `Tabs`, `Card`), Vitest only on request.

**Spec:** `docs/superpowers/specs/2026-08-27-two-economies-design.md`

## Global Constraints

- All DB changes additive; every edited existing function gets a `_backup_vN` copy first (`pg_get_functiondef` + rename). Zero deletes of data.
- Economy rule: `transactions.activity_type = 'individual'` → My Journey; everything else → Team. Never key on `team_id`.
- `platform_settings.journeys` defaults `{"my_journey": false, "team_journey": true}` (mirrors today's nav). Admins always see everything.
- Student-facing labels: "My Journey XP", "My Journey Credits", "Team XP", "Team Points". Never bare "XP".
- **No DB-writing Vitest runs** unless the user asks. Verify with `tsc`, lint, read-only SQL, and transaction-wrapped MCP probes that `ROLLBACK`.
- Prettier defaults (80 cols, double quotes). Files < ~300 lines. ShadCN only. Sonner toasts. `retry: 0` on mutations.
- Commit/push only when the user asks.

---

### Task 1: `platform_settings` + helpers (DB)

**Interfaces (produces):**
- table `platform_settings(key text pk, value jsonb, updated_at, updated_by)`; row `journeys`.
- `journey_enabled_v1(p_journey text) returns boolean`
- `set_platform_setting_v1(p_key text, p_value jsonb) returns jsonb` (admin only)

- [ ] **Step 1: apply_migration `platform_settings_v1`**

```sql
create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.platform_settings enable row level security;
create policy p_platform_settings_read on public.platform_settings
  for select to authenticated using (true);
insert into public.platform_settings(key, value)
values ('journeys', '{"my_journey": false, "team_journey": true}'::jsonb);

create or replace function public.journey_enabled_v1(p_journey text)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select coalesce((select (value ->> p_journey)::boolean
                   from public.platform_settings where key = 'journeys'), true);
$$;
grant execute on function public.journey_enabled_v1(text) to authenticated, service_role;

create or replace function public.set_platform_setting_v1(p_key text, p_value jsonb)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if not public.is_admin_v1() then
    raise exception 'Unauthorized: Admin access required' using errcode = '42501';
  end if;
  insert into public.platform_settings(key, value, updated_at, updated_by)
  values (p_key, p_value, now(), auth.uid())
  on conflict (key) do update
    set value = excluded.value, updated_at = now(), updated_by = auth.uid();
  return p_value;
end $$;
revoke all on function public.set_platform_setting_v1(text, jsonb) from public;
grant execute on function public.set_platform_setting_v1(text, jsonb) to authenticated;
```

- [ ] **Step 2: Verify** `select journey_enabled_v1('team_journey'), journey_enabled_v1('my_journey');` → `true, false`.

---

### Task 2: Weekly-report / strike guards (DB)

- [ ] **Step 1:** For each of `check_missed_weekly_reports_team_context`, `send_weekly_report_reminders`, `send_weekly_report_reminders_sunday`: fetch def via `pg_get_functiondef`, create `<name>_backup_v2` (rename in def), then re-create the live function with, as the first statement after `BEGIN`:
  - `check_missed…`: `IF NOT public.journey_enabled_v1('team_journey') THEN RETURN; END IF;`
  - both reminders (`returns integer`): `IF NOT public.journey_enabled_v1('team_journey') THEN RETURN 0; END IF;`
  Also replace `u.total_xp < 8000` with `u.team_xp < 8000` in all three (column exists after Task 3 — so **apply this migration after Task 3**). Migration name `weekly_reports_team_journey_guard`.
- [ ] **Step 2: Probe (read-only effect):**
```sql
begin;
update platform_settings set value = '{"my_journey": false, "team_journey": false}' where key='journeys';
select count(*) from check_missed_weekly_reports_team_context();  -- expect 0
rollback;
```

---

### Task 3: Economy columns + trigger + backfill (DB)

- [ ] **Step 1: apply_migration `two_economies_columns_trigger_backfill`**

```sql
alter table public.users
  add column if not exists my_journey_xp integer not null default 0,
  add column if not exists my_journey_credits integer not null default 0,
  add column if not exists team_xp integer not null default 0,
  add column if not exists team_points integer not null default 500;
comment on column public.users.team_points is 'Team economy points. Default 500 = starting capital. Maintained by trg_transactions_split_economy.';

create or replace function public.transactions_split_economy_v1()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare r record; sgn int;
begin
  if tg_op = 'INSERT' then r := new; sgn := 1; else r := old; sgn := -1; end if;
  if r.user_id is null then return null; end if;
  if r.activity_type = 'individual' then
    update users set my_journey_xp = my_journey_xp + sgn * coalesce(r.xp_change, 0),
                     my_journey_credits = my_journey_credits + sgn * coalesce(r.points_change, 0)
    where id = r.user_id;
  else
    update users set team_xp = team_xp + sgn * coalesce(r.xp_change, 0),
                     team_points = team_points + sgn * coalesce(r.points_change, 0)
    where id = r.user_id;
  end if;
  return null;
end $$;
drop trigger if exists trg_transactions_split_economy on public.transactions;
create trigger trg_transactions_split_economy
  after insert or delete on public.transactions
  for each row execute function public.transactions_split_economy_v1();

-- Backfill from the ledger.
with s as (
  select user_id,
    coalesce(sum(xp_change)     filter (where activity_type = 'individual'), 0) as mxp,
    coalesce(sum(points_change) filter (where activity_type = 'individual'), 0) as mcr,
    coalesce(sum(xp_change)     filter (where activity_type is distinct from 'individual'), 0) as txp,
    coalesce(sum(points_change) filter (where activity_type is distinct from 'individual'), 0) as tpt
  from transactions group by user_id)
update users u set my_journey_xp = s.mxp, my_journey_credits = s.mcr,
                   team_xp = s.txp, team_points = 500 + s.tpt
from s where s.user_id = u.id;
```

- [ ] **Step 2: Extend `prevent_sensitive_column_updates`** — save `_backup_v1`, then add after the `total_points` check:
```sql
  IF OLD.my_journey_xp IS DISTINCT FROM NEW.my_journey_xp
     OR OLD.my_journey_credits IS DISTINCT FROM NEW.my_journey_credits
     OR OLD.team_xp IS DISTINCT FROM NEW.team_xp
     OR OLD.team_points IS DISTINCT FROM NEW.team_points THEN
    RAISE EXCEPTION 'Direct modification of economy balances is not allowed.';
  END IF;
```
- [ ] **Step 3: Verify (read-only)**
```sql
select count(*) filter (where my_journey_xp + team_xp <> total_xp) as xp_mismatch,
       count(*) filter (where my_journey_credits + team_points <> total_points) as pts_mismatch
from users where primary_role = 'user';
```
Report the numbers (some drift from historical manual edits is expected — list the top 5 by |diff|). Then trigger probe:
```sql
begin;
insert into transactions(user_id, type, xp_change, points_change, activity_type, points_type, description)
select id, 'admin_grant', 7, 3, 'individual', 'individual', 'probe' from users where email='eliassbaranovs@startschool.org';
select my_journey_xp, my_journey_credits from users where email='eliassbaranovs@startschool.org';
rollback;
```
Expect +7 / +3 vs. before, and unchanged after rollback.

---

### Task 4: Read RPCs (DB)

- [ ] **Step 1: `get_dashboard_overview_v2`** — copy of v1 with `RETURNS TABLE(... , my_journey_xp integer, my_journey_credits integer, team_xp integer, team_points integer)` and the four columns selected from `users`. Migration `dashboard_overview_v2`.
- [ ] **Step 2: `get_user_progress_details`** — `_backup_v1`, then: `xp_progress_percent` uses `u.team_xp`; add keys `my_journey_xp, my_journey_credits, team_xp, team_points` to the `user` object. Migration `user_progress_details_two_economies`.
- [ ] **Step 3: `get_live_my_journey_leaderboard_v1(p_limit int default 50)`**
```sql
returns table(rank_position int, user_id uuid, user_name text, user_avatar_url text,
              my_journey_xp int, my_journey_credits int, tasks_completed int)
... select row_number() over (order by u.my_journey_xp desc, u.name)::int, u.id, u.name, u.avatar_url,
       u.my_journey_xp, u.my_journey_credits,
       (select count(*)::int from task_progress tp where tp.user_id = u.id and tp.context = 'individual' and tp.status in ('approved','completed'))
    from users u join auth.users au on au.id = u.id
    where u.status = 'active' and u.primary_role = 'user' and au.email_confirmed_at is not null
    order by 1 limit p_limit;
```
- [ ] **Step 4: `get_live_team_members_leaderboard_v1(p_limit)`** — `pg_get_functiondef('get_live_leaderboard_data')`, rename, replace `COALESCE(u.total_xp, 0)` → `COALESCE(u.team_xp, 0)` and `COALESCE(u.total_points, 0)` → `COALESCE(u.team_points, 0)` (verify with a count of replacements = 2 before applying).
- [ ] **Step 5: `generate_weekly_leaderboard_snapshots_v2`** — same approach on `generate_weekly_leaderboard_snapshots` (`u.total_xp` → `u.team_xp`, `u.total_points` → `u.team_points`). Then:
```sql
select cron.alter_job(3, command := 'SELECT generate_weekly_leaderboard_snapshots_v2(NULL, NULL);');
select cron.alter_job(6, command := 'SELECT generate_weekly_leaderboard_snapshots_v2(NULL, NULL); SELECT generate_weekly_team_leaderboard_snapshots(NULL, NULL);');
```
Verify `select jobid, command from cron.job where jobid in (3,6)`.
- [ ] **Step 6:** Regenerate `src/types/database.ts` (MCP → node write → prettier). `git diff --stat` additions only.

---

### Task 5: Settings hook + admin toggle + guards in UI

**Files:** Create `src/hooks/use-platform-settings.ts`, `src/lib/platform-settings.ts` (server: `getJourneySettings()`), `src/components/admin/programme-phase-card.tsx`; Modify `src/components/admin/admin-overview.tsx` (render card at top), `src/components/app-sidebar.tsx`, `src/components/dashboard/weekly-report-banner.tsx`, `src/app/dashboard/my-journey/page.tsx`, `src/app/dashboard/team-journey/page.tsx`, `src/app/dashboard/team-journey/[id]/page.tsx`.

**Interfaces:**
```ts
export interface JourneySettings { myJourney: boolean; teamJourney: boolean }
export function usePlatformSettings(): { data: JourneySettings; isLoading: boolean }  // defaults {false,true} while loading
export function useSetJourneys(): UseMutationResult<JourneySettings, Error, JourneySettings>
```
- Hook: browser client `.from("platform_settings").select("value").eq("key","journeys").single()`, map `{my_journey, team_journey}` → camelCase; key `["platform-settings","journeys"]`, staleTime 5 min. Mutation: `rpc("set_platform_setting_v1", { p_key: "journeys", p_value: {...} })`, toast, invalidate.
- `ProgrammePhaseCard`: two `Switch` rows with labels + helper text ("Hides the My Journey link, board and dashboard card" / "Hides Team Journey pages, boards, card and pauses weekly reports & strikes"), disabled while pending.
- Sidebar: remove `hidden: true`; filter `navMainItems` by `myJourney`/`teamJourney`; the dynamic team link only when `teamJourney`. Admins bypass filters.
- Page guards: in each page's client component, `if (!settings.<flag> && user?.primary_role !== "admin") redirect("/dashboard")` after settings load (render skeleton until then).
- `WeeklyReportBanner`: `if (!teamJourney) return null;` and exemption reads `user.team_xp`.
- Team Journey detail: hide `weekly-reports` and `strikes` `TabsTrigger`/`TabsContent` and the header "Weekly Report" block when `!teamJourney` (grid cols 4 → 2). (Admins still see them.)

---

### Task 6: Economy labels + dashboard cards

**Files:** `src/app/dashboard/page.tsx`, `src/contexts/app-context.tsx`, `src/components/admin/user-detail-modal.tsx`, `src/components/admin/team-detail-modal.tsx`, `src/app/dashboard/team-journey/[id]/page.tsx` (labels), `src/components/team-journey/tasks-table.tsx` + `task-preview-modal.tsx` + `src/components/my-journey/achievement-card.tsx` (reward chip labels), `src/app/dashboard/transaction-history/**` (labels), `src/components/leaderboard/**` headers.

- `useApp()` select adds `my_journey_xp, my_journey_credits, team_xp, team_points`; type updated.
- Dashboard: switch to `get_dashboard_overview_v2`; `statsCards` = `[MyJourneyCard?, TeamJourneyCard?, Achievements, Tasks]` where the first two are conditional on settings. My Journey card: title "My Journey", value `my_journey_xp` + " XP", subtitle `"{my_journey_credits} Credits"`, href `/dashboard/my-journey`. Team Journey card: title "Team Journey", value `team_xp` + " Team XP", subtitle `"{team_points} Team Points"`, href team page or `/dashboard/team-journey`. Remove `IndividualWeeklyReportModal` usage.
- Reward chips: add prop `economy: "my_journey" | "team"` to `TasksTable`/`TaskPreviewModal`/`AchievementCard` rendering `"My Journey XP"`/`"Team XP"` and `"Credits"`/`"Team Points"`. Team Journey passes `"team"`, My Journey passes `"my_journey"`.
- Admin modals: "/ 8,000 Team XP".
- Grep gate: `grep -rn '"XP"\|>XP<\| XP<' src/app/dashboard src/components --include=*.tsx | grep -v "Team XP\|My Journey XP"` → only admin/analytics hits remain.

---

### Task 7: Leaderboard boards

**Files:** Modify `src/app/dashboard/leaderboard/page.tsx`, `page-client.tsx` (split: `my-journey-board.tsx`, `team-journey-board.tsx` under `src/components/leaderboard/`), `src/lib/leaderboard-server.ts` (add `getServerSideMyJourneyLeaderboard()`, `getServerSideTeamMembersLeaderboard()`).

- Top-level `Tabs` "My Journey" | "Team Journey", only for enabled journeys (admins: both). Default tab = Team Journey if enabled else My Journey.
- `MyJourneyBoard`: table Rank · Student · My Journey XP · Credits · Tasks done; data from `get_live_my_journey_leaderboard_v1`; no week selector; current user's row highlighted (reuse existing row styling).
- `TeamJourneyBoard`: sub-`Tabs` Teams (existing team board + week selector, unchanged) | Members (existing individual table component fed by `get_live_team_members_leaderboard_v1` for "current", `get_leaderboard_data` for past weeks; headers "Team XP", "Team Points").
- Server page prefetches according to settings (`getJourneySettings()`).

---

### Task 8: My Journey page rebuild

**Files:** Rewrite `src/app/dashboard/my-journey/page.tsx` (< 300 lines); Create `src/components/journey/achievements-grid.tsx`, `src/components/journey/my-journey-header.tsx`, `src/components/journey/my-journey-progress-cards.tsx`; Modify `team-journey/[id]/page.tsx` to use `AchievementsGrid`; Delete usage of `IndividualWeeklyReportsTable`, `IndividualWeeklyReportModal`, `src/data/my-journey-data.ts`, `hasUserSubmittedThisWeekIndividual` import (keep lib function; remove if no other caller).

**`AchievementsGrid` props:**
```ts
{ achievements: {achievement_id: string; achievement_name: string; status: string; points_reward: number; xp_reward: number; completed_tasks?: number; total_tasks?: number}[];
  loading: boolean; selectedId: string | null; onSelect: (id: string | null) => void; economy: "my_journey" | "team"; emptyText: string }
```
Renders the skeleton grid / empty state / `AchievementCard` grid + the "Showing tasks for" filter banner (moved from both pages).

**Page layout (mirrors team detail):** Breadcrumb ("My Journey") → header (`Avatar` from `user.avatar_url`, `<h1>{name}</h1>`, badge "My Journey", helper text "Solo preparation phase") → `StatsCardComponent` grid: "My Journey XP" (`my_journey_xp`), "My Journey Credits", "Tasks Completed" (`completed/total` from `getUserTaskCompletionStats`), "Achievements" (`x/y`) → two `Card`s: "Progress" (completion bar `completed/total`, `%`) and "How My Journey works" (3 bullet explainer: solo tasks → My Journey XP/Credits; Team Journey opens later with Team XP for graduation; no weekly reports here) → `Tabs` with the single "Tasks" trigger → `AchievementsGrid` + `TasksTable` (`economy="my_journey"`, `onStartTask` → existing `startTaskLazy` mutation) + `TaskPreviewModal`.

Data hooks unchanged from the current page (`getUserTasksVisible`, `getUserIndividualTasks`, `getUserAchievementProgress`, `getUserTaskCompletionStats`); balances from `useApp().user`.

---

### Task 9: Verification + docs

- `npx tsc --noEmit`, `npx eslint` on touched files, `node scripts/seam-audit.mjs`, `npm run build`.
- Read-only SQL: settings row; economy sums; cron commands; `journey_enabled_v1` values.
- Manual on develop preview (user): flip switches; My Journey page with one individual task template.
- Docs: `docs/documentation/economies.md` (rule, columns, trigger, switch, guards, rollback); update `docs/documentation/leaderboard.md` board section; `CLAUDE.md` rollback entry listing migrations + `_backup_*` names + cron re-point rollback (`cron.alter_job(3/6, command := 'SELECT generate_weekly_leaderboard_snapshots(NULL, NULL);' …)`).
