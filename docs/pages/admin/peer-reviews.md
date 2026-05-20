# Peer Reviews — `/dashboard/admin/peer-reviews`

> A single inspectable backlog of every task submission, who's reviewing it, and how long it's been sitting.

## Purpose

Peer review is how tasks get approved on the platform — students submit, another student reviews, XP gets awarded. This page exists so admins can see the entire pipeline at once: what's pending, who's stuck, who has been waiting too long, and where the system is silently jamming because no reviewer was assigned. An admin opens this when a student complains a task hasn't been reviewed, when XP looks wrong, or as part of a weekly sweep to keep the queue healthy.

## What it does

- Lists every task submission across the cohort with status `pending_review`, `approved`, `rejected`, or `revision_required` — most recently updated first.
- Shows summary counts above the table: total, pending, approved, and unassigned (pending submissions with no reviewer).
- Free-text search across task title, team name, submitter name, and reviewer name (filtered in-memory after fetch).
- Status filter dropdown: All, Pending Review, Approved, Rejected.
- Highlights overdue rows in red — pending reviews where a reviewer was assigned more than 7 days ago.
- Inline `Remove reviewer` action (red `UserX` icon) on stuck pending reviews — sends the task back to the available reviewer pool via [`/api/admin/peer-reviews/remove-reviewer`](../../../src/app/api/admin/peer-reviews/remove-reviewer).
- Click any row to open a detail dialog showing the full submission (description, attached files with image previews, external URLs), reviewer feedback, and a chronological review history timeline (`submitted_for_review`, `reviewer_assigned`, `review_completed` with decision).
- Pagination at 25 rows per page.

## How it looks

Page header: `Peer Reviews` title. A single Card titled "All Peer Reviews" wraps the entire content.

Inside the card: a thin summary line of counts in coloured text, then a search input plus status `Select`, then a bordered `Table` with columns `Task`, `Team`, `Submitter`, `Reviewer`, `Status`, `Submitted`, `Reviewed`, and an action column. Reviewer cells show "(3d ago)" next to the reviewer's name when assigned — turning red after a week. `StatusBadge` provides the consistent status colouring. Skeleton rows render during fetch. Pagination buttons sit beneath the table.

The detail modal ([`PeerReviewDetailDialog`](../../../src/components/admin/peer-review-detail-dialog.tsx)) is a wide `Dialog` with a metadata grid (Team, Submitter, Reviewer, Category), the rendered submission body, an inline image preview block for image attachments, a feedback panel, and a vertical timeline with iconography per event type.

## Thought behind it

Peer review is the load-bearing piece of the gamification loop — if it stalls, XP stalls, motivation stalls. The product decision here is to make stalls visible by default rather than buried in per-task notifications. The 7-day overdue threshold and the `unassigned` counter are both nudges towards admin intervention, and the `Remove reviewer` button gives the admin one click to unjam the queue without having to dig into the database.

This page is deliberately read-mostly. It is not a place to approve or reject submissions on a student's behalf — that would undermine the peer accountability the system is built on. The only mutating action is reassigning a stuck review back to the pool. The detail dialog is rich enough to verify what was submitted and what the reviewer wrote, but it does not let you edit either; for that, the audit trail in [Activity Log](./audit-logs.md) is the source of truth.

## Wired-up bits

- **Page file:** [`src/app/dashboard/admin/peer-reviews/page.tsx`](../../../src/app/dashboard/admin/peer-reviews/page.tsx)
- **Key components:**
  - [`src/components/admin/admin-peer-reviews-table.tsx`](../../../src/components/admin/admin-peer-reviews-table.tsx) — table, filters, pagination, summary stats
  - [`src/components/admin/peer-review-detail-dialog.tsx`](../../../src/components/admin/peer-review-detail-dialog.tsx) — submission viewer + history timeline
  - [`src/components/ui/status-badge.tsx`](../../../src/components/ui/status-badge.tsx) — shared status colouring
- **Hooks:** local state only — `useState` / `useRef` / `useEffect` with an `AbortController` to cancel in-flight fetches when filters change.
- **API routes:**
  - `GET /api/admin/peer-reviews` — [`src/app/api/admin/peer-reviews/route.ts`](../../../src/app/api/admin/peer-reviews/route.ts) (joins `task_progress` → `tasks` / `teams` / reviewer; resolves submitter via a second query because `assigned_to_user_id` has no FK to `public.users`)
  - `POST /api/admin/peer-reviews/remove-reviewer` — [`src/app/api/admin/peer-reviews/remove-reviewer`](../../../src/app/api/admin/peer-reviews/remove-reviewer)
- **Auth requirement:** admin only. Page redirects non-admins to `/dashboard`; the API route rejects with 401/403.
- **Notable types:** `PeerReviewRow` (exported from the table component) — id, status, submission_data, review_feedback, peer_review_history, completed_at, reviewed_at, task, team, submitter, reviewer.
