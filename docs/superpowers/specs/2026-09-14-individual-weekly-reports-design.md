# Individual (My Journey) weekly reports — design

**Date:** 2026-09-14
**Status:** approved in chat, pending implementation plan
**Related:** `docs/superpowers/specs/2026-08-27-two-economies-design.md`,
`docs/documentation/economies.md`, `docs/documentation/team-journey.md` (§ Weekly Reports)

## 1. Problem

Weekly reports exist only for Team Journey. The whole feature is paused while
`platform_settings.journeys.team_journey = false` (three DB functions return
early, the Team Journey page redirects students, the banner returns null).
Batch 3 starts in My Journey (solo) mode, so students have no weekly report at
all. We want a **solo weekly report** during My Journey and the existing
**team weekly report** during Team Journey — two forms, one per student per
week, never both.

The solo form keeps four of the eight team questions: #1 commitments with
status, #2 blockers (optional), #6 next-week commitments, #8 alignment and
motivation score with reason.

## 2. What already exists (DB is truth, checked 2026-09-14)

- `weekly_reports` has `context varchar` with CHECK `('individual','team')` and
  CHECK `context='team' ⇒ team_id NOT NULL`, `context='individual' ⇒ team_id IS NULL`.
  Zero `individual` rows exist. 1,139 team rows (8 drafts, 1,131 submitted).
- No unique constraint on user + week + context. No duplicate submitted rows
  exist for `(user_id, context, week_year, week_number)`.
- RLS (`authenticated`): INSERT own rows, UPDATE own rows, SELECT own rows or
  team rows of own active teams. Admin reads go through the service-role client.
- Team functions: `save_weekly_report_draft`, `has_user_submitted_this_week`,
  `send_weekly_report_reminders` (cron job 5, Fri 10:00 UTC),
  `send_weekly_report_reminders_sunday` (job 7, Sun 10:00 UTC),
  `check_missed_weekly_reports_team_context` (called by edge function
  `weekly-strikes-automation`, job 2, Mon 09:00 UTC). All three guarded by
  `journey_enabled_v1('team_journey')`.
- Submitting a report pays nothing. Only missing one is penalised
  (`weekly_report_penalty`, currently `PENALTY_POINTS = 0`). Strikes are
  team-scoped (`team_strikes.team_id NOT NULL`).
- Week boundaries: `get_riga_week_boundaries(timestamptz default now())` —
  Monday-start ISO week in Europe/Riga; Monday before 10:00 still counts as the
  previous week.
- Repo has a dead 5-question solo modal
  (`src/components/weekly-reports/individual-weekly-report-modal.tsx`) and its
  table; nothing imports them. Shape does not match this spec.
- Team modal (`weekly-report-modal.tsx`, 976 lines) inserts directly from the
  browser; Zod runs client-side only. **Out of scope** — left untouched.

## 3. Decisions (all confirmed by product owner 2026-09-14)

| Question | Decision |
|---|---|
| Both journeys on — which form? | Team Journey on **and** student in an active team → team form. Otherwise, if My Journey on → solo form. One report per week, never both. |
| Missing a solo report | Reminders only (Friday + Sunday). No strike, no penalty, no "missed" tracking. |
| Reward for submitting | None (same as team reports). |
| Submit path | New RPC with server-side validation + partial unique index. Team form untouched. |

## 4. Mode rule

```
solo_mode(user) :=
  journeys.my_journey = true
  AND NOT (journeys.team_journey = true AND user has active team membership
           (team_members.left_at IS NULL AND teams.status = 'active'))
```

Evaluated in two places that must agree:

- **UI:** `usePlatformSettings()` + `get_my_journey_overview_v1().has_active_team`.
- **SQL:** inside `send_individual_weekly_report_reminders_v1` and
  `submit_individual_weekly_report_v1` (the RPC refuses when My Journey is off;
  it does not refuse team members — an admin may want to test — but the UI
  never offers them the solo form).

## 5. Database — migration `weekly_reports_individual_v1`

Purely additive. No existing function, trigger, policy, cron job, or row is
modified.

### 5.1 Index

```sql
create unique index uq_weekly_reports_individual_submitted_week
  on public.weekly_reports (user_id, week_year, week_number)
  where context = 'individual' and status = 'submitted';
```

Team rows are not covered → zero behavioural change for the team form.

### 5.2 `submit_individual_weekly_report_v1(p_submission_data jsonb, p_as_draft boolean default false) returns jsonb`

SECURITY DEFINER, `set search_path = public, pg_temp`, EXECUTE → `authenticated`
(revoke from `anon`, `public`).

1. `auth.uid()` NULL → raise `28000` "Not authenticated".
2. `NOT journey_enabled_v1('my_journey')` → raise with ERRCODE `P0001`,
   message `MY_JOURNEY_DISABLED`.
3. Week = `get_riga_week_boundaries(now())`.
4. Normalise payload into exactly these keys (anything else dropped):
   - `commitments`: array of `{text text, status in ('completed','in_progress','not_done'), explanation text}`; items with blank `text` removed.
   - `blockers`: text, may be empty.
   - `nextWeekCommitments`: array of text; blank items removed.
   - `alignmentScore`: int.
   - `alignmentReason`: text.
   - `submittedAt`: set by the function (`now()`) on submit; absent on draft.
5. If `p_as_draft = false`, validate (raise `P0001` with a message the UI can
   show verbatim, same rules as the Zod schema):
   - ≥1 commitment with `length(trim(text)) >= 5`; every kept commitment `text >= 5`.
   - ≥1 next-week commitment with `length(trim) >= 5`; every kept item `>= 5`.
   - `alignmentScore` integer 1..10.
   - `length(trim(alignmentReason)) >= 5`.
6. Upsert on `(auth.uid(), context='individual', week_year, week_number)`:
   - existing `submitted` row → raise `P0001` `ALREADY_SUBMITTED`.
   - existing `draft` row → UPDATE `submission_data`, `status`, `submitted_at`, `updated_at`.
   - none → INSERT with `context='individual'`, `team_id NULL`, week columns,
     `status = case when p_as_draft then 'draft' else 'submitted' end`,
     `submitted_at = case when p_as_draft then null else now() end`.
7. Return `jsonb_build_object('report_id', id, 'status', status,
   'week_number', ., 'week_year', ., 'week_start', ., 'week_end', .)`.

Unique-index violation (race) is caught and re-raised as `ALREADY_SUBMITTED`.

### 5.3 `get_individual_weekly_report_status_v1() returns jsonb`

STABLE, SECURITY DEFINER, EXECUTE → `authenticated`. Uses `auth.uid()` only
(no `p_user_id`, so it cannot read another user).

```json
{
  "week": {"week_start": "…", "week_end": "…", "week_number": 38, "week_year": 2026},
  "submitted": false,
  "submitted_at": null,
  "draft": { …submission_data… } | null,
  "history": [ {"id","week_number","week_year","week_start_date","week_end_date","submitted_at","submission_data"} … up to 8, newest first, submitted only ]
}
```

### 5.4 `send_individual_weekly_report_reminders_v1(p_kind text) returns integer`

SECURITY DEFINER, EXECUTE → `service_role` only. `p_kind in ('2day','1day')`
else raise.

- `IF NOT journey_enabled_v1('my_journey') THEN RETURN 0`.
- Week = `get_riga_week_boundaries()`.
- Targets: `users u JOIN auth.users au` where `u.status = 'active'`,
  `coalesce(u.primary_role,'user') = 'user'`, `au.email_confirmed_at IS NOT NULL`,
  and `solo_mode(u)` per §4 (team-membership exclusion applies only when
  `journey_enabled_v1('team_journey')`).
- Exclude users with a `submitted` `individual` report for this week.
- Exclude users who already have a notification of this type this week with
  `data->>'context' = 'individual'` (`created_at >= week_start`).
- Insert `notifications`:
  - `'2day'`: type `weekly_report_reminder_2day`, title
    "Weekly report reminder", message "Don't forget to submit your My Journey
    weekly report before Monday 10:00!"
  - `'1day'`: type `weekly_report_reminder_1day`, title
    "Last chance — weekly report due tomorrow!", message "Submit your My
    Journey weekly report before Monday 10:00!"
  - `data = {"context":"individual","week_number":…,"week_year":…}`.
- No penalty wording anywhere.

### 5.5 Cron (two **new** jobs; jobs 5 and 7 untouched)

```sql
select cron.schedule('weekly-report-reminder-friday-individual', '0 10 * * 5',
  $$select public.send_individual_weekly_report_reminders_v1('2day');$$);
select cron.schedule('weekly-report-reminder-sunday-individual', '0 10 * * 0',
  $$select public.send_individual_weekly_report_reminders_v1('1day');$$);
```

### 5.6 Not changed, deliberately

- `get_dashboard_action_items.weekly_report_submitted` ignores `context`; it
  is only read by the Team Journey overview, harmless.
- No changes to `check_missed_weekly_reports_team_context`, the edge function,
  strikes, penalties, or the 8,000 Team XP exemption (Team-only concept).
- No new `transaction_type` values.

## 6. Frontend

### 6.1 Removed (dead code, wrong shape)

- `src/components/weekly-reports/individual-weekly-report-modal.tsx`
- `src/components/weekly-reports/individual-weekly-reports-table.tsx`
- `hasUserSubmittedThisWeekIndividual`, `getUserIndividualWeeklyReports` in
  `src/lib/weekly-reports.ts` (no callers after the two files above go).
- `WeeklyReport` / `weeklyReports` leftovers in `src/types/my-journey.ts`
  only if a grep shows no remaining consumer (mock data file may still use it;
  if so, leave).

### 6.2 Added

`src/components/weekly-reports/individual/`

- `individual-weekly-report-modal.tsx` — dialog shell: title "Submit My
  Journey weekly report", week label, draft-restore (from status RPC, no
  localStorage), footer with Cancel / Save as Draft / Submit, `isPending`
  states, toasts. Calls the hook only. ≤ 200 lines.
- `individual-report-questions.tsx` — the four questions, numbered 1–4, same
  wording as the team form (renumbered), same commitment status select
  (✅ Completed / 🔄 In Progress / ❌ Not Done) with the conditional
  explanation input, same add/remove rows, same 1–10 score select + reason.
  Controlled component: `value`, `onChange`. ≤ 200 lines; split
  `commitments-field.tsx` if it grows past that.
- `individual-weekly-report-history.tsx` — dialog listing `history` from the
  status RPC (week, submitted date, expandable answers).

`src/components/dashboard/my-journey/weekly-report-card.tsx` — card in
`MyJourneyOverview` between the stat cards and the Next-up/Continue grid:
this week's label, status badge (Submitted ✓ / Draft saved / Not submitted),
"Submit weekly report" (or "Continue draft") button opening the modal, and a
"Past reports" link opening history. Rendered only when `solo_mode` (§4)
resolves true; `MyJourneyOverview` passes `has_active_team`.

`src/components/dashboard/individual-weekly-report-banner.tsx` — sibling of
`WeeklyReportBanner` in `dashboard-layout-client.tsx`. Shows Friday → Monday
10:00 Riga (same window logic as the team banner, reusing
`getCurrentWeekBoundaries`) when `solo_mode` is true and `submitted = false`.
Amber alert, text "My Journey weekly report not submitted — Week N (…).
Deadline: Monday 10:00 Riga time." Button opens the modal in place. No
penalty sentence. Needs `has_active_team`: read it via
`useMyJourneyOverview(user.id)` (already cached 60 s).

`src/hooks/use-individual-weekly-report.ts`

- `useIndividualWeeklyReportStatus(userId)` → RPC
  `get_individual_weekly_report_status_v1`, key
  `["weekly-reports","individual","status",userId]`, `staleTime 60_000`,
  `enabled: !!userId`.
- `useSubmitIndividualWeeklyReport()` → mutation, `retry: 0`, args
  `{ data, asDraft }`, invalidates the status key and
  `["dashboard","my-journey",userId]`; `onError` toast maps `ALREADY_SUBMITTED`
  and `MY_JOURNEY_DISABLED` to friendly text.

`src/lib/validation-schemas.ts` — `IndividualWeeklyReportSchema` (commitments,
blockers optional, nextWeekCommitments, alignmentScore, alignmentReason) with
the same rules as §5.2; `IndividualWeeklyReportFormData = z.infer<…>`.

PostHog: `individual_weekly_report_submitted` /
`individual_weekly_report_draft_saved` with `week_number`, `week_year`,
`commitments_count`, `commitments_completed`, `has_blockers`,
`alignment_score`, `next_week_commitments_count`, `was_draft`.

### 6.3 Changed

- `src/components/dashboard/my-journey-overview.tsx` — mount
  `WeeklyReportCard` (pass `hasActiveTeam={data.has_active_team}`).
- `src/components/dashboard-layout-client.tsx` — mount
  `IndividualWeeklyReportBanner` next to `WeeklyReportBanner`.
- `src/components/notification-center.tsx` — reminder deep link for
  `context !== 'team'` → `/dashboard` (the `my-journey?tab=weekly-reports`
  tab no longer exists).
- Admin:
  - `src/app/api/admin/weekly-reports/route.ts` — query param
    `context = team | individual | all` (default `all`).
  - `src/components/admin/admin-weekly-reports-table.tsx` — Context select,
    and a "Solo" badge in the Team column when `team_id` is null.
  - `src/components/admin/admin-weekly-report-view-modal.tsx` — context badge
    in the header; sections already render only when data is present, so the
    solo report shows its four answers and nothing else.
- `src/types/database.ts` — regenerate (`npx supabase gen types …`).

## 7. Error handling

- RPC raises with stable message codes (`MY_JOURNEY_DISABLED`,
  `ALREADY_SUBMITTED`) or verbatim validation text; the hook's `onError` maps
  codes to sentences following WHAT + WHY + HOW, everything else surfaces the
  message via `toast.error`.
- Client Zod check runs first so users get inline feedback without a round
  trip; the RPC re-validates so the client cannot be bypassed.
- Drafts skip validation on both sides.
- Status RPC failure → card shows "Couldn't load weekly report" with Retry;
  banner renders nothing.

## 8. Testing & verification

- Vitest (pure, no DB): `tests/weekly-reports/individual-schema.test.ts`
  covers the Zod schema (happy path, empty commitments, short reason, score
  out of range, blank next-week rows filtered).
- RPCs verified through Supabase MCP as an existing `[TEST]` user (set
  `request.jwt.claims` in a transaction): submit draft → status shows draft →
  submit → status submitted → second submit raises `ALREADY_SUBMITTED`;
  reminder function returns expected count with the test user and 0 after
  submission. **Every row created is deleted in the same session and
  verified gone.**
- Manual click-through on the develop preview: card, modal, draft, submit,
  banner window, history, admin filter, admin modal.
- `npm run lint`, `npm run build`, `npm run test`.

## 9. Documentation

- `docs/documentation/economies.md` — phase table: My Journey gets "solo
  weekly reports (reminders only)".
- `docs/documentation/team-journey.md` — § Weekly Reports: note the solo
  variant and link here.
- `docs/documentation/dashboard.md` — card + banner.
- `docs/documentation/notifications.md` — `data.context = 'individual'`
  variant and the new cron jobs.
- `docs/pages/admin/weekly-reports.md` — Context filter.
- `CLAUDE.md` — Rollback Reference entry (see §10).

## 10. Rollback

```sql
select cron.unschedule('weekly-report-reminder-friday-individual');
select cron.unschedule('weekly-report-reminder-sunday-individual');
drop function public.send_individual_weekly_report_reminders_v1(text);
drop function public.get_individual_weekly_report_status_v1();
drop function public.submit_individual_weekly_report_v1(jsonb, boolean);
drop index public.uq_weekly_reports_individual_submitted_week;
-- data (only if wanted): delete from weekly_reports where context = 'individual';
```

Then revert the app code (git). Team weekly reports are never touched by this
feature, so no team-side rollback exists.

## 11. Out of scope (explicitly)

- Refactoring the 976-line team modal or moving its insert behind an RPC.
- Strikes, penalties, "missed" tracking, or any reward for solo reports.
- Analytics pages (team-only by design).
- AI review or admin feedback on solo reports.
