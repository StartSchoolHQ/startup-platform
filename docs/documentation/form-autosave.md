# Form autosave

> Task submissions, the solo weekly report and the team weekly report save
> what the student types to the database automatically, without a button.
> Closing the modal, reloading, closing the tab or switching device brings
> the text back on the next open. Text and links only, never files.

Spec: `docs/internal/superpowers/specs/2026-10-27-form-autosave-design.md`.
Plan: `docs/internal/tomorrow.md`. Built 2026-10-29 on
`feature/form-autosave`; migration `task_submission_drafts_v1` applied to
prod the same day.

## The three forms

| Form | Modal | Where the draft lives | Written by |
|---|---|---|---|
| Task submission (solo and team) | `src/components/tasks/task-submission-modal.tsx` | `task_submission_drafts`, one row per `task_progress` row | `save_task_submission_draft_v1` |
| Solo weekly report | `src/components/weekly-reports/individual/individual-weekly-report-modal.tsx` | this week's `weekly_reports` row, `context = 'individual'`, `status = 'draft'` | `submit_individual_weekly_report_v1(…, p_as_draft => true)` (unchanged) |
| Team weekly report | `src/components/weekly-reports/team/weekly-report-modal-v2.tsx` | this week's `weekly_reports` row, `context = 'team'`, `status = 'draft'` | `save_weekly_report_draft(…)` (unchanged) |

Task drafts have their own table on purpose: `task_progress.submission_data`
feeds the AI reviewer, the History tab, admin views and
`previous_submissions`, and a half-written draft must reach none of them.
Only `description` and `external_urls` are drafted; extra text fields of a
custom form schema are not, and the RPC strips any `files` key.

The team report's old localStorage mirror and its Restore/Discard banner are
gone: the DB row is the only draft. The weekly report modals keep a manual
**Save and close** button; the task modal has none.

## How a save happens

All three forms use `useAutosaveDraft` (`src/hooks/use-autosave-draft.ts`).

- **Debounce.** 2 s after the last change the latest value is saved. A
  change during an in-flight save queues exactly one more save when it
  settles. The first value after the form opens is the baseline, not a
  change, so open-and-close writes nothing.
- **Never create an empty row.** An empty form is not saved unless a row
  already exists (then it is saved empty, see Clear below).
- **Close** (Cancel, X, overlay, Escape) calls `flush()`: the pending value is
  saved immediately and the modal waits for it.
- **Leave** (`pagehide`, `visibilitychange` → hidden, unmount, or the hook
  being disabled while dirty) fires a keepalive beacon:
  `sendDraftBeacon` (`src/lib/drafts/beacon.ts`) posts to
  `POST /api/drafts` with `fetch(…, { keepalive: true })`. Unmount matters
  because Next.js client navigation never fires `pagehide`.
- **Submit** calls `cancel()` first so a late debounce cannot resurrect the
  draft. The team report then awaits any save already in flight and upgrades
  that draft row by id instead of inserting a second row.
- **Indicator.** `DraftSaveState` (`src/components/forms/draft-save-state.tsx`)
  shows nothing → "Saving…" → "Saved" (fades back to nothing after 3 s), or
  on failure the save's error message in red (already-submitted cases are
  mapped to "This task / This week's report was already submitted."; "Not
  saved, check your connection" only when the error has no message). Never
  a toast, and it never blocks submit.

### Keepalive route

`POST /api/drafts` (`src/app/api/drafts/route.ts`): cookie session
(`getUser()`, 401 without), body validated by `DraftBeaconSchema` in
`src/lib/validation-schemas.ts`, a discriminated union on `kind`:

| `kind` | Body | Calls |
|---|---|---|
| `task` | `progressId`, `draft` | `save_task_submission_draft_v1` |
| `solo_report` | `data` | `submit_individual_weekly_report_v1(…, p_as_draft => true)` |
| `team_report` | `teamId`, `data` | `get_riga_week_boundaries` (shared 10:00 cutoff) + `save_weekly_report_draft` |

Returns 204 on success, 400 on a bad body, 409 when the RPC refuses
(already submitted, denied), 500 on anything else. Runs as the student,
never the admin client. The beacon swallows every error: the tab is dying.

## Restore on open

Every open refetches the draft (`staleTime: 0`, `refetchOnMount: "always"`,
no refetch on focus or reconnect so typing is never interrupted). While the
fetch runs the form shows "Checking for a saved draft…" and autosave is off.
Once it settles the form is seeded once for that open. A non-empty restored
draft shows `DraftRestoredChip` under the title: "Draft restored · saved
3 min ago".

- **Task:** `useTaskSubmissionDraft`
  (`src/components/tasks/use-task-submission-draft.ts`) reads through
  `get_task_submission_draft_v1` for both solo and team (team members cannot
  read each other's row under RLS).
- **Solo report:** `useIndividualReportDraft`
  (`src/components/weekly-reports/individual/use-individual-report-draft.ts`)
  refetches the status RPC; the "saved N min ago" age comes from an owner
  select of `weekly_reports.updated_at`. Autosave goes through
  `saveIndividualReportDraftSilently` in
  `src/hooks/use-individual-weekly-report.ts` (no toast, no close,
  `setQueryData` instead of invalidation).
- **Team report:** `useTeamReportDraft`
  (`src/components/weekly-reports/team/use-team-report-draft.ts`) reads the
  week boundaries and the draft row once per open; autosave and submit both
  reuse that week. If the read fails the modal shows an inline error with
  **Retry** and autosave stays off for that open, so an empty form can never
  overwrite the real draft.

### Precedence on a rejected task

`pickTaskSeed` (`src/lib/task-draft-precedence.ts`): the draft wins only if
its `updated_at` is later than the row's `submitted_at` (or there never was
a submission). Otherwise the modal prefills the rejected submission, as
before. Recurring solo tasks reuse one `progress_id` across cycles, so this
check keeps an old cycle's draft from hiding what the reviewer just
rejected.

### After submit

- **Task:** the draft is deleted with `delete_task_submission_draft_v1` right
  after a successful submit (solo: `src/app/dashboard/my-journey/task/[id]/page.tsx`;
  team: the `complete` mutation in `src/hooks/use-team-task-mutations.ts`).
  A failed delete is ignored; the save RPC's status guard and the
  precedence rule are the backstop.
- **Weekly reports:** the row itself becomes `submitted`; nothing to delete.

### Clear (weekly reports)

Clear empties the form. If a draft row exists, autosave then writes the
empty draft to it, so Clear + Cancel does not bring the text back. An empty
restored draft shows no chip and fires no event.

## Database

`task_submission_drafts`: `progress_id` (PK, FK `task_progress` on delete
cascade), `user_id` (last writer, FK `users` on delete cascade), `draft`
jsonb, `created_at`, `updated_at`. RLS on: owner SELECT and owner DELETE
only, no INSERT/UPDATE policy (writes only through the RPC), no admin
policy. One row per progress row, so on a team task the last writer wins.

RPCs (SECURITY DEFINER, `search_path = public, pg_temp`, EXECUTE
authenticated + service_role, anon revoked). Visibility in all three: an
`individual` row owned by the caller, or a `team` row of a team the caller
is an active member of.

| RPC | What |
|---|---|
| `save_task_submission_draft_v1(p_progress_id, p_draft)` | Upserts the draft, strips `files`, returns `{progress_id, updated_at}`. Status must be `not_started`, `in_progress`, `rejected` or `revision_required`. |
| `get_task_submission_draft_v1(p_progress_id)` | `{draft, updated_at}` or null. Any status. |
| `delete_task_submission_draft_v1(p_progress_id)` | Deletes the row, returns the count. Any status (it runs after submit, when the row is already `pending_review`). |

Errors: `task_draft_denied` (42501, not visible to the caller),
`task_draft_status_locked` (42501, save only, task pending review or
approved), `task_draft_invalid` (22023, draft is not a JSON object). The
client maps the first two to "You can't edit this task." and "This task was
already submitted." in `src/lib/data/task-drafts.ts`.

The weekly report RPCs were not touched.

### Inspecting a student's draft

Drafts are private, so the admin UI never shows them. As postgres (MCP
`execute_sql`):

```sql
select draft, updated_at, user_id
from task_submission_drafts
where progress_id = '<task_progress id>';
```

Weekly report drafts are ordinary `weekly_reports` rows with
`status = 'draft'`.

## Analytics (PostHog)

- `task_draft_restored` `{ progress_id }` — task modal opened from a draft.
- `weekly_report_draft_restored` `{ context: "individual" | "team" }`.
- Autosave emits nothing per save. `weekly_report_draft_saved` and
  `individual_weekly_report_draft_saved` still fire on the manual **Save and
  close** button only.

## Known limits

- Files are never drafted. After a close the student re-attaches them.
- A keepalive body over 64 KB is refused by the browser and never flushes.
  Report and task text is far below that; the debounced save (no limit)
  still covers everything except the last 2 s before the tab dies.
- Team `task_progress.submitted_at` is rarely set on prod, so on a rejected
  team task a surviving draft always beats the rejected prefill.
  Delete-on-submit is what keeps that from mattering.
- Edits made in the ~2 s before a submit that then fails are not re-drafted
  until the student types again (submit cancels the pending save).
- No offline or localStorage fallback, by decision: with no network the
  draft is not saved and the indicator says so.
- Two devices or two teammates editing at once: last write wins.

## Key files

| Area | Files |
|---|---|
| Hook + UI | `src/hooks/use-autosave-draft.ts`, `src/components/forms/draft-save-state.tsx`, `draft-restored-chip.tsx` |
| Keepalive | `src/app/api/drafts/route.ts`, `src/lib/drafts/beacon.ts` |
| Task | `src/lib/data/task-drafts.ts` (re-exported from `src/lib/database.ts`), `src/lib/task-draft-precedence.ts`, `src/components/tasks/use-task-submission-draft.ts`, `task-submission-modal.tsx`, `task-submission-form-fields.tsx` |
| Solo report | `src/components/weekly-reports/individual/use-individual-report-draft.ts`, `individual-weekly-report-modal.tsx`, `individual-report-footer.tsx`, `src/hooks/use-individual-weekly-report.ts` |
| Team report | `src/components/weekly-reports/team/use-team-report-draft.ts`, `use-team-report-form.ts`, `weekly-report-modal-v2.tsx` |
| Migration | `supabase/migrations/20261029073105_task_submission_drafts_v1.sql` |
| Tests | `tests/drafts/*` (RPCs, hook with fake timers, beacon schema, precedence) |

## Rollback

See the 2026-10-29 entry in the CLAUDE.md "Rollback Reference". In short:
revert the app code (git), then drop the three RPCs and
`task_submission_drafts`. The weekly report RPCs are unchanged, so nothing
else needs restoring.
