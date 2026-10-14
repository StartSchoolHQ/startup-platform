# Program assistant (Tech module check)

Every morning at 08:00 Riga the platform checks each Batch 3 student's Qwasar
progress and class attendance, decides who is on pace, who to watch and who to
talk to, and writes a short note per flagged student. Admins read the result
under **Admin → People → Tech module**. Nothing here touches the platform's
core tables (users, tasks, task progress, economies): it is a standalone
add-on living in the `program` and `qwasar` schemas.

Design spec (internal): `docs/internal/superpowers/specs/2026-10-13-program-assistant-design.md`.

## How a run works

```
pg_cron 06:00 UTC ─► program_kick_run_v1 ─► POST /api/program-assistant/run
   1. attendance_sync   n8n webhook: Sheet (written by WF-ATTENDANCE-NEW v2) → program.attendance_event
   2. track_sync        n8n webhook: Student info sheet → qwasar.student_track
   3. import            CAS login to Qwasar, GET the progress CSV, validate (header, cohort size, unmapped limit)
   4. store_csv         raw CSV → bucket program-imports (private)
   5. snapshot          upsert qwasar.progress_snapshot (kind scheduled | adhoc)
   6. verdicts          program.student_status_v2 → program.verdict
   7. data_issues       sheet vs Qwasar disagreements → program.data_issue (with a suggested fix)
   8. explain           Claude writes {line, next_step} for Talk to / Watch rows (numbers only, no names)
   9. sheet_refresh     qwasar.request_sheet_refresh() (the Google Sheet tabs)
  10. finish            run done + Slack digest text stored on program.run.slack_message
```

Steps 1, 2, 4, 7, 8, 9 are warnings when they fail. Steps 3, 5, 6 are fatal:
the run is marked `failed`, an email goes to the ops address through the n8n
alert workflow, and yesterday's verdicts stay in place. A watchdog at 06:30
UTC emails if no run succeeded that day.

## Rules (program.student_status_v2)

Same vocabulary as the Cowork skill: **On pace · Watch · Talk to · Not tracked**.

- Progress = the student's own track module (FS → Preseason Web, ML →
  Preseason Data). Bars come from `program.timeline_week`; a NULL bar means
  login rules only.
- Login rules: never logged in, no login ≥ 7 days, 0 % and no login ≥ 4 days
  → Talk to; 0 %, ≤ 6 % with no login ≥ 3 days, or no gain versus the
  scheduled snapshot a week earlier → Watch.
- Week 6 onward: Preseason ≥ bar and Season 01 Arc 01 started → On pace.
- Attendance: cumulative since 2 September, `present / (present + absent)`
  (excused excluded). Below the rule percentage with at least the minimum
  number of sessions → Talk to. Students with no attendance rows show
  "incomplete" and skip the rule.
- Part-time students are Not tracked until a part-time threshold exists.
- Hackathon, catch-up, break and review weeks are flagged "not evaluated".
- Trend: up / flat / down against the latest scheduled snapshot at least 6
  days older; "na" without a baseline.

## Claude

Model from Settings (`claude-sonnet-5-5` by default). Input per student: track,
week, this and last week's requirement, progress now and 7 days ago, trend,
days since login, attendance, the rule's reason. Output: one line on why and
one next step, at most 160 characters each. Names and emails never reach the
model. A failed call is counted and the row keeps its rule reason. Cost is
recorded per explanation in `program.explanation` and captured to PostHog as
`$ai_generation` (feature `program_assistant`).

## Admin UI

- **Tech module page**: run status, stale banner, Run now, counts, a
  filterable table (status, track, study type, search), the week's
  requirements per track, a **Data to fix** tab with "Mark fixed", and the
  **Digest** tab showing the Slack text (never posted unless the Settings
  switch is on; posting itself is not built yet).
- **Settings → Program assistant**: enabled, Slack switch + channel, model,
  attendance rule %, minimum sessions, unmapped limit.

## Secrets and config

| Where | Name | Purpose |
|---|---|---|
| Vercel | `PROGRAM_ASSISTANT_SECRET` | run route header; also sent to the n8n webhooks |
| Vercel | `QWASAR_USERNAME`, `QWASAR_PASSWORD` | Qwasar admin login (CAS form) |
| Vercel | `ANTHROPIC_API_KEY` | explanations |
| Supabase vault | `program_assistant_secret` | same value as the Vercel secret; used by cron and the watchdog |
| n8n | Header Auth credential `x-program-secret` | same value; on the Webhook node of all three `program/*` workflows |
| `platform_settings.program_assistant` | `worker_url`, `n8n_webhook_base`, thresholds | read by the route and the DB functions |

n8n workflow files: `docs/internal/program-assistant/*.json`
(`WF-ATTENDANCE-TO-SUPABASE`, `WF-STUDENT-TRACK-SYNC`, `WF-PROGRAM-ALERT`).

## Operations

- Start a run by hand: **Run now** on the page, or
  `select public.program_kick_run_v1('adhoc');` in the SQL editor.
- Read a run: `select * from program.run order by started_at desc limit 5;`
  (`steps` holds every step with timings, counts and errors).
- Turn it off: Settings → Program assistant → Enabled off (cron and Run now
  become no-ops), or `slack_enabled` off to keep the digest unposted.
- Change a pace bar: `update program.timeline_week set threshold_module =
  'Preseason Web', threshold_percent = 90 where track = 'FS' and week = 7;`
- Rollback recipes are in the header of each `supabase/migrations/20261013*`
  and `20261014*` program assistant file.
