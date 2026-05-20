# Peer Review & Acceptance — `/dashboard/peer-review`

> Where founders review each other's submitted work, earn 10% kickback rewards, and track the verdicts they give and receive.

## Purpose
This is the marketplace for cross-team quality control. Tasks submitted by one team don't auto-complete — they sit in a pool until another founder picks them up, evaluates them, and votes accept or reject. The page exists so members can:

- Find work that needs reviewing and earn from reviewing it.
- Track the status of their own submissions waiting on a peer verdict.
- Audit the history of reviews they've given.

It is used by every authenticated team member. They visit when they want to grind reviewer XP, when a notification tells them someone reviewed their submission, or when they need to pick up an active review they accepted earlier.

## What it does
- Loads four parallel React Query datasets keyed by `user.id`: available tasks, my submitted tasks, tasks I accepted as reviewer, and my completed reviews — plus an aggregate stats row from transactions.
- Surfaces four KPI cards at the top: **Reviews Available**, **Tasks Reviewed By You**, **Points Earned** (from reviews), **XP Earned** (from reviews).
- Splits work across four URL-synced tabs (`?tab=available-tests|my-tests|my-tasks|history`):
  - **Available Reviews** — pool of `pending_review` task submissions from other teams. Each row shows task, team, difficulty, the 10% reviewer XP / points cut, submission timestamp, and an `Accept Review` action.
  - **My Reviews** — tasks the user has accepted as reviewer (status `pending_review`, `reviewer_user_id = me`). Action button opens the review modal.
  - **My Tasks** — tasks the user submitted that are awaiting or have received a verdict. `View Feedback` is enabled only when status is `approved`, `rejected`, or `revision_required`, and routes to `/dashboard/team-journey/task/[id]`.
  - **History** — completed reviews. Renders a per-review row with task, team, assignee avatar, difficulty, XP earned (`base_xp_reward * 0.1`, min 1), points earned, status badge, and date. Multi-reviewer continuations show a "Review N/M" badge.
- Enforces a hard limit: **one active review at a time**. If `myAcceptedTasks.length > 0`, the accept button is disabled and labelled "Max 1 Task"; clicking it surfaces an info `InlineAlert`.
- `acceptTaskMutation` calls the `accept_external_task_for_review` RPC, optimistically moves the row from Available → My Reviews, switches tabs, and pre-opens the review modal.
- `submitReviewMutation` calls `submit_external_peer_review` with `decision: "accepted" | "rejected"`, optional feedback, and a `p_is_continuation` flag for follow-up reviews on the same task. On success it fires `peer_review_submitted` to PostHog with estimated XP/points and invalidates dashboard stats.
- Detects duplicate-review attempts: errors containing `DUPLICATE PREVENTION` trigger a hard reload after 2s to resync cache.

## How it looks
Page header `Peer Review & Acceptance` with a disabled "Read About Reviews" button (coming soon). Below that, a 4-column grid of `StatsCardComponent` KPI tiles using monochrome icons (`FileText`, `User`, `CreditCard`, `Zap`).

The body is a four-tab `Tabs` block with icons: Trophy (Available), CheckCircle2 (My Reviews), Users (My Tasks), History (History). Each tab content is an `overflow-x-auto` table built around the shared `TaskRow` component with `variant` switching between `available`, `review`, and `submitted`. Loading states render a `TableSkeleton` with the right column count.

A persistent `InlineAlert` banner slides in from the top of the active tab via `framer-motion` `AnimatePresence` for accept/error/limit feedback, and auto-dismisses after 4 seconds.

The review modal (`TaskDetailsModal` in `mode="review"`) opens over the page when accepting or clicking "Review Submission". It carries the task details, peer review criteria, and the accept/reject + feedback form.

## Thought behind it
This page is the platform's **trust loop**. In a startup accelerator, founders ship lots of small artefacts and there's no academic teacher to grade them — so the platform makes the founders the graders. The economics are deliberately asymmetric: the submitter gets 100% of the task's XP/points; the reviewer gets a 10% kickback. Small enough to never cannibalise doing your own work, big enough to make reviewing feel like real progress on the leaderboard.

The single-active-review cap is the most opinionated decision on the page. It would be trivially more "powerful" to let users queue ten reviews. But the team chose throughput-via-rotation over hoarding — if any one person sits on ten reviews, the pool stalls and other teams wait. Forcing serialization means submitters get verdicts faster, even at the cost of a slightly chunkier UX.

The continuation-review pattern (`Review N/M` badges, `is_continuation` flag) is a quiet acknowledgement that one reviewer's verdict isn't always the truth. Multiple reviewers can layer on the same task, building a small consensus rather than a single point of failure. The `DUPLICATE PREVENTION` error path with auto-reload exists because optimistic UI plus multi-reviewer flows will eventually drift, and silently re-syncing is kinder than throwing the user an obscure error.

The history tab is intentionally not just a paper trail — it's a portfolio. Showing the assignee, the difficulty, and the verdict you delivered turns reviewing into something visible and self-affirming.

## Wired-up bits
- **Page file:** [`src/app/dashboard/peer-review/page.tsx`](../../../src/app/dashboard/peer-review/page.tsx)
- **Key components:**
  - [`src/components/tasks/task-row.tsx`](../../../src/components/tasks/task-row.tsx) — shared row for available / review / submitted variants
  - [`src/components/ui/task-details-modal.tsx`](../../../src/components/ui/task-details-modal.tsx) — review form modal (`mode="review"`)
  - [`src/components/dashboard/stats-card.tsx`](../../../src/components/dashboard/stats-card.tsx)
  - [`src/components/ui/inline-alert.tsx`](../../../src/components/ui/inline-alert.tsx)
  - [`src/components/ui/difficulty-badge.tsx`](../../../src/components/ui/difficulty-badge.tsx)
- **Hooks:**
  - [`src/contexts/app-context.tsx`](../../../src/contexts/app-context.tsx) — `useApp()` for current user
  - [`src/hooks/use-task-notifications.ts`](../../../src/hooks/use-task-notifications.ts) — `invalidateNotifications`
  - `useQuery` / `useMutation` / `useQueryClient` from `@tanstack/react-query`
- **Data layer:** [`src/lib/database.ts`](../../../src/lib/database.ts) re-exports `getAvailableTasksForReview`, `getMySubmittedTasksForReview`, `getCompletedPeerReviews`, `getPeerReviewStatsFromTransactions`
- **RPCs / API routes:**
  - `accept_external_task_for_review(p_progress_id)` — claim a review
  - `submit_external_peer_review(p_progress_id, p_decision, p_feedback, p_is_continuation)` — deliver verdict
  - Direct query against `task_progress` for "tasks I'm currently reviewing"
- **Auth requirement:** Authenticated. `user?.id` from `useApp()` gates every query via `enabled: !!user?.id`.
- **Notable types or schemas:** Local `PeerReviewStats`, `AvailableTask`, `CompletedReview` interfaces in the page file. Decision payload is `"accepted" | "rejected"`.
