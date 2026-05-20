# Team Task Detail — `/dashboard/team-journey/task/[taskId]`

> The full briefing and action surface for a single team task: read it,
> start it, submit it, retry it, reassign it.

## Purpose

This is the deep-end of the team workflow. The team detail page lists
tasks; this page is where one of them gets done. It carries the full
task description, learning objectives, deliverables, and peer-review
criteria, then exposes the right primary action for the current
status — Start, Complete, Cancel, Retry, Reassign — gated by the
viewer's per-task permissions. It also surfaces the task's history and,
for recurring tasks, every previous submission.

## What it does

- Resolves the task by `taskId` (route param) and the current user via
  `getTaskByIdLazy(taskId, userId)`. The same identifier may be a
  `progress_id` or a `task_id` for never-started tasks.
- Computes per-action permissions in parallel via four
  `checkTaskPermission` calls (start, complete, cancel, reassign) and
  surfaces the user's role and assignment status.
- Tabs (dynamic — only shown when applicable):
  - **Task** — markdown-rendered `detailed_instructions`, learning
    objectives, expected deliverables. Always shown.
  - **Submission** — the actual submission payload (description,
    external URLs, uploaded files with inline image preview, submitted
    timestamp). Only when `submission_data` exists.
  - **Peer Review** — the criteria checklist (markdown), and once the
    task is reviewed: reviewer card, status badge, review feedback,
    and the full validated `peer_review_history` timeline.
  - **History** — a unified, newest-first timeline merging `assigned`,
    `started`, and peer-review events. Falls back to legacy
    `submission_notes` parsing when no structured history exists.
  - **Previous (n)** — only for recurring tasks; shows
    `submission_history` sorted newest-first.
- Right-side action card with status-aware primary button:
  - `not_started` + `canStart` → **Start Task**.
  - `in_progress` → **Complete** (opens [`TaskDetailsModal`](../../../src/components/ui/task-details-modal.tsx))
    plus a red **Cancel Task** for permitted users.
  - `pending_review` → disabled "Under Peer Review".
  - `approved` → disabled "Completed".
  - `rejected` / `revision_required` → **Retry** for permitted users.
  - `cancelled` → **Restart Task** (or contact-leader hint).
  - **Reassign Task** dialog appears for leaders on any active state.
- Mutations: start, complete (uploads files via
  [`uploadTaskFiles`](../../../src/lib/file-upload.ts) before calling
  `completeTask`), cancel (auto-navigates back to the team page on
  success), retry, reassign. Every mutation fires PostHog events
  (`task_started`, `task_submitted`, `task_cancelled`, `task_retried`,
  `task_reassigned`, `task_submission_failed`).
- "Suggest Edits" link in the Task and Peer Review cards opens
  [`SuggestEditsModal`](../../../src/components/tasks/suggest-edits-modal.tsx)
  so anyone can propose copy improvements to the underlying template.
- Submission validation: `peer_review_history` is parsed with
  [`peerReviewHistorySchema`](../../../src/lib/validation-schemas.ts)
  via Zod; invalid shapes are logged and treated as empty rather than
  crashing the page.

## How it looks

- Four-segment breadcrumb: Dashboard › Products › *Team Name* › *Task
  Title* (truncated at 200 px).
- Header: 3xl task title beside a [`StatusBadge`](../../../src/components/ui/status-badge.tsx)
  in `journey` variant; subtitle maps the DB `category`
  (`development`, `marketing`, `business`, etc.) to the human
  achievement name (e.g. "Product Foundation", "Customer Acquisition").
- 4-column grid: 3-col main content (tabs) and 1-col right rail with
  a Reward card (Points + XP) and the Task Information / action card.
- Submission tab renders external URLs as click cards, files as a
  download list with image thumbnails for `jpg|png|gif|webp|bmp|svg`.
- Peer Review tab uses purple section headings and per-criteria
  bulleted markdown; review history events get coloured badges
  (blue/indigo/green/red) for submit / assigned / approved / rejected.
- History tab renders dot-and-icon markers per event; pending review
  shows a pulsing orange dashed-border row.

## Thought behind it

This page is the operational counterpart to the team detail page's
tasks tab — the table is the index, this is the article. The layout
and tab order (Task → Submission → Peer Review → History) follow the
task lifecycle, so the developer using it sees the next thing they
need next.

The action card consolidates **what can I do right now** into a single
status-driven button. Everything else (reassign, suggest edits, retry)
is contextual. That's why permissions are computed in parallel — the
UI cannot render the right primary CTA until all four checks resolve.

Optimistic UI on Start gives instant feedback (the task flips to
in-progress in the cache before the server confirms) but rolls back on
error, because the alternative — a half-second of "did it work?" — is
the single biggest cause of double-clicks in task UIs.

The cancel mutation auto-redirects back to the team page because once
a task is cancelled there's nothing useful left on this page. The
retry mutation does *not* redirect because the user typically wants
to read the rejection feedback and fix the submission inline.

PostHog events on every mutation exist to feed the platform's
adoption analytics — we measure how many tasks get started vs
abandoned vs submitted vs failed-to-submit, which is the single most
important signal for the accelerator's pacing.

## Wired-up bits

- **Page file:** [`src/app/dashboard/team-journey/task/[taskId]/page.tsx`](../../../src/app/dashboard/team-journey/task/[taskId]/page.tsx)
- **Key components:**
  - [`TaskDetailsModal`](../../../src/components/ui/task-details-modal.tsx)
    (used for submission)
  - [`SuggestEditsModal`](../../../src/components/tasks/suggest-edits-modal.tsx)
  - [`StatusBadge`](../../../src/components/ui/status-badge.tsx)
  - [`TaskDetailSkeleton`](../../../src/components/ui/task-detail-skeleton.tsx)
  - ShadCN `Tabs`, `Card`, `Dialog`, `Avatar`, `Breadcrumb`
  - `react-markdown` for `detailed_instructions` and review criteria
- **Hooks:** [`useAppContext`](../../../src/contexts/app-context.tsx),
  TanStack Query (`useQuery`, `useMutation`, `useQueryClient`),
  [`invalidateNotifications`](../../../src/hooks/use-task-notifications.ts),
  Next.js `useRouter`, `use()` for the async params.
- **Data layer:**
  - [`getTaskByIdLazy`](../../../src/lib/tasks.ts)
  - `checkTaskPermission(progressId, userId, action)` × 4
  - `startTask`, `startTaskLazy`, `completeTask`, `cancelTask`,
    `retryTask`, `reassignTask` (all from `@/lib/tasks`)
  - [`uploadTaskFiles`](../../../src/lib/file-upload.ts)
  - Direct Supabase queries (browser client) for `teams.name` and
    `team_members.users` — small, cached for 2–5 minutes.
- **API routes hit:** none directly. Notifications are fired from the
  team detail page (`/api/notifications/task-assigned`); reassignment
  here goes through the `reassignTask` lib helper.
- **Analytics:** PostHog events `task_started`, `task_submitted`,
  `task_submission_failed`, `task_cancelled`, `task_retried`,
  `task_reassigned`.
- **Auth requirement:** authenticated. Action availability is gated by
  `checkTaskPermission`, which is RLS-aware on the server.
- **Notable types:** [`peerReviewHistorySchema`](../../../src/lib/validation-schemas.ts)
  (Zod), `TaskStatus` from [`StatusBadge`](../../../src/components/ui/status-badge.tsx).
