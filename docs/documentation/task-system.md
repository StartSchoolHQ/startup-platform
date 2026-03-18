# Task System

> The task system manages task templates, assignment, submission, and reward distribution. It uses a lazy progress architecture where task_progress records are created on-demand, supports both individual (auto-approved) and team (peer-reviewed) contexts, and includes recurring tasks with cooldown periods.

## Overview

The task system has two layers:

1. **Task Templates** (`tasks` table) — Master definitions with instructions, criteria, rewards, and form schemas
2. **Task Progress** (`task_progress` table) — Per-team or per-user instances tracking status, submissions, and reviews

Key features:
- **Lazy progress** — progress records created only on first user interaction
- **Dual context** — individual tasks (auto-approved) vs team tasks (peer-reviewed)
- **Recurring tasks** — repeatable with configurable cooldown periods
- **Dynamic submission forms** — JSON-defined form schemas per task
- **Achievement linkage** — tasks can unlock achievements on completion

---

## Architecture

### Task Lifecycle

```
Task Template (admin creates)
  → task_progress created on first interaction (lazy)
    → "not_started"
      → User clicks "Start" → "in_progress"
        → User submits → "pending_review" (team) or "approved" (individual)
          → Peer review (team tasks only)
            → "approved" → transaction created (XP + points awarded)
            → "rejected" / "revision_required" → user can resubmit
```

### Individual vs Team Flow

| | Individual | Team |
|---|-----------|------|
| Progress keyed on | `user_id` | `team_id` |
| On submission | Auto-approved, instant XP | Goes to peer review |
| Reviewer | None | External team member |
| Peer review criteria | N/A | Defined on task template |

---

## Database Schema

### `tasks` (Master Templates)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `title` | TEXT | Task name |
| `description` | TEXT | Brief description |
| `template_code` | TEXT | Unique identifier (e.g., `"TEAM-PROD-001"`) |
| `category` | `task_category_type` | See categories below |
| `priority` | `task_priority_type` | `low`, `medium`, `high`, `urgent` |
| `difficulty_level` | INT | 1–5 scale |
| `base_xp_reward` | INT | XP awarded on completion |
| `base_points_reward` | INT | Points awarded on completion |
| `activity_type` | TEXT | `"team"` or `"individual"` |
| `is_active` | BOOLEAN | Task availability flag |
| `is_confidential` | BOOLEAN | Restricted visibility |
| `is_recurring` | BOOLEAN | Repeatable task flag |
| `cooldown_days` | INT | Days between completions (default 7) |
| `requires_review` | BOOLEAN | Needs peer review |
| `detailed_instructions` | TEXT | Markdown instructions |
| `tips_content` | JSONB | `[{ title, content }, ...]` |
| `peer_review_criteria` | JSONB | `[{ category, points: [...] }, ...]` |
| `learning_objectives` | TEXT[] | Learning goals |
| `deliverables` | TEXT[] | Expected outputs |
| `resources` | JSONB | `[{ title, description, type, url }, ...]` |
| `submission_form_schema` | JSONB | Dynamic form definition |
| `review_instructions` | TEXT | Guidance for reviewers |
| `tags` | TEXT[] | Metadata tags |
| `achievement_id` | UUID | FK to `achievements` — linked achievement |
| `created_by_user_id` | UUID | Admin who created |
| `sort_order` | INT | Display order |
| `minimum_team_level` | INT | Team level requirement |
| `prerequisite_template_codes` | TEXT[] | Task dependencies |
| `auto_assign_to_new_teams` | BOOLEAN | Auto-assign on team creation |
| `estimated_hours` | INT | Time estimate |
| `metadata` | JSONB | Extensible metadata |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update |

### `task_progress` (Instance Tracking)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Progress record ID |
| `task_id` | UUID | FK to `tasks` |
| `team_id` | UUID | FK to `teams` (nullable, for team context) |
| `user_id` | UUID | FK to `users` (nullable, for individual context) |
| `assigned_to_user_id` | UUID | Who's working on it |
| `assigned_by_user_id` | UUID | Who assigned it |
| `context` | `task_context_type` | `"individual"` or `"team"` |
| `activity_type` | TEXT | `"team"` or `"individual"` |
| `status` | `task_status_type` | See statuses below |
| `started_at` | TIMESTAMP | When started |
| `completed_at` | TIMESTAMP | When submitted |
| `submitted_at` | TIMESTAMP | Submission time |
| `cancelled_at` | TIMESTAMP | Cancellation time |
| `assigned_at` | TIMESTAMP | Assignment time |
| `last_completed_at` | TIMESTAMP | For recurring: last completion |
| `next_available_at` | TIMESTAMP | For recurring: next available date |
| `submission_data` | JSONB | Form submission data |
| `submission_notes` | TEXT | Optional notes |
| `submission_url` | TEXT | External submission link |
| `submission_history` | JSONB | Historical submissions |
| `reviewer_user_id` | UUID | Assigned peer reviewer |
| `review_feedback` | TEXT | Review comments |
| `peer_review_history` | JSONB | Review event history |
| `points_awarded` | INT | Actual points given |
| `metadata` | JSONB | Extensible metadata |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update |

### Enums

**`task_status_type`:**
`not_started` | `in_progress` | `completed` | `cancelled` | `pending_review` | `approved` | `rejected` | `revision_required`

**`task_category_type`:**
`onboarding` | `development` | `design` | `marketing` | `business` | `testing` | `deployment` | `milestone` | `customer-acquisition` | `product-foundation` | `idea-validation` | `repeatable-tasks` | `team-growth` | `legal-finance` | `pitch`

**`task_priority_type`:**
`low` | `medium` | `high` | `urgent`

**`task_context_type`:**
`individual` | `team`

### Related Tables

| Table | Relationship |
|-------|-------------|
| `achievements` | Tasks linked via `achievement_id` |
| `task_edit_suggestions` | User-submitted improvement suggestions |
| `transactions` | Reward records on task completion |
| `notifications` | Alerts on assignment, review status |

---

## Lazy Progress Architecture

### Problem (Old Eager Model)

Creating a team would auto-create `task_progress` for ALL tasks → performance issue at scale.

### Solution (Lazy Model)

Progress records are created only when needed:

1. Task displayed as `"not_started"` even without a progress record
2. Progress record created on first interaction (clicking "Start")
3. Visibility queries return all tasks regardless of progress existence

### Key RPC Functions

| Function | Purpose |
|----------|---------|
| `create_progress_if_needed_v2(task_id, team_id, user_id, context)` | Creates progress on demand |
| `get_team_tasks_visible(team_id, user_id)` | All team tasks with or without progress |
| `get_user_tasks_visible(user_id)` | All individual tasks with or without progress |

---

## Task Lifecycle

### State Transitions

```
not_started → in_progress → pending_review → approved ✅
                           ↓
                     rejected / revision_required → in_progress (resubmit)
             ↓
           cancelled
```

### Team Tasks (with peer review)

1. `not_started` — initial state
2. `in_progress` — user clicks "Start"
3. `pending_review` — user submits completion
4. `approved` — peer reviewer approves → XP/points awarded
5. `rejected` — reviewer rejects → user can resubmit

### Individual Tasks (auto-approved)

1. `not_started` — initial state
2. `in_progress` — user clicks "Start"
3. `approved` — user submits → immediate approval + instant XP/points

### Recurring Tasks

After `approved`:
1. Check `cooldown_days` configuration
2. Set `next_available_at = last_completed_at + cooldown_days`
3. Show as `"cooldown"` status until cooldown expires
4. When `next_available_at` passes → becomes `not_started` again

---

## Task Assignment

### Assignment Methods

| Method | Trigger | Function |
|--------|---------|----------|
| Auto-assign | Task has `auto_assign_to_new_teams = true` | On team creation |
| Manual assign | Admin/leader assigns | `assign_user_to_task_simple(progress_id, user_id)` |
| Self-assign | User clicks "Start Task" | `startTaskLazy(taskId, teamId, userId, context)` |
| Reassign | Admin/leader changes assignee | `reassign_task(progress_id, new_user_id, reassigned_by_user_id)` |

### Permission Checks

**Function:** `checkTaskPermission(progressId, userId, action)`

**Returns:** `{ canManage, userRole, isAssignedUser }`

**Actions:** `"start"`, `"complete"`, `"cancel"`, `"reassign"`

**Checks:** User role (admin/leader), team membership, assignment ownership.

---

## Submission Form System

### Form Schema Definition

Stored in `tasks.submission_form_schema`:

```typescript
{
  fields: [
    {
      name: string;           // Field identifier
      type: "text" | "textarea" | "url_list" | "file";
      label: string;          // Display label
      placeholder?: string;
      required?: boolean;
      multiple?: boolean;     // For file/url_list
      accept?: string;        // MIME types for file fields
    }
  ]
}
```

### Default Schema (if none provided)

**File:** `src/components/tasks/task-submission-modal.tsx`

1. `description` (textarea, required) — "Describe what you accomplished"
2. `external_urls` (url_list, optional) — "Public resources (Google Sheets, GitHub, demos)"
3. `screenshots` (file, optional, multiple) — "Upload screenshots or documents"

### Submission Data Structure

```typescript
{
  description?: string;
  external_urls: [
    { url: string, title: string, type: "google_sheets" | "google_docs" | "github" | "figma" | "notion" | "external" }
  ];
  files: File[];
  submitted_at: string;  // ISO timestamp
  notes?: string;
}
```

URL types are auto-detected from the URL pattern.

---

## Recurring Tasks

### Configuration

| Field | Location | Description |
|-------|----------|-------------|
| `is_recurring` | `tasks` table | Marks task as repeatable |
| `cooldown_days` | `tasks` table | Days until next attempt (default 7) |
| `last_completed_at` | `task_progress` | Last completion timestamp |
| `next_available_at` | `task_progress` | Calculated availability date |

### Hook: `useRecurringTasks`

**File:** `src/hooks/use-recurring-tasks.ts`

**Props:** `teamId` (required), `enabled` (boolean)

**Returns:**
```typescript
{
  recurringTasks: RecurringTaskStatus[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  startRecurringTask: (taskId, userId) => Promise<result>;
}
```

### Status Values

| Status | Meaning | UI Display |
|--------|---------|------------|
| `never_completed` | Never started | "Never Completed" (blue) |
| `available` | Cooldown expired, can start | "Ready to Start" (green) |
| `cooldown` | Waiting for cooldown | "Cooldown Period" + time remaining (orange) |

### RPC Functions

| Function | Purpose |
|----------|---------|
| `get_recurring_task_status(team_id)` | Status for all recurring tasks |
| `start_recurring_task(task_id, team_id, user_id)` | Start task, respects cooldown |
| `reset_available_recurring_tasks(team_id)` | Admin: reset cooldowns |

---

## Task Detail Pages

### Team Task Detail (`/dashboard/team-journey/task/[taskId]`)

**File:** `src/app/dashboard/team-journey/task/[taskId]/page.tsx`

**Displays:**
- Task metadata (title, description, XP, points, difficulty)
- Status badge (color-coded)
- Detailed instructions (markdown)
- Tips section (collapsible)
- Learning objectives list
- Deliverables list
- Resources (with links, categorized by type)
- Assignee information
- **Status-specific actions:**
  - Not Started → "Start Task"
  - In Progress → "Submit Completion"
  - Pending Review → "View Submission" + review feedback
  - Approved → "Finished"
- Reassign modal (admin/leader only)
- Submission modal
- "Suggest Edits" button

### Individual Task Detail (`/dashboard/my-journey/task/[id]`)

**File:** `src/app/dashboard/my-journey/task/[id]/page.tsx`

**Differences from team:**
- Auto-approval on submission (no peer review)
- Simpler flow: Start → Submit → Approved (instant)
- Shows "Task Completed Successfully! 🎉" toast with XP/points

---

## Admin Task Management

### Admin Tasks Page (`/dashboard/admin/tasks`)

**File:** `src/app/dashboard/admin/tasks/page.tsx`

**Three tabs:**
1. **Team Tasks** — manage team-context tasks
2. **Individual Tasks** — manage individual-context tasks
3. **Suggestions** — review user edit suggestions

**Actions:** Create, import (bulk), edit, delete, sort, filter

### Create Task Dialog

**File:** `src/components/admin/create-task-dialog.tsx`

**Three tabs:**

#### Basic Tab
- Task context (team/individual)
- Template code (auto-generated or manual)
- Title, description
- Category, priority, difficulty level
- Estimated hours
- Base XP/points rewards
- Toggles: requires review, is recurring, is confidential
- Cooldown days (for recurring)

#### Content Tab
- Detailed instructions (markdown)
- Tips (array of `{ title, content }`)
- Peer review criteria (array of `{ category, points[] }`)
- Learning objectives (string array)
- Deliverables (string array)
- Resources (array of `{ title, description, type, url }`)
- Review instructions (markdown)

#### Advanced Tab
- Achievement link
- Tags
- Prerequisites (template codes)
- Minimum team level
- Submission form schema (JSON)

### CRUD Functions

**File:** `src/lib/data/tasks.ts`

| Function | Purpose |
|----------|---------|
| `createTask(params)` | Insert new task template |
| `updateTask(taskId, params)` | Update task fields |
| `deleteTask(taskId)` | Hard delete task |
| `getTaskForEdit(taskId)` | Fetch full details for editing |
| `getAllTasks(activityType?, sortBy?, sortOrder?)` | List with filtering |
| `generateNextTemplateCode(category, context)` | Auto-increment code |

### Import Tasks

**File:** `src/components/admin/import-tasks-dialog.tsx`

Bulk import from CSV/JSON with validation and progress tracking.

---

## Status Mapping System

**File:** `src/lib/status-mapper.ts`

Three layers of status representation:

| Layer | Purpose | Example |
|-------|---------|---------|
| Database Status | Stored in `task_progress.status` | `"approved"` |
| UI Status | Displayed to users | `"Finished"` |
| Badge Status | Badge component variant | Green badge |

### Key Functions

| Function | Purpose |
|----------|---------|
| `mapDatabaseStatusToUI(status, isRecurring)` | DB → user-facing label |
| `mapUIStatusToBadge(status)` | Label → badge variant |
| `mapRecurringStatusToUI(status, hasBeenCompletedBefore)` | Recurring API → UI |
| `getTaskAction(status, isRecurring)` | Status → button action |
| `validateStatusConsistency(task)` | Debugging helper |

---

## Core Task Functions

**File:** `src/lib/tasks.ts` (1291 lines)

### Lazy Progress Functions

| Function | Purpose |
|----------|---------|
| `createProgressIfNeeded(taskId, teamId?, userId?, context)` | Create progress on demand |
| `getTaskByIdLazy(taskIdOrProgressId, userId, teamId?)` | Fetch with lazy support |
| `startTaskLazy(taskId, teamId?, userId?, context)` | Start task, create progress if needed |
| `assignTaskToMember(taskIdOrProgressId, userId, teamId?)` | Assign, handle both ID types |

### Task Actions

| Function | Purpose |
|----------|---------|
| `startTask(progressId, userId)` | Mark as in_progress, assign user |
| `completeTask(progressId, submissionData)` | Submit for review (team) |
| `completeIndividualTask(progressId, submissionData)` | Auto-approve + award XP |
| `cancelTask(progressId, userId)` | Delete progress record |
| `retryTask(progressId, userId)` | Reset rejected task to in_progress |
| `reassignTask(progressId, newUserId, reassignedByUserId)` | Change assignee |

### Visibility Functions

| Function | Purpose |
|----------|---------|
| `getTeamTasksVisible(teamId, userId?)` | All team tasks (lazy progress) |
| `getUserTasksVisible(userId)` | All individual tasks (lazy progress) |
| `getTeamTasks(teamId)` | Legacy (eager progress) |
| `getUserTasks(userId)` | Legacy (eager progress) |

---

## Achievement Linkage

- Tasks can link to achievements via `achievement_id` FK
- When task is approved → check if achievement criteria met
- Multiple tasks can link to same achievement
- Achievement progress tracked in `user_achievements` / `team_achievements`
- Query: `get_tasks_by_achievement(achievement_id, team_id)` returns linked tasks

---

## Task Edit Suggestions

### Table: `task_edit_suggestions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `task_id` | UUID | FK to `tasks` |
| `user_id` | UUID | Suggesting user |
| `task_title` | TEXT | Task title at time of suggestion |
| `suggestion_text` | TEXT | User's suggestion |
| `status` | TEXT | Suggestion status |
| `created_at` | TIMESTAMP | Submitted |
| `updated_at` | TIMESTAMP | Last update |

### Workflow

1. User clicks "Suggest Edits" on task detail page
2. Opens `SuggestEditsModal` — textarea for suggestion
3. Admin reviews in "Suggestions" tab of admin tasks page

---

## Confidential Tasks

- `tasks.is_confidential = true` hides task from regular views
- Only visible to admins and specifically assigned users
- Peer review: only admins can review confidential tasks
- RPC: `user_can_see_confidential_tasks(user_id, task_id)` checks visibility

---

## Points & XP Rewards

| Action | Points | XP | Method |
|--------|--------|----|--------|
| Team task approved | `base_points_reward` | `base_xp_reward` | Peer review approval |
| Individual task completed | `base_points_reward` | `base_xp_reward` | Auto on submission |
| Peer review submitted | 10% of `base_points_reward` | 10% of `base_xp_reward` | Review completion |

Rewards stored as `transactions` records with `type = "task"` or `type = "validation"` (for reviews).

---

## Pre-built Templates

**File:** `src/lib/task-templates.ts`

| Template | Context | Description |
|----------|---------|-------------|
| `development-team` | Team | Collaborative feature/component development |
| `development-individual` | Individual | Learning individual tech skills |
| `business-team` | Team | Business strategy & market research |

Templates include pre-configured instructions, tips, criteria, objectives, deliverables, and resources.

---

## Hooks

### `useRecurringTasks`

**File:** `src/hooks/use-recurring-tasks.ts`

Manages recurring task state, cooldown tracking, and start actions for a team.

### `useTaskNotifications`

**File:** `src/hooks/use-task-notifications.ts`

Supabase Realtime subscriptions for task-related notifications (assignment, review status changes).

---

## Frontend Types

**File:** `src/types/team-journey.ts`

```typescript
interface TeamTask {
  progress_id: string | null;
  task_id: string;
  title: string;
  description: string;
  category: string;
  difficulty_level: number;
  base_xp_reward: number;
  status: string;
  assigned_to_user_id: string | null;
  assignee_name: string | null;
  submission_data: any;
  review_feedback: string | null;
  peer_review_criteria: any[];
  peer_review_history: any[];
  submission_history: any[];
  // ... more fields
}

interface TaskTableItem {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  xp: number;
  points: number;
  status: string;
  action: string;
  reviewFeedback?: string;
  // ... more fields
}
```

---

## RPC Functions Reference

| Function | Purpose |
|----------|---------|
| `create_progress_if_needed_v2` | Lazy progress creation |
| `get_team_tasks_visible` | All team tasks |
| `get_user_tasks_visible` | All individual tasks |
| `get_team_tasks_simple` | Simplified team tasks |
| `get_user_tasks_with_feedback` | Tasks with peer review feedback |
| `assign_user_to_task_simple` | Assign task to user |
| `start_recurring_task` | Start recurring, respects cooldown |
| `get_recurring_task_status` | Recurring task statuses |
| `complete_individual_task` | Auto-approve individual task |
| `resubmit_task_for_review` | Resubmit after rejection |
| `user_can_manage_task` | Permission check |
| `reassign_task` | Change assignee |
| `get_tasks_by_achievement` | Achievement-linked tasks |

---

## File Reference

### Pages
| File | Purpose |
|------|---------|
| `src/app/dashboard/admin/tasks/page.tsx` | Admin task management |
| `src/app/dashboard/team-journey/task/[taskId]/page.tsx` | Team task detail |
| `src/app/dashboard/my-journey/task/[id]/page.tsx` | Individual task detail |

### Components
| File | Purpose |
|------|---------|
| `src/components/ui/task-details-modal.tsx` | Multi-mode task modal |
| `src/components/tasks/task-submission-modal.tsx` | Submission form |
| `src/components/tasks/task-row.tsx` | Task row in tables |
| `src/components/tasks/suggest-edits-modal.tsx` | Edit suggestion form |
| `src/components/admin/create-task-dialog.tsx` | Admin create task (3-tab form) |
| `src/components/admin/edit-task-dialog.tsx` | Admin edit task |
| `src/components/admin/import-tasks-dialog.tsx` | Bulk import |
| `src/components/admin/admin-tasks-table.tsx` | Admin tasks table |
| `src/components/team-journey/tasks-table.tsx` | Team tasks table |
| `src/components/team-journey/task-preview-modal.tsx` | Task preview |
| `src/components/team-journey/recurring-tasks-card.tsx` | Recurring task card |

### Library
| File | Purpose |
|------|---------|
| `src/lib/tasks.ts` | Core task logic (1291 lines) |
| `src/lib/data/tasks.ts` | Task CRUD & queries (508 lines) |
| `src/lib/task-templates.ts` | Pre-built templates (310 lines) |
| `src/lib/status-mapper.ts` | Status mapping system (208 lines) |
| `src/lib/database.ts` | Public API facade |
| `src/lib/file-upload.ts` | File upload to Supabase Storage |

### Hooks
| File | Purpose |
|------|---------|
| `src/hooks/use-recurring-tasks.ts` | Recurring task management |
| `src/hooks/use-task-notifications.ts` | Realtime task notifications |

### Types
| File | Purpose |
|------|---------|
| `src/types/database.ts` | Auto-generated DB types |
| `src/types/team-journey.ts` | TeamTask, TaskTableItem interfaces |
| `src/lib/validation-schemas.ts` | Zod schemas for task data |
