# Diploma Generation — Design Spec

**Date:** 2026-08-03
**Status:** Approved by Elias (brainstorming session)

## Purpose

Generate the official "Supplement to Diploma" PDF per student, combining:

1. **Startup Module** — per-category progress computed from platform task data.
2. **Tech Module** — per-track Qwasar percentages, synced from the Qwasar admin CSV export.

Reference layout: `diploma.png` (last year's document — B0-S024). This year's version
replaces the old Startup Module rows with the 6 SMP platform categories.

Generated PDFs are stored (DB record + Supabase Storage). Later, an n8n workflow
will read issued diplomas and email each student their PDF — out of scope here,
but the storage design serves it.

## Decisions locked during brainstorming

| Decision | Choice |
| --- | --- |
| Progress scope | Team-context completions of the student's team **+** their individual-context completions, combined |
| Startup row content | **Hours + % completed** per category |
| Hours source | `SUM(tasks.estimated_hours)` over distinct completed tasks (no actual time tracking exists) |
| Revenue-milestone hours | **Excluded from hour sums** (still count toward %). Flag: `tasks.metadata.diploma_hours_excluded = true` on the 4 revenue tasks (€5k=2000h, €1k=1000h, €500=500h, first sale=160h) |
| Categories shown | 6 of 7 — `repeatable-tasks` excluded entirely from the diploma |
| Module naming | Diploma uses SMP platform categories (not last year's curriculum names) |
| Who generates | **Admin only.** Students only see/download their issued diploma |
| Qwasar data v1 | **Manual CSV upload** by admin (n8n nightly sync later, same table) |
| Static header fields | Stored in DB; diploma numbers auto-assigned per batch (`B1-S001` style) |
| Tech-only graduates | Supported: `diploma_type = 'tech_only'` renders without Startup Module / startup name. All graduates have platform accounts |
| Architecture | Snapshot-on-issue: compute once, freeze jsonb snapshot, render + store PDF. Re-issue supersedes |

## Data model (all new; no existing objects modified)

### `users` — new columns

- `qwasar_username text UNIQUE NULL` — join key to Qwasar CSV `Login` column.
- `personal_code text NULL` — DOB/personal code printed on the diploma (e.g. `190680-11014`).
- `startup_module_completed boolean NOT NULL DEFAULT false` — admin checks this off
  per user (checkbox column in the admin diplomas student table). Drives
  `diploma_type`: checked → `full`, unchecked → `tech_only`.

One-time backfill from `users.csv` (workspace root): 77 rows (`name,email,login,status`),
matched by email → 64 match current users. Unmatched: 12 dropouts (expected; several
hard-deleted 2026-07-28) + **`juris.lebedoks@startschool.org` — graduate with no platform
account; needs an account before issue** (open item for Elias).

### `diploma_batches`

| column | type | notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `name` | text | e.g. `Mercury-Redstone` |
| `admission_date` | date | printed as Date of admission |
| `completion_date` | date | printed as Date of completion |
| `number_prefix` | text | e.g. `B1` |
| `next_seq` | int | next diploma sequence number |

Diploma number = `number_prefix || '-S' || lpad(seq, 3, '0')` (matches `B0-S024` format).
Sequence assignment happens inside the issue RPC/route atomically (`UPDATE ... RETURNING`).

### `qwasar_progress`

| column | type | notes |
| --- | --- | --- |
| `qwasar_login` | text | CSV `Login` |
| `track` | text | CSV column header name, verbatim |
| `percent` | int | 0–100; row absent = never enrolled (**empty cell ≠ 0**) |
| `cohort` | text | CSV `Cohort Name` |
| `qwasar_status` | text | CSV `Status` (license status, NOT graduation) |
| `synced_at` | timestamptz | upload time |

Unique `(qwasar_login, track)`. Upsert target for both the v1 manual upload and the
future n8n nightly sync. Parse CSV **by header name, never column index**; tolerate
unknown/new track columns (Qwasar adds tracks over time).

### `qwasar_tracks` (reference/content table)

`csv_column text UNIQUE`, `display_name text`, `weeks numeric`, `description text`,
`sort_order int`, `is_active bool`. The CSV has only percentages; the diploma's Tech
Module table needs weeks + description per track. Seed from diploma.png content;
admin can extend when new tracks appear.

### `diplomas`

| column | type | notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `diploma_number` | text UNIQUE | e.g. `B1-S007` |
| `user_id` | uuid FK users | |
| `batch_id` | uuid FK diploma_batches | |
| `diploma_type` | text | `full` \| `tech_only` — derived from `users.startup_module_completed` at issue time |
| `snapshot` | jsonb | every value printed on the PDF, frozen at issue |
| `storage_path` | text | path in private `diplomas` Storage bucket |
| `issued_by` | uuid FK users | admin |
| `issued_at` | timestamptz | |
| `status` | text | `issued` \| `superseded` |

Re-issue = old row → `superseded`, new row + new PDF. PDFs render **only from the
snapshot** — issued documents never drift as live data changes.

### Category content (code, not DB)

Constants file maps the 6 categories → display name + description prose. Static
programme text (title conferred, programme length, entrance requirements,
"1 credit = 40 working hours", CEO signature block, etc.) lives in the same
constants module.

RLS: all new tables admin-write; `diplomas` readable by the owning student
(status = 'issued' only); `qwasar_progress`/`qwasar_tracks`/`diploma_batches`
not exposed to students.

## Progress computation

RPC `get_diploma_data(p_user_id uuid)` — SECURITY DEFINER, verifies caller is admin,
returns one jsonb:

- **startup_modules[]** (6 rows): per category —
  `hours` = `SUM(estimated_hours)` over **distinct** completed tasks
  (team-context rows for the student's team ∪ individual-context rows for the user,
  `status='completed'`), excluding tasks where
  `metadata->>'diploma_hours_excluded' = 'true'`;
  `percent` = distinct completed active tasks ÷ total active tasks in category × 100,
  rounded (milestones DO count here).
- **tech_modules[]**: `qwasar_progress` rows for `users.qwasar_username`, joined to
  `qwasar_tracks` (display name, weeks, description), ordered by `sort_order`.
  Only enrolled tracks appear.
- **header**: user name, `personal_code`, batch name + dates, team/startup name.

## Admin UI — `/dashboard/admin/diplomas`

Admin-role gated (same pattern as existing admin pages). Three tabs:

1. **Setup** — CRUD `diploma_batches`; upload Qwasar progress CSV (header-name
   parsing, upsert via API route, result summary "X upserted, Y unknown tracks
   skipped"); upload qwasar_username mapping CSV (match by email, list unmatched
   rows); inline-edit `personal_code` per student.
2. **Issue** — table of ALL users with: readiness flags (qwasar_username?
   personal_code? batch?), a **"Startup module completed" checkbox** persisting to
   `users.startup_module_completed` (this is the check-off table Elias asked for),
   and an Issue action. Pick student → **preview** of exact computed values
   (diploma_type derived from the checkbox) → Issue button → API route assigns
   number, renders PDF (`@react-pdf/renderer`), uploads to private `diplomas`
   bucket, inserts row. Missing prerequisites block issue with a specific message
   each.
3. **Issued** — list all diplomas, signed-URL download, supersede/re-issue.

Student side: account page shows a download card iff an `issued` diploma exists
for them (signed URL via API route).

## PDF rendering

- **Handlebars HTML template + puppeteer-core/@sparticuz/chromium** — the repo's
  existing, Vercel-proven PDF stack (scholarship agreements use it). NOT
  @react-pdf/renderer (originally suggested in Qwasar_Scrape.md; changed because
  the dependency doesn't exist in the repo and HTML/CSS replicates diploma.png
  more faithfully).
- The scholarship module is firewalled by `scripts/seam-audit.mjs`, so the
  diplomas module carries its own small copy of the renderer
  (`src/lib/diplomas/pdf-render.ts`) instead of importing scholarship code.
- Template + snapshot builder isolated in `src/lib/diplomas/` — render purely
  from the frozen snapshot.
- `tech_only` type omits the Startup Module section and startup title line.
- Layout replicates diploma.png, Startup Module rows updated to SMP categories
  with Hours + % completed columns.

## API routes (all: server client → getUser → admin check; Zod-validated)

- `POST /api/admin/diplomas/issue` — { user_id, batch_id, diploma_type }
- `POST /api/admin/diplomas/[id]/supersede`
- `POST /api/admin/qwasar/upload-progress` — parsed CSV rows
- `POST /api/admin/qwasar/upload-usernames` — parsed mapping rows
- `GET  /api/diplomas/mine` — student download (signed URL, own issued diploma only)

## Error handling

House rules (`docs/errors/guidelines.md`): Zod 400s with field detail, Sonner
toasts, `isPending` on all mutations, no silent failures, specific messages
per missing prerequisite.

## Testing

- RPC math: category %, milestone hour exclusion, team+individual dedup,
  user with no team (tech_only), empty categories.
- CSV parsing: header-based mapping, empty-vs-0 preservation, unknown columns
  tolerated, unmatched emails reported.
- Numbering: sequential, atomic, per-batch, unique.
- Issue flow: snapshot frozen (later task completions don't change stored PDF data),
  supersede path, RLS (student sees only own issued diploma).

## Out of scope (explicitly)

- n8n nightly Qwasar sync (v2 — same `qwasar_progress` upsert contract).
- n8n diploma email distribution (reads `diplomas` + Storage; nothing more needed).
- `/verify/<diploma-number>` public page (enabled by `diplomas` design; later).

## Open items

1. `juris.lebedoks@startschool.org` — graduate in users.csv without a platform
   account. Elias to create the account (or decide manual handling) before his
   diploma can be issued.
2. Seed content for `qwasar_tracks` descriptions: `diploma_resources/Track
   descriptions.html` (13 tracks, verbatim prose). Weeks come from diploma.png for
   the tracks shown there; remaining tracks need values from Elias (nullable until
   provided).
3. Last year's per-student data (`diploma_resources/Student Data.html`, 74 B0
   students: certificate IDs, personal codes, startup names) is REFERENCE ONLY for
   v1 — importing B0 diplomas retroactively is out of scope unless Elias asks.
4. Season 03 on last year's diploma mostly printed "Satisfactory" instead of a
   percentage. v1 prints the actual Qwasar percentage for all tracks; if Elias
   wants a "Satisfactory" threshold rule, that's a render-time tweak later.
