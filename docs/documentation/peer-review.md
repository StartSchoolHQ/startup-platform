# Peer Review System

> The peer review system enables users to review tasks submitted by other teams and earn rewards (XP + Points) for providing quality feedback. Reviewers are always external to the submitting team, ensuring unbiased evaluation.

## Overview

Key principles:

- Users can only review tasks from teams they are **NOT** members of
- Confidential tasks are only reviewable by admins
- Reviewers earn **10% of the task's base rewards** for each review
- Only **1 active review per user** at a time
- Continuation reviews allow the same reviewer to re-review resubmitted tasks

---

## Architecture

### End-to-End Flow

```
User completes team task → submits for review
  → Task status: "pending_review"
    → Available in "Available Reviews" for external reviewers
      → Reviewer accepts task (accept_external_task_for_review RPC)
        → reviewer_user_id set, task moves to "My Reviews"
          → Reviewer evaluates submission against criteria
            → Submits decision: Approved or Rejected
              → submit_external_peer_review RPC
                → Transaction created (10% rewards)
                  → Notification sent to submitter
                    → If rejected: submitter can resubmit → cycle repeats
```

### Key Files

| File | Role |
|------|------|
| `src/app/dashboard/peer-review/page.tsx` | Main peer review page (4 tabs) |
| `src/app/dashboard/admin/peer-reviews/page.tsx` | Admin oversight page |
| `src/app/api/admin/peer-reviews/route.ts` | Admin list API |
| `src/components/peer-review/tests-table.tsx` | Reusable review table component |
| `src/components/admin/admin-peer-reviews-table.tsx` | Admin table with search/filter |
| `src/components/admin/peer-review-detail-dialog.tsx` | Review details + history timeline |
| `src/components/ui/task-details-modal.tsx` | Review submission form (mode: "review") |
| `src/lib/data/reviews.ts` | Query functions |
| `src/types/peer-review.ts` | UI type definitions |

---

## Database Schema

### `task_progress` (Review-Relevant Columns)

| Column | Type | Description |
|--------|------|-------------|
| `reviewer_user_id` | UUID | Assigned peer reviewer (FK to `users`) |
| `status` | ENUM | `pending_review`, `approved`, `rejected`, `revision_required` |
| `submission_data` | JSONB | Submitter's work (description, URLs, files) |
| `submission_notes` | TEXT | Additional notes from submitter |
| `review_feedback` | TEXT | Reviewer's feedback |
| `peer_review_history` | JSONB[] | Array of review event records |

### `tasks` (Review-Relevant Columns)

| Column | Type | Description |
|--------|------|-------------|
| `peer_review_criteria` | JSONB | Review checklist (categories + points) |
| `is_confidential` | BOOLEAN | Only admin reviewers allowed |
| `requires_review` | BOOLEAN | Must go through peer review |
| `base_xp_reward` | INT | XP for task completion (reviewer gets 10%) |
| `base_points_reward` | INT | Points for task completion (reviewer gets 10%) |

### `transactions` (Reviewer Rewards)

| Column | Type | Value |
|--------|------|-------|
| `user_id` | UUID | Reviewer |
| `type` | ENUM | `"validation"` |
| `xp_change` | INT | `floor(base_xp_reward * 0.10)` |
| `points_change` | INT | `floor(base_points_reward * 0.10)` |
| `team_id` | NULL | Personal reward, not team |

### Peer Review History Entry Structure

```typescript
{
  timestamp: string;          // ISO timestamp
  event_type: string;         // "submitted_for_review" | "reviewer_assigned" | "review_completed"
  reviewer_id: string;        // UUID (null for submit events)
  reviewer_name: string;
  reviewer_avatar_url: string;
  decision: string;           // "approved" | "rejected"
  feedback: string;
}
```

---

## RPC Functions

### `accept_external_task_for_review(p_progress_id)`

Assigns a pending review task to the current user.

**Returns:** `{ success: boolean, error?: string }`

**Logic:**
- Validates task is in `pending_review` status
- Sets `reviewer_user_id = current_user_id`
- Adds history entry: `event_type = "reviewer_assigned"`
- Prevents duplicate assignments

**Preconditions:**
- Task must be from a team user is NOT a member of
- Task must not be confidential (unless admin)
- User can only have 1 active review at a time

### `submit_external_peer_review(p_progress_id, p_decision, p_feedback, p_is_continuation)`

Submits review decision and awards reviewer.

**Parameters:**
- `p_progress_id` — task_progress record ID
- `p_decision` — `"approved"` or `"rejected"`
- `p_feedback` — reviewer's feedback (optional)
- `p_is_continuation` — is this a re-review of a resubmitted task?

**Returns:** `{ success: boolean, error?: string }`

**Logic:**
1. Validate user is assigned reviewer OR has reviewed before (if continuation)
2. Check for duplicate prevention (error if non-continuation duplicate)
3. Update `task_progress.status` → approved or rejected
4. Set `task_progress.review_feedback`
5. Add peer review history entry
6. Create reward transaction: 10% of task's base XP/points
7. Trigger notification to submitter

### `add_peer_review_history_entry(p_progress_id, p_event_type, p_reviewer_id, p_decision, p_feedback)`

Utility to append event to `peer_review_history` JSONB array.

---

## Peer Review Criteria

### Definition

Tasks can specify review criteria that guide reviewers in evaluating submissions.

**Format** (in `tasks.peer_review_criteria`):

```typescript
[
  {
    category: string;     // e.g., "Code Quality", "Completeness"
    points: string[];     // Markdown checklist items
  }
]
```

**Example:**
```json
[
  {
    "category": "Quality",
    "points": [
      "- Code is well-formatted and readable",
      "- No obvious bugs or errors",
      "- Follows project conventions"
    ]
  },
  {
    "category": "Completeness",
    "points": [
      "- All requirements are met",
      "- Documentation is comprehensive"
    ]
  }
]
```

**Display:** Rendered in task-details-modal using ReactMarkdown, with category as heading and points as list.

**Note:** Criteria are **informational only** — there's no point-based scoring. Reviewer makes a binary approve/reject decision.

---

## Reviewer Reward Calculation

### Formula

```
Reviewer XP = floor(task.base_xp_reward * 0.10)
Reviewer Points = floor(task.base_points_reward * 0.10)
Minimum: 1 XP, 1 Point
```

### Example

Task with `base_xp_reward = 100`, `base_points_reward = 50`:
- Reviewer earns: **10 XP, 5 Points**

### Storage

Transaction record:
- `type = "validation"`
- `team_id = NULL` (personal reward)
- Date filter: `created_at >= "2025-11-21"` (when 10% calc was fixed)

---

## Frontend Pages

### Peer Review Hub (`/dashboard/peer-review`)

**File:** `src/app/dashboard/peer-review/page.tsx`

#### Tab 1: Available Reviews

Tasks pending review from teams the user is NOT in.

**Filters applied:**
- `status = "pending_review"`
- `reviewer_user_id IS NULL` (not yet assigned)
- `context = "team"`
- `team_id NOT IN (user's team IDs)` (exclude own teams)
- `is_confidential = FALSE` (unless admin)

**Columns:** Task title, team, difficulty, XP reward (10%), points reward (10%), submit date, action

**Action:** "Review" button → accepts task + opens review modal

**Constraint:** If user has an active review, shows info banner instead of accept buttons.

#### Tab 2: My Reviews

Tasks the user has accepted for review.

- `reviewer_user_id = user.id`
- `status = "pending_review"`
- Action: Opens task-details-modal in review mode

#### Tab 3: My Tasks

Tasks the user submitted that are in the review pipeline.

- `assigned_to_user_id = user.id`
- `status IN ("pending_review", "approved", "rejected", "revision_required")`
- Shows reviewer avatar + name, status badge

#### Tab 4: History

Completed reviews from `peer_review_history` JSONB field.

- Shows task title, team, submitter, decision, feedback, timestamp
- Multiple reviews of same task shown as separate rows
- Enriched with submitter data

### Stats Cards

| Card | Data Source |
|------|------------|
| Tasks Available for Review | Count from available reviews query |
| Tasks Reviewed by User | Count from `getPeerReviewStatsFromTransactions()` |
| Total XP Earned | Sum of `xp_change` from validation transactions |
| Total Points Earned | Sum of `points_change` from validation transactions |

---

## React Query Patterns

### Queries

| Key | Function | Purpose |
|-----|----------|---------|
| `["peerReview", "available", userId]` | `getAvailableTasksForReview()` | Available pending reviews |
| `["peerReview", "accepted", userId]` | Manual fetch | User's accepted reviews |
| `["peerReview", "myTasks", userId]` | `getMySubmittedTasksForReview()` | User's submitted tasks |
| `["peerReview", "completed", userId]` | `getCompletedPeerReviews()` | Completed review history |
| `["peerReview", "stats", userId]` | `getPeerReviewStatsFromTransactions()` | Review count + rewards earned |

### Mutations

#### Accept Task

```typescript
useMutation({
  mutationFn: (taskId) =>
    supabase.rpc("accept_external_task_for_review", { p_progress_id: taskId }),
  onMutate: () => {
    // Optimistic: move task from available to accepted, switch tab, open modal
  },
  onSuccess: () => toast.success("Task accepted for review"),
  onError: () => { /* Revert optimistic update */ },
});
```

#### Submit Review

```typescript
useMutation({
  mutationFn: ({ progressId, feedback, decision, isContinuation }) =>
    supabase.rpc("submit_external_peer_review", {
      p_progress_id: progressId,
      p_decision: decision,
      p_feedback: feedback || null,
      p_is_continuation: isContinuation,
    }),
  onSuccess: (_, vars) => {
    // PostHog: "peer_review_submitted"
    // Toast with estimated XP/points earned
    // Invalidate: peerReview, notifications, dashboard stats
  },
  onError: (error) => {
    // Check for DUPLICATE PREVENTION → reload page
  },
});
```

---

## Continuation Reviews

### Definition

A reviewer can review the same task multiple times if:
1. User is the **assigned reviewer** (`reviewer_user_id = user.id`), OR
2. User **previously reviewed** the task (found in `peer_review_history`)

### Implementation

```typescript
const hasPreviouslyReviewedTask = completedReviews.some(
  (review) => review.task_id === selectedTask.task_id
);
const isAssignedReviewer = selectedTask.reviewer?.id === user.id;
const isContinuation = isAssignedReviewer || hasPreviouslyReviewedTask;
```

### Use Case

Revision reviews: submitter resubmits after rejection → original reviewer can review again.

---

## Duplicate Prevention

### Mechanism

RPC `submit_external_peer_review` checks:
- If `NOT isContinuation` AND user has already reviewed this task → raises `"DUPLICATE PREVENTION"` error

### Error Handling

Frontend catches this error:
1. Shows toast: "You have already reviewed this task"
2. Reloads page after 2 seconds to sync view

---

## Notifications

| Type | Trigger | Routing |
|------|---------|---------|
| `peer_review_approved` | Review approved | `/dashboard/peer-review?tab=my-tasks` |
| `peer_review_rejected` | Review rejected | `/dashboard/peer-review?tab=my-tasks` |
| `peer_review_resubmission` | Task resubmitted for re-review | `/dashboard/peer-review?tab=my-tests` |

Created automatically by database triggers on `submit_external_peer_review` completion.

---

## Admin Oversight

### Admin Peer Reviews Page (`/dashboard/admin/peer-reviews`)

**File:** `src/app/dashboard/admin/peer-reviews/page.tsx`

**Access:** `primary_role === "admin"` only

### AdminPeerReviewsTable

- **Search:** Client-side filter by task title, team name, submitter, reviewer
- **Status Filter:** All, Pending Review, Approved, Rejected
- **Pagination:** 25 rows per page
- **API:** `GET /api/admin/peer-reviews?page=X&limit=25&search=Q&status=S`

**Columns:** Task title, team, submitter (avatar), reviewer (or "Not assigned"), status badge, submitted date, reviewed date

### PeerReviewDetailDialog

Opened by clicking a table row:

1. **Header:** Task title + status badge
2. **Metadata Grid:** Team, submitter, reviewer, category
3. **Submission Section:** Description, files (with image previews), URLs
4. **Reviewer Feedback:** Blue background block (if exists)
5. **Review History Timeline:**
   - Icons: blue (submit), purple (assign), green/red (completed)
   - Timestamps, reviewer name, feedback text, decision badges

---

## Admin API

### `GET /api/admin/peer-reviews`

**File:** `src/app/api/admin/peer-reviews/route.ts`

**Auth:** Admin only

**Query Params:**
- `page` (int, 1-based)
- `limit` (int, max 100)
- `search` (string)
- `status` (enum: `all`, `pending_review`, `approved`, `rejected`)

**Returns:**
```json
{
  "data": [
    {
      "id": "progress_id",
      "status": "pending_review",
      "task": { "id", "title", "category" },
      "team": { "id", "name" },
      "submitter": { "id", "name", "avatar_url" },
      "reviewer": { "id", "name", "avatar_url" } | null,
      "submission_data": {},
      "review_feedback": "",
      "peer_review_history": [],
      "completed_at": "timestamp",
      "reviewed_at": "timestamp"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 25
}
```

---

## Task Details Modal (Review Mode)

**File:** `src/components/ui/task-details-modal.tsx`

**Props:** `mode: "review"`, `taskData`, `onReviewSubmit`

**Content:**
1. Task info (title, description, team, XP/points)
2. Submission data (description, files rendered inline, URLs with previews)
3. Peer review criteria (rendered as markdown checklist)
4. **Review Form:**
   - Textarea: "Review Feedback" (optional)
   - Two buttons: "Approve" (green) / "Reject" (red)
   - Decision is required, feedback is optional

---

## Data Query Functions

### `getAvailableTasksForReview(userId)`

**File:** `src/lib/data/reviews.ts`

Returns task_progress records with joined task and team data, filtered for:
- `status = "pending_review"`, `reviewer_user_id IS NULL`
- `context = "team"`, `assigned_to_user_id IS NOT NULL`
- Excludes user's teams and confidential tasks (unless admin)
- Ordered by `completed_at DESC`

### `getMySubmittedTasksForReview(userId)`

Returns tasks submitted by user in review pipeline:
- `assigned_to_user_id = userId`
- `status IN ("pending_review", "approved", "rejected", "revision_required")`

### `getCompletedPeerReviews(userId)`

Explodes `peer_review_history` — each review by user becomes a separate result:
- Filters for reviews where `reviewer_id = userId` AND `decision IN ("approved", "rejected")`
- Enriches with submitter data
- Returns sorted array

### `getPeerReviewStatsFromTransactions(userId)`

**File:** `src/lib/data/users.ts`

Queries `transactions` where `type = "validation"`, `team_id IS NULL`, `xp_change >= 0`:
- Count = reviews completed
- Sum xp_change, points_change

---

## File Reference

### Pages
| File | Purpose |
|------|---------|
| `src/app/dashboard/peer-review/page.tsx` | Main peer review hub (4 tabs) |
| `src/app/dashboard/admin/peer-reviews/page.tsx` | Admin oversight |

### API Routes
| File | Purpose |
|------|---------|
| `src/app/api/admin/peer-reviews/route.ts` | Admin list API with pagination |

### Components
| File | Purpose |
|------|---------|
| `src/components/peer-review/tests-table.tsx` | Reusable review table |
| `src/components/admin/admin-peer-reviews-table.tsx` | Admin table with search/filter |
| `src/components/admin/peer-review-detail-dialog.tsx` | Review detail + history timeline |
| `src/components/ui/task-details-modal.tsx` | Review submission form |
| `src/components/tasks/task-row.tsx` | Task row in tables |

### Data & Logic
| File | Purpose |
|------|---------|
| `src/lib/data/reviews.ts` | Query functions for reviews |
| `src/lib/data/users.ts` | `getPeerReviewStatsFromTransactions` |
| `src/lib/database.ts` | Public API facade |
| `src/lib/tasks.ts` | Task lifecycle functions |
| `src/lib/notifications.ts` | Notification helpers |

### Types
| File | Purpose |
|------|---------|
| `src/types/peer-review.ts` | UI type definitions |
| `src/types/database.ts` | Auto-generated DB types |
| `src/types/team-journey.ts` | TeamTask interface |
| `src/lib/validation-schemas.ts` | Zod schemas |
