# Support inbox

Student support tickets and task suggestions live in the database and are
reviewed on **Admin → System → Inbox**. Discord is no longer involved.

## Student side — `/dashboard/support`

- **Report a problem** (default) → `POST /api/support/ticket` → row in
  `support_tickets`, files in the private bucket `support-attachments`
  under `<user_id>/<ticket_id>/`. 15-minute cooldown via
  `support_rate_limits`. Max 3 files, 8 MB each.
- **Suggest a task** (`?mode=suggest`) → RPC `suggest_task_v1` → row in
  `task_suggestions`. 5 per student per rolling 24 h; the sixth returns
  `SUGGESTION_LIMIT_REACHED`, shown as "You've suggested 5 tasks today —
  come back tomorrow." Students cannot insert into the table directly.

## Admin side — `/dashboard/admin/inbox`

| Tab | Table | Actions |
|---|---|---|
| Tickets | `support_tickets` | open a ticket, download attachments (10-min signed URLs), admin note, mark resolved / reopen |
| Task suggestions | `task_suggestions` | accept / decline with a note. Accepting only records the decision — create the task on the Tasks page. |
| Edit suggestions | `task_edit_suggestions` | unchanged, moved here from Tasks |

Nobody is notified of anything. Reply to students by email. Elias reviews
the inbox daily.

## Rollback

See the 2026-09-23 entry in `CLAUDE.md`.
