# Notifications System

> The notification system delivers real-time and persistent alerts to users about task assignments, peer reviews, team invitations, weekly report reminders, achievement unlocks, and strike resolutions. It uses a dual-source architecture combining database-persisted notifications with Supabase Realtime subscriptions.

## Overview

Notifications are created through two mechanisms:

1. **API Routes** — Server-side notification creation for task assignments, strike refunds, and welcome messages
2. **Database Triggers** — Automatic Postgres triggers for peer reviews, invitations, achievements, and weekly report reminders

All notifications are stored in the `notifications` table and delivered to the UI via Supabase Realtime subscriptions with React Query fallback polling.

---

## Architecture

### Data Flow

```
Trigger Event (task assigned, review completed, deadline approaching)
  → Notification created (API insert or DB trigger)
    → Supabase Realtime broadcasts INSERT event
      → React Query invalidation → UI re-fetch
        → NotificationCenter updates (bell badge + dropdown list)
          → User clicks → Mark as read + route to relevant page
```

### Key Files

| File | Role |
|------|------|
| `src/lib/notifications.ts` | Notification types, icon mapping, mark-as-read logic |
| `src/lib/data/notifications.ts` | Legacy metadata system (disabled to prevent duplicates) |
| `src/lib/notification-manager.ts` | Simple event emitter for notification updates |
| `src/components/notification-center.tsx` | UI component (bell, popover, list) |
| `src/hooks/use-task-notifications.ts` | React Query + Realtime subscription hook |

---

## Database Schema

### `notifications` Table

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | No | FK → `users.id` — recipient |
| `type` | TEXT | No | Notification type (constrained) |
| `title` | TEXT | No | Display title |
| `message` | TEXT | Yes | Optional message body |
| `data` | JSONB | Yes | Structured routing/context data |
| `read_at` | TIMESTAMP | Yes | NULL = unread, timestamp = read |
| `created_at` | TIMESTAMP | Yes | Auto-set to `now()` |

### Constraints

- **`notifications_type_check`** — Validates `type` column against allowed values. New notification types **must** be added to this constraint before inserting.
- **`notifications_user_id_fkey`** — FK to `users(id)`

---

## Notification Types

| Type | Trigger | Icon | Color | Source |
|------|---------|------|-------|--------|
| `task_assigned` | Team member assigns task to another | `UserCheck` | Green | API route |
| `invitation_accepted` | Team invitation accepted | `UserCheck` | Green | DB trigger |
| `invitation_declined` | Team invitation declined | `UserX` | Red | DB trigger |
| `invitations_auto_declined` | Pending invitations auto-declined on team join | `Users` | Red | DB trigger |
| `invitation` | New team invitation created | `Users` | Blue | DB trigger |
| `peer_review_approved` | Peer review approved | `CheckCircle` | Green | DB trigger |
| `peer_review_rejected` | Peer review rejected | `XCircle` | Red | DB trigger |
| `peer_review_resubmission` | Task needs resubmission | `RefreshCw` | Blue | DB trigger |
| `weekly_report_reminder_2day` | 2 days before deadline | `CalendarClock` | Blue | Scheduled job |
| `weekly_report_reminder_1day` | 1 day before deadline | `CalendarClock` | Blue | Scheduled job |
| `weekly_report_penalty` | Penalty applied for missed report | `AlertTriangle` | Red | Scheduled job |
| `weekly_report_refund` | Strike resolved, penalty refunded | `CheckCircle` | Green | API route |
| `achievement` | Achievement unlocked | `Trophy` | Yellow | DB RPC trigger |
| `system` | Welcome message for invited user | `Bell` | Gray | API route |

---

## API Routes

### `POST /api/notifications/task-assigned`

**File:** `src/app/api/notifications/task-assigned/route.ts`

**Body:** `{ assigneeId, taskTitle, teamId, teamName }`

**Flow:**
1. Verify auth + team membership
2. Skip if self-assignment (no notification to yourself)
3. Insert to `notifications` table via admin client (bypasses RLS)
4. Include assigner name in message

**Data payload:** `{ team_id, teamName }`

### `POST /api/admin/resolve-strike` (notification side effect)

**File:** `src/app/api/admin/resolve-strike/route.ts`

When all strikes for a team+week are resolved, creates `weekly_report_refund` notifications for each active team member.

**Data payload:** `{ team_id, week_number, week_year, points_refunded }`

### `POST /api/admin/bulk-invite` (notification side effect)

**File:** `src/app/api/admin/bulk-invite/route.ts`

Creates `system` type welcome notification when new user is invited.

---

## Database Triggers

The following notifications are created automatically by Postgres triggers (not application code):

| Trigger | Fires On | Notification Type |
|---------|----------|-------------------|
| `notify_submitter_on_review_completion` | `task_progress` status → approved/rejected | `peer_review_approved` / `peer_review_rejected` |
| `notify_reviewer_on_resubmission` | Task marked for resubmission | `peer_review_resubmission` |
| Invitation state change trigger | `team_invitations` update | `invitation_accepted` / `invitation_declined` |
| Auto-decline trigger | `team_members` insert | `invitations_auto_declined` |
| Achievement trigger | RPC `check_and_award_achievement` | `achievement` |
| Weekly report reminder | Postgres cron/scheduled job | `weekly_report_reminder_2day` / `weekly_report_reminder_1day` |

---

## Frontend Components

### NotificationCenter

**File:** `src/components/notification-center.tsx`

**Location:** Sidebar header (next to logo in `AppSidebar`)

**Structure:**
```
<Popover>
  <PopoverTrigger>
    <Bell icon/>
    <Badge count={unreadCount}/>  (destructive variant, top-right)
  </PopoverTrigger>

  <PopoverContent w-96>
    <Header>
      <h3>Notifications</h3>
      <Button "Mark all read"/>
    </Header>

    <ScrollArea h-400>
      {notifications.map(notif => (
        <NotificationItem>
          <Icon/> <Title/>
          <Message/> (if present)
          <TaskTitle/> (if present)
          <TimeAgo/> (formatDistanceToNow)
        </NotificationItem>
      ))}
    </ScrollArea>
  </PopoverContent>
</Popover>
```

**Styling:**
- Radix UI Popover + ShadCN components
- ScrollArea: 400px max height
- 1px separators between items
- Slide-in-right animation (0.3s, 30ms stagger per item)
- Badge: destructive variant, hidden when count = 0

### Click Routing

When a notification is clicked, the user is routed based on type:

| Type | Route |
|------|-------|
| `invitation*` | `/dashboard/invitations` |
| `peer_review_approved/rejected` | `/dashboard/team-journey/task/{taskProgressId}?tab=peer-review` |
| `peer_review_resubmission` | `/dashboard/peer-review?tab=my-tests` |
| `weekly_report_reminder_*` (team) | `/dashboard/team-journey/{teamId}?tab=weekly-reports` |
| `weekly_report_reminder_*` (personal) | `/dashboard/my-journey?tab=weekly-reports` |
| `task_assigned` | `/dashboard/team-journey/{teamId}` |
| `achievement` | `/dashboard/my-journey` |
| `weekly_report_refund` | `/dashboard/team-journey/{teamId}` |

---

## Hooks & State Management

### `useNotifications(userId)` / `useTaskNotifications(userId)`

**File:** `src/hooks/use-task-notifications.ts`

**Returns:** `{ notifications, count, markAsSeen, isLoading }`

### React Query Configuration

| Setting | Value |
|---------|-------|
| List query key | `["notifications", "list", userId]` |
| Count query key | `["notifications", "count", userId]` |
| Stale time | 30 seconds |
| Refetch on focus | Enabled |
| Fallback polling | Every 5 minutes |

### Data Fetching

```typescript
// getNotifications(userId)
SELECT * FROM notifications
WHERE user_id = ? AND read_at IS NULL
ORDER BY created_at DESC
LIMIT 50
```

Returns `UnifiedNotification[]` sorted by creation date (newest first).

---

## Real-time Updates

### Supabase Realtime Subscription

```typescript
channel = supabase
  .channel(`notifications:${userId}`)
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "notifications",
    filter: `user_id=eq.${userId}`,
  }, () => {
    // Invalidate React Query → triggers immediate re-fetch
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  })
  .subscribe();
```

**Auth Token:** Must manually set on Realtime WebSocket:
```typescript
const token = data.session?.access_token;
supabase.realtime.setAuth(token);
```

### Update Flow

1. Notification INSERT hits database
2. Supabase Realtime broadcasts change event
3. Hook callback fires → invalidates React Query cache
4. React Query re-fetches notification list + count
5. UI updates (badge count + list)
6. Fallback: 5-minute polling interval catches any missed events

---

## Key Behaviors

### Mark as Read

**Single notification:**
```typescript
await supabase
  .from("notifications")
  .update({ read_at: new Date().toISOString() })
  .eq("id", notificationId);
```

**Mark all as read:**
- Loops through all displayed notifications
- Calls `markAsSeen(id, "persistent")` for each
- Invalidates React Query to refresh UI

### Unread Count

- Count = number of notifications where `read_at IS NULL`
- Displayed as red badge on bell icon
- Hidden when count = 0
- Updated via Realtime + React Query

### Pagination

- Fixed limit of 50 notifications per fetch
- No cursor pagination or infinite scroll
- Only unread notifications are fetched

---

## Notification Data Payload

**Interface:** `NotificationData` (`src/lib/notifications.ts`)

```typescript
{
  // Task routing
  taskId?: string;
  task_id?: string;
  task_progress_id?: string;
  taskTitle?: string;
  task_title?: string;

  // Team routing
  teamId?: string;
  team_id?: string;
  teamName?: string;

  // Invitation routing
  invitationId?: string;
  invitation_id?: string;

  // Review data
  reviewerId?: string;
  reviewer_id?: string;
  reviewDecision?: string;
  decision?: string;
  feedback?: string;

  // Custom routing
  target_route?: string;     // Hardcoded navigation override
  target_tab?: string;       // Tab to open

  // Weekly reports
  week_number?: number;
  week_year?: number;
  points_refunded?: number;
  context?: string;          // "team" or "individual"

  // Other
  role?: string;
  achievementId?: string;
  achievementName?: string;
  inviterName?: string;
}
```

---

## Implementation Patterns

### Service Role for Inserts

All notification inserts use `createAdminClient()` to bypass RLS:

```typescript
const adminClient = createAdminClient();
await adminClient.from("notifications").insert({
  user_id: recipientId,
  type: "task_assigned",
  title: "New Task Assigned",
  message: `${assignerName} assigned you "${taskTitle}"`,
  data: { team_id: teamId, teamName },
});
```

### Legacy Metadata System (Disabled)

**File:** `src/lib/data/notifications.ts`

The legacy system generated notifications from metadata (task_progress changes, invitation states) instead of persisting them. It has been **disabled** (returns empty array) to prevent duplicates with database trigger notifications. Kept for backward compatibility.

---

## Adding a New Notification Type

1. **Add type to `notifications_type_check` constraint** in Supabase SQL:
   ```sql
   ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
   ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
     CHECK (type IN ('task_assigned', 'invitation_accepted', ..., 'your_new_type'));
   ```

2. **Add icon mapping** in `src/lib/notifications.ts` → `getNotificationIcon()` function

3. **Add click routing** in `src/components/notification-center.tsx` → click handler switch

4. **Create the notification** via API route or DB trigger using `createAdminClient()`

5. **Test** by verifying the Realtime subscription picks up the new INSERT

---

## File Reference

| File | Purpose |
|------|---------|
| `src/lib/notifications.ts` | Types, icons, mark-as-read, data interface |
| `src/lib/data/notifications.ts` | Legacy metadata system (disabled) |
| `src/lib/notification-manager.ts` | Event emitter for updates |
| `src/components/notification-center.tsx` | Bell icon, popover, notification list |
| `src/hooks/use-task-notifications.ts` | React Query + Realtime hook |
| `src/app/api/notifications/task-assigned/route.ts` | Task assignment notification |
| `src/app/api/admin/resolve-strike/route.ts` | Refund notification (side effect) |
| `src/app/api/admin/bulk-invite/route.ts` | Welcome notification (side effect) |
