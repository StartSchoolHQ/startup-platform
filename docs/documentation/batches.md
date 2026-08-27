# Batches (cohorts) — close & reopen

Spec: `docs/superpowers/specs/2026-08-27-batch-close-design.md`

## Model

- A batch is a row in `diploma_batches` (name, diploma number prefix,
  admission/completion dates). It doubles as the cohort record.
- `users.batch_id` and `teams.batch_id` point at a batch.
  **NULL means "current cohort or staff"** — admins are never tagged, and
  new sign-ups are not tagged until their batch is closed.
- `diploma_batches.closed_at` is set when the cohort was archived.
- Archiving reuses the existing `status = 'archived'` on `users`/`teams`
  (+ `teams.archived_at`). Nothing is deleted, ever.

## Closing a batch (admin)

Dashboard → Admin → Diplomas → **Setup** → batch card → **Close batch…**

1. The dialog loads `get_batch_close_preview_v1`: every active student with
   `batch_id IS NULL` and every active team. Teams containing an admin are
   unchecked by default; uncheck anyone else who should stay (e.g. a
   student who already belongs to the next cohort).
2. Type the batch name to confirm.
3. `POST /api/admin/batches/[id]/close` runs `close_batch_v1` (one
   transaction: tag `batch_id`, `status = 'archived'`, `archived_at`,
   `closed_at`), then bans each user's auth account
   (`auth.admin.updateUserById(id, { ban_duration: "876000h" })`).
   The RPC refuses admin accounts and already-closed batches.
4. Banned users see "This account belongs to a completed programme batch…"
   on the login page. Existing sessions expire within an hour.

If some bans fail the DB state is still correct — use **Retry lock-out**
(`/retry-bans`), which only touches accounts that are not yet banned.

## What archiving changes

- Archived users/teams disappear from leaderboards, weekly-report
  reminders, strike automation, the students health overview and the
  analytics user picker (all filter `status = 'active'`).
- Admin users/teams tables keep showing them (filter: Archived / per batch)
  and the detail modals still load everything. Admins read `users` under
  RLS via `p_users_select_admin_all` (`is_admin_v1()`).

## Reopening

Batch card → **Reopen batch…** → `reopen_batch_v1` restores rows archived
by that close (`updated_at`/`archived_at >= closed_at`, so teams dissolved
before the close stay archived), clears `closed_at`, keeps `batch_id`, and
unbans the accounts (`ban_duration: "none"`).

## New batch

Setup tab → **New batch** card (name + prefix). Dates can be filled later.

## Tests

`npx vitest run tests/batch-close.test.ts` — uses its own `test_` batch and
`test_` users/teams; never touches a real batch.
