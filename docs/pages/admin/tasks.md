# Task Management — `/dashboard/admin/tasks`

> Where admins author, import, and curate the task templates that drive every team's and student's journey on the platform.

## Purpose

Tasks are the primary content of the accelerator — they are what students and teams actually do. This page exists so an admin can keep the task catalogue clean, separated by audience (team-collaborative vs personal-development), and respond to user-suggested edits without leaving the admin surface.

Admins visit this page when launching a new program week, importing a fresh batch of templates from a spreadsheet, fixing a typo or reward value flagged in support, or processing the queue of user-submitted task improvement suggestions.

## What it does

- **Team Tasks tab** — table of every team task template with title, category (color-coded), priority (badge), difficulty level, rewards (XP and points), created/updated date, and per-row Edit / Delete actions.
- **Individual Tasks tab** — same table for personal-development task templates. Powered by the same `AdminTasksTable` component with `activityType="individual"`.
- **Suggestions tab** — review queue for user-submitted task edit suggestions, filterable by Pending / Reviewed / All; default Pending. Mark-as-reviewed mutation persists status.
- **Create Task** dialog — full multi-tab task authoring form (description, tips, peer-review criteria, resources). The dialog opens with `defaultTaskType` pre-selected based on which tab the admin is on.
- **Import Tasks** dialog — Excel/spreadsheet bulk upload using `parseTasksFromExcel`. Auto-generates template codes and maps category strings to achievement names.
- **Download Template** button — disabled placeholder for upcoming spreadsheet template generation.
- **Confidential task indicator** — rows for confidential tasks render with a red tint and a `Lock` badge with tooltip explaining only admins can review them.
- **Sortable** by Title, Category, Priority, Difficulty, or Date Created via either column header click or a top-right sort Select. Sort order toggles asc/desc.
- **Active tab URL-synced** via `?tab=team-tasks|individual-tasks|suggestions`.
- Edit and Delete share carefully-managed modal state to prevent stuck overlays — deleting clears editing state and vice versa.

## How it looks

Page header "Task Management" sits above a three-tab strip. Each task tab is a Card with a header row split between title/description on the left and an action group on the right (Download Template, Import, Create — all in that order). Below the header is a count summary ("N tasks found") and a Sort By Select with an Ascending/Descending toggle button. The table itself is a custom HTML table (not the ShadCN Table component) to support the icon-prefixed task cell with its description excerpt.

Each row uses an icon "tile" on the left, the task title with optional Confidential badge, a clamped two-line description, then category pill / priority badge / difficulty badge / rewards (XP + points stacked) / updated date / kebab menu. Confidential rows get a faint red row background — a subtle but unmissable cue.

The Suggestions tab swaps the action header for a status filter and lists each suggestion with the originating user, the target task, the suggested edit text, and a "Mark as Reviewed" action.

## Thought behind it

Splitting team and individual tasks into separate tabs is the central design decision. They are authored, assigned, and reviewed differently — collapsing them into one filterable list would either flood admins with irrelevant rows or hide the audience distinction behind a toggle. Two tabs make the audience explicit at navigation time.

Recent admin overhaul (commit `4f48cd0`) **unified the task filters** so both audiences use the same column set, sort logic, and action menu — this reduces cognitive load when an admin moves between tabs. The component takes `activityType` as a prop and the rest is identical.

Confidential tasks get the red-tinted row treatment because an admin assigning a confidential task to a public review pool would be a real harm. Visual distinction is cheaper than a confirmation dialog.

The Suggestions tab exists because the platform invites users to flag broken tasks — without an admin-side queue, those suggestions go to the void. Marking-as-reviewed (rather than implementing the suggestion inline) is the right primitive: admins read, decide, and either apply the edit via the Edit dialog or ignore. The state machine is intentionally simple (`pending` → `reviewed`) to avoid an over-engineered triage workflow.

Bulk import via Excel is the productivity escape hatch — manually creating 50 tasks in the dialog is nobody's idea of a Tuesday afternoon. Auto-generated template codes prevent collisions when multiple admins import in the same window.

What was deliberately left out: bulk delete on the task list, drag-to-reorder, and inline editing in the table. Those are powerful but error-prone — every task edit goes through the modal so there is always one explicit confirmation step before content changes.

## Wired-up bits

- **Page file:** [`src/app/dashboard/admin/tasks/page.tsx`](../../../src/app/dashboard/admin/tasks/page.tsx)
- **Key components:**
  - [`src/components/admin/admin-tasks-table.tsx`](../../../src/components/admin/admin-tasks-table.tsx) — shared table for team and individual tasks
  - [`src/components/admin/create-task-dialog.tsx`](../../../src/components/admin/create-task-dialog.tsx) — full task authoring form with templates, tips, criteria, resources
  - [`src/components/admin/edit-task-dialog.tsx`](../../../src/components/admin/edit-task-dialog.tsx) — edit existing task
  - [`src/components/admin/import-tasks-dialog.tsx`](../../../src/components/admin/import-tasks-dialog.tsx) — Excel bulk import
  - [`src/components/admin/admin-suggestions-table.tsx`](../../../src/components/admin/admin-suggestions-table.tsx) — user-submitted edit suggestions
  - [`src/components/ui/difficulty-badge.tsx`](../../../src/components/ui/difficulty-badge.tsx)
- **Hooks:** `useApp()` for the admin role guard; `useSearchParams` / `useRouter` for URL-synced tabs; React Query in `AdminSuggestionsTable`.
- **Data access (no dedicated API route — uses Supabase SDK directly via `lib/database`):**
  - `getAllTasks(activityType, sortBy, sortOrder)` from [`src/lib/tasks.ts`](../../../src/lib/tasks.ts)
  - `createTask`, `deleteTask` from [`src/lib/database.ts`](../../../src/lib/database.ts)
  - `parseTasksFromExcel` from [`src/lib/excel-utils.ts`](../../../src/lib/excel-utils.ts)
  - `generateNextTemplateCode` from [`src/lib/template-codes.ts`](../../../src/lib/template-codes.ts)
  - `task_edit_suggestions` table queried directly via the browser Supabase client in `AdminSuggestionsTable` — RLS gates admin access.
- **Auth requirement:** admin only. Non-admins redirected to `/dashboard`. Task mutations rely on RLS policies on `tasks` and `task_edit_suggestions`.
- **Notable types or schemas:** `AdminTaskItem` from [`src/types/team-journey.ts`](../../../src/types/team-journey.ts); `TipContent`, `PeerReviewCriteria`, `ResourceItem` exported from [`src/lib/database.ts`](../../../src/lib/database.ts); `Suggestion` (inline in `admin-suggestions-table.tsx`); `TaskExcelRow` from [`src/lib/excel-utils.ts`](../../../src/lib/excel-utils.ts).
