# Two economies — My Journey vs Team Journey

Spec: `docs/superpowers/specs/2026-08-27-two-economies-design.md`

## Overview

The programme has two phases, each with its own economy. Phases are
switched **manually by an admin** — no threshold, no automation. Both can
be on at once (and are, for admins).

| Phase            | What it is         | Units earned              | Weekly reports / strikes |
| ---------------- | ------------------ | ------------------------- | ------------------------ |
| **My Journey**   | Solo preparation   | My Journey XP · My Journey Credits | No              |
| **Team Journey** | The startup phase  | Team XP · Team Points     | Yes                      |

Four balances live on `users`, one pair per economy. Graduation (8,000) is
**Team XP**.

**Labels rule:** students never see a bare "XP" or "Points". Every unit
label comes from `src/lib/economy-labels.ts`:

```ts
economyLabels("my_journey"); // { xp: "My Journey XP", points: "My Journey Credits" }
economyLabels("team"); //      { xp: "Team XP",       points: "Team Points" }
economyFromActivityType(activityType); // "individual" -> my_journey, else team
```

Change the wording there, not in components.

## Economy rule

An entry belongs to My Journey **iff `transactions.activity_type =
'individual'`**. Everything else — including a missing value — is Team.

Never key on `team_id` or `points_type`:

- 1,562 `validation` rows carry `points_type = 'individual'` but
  `activity_type = 'team'` (peer-review payouts are a team activity).
- peer-review `validation` and team `admin_grant` rows have `team_id NULL`.
- `team_cost` rows are `activity_type = 'team'`, so team creation is paid
  in Team Points.

## Data model

Columns added to `users` (migration
`two_economies_columns_trigger_backfill`):

| Column               | Default | Fed by                                  |
| -------------------- | ------- | --------------------------------------- |
| `my_journey_xp`      | 0       | `activity_type = 'individual'` XP        |
| `my_journey_credits` | 0       | `activity_type = 'individual'` points    |
| `team_xp`            | 0       | every other row's XP                     |
| `team_points`        | 500     | 500 starting capital + every other row's points |

Maintained by one trigger — reward RPCs were not touched:

- `trg_transactions_split_economy` — `AFTER INSERT OR DELETE ON
  transactions`, function `transactions_split_economy_v1()` (SECURITY
  DEFINER). INSERT adds to the matching pair, DELETE reverses it.
- **UPDATE of `xp_change` / `points_change` is not handled.** Nothing in
  the app updates a booked transaction; if that ever changes, extend the
  trigger.
- `prevent_sensitive_column_updates` was extended to block direct edits of
  all four columns (same `current_user = 'postgres'` bypass). Pre-edit copy:
  `prevent_sensitive_column_updates_backup_v1`.

**Backfill** ran in the same migration and reconciled exactly with the
ledger: individual XP 600 = 600, team XP 655,377 = 655,377.

`total_xp` / `total_points` remain the **legacy combined wallet**. The
reward RPCs still write them and they are still useful for admin
reconciliation, but they are no longer shown to students.

## Programme phase switch

```sql
public.platform_settings (key text primary key, value jsonb,
                          updated_at timestamptz, updated_by uuid)
-- row 'journeys' = {"my_journey": false, "team_journey": true}
```

RLS: `p_platform_settings_read` grants SELECT to `authenticated`. There is
no write policy — writes go through the RPC.

| Function                                       | Who      | Purpose                                        |
| ---------------------------------------------- | -------- | ---------------------------------------------- |
| `journey_enabled_v1(p_journey text)`           | any      | SQL STABLE SECURITY DEFINER; **true** if the row/key is missing |
| `set_platform_setting_v1(p_key, p_value jsonb)` | admin    | upsert via `is_admin_v1()`, stamps `updated_by` |

### Who reads it

| Reader                                                      | Behaviour when the journey is off                 |
| ----------------------------------------------------------- | ------------------------------------------------- |
| `usePlatformSettings()` (`src/hooks/use-platform-settings.ts`) | client hook → `{ myJourney, teamJourney }`, 5-min stale |
| `getJourneySettings()` (`src/lib/platform-settings.ts`)      | server pages / SSR                                 |
| `src/components/app-sidebar.tsx`                             | nav item hidden                                    |
| `my-journey/page.tsx`, `team-journey/page.tsx`, `team-journey/[id]/page.tsx` | redirect to `/dashboard` (admins exempt)  |
| Leaderboard boards                                           | that board is not rendered                         |
| Dashboard home cards                                         | that card is not rendered                          |
| `WeeklyReportBanner`                                         | renders nothing when Team Journey is off           |
| `check_missed_weekly_reports_team_context`                   | returns 0 rows → Monday edge function creates no strikes |
| `send_weekly_report_reminders`, `send_weekly_report_reminders_sunday` | return 0                                  |

Guards never redirect while settings are loading or after a failed read —
a settings outage must not lock students out. Admins always see both.

The three weekly-report functions also had their 8,000 exemption switched
from `total_xp` to `u.team_xp`. Pre-edit copies: `*_backup_v2`.

## Read RPCs

| RPC                                       | Shape                                                          |
| ----------------------------------------- | -------------------------------------------------------------- |
| `get_dashboard_overview_v2(p_user_id)`    | v1 + the four balance columns                                   |
| `get_live_my_journey_leaderboard_v1(p_limit default 50)` | rank, user, `my_journey_xp`, `my_journey_credits`, individual tasks completed |
| `get_live_team_members_leaderboard_v1(p_limit default 50)` | same shape as `get_live_leaderboard_data`, Team economy |
| `generate_weekly_leaderboard_snapshots_v2` | snapshot column names unchanged, values are Team XP / Team Points |

Edited in place (each with a `_backup_v1` copy):

| Function                    | Change                                                        |
| --------------------------- | ------------------------------------------------------------- |
| `get_user_progress_details` | adds the four keys; `xp_progress_percent` from `team_xp`       |
| `get_team_progress_details` | members gain `team_xp` / `team_points`; percent + order by `team_xp` |
| `get_dashboard_action_items` | rank and `leaderboard_xp_change` from the Team economy; output shape unchanged |

Cron jobs were re-pointed to the `_v2` snapshot generator:

```sql
cron.alter_job(3, command := 'SELECT generate_weekly_leaderboard_snapshots_v2(NULL, NULL);');
cron.alter_job(6, command := 'SELECT generate_weekly_leaderboard_snapshots_v2(NULL, NULL); SELECT generate_weekly_team_leaderboard_snapshots(NULL, NULL);');
```

## Leaderboard boards

`/dashboard/leaderboard` now has a **My Journey** board (students by My
Journey XP, live only — no week selector) and a **Team Journey** board with
**Teams | Members** sub-tabs, both ranked by the Team economy and both
keeping the week selector. Each board renders only if its journey is on;
admins see both, and when only one is on there are no top-level tabs. Shell
and rows live in `src/components/leaderboard/` (`my-journey-board`,
`team-journey-board`, `teams-board`, `members-board`, `member-row`,
`team-row`, `leaderboard-board-shell`, `row-styles`, `mappers`). Full
detail: `docs/documentation/leaderboard.md`.

## My Journey page

`src/app/dashboard/my-journey/page.tsx` was rebuilt on the Team Journey
detail layout with a **single Tasks tab**: header
(`src/components/journey/my-journey-header.tsx`), stat cards + progress /
economy explainer (`my-journey-progress-cards.tsx`), shared achievement
grid (`achievements-grid.tsx`), then the tasks table and preview modal.
Task data comes from `src/lib/my-journey-tasks.ts`. Individual weekly
reports and strikes were removed from My Journey entirely — they are a Team
Journey feature.

## Admin UI

Dashboard → Admin (overview) → **Programme Phase** card
(`src/components/admin/programme-phase-card.tsx`): two Switches, one per
journey, calling `set_platform_setting_v1` and invalidating
`["platform-settings", "journeys"]`. Non-admins get a permission error from
the RPC.

## Verification checklist

Read-only SQL:

```sql
select * from platform_settings where key = 'journeys';
select journey_enabled_v1('my_journey'), journey_enabled_v1('team_journey');

-- balances must equal the ledger
select
  (select coalesce(sum(my_journey_xp), 0) from users) as col_individual_xp,
  (select coalesce(sum(xp_change), 0) from transactions
    where activity_type = 'individual') as ledger_individual_xp,
  (select coalesce(sum(team_xp), 0) from users) as col_team_xp,
  (select coalesce(sum(xp_change), 0) from transactions
    where activity_type is distinct from 'individual') as ledger_team_xp;

select jobid, command from cron.job where jobid in (3, 6);
```

Manual (develop preview): flip each switch on the admin overview and check
that the sidebar item, the leaderboard board, the dashboard card and (for
Team Journey) the weekly-report banner appear and disappear; confirm a
student is redirected off the disabled journey's page while an admin is
not. My Journey needs at least one active individual task template to show
anything meaningful.

## Rollback

1. **Cron** — re-point to the v1 generator:

   ```sql
   select cron.alter_job(3, command := 'SELECT generate_weekly_leaderboard_snapshots(NULL, NULL);');
   select cron.alter_job(6, command := 'SELECT generate_weekly_leaderboard_snapshots(NULL, NULL); SELECT generate_weekly_team_leaderboard_snapshots(NULL, NULL);');
   ```

2. **Edited functions** — restore from their backups
   (`get_user_progress_details_backup_v1`, `get_team_progress_details_backup_v1`,
   `get_dashboard_action_items_backup_v1`,
   `prevent_sensitive_column_updates_backup_v1`; the three weekly-report
   guards from `*_backup_v2`) with the usual
   `select pg_get_functiondef(oid) from pg_proc where proname = '<name>_backup_vN'`,
   rename in the returned definition, re-apply.

3. **Trigger** — `drop trigger trg_transactions_split_economy on transactions;`
   The four columns can stay; they are additive and unused once the app is
   reverted.

4. **Additive objects** — `platform_settings` and every new `_v1` / `_v2`
   function can be dropped, but only after the app code that calls them is
   reverted.

Balances can always be rebuilt from the ledger with the backfill query in
`two_economies_columns_trigger_backfill`.

Migrations applied 2026-08-28, in order: `platform_settings_v1`,
`two_economies_columns_trigger_backfill`,
`prevent_sensitive_column_updates_two_economies`,
`weekly_reports_team_journey_guard`, `dashboard_overview_v2`,
`user_progress_details_two_economies`, `my_journey_leaderboard_v1`,
`team_members_leaderboard_v1`, `weekly_leaderboard_snapshots_v2`,
`team_progress_details_two_economies`, `dashboard_action_items_team_economy`,
`set_platform_setting_v1_revoke_anon` (revokes EXECUTE on
`set_platform_setting_v1(text, jsonb)` from `anon` — the function was already
admin-gated via `is_admin_v1()`, this only tightens the grant).

## Out of scope / known follow-ups

- `src/components/dashboard/tasks-table.tsx` is dead code (superseded by
  the Team Journey tasks table).
- `src/components/dashboard/achievement-grid.tsx` — and therefore
  `src/components/dashboard/achievement-card.tsx` — is unreferenced.
- `src/types/my-journey.ts` is unreferenced.
- The individual weekly-report components and
  `hasUserSubmittedThisWeekIndividual` are unreferenced.
- `getServerSideLiveLeaderboardData` is unreferenced.
- `src/components/onboarding/tours.tsx` and `src/data/dashboard-data.ts`
  still reference the old `#onborda-xp-balance` ids and describe a single
  combined XP balance.
- Bare "XP" copy still exists on surfaces the spec did not enumerate:
  `src/app/dashboard/peer-review/page.tsx`,
  `src/components/tasks/task-submission-modal.tsx`,
  `src/components/team-journey/add-client-meeting-modal.tsx`,
  `src/components/team-journey/client-meetings-table.tsx`,
  `src/components/ui/task-details-modal.tsx`.
- Snapshot history before 2026-08-31 holds the combined XP, not Team XP.
  Batch 2 individual XP was ~0, so the history reads the same.
