# Team Journey System

> The Team Journey system is the core operational backbone of the StartSchool Platform, covering team structure, task management, weekly reports, client meetings, and the accountability/penalty system. It tracks a team's progress through the accelerator program.

## Overview

The Team Journey encompasses five interconnected subsystems:

1. **Teams & Membership** — Team creation, roles, member management
2. **Tasks** — Team task assignment, completion, peer review, and rewards
3. **Weekly Reports** — Accountability system with Riga timezone deadlines
4. **Client Meetings** — Sales/customer interaction tracking with a 7-question template
5. **Strikes & Penalties** — Accountability enforcement with explanation and refund mechanisms

---

## Architecture

### System Connections

```
Teams
  ├─ Team Members (roles, join/leave)
  ├─ Tasks (assignment, completion → transactions)
  ├─ Weekly Reports (submission → penalties if missed)
  │   └─ Strikes (auto-created on missed deadline)
  │       └─ Explain → Resolve/Reject → Refund
  ├─ Client Meetings (tracking → transactions)
  └─ Transactions (points/XP ledger)
```

### Key Data Flow

```
Team Action (task completed, meeting submitted, report missed)
  → Transaction recorded (points/XP change)
    → User totals updated
      → Leaderboard snapshots (weekly)
        → Rankings displayed
```

---

## Database Schema

### `teams`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Team name |
| `description` | TEXT | Team description (nullable) |
| `website` | TEXT | Team website (nullable) |
| `logo_url` | TEXT | Team logo (nullable) |
| `status` | `"active"` \| `"archived"` | Team status |
| `founder_id` | UUID | FK to `users` |
| `member_count` | INT | Active member count |
| `team_points` | INT | Total points balance |
| `strikes_count` | INT | Active strikes counter |
| `formation_cost` | INT | Cost to create team (nullable) |
| `weekly_maintenance_cost` | INT | Weekly cost (nullable, not actively used) |
| `current_week` | INT | Last processed week (nullable) |
| `archived_at` | TIMESTAMP | Archive date (nullable) |
| `created_at` | TIMESTAMP | Creation date |

### `team_members`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to `users` |
| `team_id` | UUID | FK to `teams` |
| `team_role` | `team_role_type` | `"founder"`, `"co_founder"`, `"leader"`, `"member"` |
| `joined_at` | TIMESTAMP | Join date |
| `left_at` | TIMESTAMP | Leave date (NULL = active member) |

**Critical:** Always filter with `.is("left_at", null)` for active members. Multiple rows per user/team are possible (old `left_at` rows + active `left_at IS NULL` row).

### `tasks` (Master Task Templates)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `title` | TEXT | Task name |
| `description` | TEXT | Task description |
| `template_code` | TEXT | Unique template identifier |
| `category` | `task_category_type` | See categories below |
| `priority` | `task_priority_type` | Task priority |
| `difficulty_level` | INT | 1–5 difficulty scale |
| `base_xp_reward` | INT | XP awarded on completion |
| `base_points_reward` | INT | Points awarded on completion |
| `is_confidential` | BOOLEAN | Restricted visibility |
| `detailed_instructions` | JSONB | Structured instructions (nullable) |
| `tips_content` | JSONB | Array of `{title, content}` tips (nullable) |
| `peer_review_criteria` | JSONB | Array of `{category, points}` (nullable) |
| `learning_objectives` | TEXT[] | Learning goals (nullable) |
| `deliverables` | TEXT[] | Expected outputs (nullable) |
| `resources` | JSONB | Array of `{title, type, url, description}` (nullable) |
| `submission_form_schema` | JSONB | Dynamic form definition (nullable) |
| `auto_assign_to_new_teams` | BOOLEAN | Auto-assign on team creation |

**Task Categories:**
`"customer-acquisition"` | `"product-foundation"` | `"idea-validation"` | `"repeatable-tasks"` | `"team-growth"` | `"legal-finance"` | `"pitch"`

### `task_progress` (Team/User Task Instances)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Progress ID |
| `task_id` | UUID | FK to `tasks` |
| `team_id` | UUID | FK to `teams` (nullable, for team context) |
| `user_id` | UUID | FK to `users` (nullable, for individual context) |
| `status` | `task_status_type` | See statuses below |
| `assigned_to_user_id` | UUID | Who's working on it (nullable) |
| `assigned_at` | TIMESTAMP | Assignment time |
| `started_at` | TIMESTAMP | Start time |
| `completed_at` | TIMESTAMP | Completion time |
| `submission_data` | JSONB | Form submission data (nullable) |
| `submission_notes` | TEXT | Submission notes (nullable) |
| `review_feedback` | TEXT | Reviewer feedback (nullable) |
| `reviewer_user_id` | UUID | Who reviewed (nullable) |
| `is_available` | BOOLEAN | Can be started |
| `points_awarded` | INT | Actual points given (nullable) |
| `xp_awarded` | INT | Actual XP given (nullable) |

**Task Statuses:**
`"not_started"` | `"in_progress"` | `"pending_review"` | `"approved"` | `"rejected"` | `"revision_required"` | `"cancelled"` | `"template"`

### `weekly_reports`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to `users` |
| `team_id` | UUID | FK to `teams` (nullable, NULL for individual) |
| `context` | `"team"` \| `"individual"` | Report type |
| `week_number` | INT | ISO week number (1–53) |
| `week_year` | INT | Year |
| `week_start_date` | DATE | Monday of the week |
| `week_end_date` | DATE | Sunday of the week |
| `status` | `"submitted"` \| NULL | NULL = draft |
| `submission_data` | JSONB | 7-question response data (nullable) |
| `submitted_at` | TIMESTAMP | Submission time (nullable) |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update |

### `client_meetings`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `team_id` | UUID | FK to `teams` |
| `responsible_user_id` | UUID | FK to `users` (who took the meeting) |
| `client_name` | TEXT | Client/company name |
| `status` | `"draft"` \| `"scheduled"` \| `"completed"` \| `"cancelled"` | Meeting state |
| `meeting_data` | JSONB | 7-question structured data (nullable) |
| `meeting_date` | TEXT | Meeting date (nullable) |
| `completed_at` | TIMESTAMP | Completion time (nullable) |
| `deleted_at` | TIMESTAMP | Soft delete (nullable) |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update |

### `team_strikes`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `team_id` | UUID | FK to `teams` |
| `user_id` | UUID | FK to `users` (nullable) |
| `strike_type` | TEXT | `"missed_weekly_report"` (primary type) |
| `title` | TEXT | Human-readable title |
| `description` | TEXT | Strike description (nullable) |
| `xp_penalty` | INT | XP penalty amount (nullable) |
| `points_penalty` | INT | Points penalty amount (nullable) |
| `status` | TEXT | `"active"`, `"explained"`, `"resolved"`, `"rejected"` |
| `explanation` | TEXT | Team member's explanation (nullable) |
| `explained_by_user_id` | UUID | Who explained (nullable) |
| `explained_at` | TIMESTAMP | Explanation time (nullable) |
| `resolved_at` | TIMESTAMP | Admin resolution time (nullable) |
| `resolved_by_user_id` | UUID | Admin who resolved (nullable) |
| `rejected_at` | TIMESTAMP | Admin rejection time (nullable) |
| `rejected_by_user_id` | UUID | Admin who rejected (nullable) |
| `rejection_reason` | TEXT | Why rejected (nullable) |
| `week_number` | INT | Week of the missed report (nullable) |
| `week_year` | INT | Year (nullable) |
| `created_at` | TIMESTAMP | Strike creation time |
| `updated_at` | TIMESTAMP | Last update |

---

## Teams & Members

### Team Roles

| Role | Permissions |
|------|-------------|
| `founder` | Full team management, all actions |
| `co_founder` | Leadership, can manage members |
| `leader` | Leadership, can manage members |
| `member` | Regular participation |

### Team Creation

- Via `createTeam()` RPC (atomic function)
- Creator automatically becomes `founder`
- `auto_assign_to_new_teams` tasks are assigned to new teams

### Team Management Modal

**File:** `src/components/team-journey/team-management-modal.tsx`

Features:
- Add/remove team members
- Update member roles
- Edit team details (name, description, website, logo)
- Disband team (sets `status = "archived"`)

---

## Tasks System

### Task Lifecycle

```
Template (master task)
  → task_progress created (status: "not_started")
    → User starts (status: "in_progress")
      → User submits (status: "pending_review")
        → Peer review
          → Approved (status: "approved", transaction created)
          → Rejected (status: "rejected" or "revision_required")
            → User revises → resubmit
```

### Task Points & XP

- Defined on master `tasks` table: `base_xp_reward`, `base_points_reward`
- Awarded on `approved` status via transaction
- Difficulty level (1–5) may scale rewards

### Task Categories

| Category | Description |
|----------|-------------|
| `customer-acquisition` | Customer/sales tasks |
| `product-foundation` | Core product building |
| `idea-validation` | Market research & validation |
| `repeatable-tasks` | Recurring operational tasks |
| `team-growth` | Team building activities |
| `legal-finance` | Legal and financial tasks |
| `pitch` | Pitch preparation |

### Frontend Types

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
  // ... more fields
}
```

### Task Components

| Component | File | Purpose |
|-----------|------|---------|
| Tasks Table | `src/components/team-journey/tasks-table.tsx` | Team tasks list with filtering |
| Task Preview | `src/components/team-journey/task-preview-modal.tsx` | Task detail view |
| Recurring Tasks | `src/components/team-journey/recurring-tasks-card.tsx` | Recurring task counter |

---

## Weekly Reports

### Deadline

**Monday 10:00 Riga time (UTC+2)**

The `get_riga_week_boundaries()` RPC function handles all timezone calculations at the database level. Never calculate timezone in frontend.

### Week Boundaries

**RPC:** `get_riga_week_boundaries(input_date?)`

Returns:
```typescript
{
  week_start: string   // Monday (ISO date)
  week_end: string     // Sunday (ISO date)
  week_number: number  // ISO week number
  week_year: number    // ISO year
}
```

### Submission Data Structure (7-Question Template)

```typescript
{
  // Q1: Commitments
  commitments: Array<{
    text: string;
    status: "completed" | "in_progress" | "not_done";
    explanation?: string;
  }>;

  // Q2: Blockers
  blockers: string;
  blockersAnalysis?: string;
  helpNeeded?: string;

  // Q3: Meetings
  meetingsHeld?: number;

  // Q4: Customer Interactions
  keyInsight?: string;
  mostImportantOutcome?: string;

  // Q5: Measurable Progress
  measurableProgress?: string;

  // Q6: Achievement
  biggestAchievement?: string;
  achievementImpact?: string;

  // Q7: Next Week Commitments
  nextWeekCommitments?: string[];  // New format
  nextWeekPriority?: string;       // Legacy format

  // Q8: Team Recognition
  teamRecognition?: string;

  // Q9: Alignment (team reports only)
  alignmentScore?: number;  // 1-10
  alignmentReason?: string;
}
```

### Report Submission Flow

1. Banner shows Friday–Monday when submission window is open
2. Team member opens weekly report form
3. Fills 7-question template
4. Can save as draft (`status: null`)
5. Submits (`status: "submitted"`, `submitted_at` set)
6. Missing deadline → automatic strike creation

### Key Functions

**File:** `src/lib/weekly-reports.ts`

| Function | Purpose |
|----------|---------|
| `getCurrentWeekBoundaries()` | Get current week via RPC |
| `hasUserSubmittedThisWeek(userId, teamId)` | Check submission status |
| `hasUserSubmittedThisWeekIndividual(userId)` | Individual context check |
| `getUserIndividualWeeklyReports(userId)` | Fetch all individual reports |
| `formatWeekPeriod(boundaries)` | Format for display |

### Weekly Report Banner

**File:** `src/components/dashboard/weekly-report-banner.tsx`

- Shows Friday through Monday 10:00 Riga time
- Lists teams with unsubmitted reports
- Links to team journey page for quick submission
- Displays deadline countdown

### Weekly Report Components

| Component | File | Purpose |
|-----------|------|---------|
| Reports Table | `src/components/team-journey/weekly-reports-table.tsx` | Submission history |
| Report Banner | `src/components/dashboard/weekly-report-banner.tsx` | Deadline warning |

---

## Client Meetings

### Meeting States

| Status | Rewards | Description |
|--------|---------|-------------|
| `draft` | 0 XP, 0 Points | In progress, only creator can edit |
| `completed` | 50 XP, 25 Points | Submitted and finalized |

### Meeting Data Structure (7-Question Template)

```typescript
{
  // Q1: Client Context
  clientRole?: string;
  clientResponsibilities?: string;
  segmentRelevance?: string;

  // Q2: Meeting Goal & Assumptions
  meetingGoal?: string;
  assumptionsTested?: string;

  // Q3: Client Feedback
  clientFeedback?: string;
  feedbackValidation?: string;
  feedbackChallenges?: string;

  // Q4: Learnings
  mainLearnings?: string;
  nextStepsClient?: string;

  // Q5: Interest Level
  interestLevel?: "intent_to_try" | "willingness_to_pay" |
                   "introductions" | "not_interested";

  // Q6: Internal Actions
  internalActions?: string;
  actionDeadline?: string;
  actionResponsible?: string;

  // Q7: Team Improvements
  teamImprovements?: string;
}
```

### Meeting Completion RPC

**Function:** `complete_meeting(p_meeting_id)`

**Returns:**
```typescript
{
  success: boolean;
  xp_rewarded: number;    // 50
  points_rewarded: number; // 25
  error?: string;
  missing_fields?: string[];
}
```

**Validation:** Requires `meetingGoal`, `clientFeedback`, `mainLearnings`, `internalActions`, `actionDeadline`, `teamImprovements`, `nextStepsClient`.

### Client Name Masking

**RPC:** `get_team_client_meetings_secure(p_team_id, p_user_id)`

- Non-team members see masked client names for privacy
- Team members and admins see full names
- Returns `is_client_name_masked: boolean` flag

### Meeting Components

| Component | File | Purpose |
|-----------|------|---------|
| Meetings Table | `src/components/team-journey/client-meetings-table.tsx` | List, filter, manage meetings |
| Add Meeting Modal | `src/components/team-journey/add-client-meeting-modal.tsx` | Create/edit meeting |
| View Meeting Modal | `src/components/team-journey/view-client-meeting-modal.tsx` | View completed details |

### Meeting Features

- Filter by interest level
- Export to CSV (admin feature)
- Draft autosave to localStorage (`client-meeting-draft-${teamId}`)
- Soft delete (`deleted_at` set, rewards not reversed)

---

## Strikes & Penalties

### Strike Lifecycle

```
Team misses weekly report deadline
  → Strike auto-created (status: "active")
    → Team member explains (status: "explained")
      → Admin reviews
        → Resolves (status: "resolved") → Check refund
        → Rejects (status: "rejected") → Penalty stands
```

### Strike Statuses

| Status | Meaning | Action Available |
|--------|---------|-----------------|
| `active` | Strike created, awaiting explanation | Team can explain |
| `explained` | Explanation submitted | Admin can resolve/reject |
| `resolved` | Admin accepted explanation | Strikes count decremented |
| `rejected` | Admin rejected explanation | Penalty stands, reason shown |

### Explanation Flow

**File:** `src/components/team-journey/explain-strike-modal.tsx`

```typescript
// Team member submits explanation
.from("team_strikes")
.update({
  explanation: explanation.trim(),
  explained_by_user_id: user.id,
  explained_at: now,
  status: "explained"
})
.eq("id", strike.id)
.in("status", ["active", "explained"])
```

### Refund Mechanism

**File:** `src/app/api/admin/resolve-strike/route.ts`

**Trigger:** All `"missed_weekly_report"` strikes for a team+week are resolved.

**Refund Flow:**
1. Admin resolves a strike → status set to `"resolved"`
2. Team's `strikes_count` decremented
3. System checks: are ALL strikes for this team+week resolved?
4. If yes → refund triggered:
   - Each active team member gets +100 points transaction
   - `increment_user_points` RPC called per member
   - Notification sent to each member
5. Concurrent request protection: duplicate transaction check prevents double-refunding

**API Endpoint:**

```
POST /api/admin/resolve-strike
Body: { strikeId: string }
Auth: Admin only
Returns: { success, team_id, refundTriggered }
```

### Admin Strike Components

| Component | File | Purpose |
|-----------|------|---------|
| Admin Strikes Table | `src/components/admin/admin-strikes-table.tsx` | Admin view of all strikes |
| Review Strike Modal | `src/components/admin/review-strike-modal.tsx` | Resolve/reject with reason |
| Team Strikes Table | `src/components/team-journey/strikes-table.tsx` | Team view of their strikes |
| Explain Strike Modal | `src/components/team-journey/explain-strike-modal.tsx` | Team explanation form |

### Frontend Strike Interface

```typescript
interface Strike {
  id: string;
  title: string;           // e.g., "Missed Weekly Report"
  datetime: string;
  status: "explained" | "waiting-explanation" | "rejected" | "resolved";
  action: "done" | "explain" | "rejected";
  userName?: string;
  description?: string;
  rejectionReason?: string;
}
```

---

## Frontend Pages

### Team Journey List (`/dashboard/team-journey`)

**File:** `src/app/dashboard/team-journey/page.tsx`

- **Tabs:** All Products, My Products, Archive
- Search (debounced 300ms), sort (name/status), filter
- Product cards grid (3 columns, responsive)
- Create team dialog with validation
- Client-side sorting prioritizes user's teams first

### Team Detail (`/dashboard/team-journey/[id]`)

**File:** `src/app/dashboard/team-journey/[id]/page.tsx`

Contains multiple sections:
- Team info & management modal
- Weekly reports table
- Tasks table with assignment
- Client meetings table
- Strikes table
- Recurring tasks card

### Task Detail (`/dashboard/team-journey/task/[taskId]`)

**File:** `src/app/dashboard/team-journey/task/[taskId]/page.tsx`

Individual task detail and submission page.

---

## API Routes

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/admin/teams` | GET | Admin | Fetch all teams with stats |
| `/api/admin/teams/[id]` | GET | Admin | Detailed team info (members, tasks, meetings, strikes, reports) |
| `/api/admin/resolve-strike` | POST | Admin | Resolve strike, trigger refund |
| `/api/admin/task-assigned` | POST | Admin | Notify user of task assignment |

---

## Hooks & Data Fetching

### React Query Patterns

**Team Journey List:**
```typescript
useQuery({
  queryKey: ["teamJourney", "all", user?.id],
  queryFn: () => getAllTeamsForJourney(user!.id),
  enabled: !!user?.id,
});
```

**Client Meetings:**
```typescript
useQuery({
  queryKey: ["clientMeetings", teamId, user?.id],
  queryFn: () => getTeamClientMeetings(teamId, user.id),
  enabled: !!teamId && !!user?.id,
});
```

**Weekly Report Banner:**
```typescript
useQuery({
  queryKey: ["dashboard", "weeklyReportBanner", user?.id],
  queryFn: () => getUserUnsubmittedTeams(user!.id),
  enabled: !!user?.id,
  staleTime: 2 * 60 * 1000,
});
```

### Mutation Patterns

**Submit Draft Meeting:**
```typescript
useMutation({
  mutationFn: (meetingId) =>
    supabase.rpc("complete_meeting", { p_meeting_id: meetingId }),
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ["clientMeetings"] });
    toast.success(`+${data.xp_rewarded} XP, +${data.points_rewarded} Points`);
  },
});
```

**Explain Strike:**
```typescript
useMutation({
  mutationFn: ({ strikeId, explanation }) =>
    supabase.from("team_strikes")
      .update({ explanation, explained_by_user_id, explained_at, status: "explained" })
      .eq("id", strikeId),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teamStrikes"] }),
});
```

---

## Related Database Functions (RPC)

| Function | Purpose |
|----------|---------|
| `createTeam(founderId, name, description)` | Atomic team creation |
| `getTeamDetails(teamId)` | Team info + active members |
| `getTeamPointsInvested(teamId)` | Sum of negative transactions |
| `getTeamPointsEarned(teamId)` | Sum of positive transactions |
| `getTeamXPEarned(teamId)` | Sum of XP earned |
| `getTeamStatsCombined(teamId)` | All 3 stats in one call |
| `getTeamActivityStats(userId, teamId)` | User's activity in team |
| `getTeamStrikes(teamId)` | Team's strikes (RPC: `get_team_strikes`) |
| `getAdminStrikes(filter?)` | Admin view with status filter |
| `getTeamWeeklyReports(teamId)` | Team's submissions |
| `get_riga_week_boundaries(input_date?)` | Week boundaries in Riga TZ |
| `has_user_submitted_this_week(userId, teamId)` | Submission check |
| `check_missed_weekly_reports()` | Identify teams needing penalties |
| `complete_meeting(meetingId)` | Finalize meeting, award rewards |
| `get_team_client_meetings_secure(teamId, userId)` | Meetings with masking |
| `increment_user_points(userId, amount)` | Increment user points balance |

---

## Points Economy Summary

| Action | Points | XP |
|--------|--------|----|
| Task completion (approved) | `base_points_reward` | `base_xp_reward` |
| Client meeting submitted | +25 | +50 |
| Achievement unlocked | `achievement.points_reward` | `achievement.xp_reward` |
| Weekly report penalty | -100 (per member) | Variable |
| Weekly report refund | +100 (per member) | Variable |
| Team formation cost | Negative | 0 |

---

## Critical Implementation Details

### Timezone Handling
- **All week calculations use Riga timezone (UTC+2)**
- `get_riga_week_boundaries()` handles timezone at DB level
- **Deadline:** Monday 10:00 Riga time (~08:00 UTC)
- Banner shows Friday through Monday only
- Never calculate timezone client-side — always use RPC

### Team Member Filtering
```typescript
// Always check left_at for active members
.is("team_members.left_at", null)
```

### Concurrent Refund Protection
- Duplicate transaction check before creating refund
- Prevents double-refunding in concurrent admin requests

### Meeting Draft Autosave
- Saved to localStorage: `client-meeting-draft-${teamId}`
- Restored when modal opens (new meetings only, not edits)
- Clears on successful submit

### Notification Type Constraint
- `notifications_type_check` constraint on `notifications` table
- New notification types must be added to constraint before inserting

---

## File Reference

### Pages
| File | Purpose |
|------|---------|
| `src/app/dashboard/team-journey/page.tsx` | Team list (all/my/archive) |
| `src/app/dashboard/team-journey/[id]/page.tsx` | Team detail (large, multi-section) |
| `src/app/dashboard/team-journey/task/[taskId]/page.tsx` | Task detail |

### Components
| File | Purpose |
|------|---------|
| `src/components/team-journey/tasks-table.tsx` | Team tasks list |
| `src/components/team-journey/task-preview-modal.tsx` | Task detail view |
| `src/components/team-journey/recurring-tasks-card.tsx` | Recurring task counter |
| `src/components/team-journey/weekly-reports-table.tsx` | Report submissions |
| `src/components/team-journey/client-meetings-table.tsx` | Meeting management |
| `src/components/team-journey/add-client-meeting-modal.tsx` | Create/edit meeting |
| `src/components/team-journey/view-client-meeting-modal.tsx` | View meeting |
| `src/components/team-journey/strikes-table.tsx` | Team strikes view |
| `src/components/team-journey/explain-strike-modal.tsx` | Explanation form |
| `src/components/team-journey/team-management-modal.tsx` | Team settings |
| `src/components/team-journey/product-card.tsx` | Team card |
| `src/components/team-journey/avatar-stack.tsx` | Member avatars |
| `src/components/admin/admin-strikes-table.tsx` | Admin strikes view |
| `src/components/admin/review-strike-modal.tsx` | Admin review form |
| `src/components/dashboard/weekly-report-banner.tsx` | Deadline warning |

### API Routes
| File | Purpose |
|------|---------|
| `src/app/api/admin/teams/route.ts` | All teams with stats |
| `src/app/api/admin/teams/[id]/route.ts` | Detailed team info |
| `src/app/api/admin/resolve-strike/route.ts` | Strike resolution + refund |

### Data & Utilities
| File | Purpose |
|------|---------|
| `src/lib/data/teams.ts` | All team queries (~27 functions) |
| `src/lib/weekly-reports.ts` | Weekly report functions |
| `src/lib/database.ts` | Database utilities, `transformTeamToProduct()` |
| `src/lib/task-templates.ts` | Task template functions |
| `src/lib/validation-schemas.ts` | `ClientMeetingSchema` and others |

### Types
| File | Purpose |
|------|---------|
| `src/types/team-journey.ts` | `TeamTask`, `Product`, `TaskTableItem` |
| `src/types/database.ts` | Auto-generated DB types (2100+ lines) |
| `src/data/team-journey-data.ts` | Mock/template data |

### Hooks
| File | Purpose |
|------|---------|
| `src/hooks/use-recurring-tasks.ts` | Recurring task logic |
| `src/hooks/use-task-notifications.ts` | Real-time task updates |
