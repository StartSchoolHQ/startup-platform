# Client Meetings System

> The Client Meetings system enables teams to document and track customer/client interactions using a structured 7-question template. It supports a full draft-to-completion lifecycle, rewards teams with XP and Points on submission, and enforces privacy through client name masking for non-team members.

## Overview

Client Meetings lives as a tab within the Team Journey detail page (`/dashboard/team-journey/[teamID]`). It provides:

1. **Structured Meeting Documentation** -- A 7-question template captures who you met, what you learned, and what happens next
2. **Draft System** -- Dual autosave (localStorage + database) so work is never lost
3. **Reward Incentives** -- 50 XP + 25 Points awarded on meeting completion
4. **Privacy Controls** -- Client names are masked for users outside the team
5. **Interest Tracking** -- Categorize client interest level for pipeline analysis
6. **CSV Export** -- Bulk export meeting data for external reporting

---

## Architecture

### System Connections

```
Team Journey Page (/dashboard/team-journey/[teamID])
  └─ Client Meetings Tab
       ├─ ClientMeetingsTable (list, filter, actions)
       │    ├─ ViewClientMeetingModal (read-only details)
       │    ├─ AddClientMeetingModal (create/edit/draft)
       │    └─ Delete confirmation dialog (soft delete)
       ├─ Data Layer: getTeamClientMeetings() → RPC get_team_client_meetings_secure()
       └─ Rewards: complete_meeting() RPC → transaction (50 XP + 25 Points)
```

### Key Data Flow

```
User fills 7-question form
  → Option A: "Submit Meeting" → INSERT with status "completed"
  → Option B: "Save as Draft" → save_meeting_draft() RPC → status "draft"
       → Later: "Submit" from table → complete_meeting() RPC
            → Validates required fields
            → Sets status "completed"
            → Creates transaction (50 XP + 25 Points)
              → React Query invalidation → UI refresh
```

---

## Database Schema

### `client_meetings`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `team_id` | UUID | No | FK to `teams` |
| `responsible_user_id` | UUID | No | FK to `users` -- who conducted the meeting |
| `client_name` | TEXT | No | Client or company name |
| `status` | TEXT | No | `"draft"`, `"scheduled"`, `"completed"`, `"cancelled"` |
| `meeting_data` | JSONB | Yes | 7-question structured response data |
| `meeting_date` | TEXT | Yes | Date the meeting took place |
| `completed_at` | TIMESTAMP | Yes | When the meeting was finalized |
| `deleted_at` | TIMESTAMP | Yes | Soft delete timestamp (NULL = active) |
| `created_at` | TIMESTAMP | Yes | Record creation time |
| `updated_at` | TIMESTAMP | Yes | Last update time |

**Foreign Keys:**
- `responsible_user_id` -> `users(id)`
- `team_id` -> `teams(id)`

**Soft Delete:** Meetings are never hard-deleted. Setting `deleted_at` hides them from queries. XP and Points earned from a deleted meeting are **not** reversed.

---

## Meeting Lifecycle

### State Diagram

```
New Meeting Form
  ├─ [Submit Meeting] ─────────────────────→ completed (50 XP + 25 Points)
  └─ [Save as Draft] → draft (0 XP, 0 Pts)
                           │
                           ├─ [Edit] → update draft fields
                           ├─ [Submit] → complete_meeting() RPC
                           │                → validates required fields
                           │                → completed (50 XP + 25 Points)
                           └─ [Delete] → soft delete (deleted_at set)

completed
  ├─ [Edit] → update fields (no additional rewards)
  └─ [Delete] → soft delete (rewards NOT reversed)
```

### Meeting Statuses

| Status | Rewards | Who Can Edit | Description |
|--------|---------|--------------|-------------|
| `draft` | 0 XP, 0 Points | Draft creator only | Incomplete, saved for later |
| `completed` | 50 XP, 25 Points | Any team member | Finalized and rewarded |
| `scheduled` | -- | -- | Reserved for future use |
| `cancelled` | -- | -- | Reserved for future use |

---

## 7-Question Template

The meeting form captures structured data across seven sections. All data is stored in the `meeting_data` JSONB column.

### Q1: Who did you meet and why is this person relevant?

| Field | Key | Required | Description |
|-------|-----|----------|-------------|
| Role | `clientRole` | Yes | Client's role (CEO, Marketing Director, etc.) |
| Responsibilities | `clientResponsibilities` | No | Decision authority, responsibilities |
| Target Segment Match | `segmentRelevance` | No | How they match your target customer segment |

### Q2: Meeting Goal & Assumptions

| Field | Key | Required | Description |
|-------|-----|----------|-------------|
| Goal & Assumptions | `meetingGoal` | Yes | What you wanted to learn and what assumptions you tested |
| Assumptions Tested | `assumptionsTested` | No | Populated automatically from `meetingGoal` for backward compatibility |

### Q3: Client Feedback

| Field | Key | Required | Description |
|-------|-----|----------|-------------|
| Client Feedback | `clientFeedback` | Yes | Overall feedback from the client |
| What Validated | `feedbackValidation` | No | Feedback that confirmed hypotheses |
| What Challenged | `feedbackChallenges` | No | Feedback that contradicted hypotheses |

### Q4: Main Learnings

| Field | Key | Required | Description |
|-------|-----|----------|-------------|
| Main Learnings | `mainLearnings` | Yes | Key insights and lessons from the meeting |

### Q5: Next Steps

| Field | Key | Required | Description |
|-------|-----|----------|-------------|
| Next Steps | `nextStepsClient` | Yes | What was agreed with the client |
| Interest Level | `interestLevel` | Yes | Client's level of interest (dropdown) |

### Q6: Internal Actions

| Field | Key | Required | Description |
|-------|-----|----------|-------------|
| Internal Actions | `internalActions` | Yes | Team actions based on the meeting |
| Deadline | `actionDeadline` | Yes | Deadline for action items (date picker) |
| Responsible | `actionResponsible` | Yes | Team member responsible for follow-up |

### Q7: Team Improvements

| Field | Key | Required | Description |
|-------|-----|----------|-------------|
| Team Improvements | `teamImprovements` | No | Process improvements, what to do differently |

### Meeting Data JSONB Structure

```typescript
{
  // Q1: Client Context
  clientRole?: string;
  clientResponsibilities?: string;
  segmentRelevance?: string;

  // Q2: Goal & Assumptions
  meetingGoal?: string;
  assumptionsTested?: string;

  // Q3: Client Feedback
  clientFeedback?: string;
  feedbackValidation?: string;
  feedbackChallenges?: string;

  // Q4: Learnings
  mainLearnings?: string;

  // Q5: Next Steps
  nextStepsClient?: string;
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

---

## Validation Rules

### Zod Schema: `ClientMeetingSchema`

**File:** `src/lib/validation-schemas.ts`

Full validation runs on "Submit Meeting" for new meetings and when editing completed meetings. Draft saves and draft edits only require `clientName` and `responsibleUserId`.

| Field | Rule | Error Message |
|-------|------|---------------|
| `clientName` | Required, min 2 chars, trimmed | "Client name is too short (minimum 2 characters)" |
| `responsibleUserId` | Required (non-empty string) | "Please select who conducted this meeting" |
| `meetingDate` | Required (non-empty string) | "Please select when the meeting took place" |
| `clientRole` | Required, min 3 chars | "Role is too short (minimum 3 characters)" |
| `clientResponsibilities` | Optional, min 5 chars if provided | "If provided, responsibilities should be at least 5 characters" |
| `segmentRelevance` | Optional, min 5 chars if provided | "If provided, segment relevance should be at least 5 characters" |
| `meetingGoal` | Required, min 5 chars | "Meeting goal is too short" |
| `assumptionsTested` | Optional, min 5 chars if provided | "If provided, assumptions should be at least 5 characters" |
| `clientFeedback` | Required, min 5 chars | "Client feedback is too short" |
| `feedbackValidation` | Optional, min 5 chars if provided | -- |
| `feedbackChallenges` | Optional, min 5 chars if provided | -- |
| `mainLearnings` | Required, min 5 chars | "Main learnings is too short" |
| `nextStepsClient` | Required, min 5 chars | "Next steps is too short" |
| `interestLevel` | Required (non-empty string) | "Please select the client's level of interest" |
| `internalActions` | Required, min 5 chars | "Internal actions is too short" |
| `actionDeadline` | Required (non-empty string) | "Please set a deadline for the action items" |
| `actionResponsible` | Required (non-empty string) | "Please select who is responsible for follow-up" |
| `teamImprovements` | Optional (no min length) | -- |

### Draft Validation (Relaxed)

When saving as draft or editing a draft, only two fields are validated:
- `clientName` -- must be non-empty (defaults to "Untitled Draft" in RPC)
- `responsibleUserId` -- must be selected

---

## RPC Functions

### `save_meeting_draft(p_team_id, p_client_name, p_responsible_user_id, p_meeting_data)`

Creates a new meeting record with `status = "draft"`.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `p_team_id` | UUID | Team the meeting belongs to |
| `p_client_name` | TEXT | Client name (defaults to "Untitled Draft") |
| `p_responsible_user_id` | UUID | Who conducted the meeting |
| `p_meeting_data` | JSONB | 7-question response data (partial is OK) |

**Returns:** `{ success: boolean, error?: string }`

### `complete_meeting(p_meeting_id)`

Validates required fields, converts a draft to completed status, and awards rewards.

**Parameter:** `p_meeting_id` (UUID) -- ID of the draft meeting to complete.

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

**Validation:** The RPC checks that the following fields exist in `meeting_data`:
- `meetingGoal`
- `clientFeedback`
- `mainLearnings`
- `internalActions`
- `actionDeadline`
- `teamImprovements`
- `nextStepsClient`

If any are missing, the function returns `success: false` with `missing_fields` listing the gaps.

**Side Effects:**
- Sets `status = "completed"` and `completed_at = now()`
- Creates a transaction record: +50 XP, +25 Points for the responsible user

### `get_team_client_meetings_secure(p_team_id, p_user_id)`

Fetches all meetings for a team with permission-based client name masking.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `p_team_id` | UUID | Team to fetch meetings for |
| `p_user_id` | UUID | Current user (for permission check) |

**Returns:** Array of meeting records with:
- Full meeting data including `meeting_data` JSONB
- Joined `users` data (name, avatar) for the responsible person
- `is_client_name_masked: boolean` -- indicates if client name was masked

**Masking Logic:**
- Team members and admins see the real `client_name`
- Non-team members see a masked/anonymized name
- The `is_client_name_masked` flag tells the UI whether to show the masked indicator

---

## Draft System

### Dual Autosave Architecture

```
User types in form
  ├─ localStorage autosave (debounced 500ms)
  │    Key: client-meeting-draft-${teamId}
  │    Triggers: on every form field change
  │    Scope: new meetings only (not edits)
  │
  └─ Database draft save (explicit "Save as Draft" button)
       RPC: save_meeting_draft()
       Creates a record with status = "draft"
```

### localStorage Draft Behavior

1. **Auto-save:** Every form change triggers a debounced (500ms) save to `localStorage` with key `client-meeting-draft-${teamId}`
2. **Restore prompt:** When opening the "Add Meeting" modal, if a localStorage draft exists, a dialog asks "Continue editing?" or "Discard Draft"
3. **Clear on submit:** Draft is cleared from localStorage on successful submit or explicit "Clear Draft" action
4. **Edit mode excluded:** localStorage drafts are only saved for new meetings, not when editing existing ones
5. **Content check:** Only saves when meaningful content exists (`clientName`, `meetingGoal`, `clientFeedback`, or `mainLearnings`)

### Database Draft Behavior

1. **Explicit save:** User clicks "Save as Draft" button in the modal footer
2. **Minimal validation:** Only requires `clientName` and `responsibleUserId`
3. **Clears localStorage:** On successful database save, the localStorage draft is cleared
4. **Visible in table:** Database drafts appear in the meetings table with an amber "Draft" badge
5. **Draft actions:** Only the draft creator can edit, submit, or delete their drafts
6. **Submit from table:** Drafts can be submitted directly from the table via the "Submit" button, which calls `complete_meeting()` RPC

---

## Interest Level Tracking

Meetings are categorized by client interest level for pipeline analysis.

| Value | Display Label | Meaning |
|-------|---------------|---------|
| `intent_to_try` | Intent to try | Client expressed intent to try the product |
| `willingness_to_pay` | Willingness to pay | Client indicated willingness to pay |
| `introductions` | Offered introductions | Client offered to introduce to others |
| `not_interested` | Not interested | Client was not interested |

The meetings table includes a dropdown filter that allows filtering by interest level, showing counts for each category.

---

## Rewards

### Completion Rewards

| Action | XP | Points |
|--------|-----|--------|
| Submit completed meeting | +50 | +25 |
| Save as draft | 0 | 0 |
| Edit completed meeting | 0 | 0 |
| Delete meeting | 0 (not reversed) | 0 (not reversed) |

**Important:** Rewards are awarded once on completion. Editing a completed meeting does not award additional rewards. Deleting a meeting does not reverse previously earned rewards.

### Reward Flow

```
User submits meeting (or submits draft from table)
  → complete_meeting() RPC
    → Validates required fields
    → Creates transaction: { xp_change: 50, points_change: 25 }
    → Updates user totals
    → Returns { xp_rewarded: 50, points_rewarded: 25 }
      → Toast: "Draft submitted! +50 XP, +25 Points"
```

---

## Privacy & Client Name Masking

### How It Works

The `get_team_client_meetings_secure()` RPC function handles access control at the database level:

- **Team members** see the real client name
- **Admins** see the real client name
- **Non-team members** see a masked/anonymized client name

### UI Indicators

When a client name is masked, the UI shows:
- An `EyeOff` icon next to the client name
- A tooltip: "Client name hidden - only visible to team members and admins"

This appears in both the meetings table and the view meeting modal.

---

## CSV Export

### Availability

The "Export CSV" button appears in the table toolbar when:
- The current user is a team member (`isTeamMember = true`)
- There is at least one meeting to export

### Exported Fields

| CSV Column | Source |
|------------|--------|
| Client Name | `client_name` |
| Role | `meeting_data.clientRole` |
| Meeting Date | `created_at` (formatted) |
| Responsible Person | `users.name` |
| Interest Level | `meeting_data.interestLevel` (display label) |
| Meeting Goal | `meeting_data.meetingGoal` |
| Client Feedback | `meeting_data.clientFeedback` |
| Main Learnings | `meeting_data.mainLearnings` |
| Next Steps | `meeting_data.nextStepsClient` |
| Internal Actions | `meeting_data.internalActions` |
| Action Deadline | `meeting_data.actionDeadline` |
| Action Responsible | `meeting_data.actionResponsible` |

### File Naming

Downloads as: `client-meetings-YYYY-MM-DD.csv` (using the current date).

### CSV Escaping

Values containing commas, double quotes, or newlines are properly escaped with double-quote wrapping.

---

## Permission Model

### Meeting Actions by Role

| Action | Draft Creator | Other Team Members | Non-Team Members | Admins |
|--------|--------------|-------------------|-------------------|--------|
| View completed meeting | Yes | Yes | Yes (masked name) | Yes |
| View draft | Yes | Yes (read-only) | No | Yes |
| Create meeting | Yes | Yes | No | -- |
| Edit own draft | Yes | No | No | -- |
| Submit own draft | Yes | No | No | -- |
| Delete own draft | Yes | No | No | -- |
| Edit completed meeting | Yes | Yes (any team member) | No | -- |
| Delete completed meeting | Yes | Yes (any team member) | No | -- |
| Export CSV | Yes | Yes | No | -- |
| Filter by interest | Yes | Yes | Yes | Yes |

**Key rule:** Only the draft creator (`responsible_user_id === user.id`) can edit, submit, or delete a draft meeting. Other team members see "Pending submission" for drafts they did not create.

---

## Admin Integration

### Team Detail API

**Endpoint:** `GET /api/admin/teams/[id]`

**File:** `src/app/api/admin/teams/[id]/route.ts`

The admin team detail endpoint fetches client meetings data:
- Queries `client_meetings` table directly (admin client bypasses RLS)
- Limited to 20 most recent meetings
- Ordered by `meeting_date DESC`
- Returns: `id`, `client_name`, `status`, `meeting_date`, `completed_at`, `client_type`, `call_type`, `responsible_user`

**Stats returned:**
```typescript
{
  total: number;      // Total meetings fetched (max 20)
  completed: number;  // Count with status "completed"
  scheduled: number;  // Count with status "scheduled"
}
```

### Admin Stats API

**Endpoint:** `GET /api/admin/stats`

**File:** `src/app/api/admin/stats/route.ts`

Returns a platform-wide count of completed client meetings across all teams.

### Audit Trail

Client meetings are tracked in the audit log system:

**File:** `src/lib/audit-log-formatter.ts`
- Table mapping: `client_meetings` -> "Client Meeting"

**File:** `src/lib/audit-log-formatter-v2.ts`
- INSERT: "{actor} logged a client meeting for {team}"
- UPDATE (approved): "Client meeting for {team} was approved"
- UPDATE (rejected): "Client meeting for {team} was rejected"
- UPDATE (other): "{actor} updated a client meeting"

---

## React Query Patterns

### Queries

| Key | Function | Purpose |
|-----|----------|---------|
| `["clientMeetings", teamId, userId]` | `getTeamClientMeetings()` | Fetch team meetings with masking |

### Mutations

**Create Meeting:**
```typescript
useMutation({
  mutationFn: (formData) => supabase.from("client_meetings").insert({...}),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["clientMeetings"] });
    queryClient.invalidateQueries({ queryKey: ["teamJourney", "stats"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
    clearDraft(); // Clear localStorage
  },
});
```

**Submit Draft (from table):**
```typescript
useMutation({
  mutationFn: (meetingId) =>
    supabase.rpc("complete_meeting", { p_meeting_id: meetingId }),
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ["clientMeetings"] });
    queryClient.invalidateQueries({ queryKey: ["teamAchievementDashboard"] });
    toast.success(`Draft submitted! +${data.xp_rewarded} XP, +${data.points_rewarded} Points`);
  },
  onError: (error) => {
    // Shows missing fields error with 5s duration if applicable
  },
});
```

**Save as Draft:**
```typescript
useMutation({
  mutationFn: (formData) =>
    supabase.rpc("save_meeting_draft", {
      p_team_id: teamId,
      p_client_name: formData.clientName || "Untitled Draft",
      p_responsible_user_id: formData.responsibleUserId,
      p_meeting_data: meetingData,
    }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["clientMeetings"] });
    clearDraft(); // Clear localStorage
  },
});
```

**Soft Delete:**
```typescript
useMutation({
  mutationFn: (meetingId) =>
    supabase.from("client_meetings")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", meetingId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["clientMeetings"] });
    toast.success("Meeting deleted successfully");
  },
});
```

---

## Backdating

The meeting form allows selecting a past date for `meetingDate`. The date picker is capped at today's date (`max` attribute). When creating a completed meeting, both `meeting_date` and `completed_at` are set to the selected date (noon UTC to avoid timezone edge cases).

---

## Frontend Components

| Component | File | Purpose |
|-----------|------|---------|
| ClientMeetingsTable | `src/components/team-journey/client-meetings-table.tsx` | Main data table with filter, export, and actions |
| AddClientMeetingModal | `src/components/team-journey/add-client-meeting-modal.tsx` | Create, edit, and draft save modal |
| ViewClientMeetingModal | `src/components/team-journey/view-client-meeting-modal.tsx` | Read-only modal for completed meetings |

### Visual Indicators

- **Draft rows:** Amber background tint (`bg-amber-50/50`), `FileEdit` icon, "Draft" badge
- **Completed rows:** Default background, `Building2` icon
- **Masked names:** `EyeOff` icon with tooltip
- **Draft rewards:** XP and Points columns show "---" instead of values

---

## Data Layer

### `getTeamClientMeetings(teamId, userId)`

**File:** `src/lib/data/teams.ts`

Calls `get_team_client_meetings_secure()` RPC and transforms the response to match the `DatabaseClientMeeting` interface used by frontend components.

```typescript
const { data, error } = await supabase.rpc(
  "get_team_client_meetings_secure",
  { p_team_id: teamId, p_user_id: userId }
);
```

Exported via `src/lib/database.ts` as a public API facade.

---

## File Reference

### Components
| File | Purpose |
|------|---------|
| `src/components/team-journey/client-meetings-table.tsx` | Meeting list, filter, CSV export, actions |
| `src/components/team-journey/add-client-meeting-modal.tsx` | Create/edit/draft meeting form |
| `src/components/team-journey/view-client-meeting-modal.tsx` | Read-only meeting details |

### Data & Utilities
| File | Purpose |
|------|---------|
| `src/lib/data/teams.ts` | `getTeamClientMeetings()` query function |
| `src/lib/database.ts` | Public API facade for data functions |
| `src/lib/validation-schemas.ts` | `ClientMeetingSchema` Zod validation |
| `src/lib/audit-log-formatter.ts` | Audit log table mapping |
| `src/lib/audit-log-formatter-v2.ts` | Audit log human-readable messages |

### API Routes
| File | Purpose |
|------|---------|
| `src/app/api/admin/teams/[id]/route.ts` | Admin team detail (includes meetings) |
| `src/app/api/admin/stats/route.ts` | Platform-wide completed meetings count |

### Types
| File | Purpose |
|------|---------|
| `src/types/database.ts` | Auto-generated DB types |
| `src/lib/validation-schemas.ts` | `ClientMeetingFormData` type export |
