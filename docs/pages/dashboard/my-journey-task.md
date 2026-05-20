## Individual Task Detail — `/dashboard/my-journey/task/[id]`

> The full read-and-do view for a single individual task: instructions, learning objectives, deliverables, tips, resources, rewards, and the submit button.

## Purpose

The My Journey list is intentionally compact — a row with a title and a CTA. This page is where the user actually does the work: they read the brief, study the tips, open linked resources, and submit when done. It exists to give a focused, distraction-free workspace for one task at a time, with the submit action as the only thing that progresses state.

Founders land here from My Journey by clicking **Continue** on an in-progress task or **View Info** on a finished one. It is the only place an individual task can be completed.

## What it does

- Resolves the dynamic `[id]` route param and loads the task via `getTaskByIdLazy(taskId, userId)` — `taskId` here is the `task_progress.id` (a `temp-{task_id}` string is also tolerated upstream by lazy-progress logic).
- Renders breadcrumbs: Dashboard › My Journey › `{task.title}`.
- Header: task title, `StatusBadge` (`journey` variant) reflecting `not_started` / `in_progress` / `pending_review` / `approved` / `rejected`, and a category line.
- Two-tab content area: **Task** and **Tips**.
  - **Task** tab: renders `detailed_instructions` (with `\n` → `<br/>` substitution) or falls back to plain `description`. Below that, optional **Learning Objectives** bullets and **Expected Deliverables** with green check icons. A "Suggest Edits" link in the card header opens [`SuggestEditsModal`](src/components/tasks/suggest-edits-modal.tsx).
  - **Tips** tab: renders `tips_content[]` as blue-bordered title/content blocks. Below tips, optional **Helpful Resources** grid — clickable external links opening in new tab with title, description, type, and URL.
- Sidebar (lg+): **Reward** card showing Points and XP (both bound to `base_xp_reward`), then **Task Information** card with the user's avatar, started date, and the primary action button.
- Action button is status-driven:
  - `in_progress` → **Complete Task** (opens `TaskSubmissionModal`).
  - `approved` → green **Completed** (disabled).
  - `not_started` → **Task Not Started** (disabled).
  - other → disabled with raw status string.
- Submission flow: modal collects data per `task.submission_form_schema`, then `completeIndividualTask(progressId, submissionData)` calls the `complete_individual_task` RPC. On success it shows a Sonner toast — *"Task Completed Successfully! XP and points awarded! Your task was automatically approved."* — and reloads the task. Individual tasks are auto-approved (no peer review).

## How it looks

A breadcrumb strip up top, then a large title + status badge header. The body is a 4-column lg grid: a 3-column left column with the tabbed instructions card, and a 1-column sidebar stacking the Reward card and the Task Information / action card. Mobile collapses to a single stack.

The instructions card has a soft prose layout (whitespace-pre-wrapped detailed instructions, bulleted learning objectives, green-check deliverables). The tips card uses left-bordered blue blocks per tip and a separate Resources sub-section with hover-state link cards. The sidebar action button changes color and label per status; an approved task additionally shows a green confirmation hint underneath.

While loading the page renders [`TaskDetailSkeleton`](src/components/ui/task-detail-skeleton.tsx). On 404 it shows a centered "Task not found" message.

## Thought behind it

This is the do-the-work page, so the design strips away every non-essential element: no navigation rails, no leaderboards, no team chatter. Just brief, tips, reward, button. The two-tab split (Task / Tips) is a small but important decision — instructions and learning support coexist without one drowning the other, and the user can reference tips mid-task without losing their place.

Auto-approval on individual tasks (and the celebratory toast) is the emotional payoff. Team tasks gate rewards behind peer review for accountability; individual tasks reward immediately because the friction of "submit and wait" kills self-driven momentum. The toast text explicitly tells the user what just happened ("XP and points awarded") so the cause-and-effect is visible.

The persistent **Suggest Edits** affordance is a quiet but deliberate choice: task content is a living document, and the people closest to executing it know best where the brief is unclear. Surfacing the edit link inside the card — not in a settings menu — invites contribution without demanding it.

## Wired-up bits

- **Page file:** [`src/app/dashboard/my-journey/task/[id]/page.tsx`](src/app/dashboard/my-journey/task/[id]/page.tsx)
- **Key components:**
  - [`src/components/tasks/task-submission-modal.tsx`](src/components/tasks/task-submission-modal.tsx) — schema-driven submission form (`isIndividualTask=true`).
  - [`src/components/tasks/suggest-edits-modal.tsx`](src/components/tasks/suggest-edits-modal.tsx) — content-feedback dialog.
  - [`src/components/ui/status-badge.tsx`](src/components/ui/status-badge.tsx) — `journey` variant.
  - [`src/components/ui/task-detail-skeleton.tsx`](src/components/ui/task-detail-skeleton.tsx) — loading skeleton.
  - ShadCN `Tabs`, `Card`, `Breadcrumb`, `Avatar` primitives.
- **Hooks / context:**
  - [`useAppContext`](src/contexts/app-context.tsx) — current user (avatar, name, id).
  - `useParams` from `next/navigation` for the dynamic `[id]`.
  - Local `useState` + `useCallback`/`useEffect` for task state — this page does **not** use React Query (one of the few that doesn't).
- **RPCs / API routes:**
  - `getTaskByIdLazy` from [`src/lib/tasks.ts`](src/lib/tasks.ts) — handles real progress IDs and `temp-{task_id}` synthetic IDs.
  - `complete_individual_task` RPC via `completeIndividualTask` in [`src/lib/tasks.ts`](src/lib/tasks.ts) — auto-approves and writes the transaction.
- **Auth requirement:** authenticated. Middleware-protected under `/dashboard/**`.
- **Notable types:** `TeamTask` from [`src/types/team-journey.ts`](src/types/team-journey.ts) (reused for individual tasks), `TaskStatus` from [`src/components/ui/status-badge.tsx`](src/components/ui/status-badge.tsx).
