# Strikes Integration — Status and Next Steps

## What’s Done (Strikes + Weekly Reports groundwork)

- Weekly reports system complete through Phase 5 (schema, modal, submission, duplicate prevention).
- Visual indicators in Status & Progress card: green/red circles on avatars for weekly submission status.
- Database supports `teams.strikes_count` and existing `team_strikes` records.
- Utility functions available: `hasUserSubmittedThisWeek`, `get_riga_week_boundaries` for accurate week detection (Riga timezone).
- Build and type errors related to strikes were fixed (made `strikes_count` optional in code paths; removed from selects where needed).

## What’s Left (Phase 6 — Automated Enforcement via Edge Functions)

1. Database schema enhancements

   - Add to `team_strikes`: `strike_type`, `related_week_start`, `related_week_end`, `auto_assigned`, `enforcement_details JSONB`.
   - Create `strike_enforcement_log` table for audit of each run.

2. Database functions

   - `detect_missed_weekly_reports(week_start, week_end, team_id?)` → returns users missing submissions.
   - `assign_weekly_report_strikes(results)` → idempotent insert of strikes with context.

3. Supabase Edge Function (TypeScript)

   - Endpoint that: computes last week in Riga TZ, calls detection, assigns strikes, writes a log, returns summary.
   - Duplicate prevention: check existing `team_strikes` for same user/week.

4. Scheduling

   - Trigger weekly via GitHub Actions cron (e.g., Mondays 09:00 Riga) calling the Edge Function URL.

5. UI wiring
   - StrikesTable: show `strike_type`, week period, auto/manual badge.
   - WeeklyReportsTable: show ⚠ indicator for weeks with strikes, tooltip with details.

## Notes / Assumptions

- Grace period (optional): allow submissions until Monday 09:00 Riga before assigning strikes.
- Late submission handling: if submitted after strike, keep strike but allow “explained” status.
- Idempotence: no duplicate strikes per user/week/team.

## Quick Start when resuming

- Step 1: apply DB schema changes for `team_strikes` and `strike_enforcement_log`.
- Step 2: scaffold Edge Function with week calculation and stubbed detection/assignment calls.
- Step 3: UI updates for strike type and week context.
