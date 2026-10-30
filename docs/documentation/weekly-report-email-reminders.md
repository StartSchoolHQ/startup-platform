# Weekly report email reminders

Students who do not log in never see the in-app weekly report reminders. Since
2026-10-30 the same reminder also goes out by email, sent by n8n from the
StartSchool Workspace Gmail account. Nothing in the app changed; the in-app
reminders (cron jobs 5, 7, 10, 11) are untouched.

## How it works

```
n8n  WF-SMP-REPORT-REMINDER  (Fri + Sun 12:15 Riga)
  Config  →  Get recipients (RPC)  →  Send reminder (Gmail)  →  Mark sent (RPC)
                                            └── error ──┐           └── error ──┐
                                                        └──  Alert mail to Elias ─┘
```

1. **Get recipients** calls `get_weekly_report_email_recipients_v1(p_kind)`
   over REST with the n8n Supabase credential (service role). `p_kind` is
   `2day` on Friday and `1day` on Sunday, derived from the Riga weekday.
2. One Gmail per returned row, HTML, no n8n attribution, sender name
   "StartSchool". The link points at `/dashboard/my-journey` or
   `/dashboard/team-journey`.
3. **Mark sent** calls `weekly_report_email_mark_sent_v1` per row, which
   writes `public.weekly_report_email_log`. The recipients RPC excludes
   logged rows, so a re-run or a half-failed run never mails a student twice.
4. A failed send or a failed log goes to the error output and mails Elias with
   the recipient and the error. The workflow also uses the instance error
   workflow for anything that escapes.

The workflow JSON is in `docs/internal/weekly-report-email/` and is the
import source. The live copy is in n8n; keep the two in sync when editing.

## Who gets mailed

A verbatim mirror of the in-app reminder functions:

| Context | Rule |
|---|---|
| Solo (My Journey) | active, role `user`, confirmed email, no `submitted` individual report for the week cut at Monday 12:00 Riga; skipped while My Journey is off; skipped for active-team members while Team Journey is on |
| Team (Team Journey) | active member of an active team, `team_xp < 8000`, no team report for the week cut at Monday 10:00 Riga; skipped while Team Journey is off |

Admins are never mailed. Test accounts are not excluded by the RPC because
`auth.users.email_confirmed_at` is set on them; keep test users deleted.

## Dry run

In the **Config** node set `test_emails` to a comma-separated list. The RPC
then returns one synthetic row per address (`user_id` null, nothing read from
`users`), the mails go to those addresses only, and `Mark sent` is a no-op
for null ids. Clear the field afterwards. `kind` forces `2day` or `1day`
regardless of the weekday.

## Database objects

- `public.weekly_report_email_log` — RLS on, no policies, no anon or
  authenticated privileges; unique on `(user_id, context, kind, week_year,
  week_number)`.
- `get_weekly_report_email_recipients_v1(p_kind text, p_test_emails text[]
  default null)` — SECURITY DEFINER, EXECUTE service_role only.
- `weekly_report_email_mark_sent_v1(uuid, text, text, integer, integer,
  text)` — SECURITY DEFINER, EXECUTE service_role only, `on conflict do
  nothing`, returns rows inserted (0 or 1).

Migration `20261030083751_weekly_report_email_v1.sql`, test
`tests/weekly-reports/email-reminders-rpc.test.ts`.

## Operations

- **Who was mailed this week?**
  `select * from weekly_report_email_log where week_year = 2026 and week_number = 44 order by sent_at;`
- **A student says they were mailed twice.** Check the log for two rows with
  different `kind`; Friday and Sunday are separate reminders by design.
- **Switch it off.** Deactivate the workflow in n8n. Nothing else needs
  changing.
- **Change the copy.** Edit the `Send reminder` node in n8n, then export and
  replace the JSON in `docs/internal/weekly-report-email/`.
- **Gmail caps.** Workspace allows roughly 2,000 recipients a day; the
  workflow sends at most one mail per active student per run.
