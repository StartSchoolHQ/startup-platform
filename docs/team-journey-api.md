# Team Journey - API Documentation

## Table of Contents
1. [Database Functions](#database-functions)
2. [Task Functions](#task-functions)
3. [Weekly Report Functions](#weekly-report-functions)
4. [RPC Functions](#rpc-functions)
5. [Data Transformation](#data-transformation)
6. [Error Handling](#error-handling)

---

## Database Functions

### Team Query Functions

#### `getAllTeamsForJourney`
Get all teams with optional filtering and sorting.

**Signature**:
```typescript
async function getAllTeamsForJourney(
  userId: string,
  options?: {
    searchQuery?: string;
    sortBy?: 'name' | 'date' | 'status' | 'revenue';
    sortOrder?: 'asc' | 'desc';
    status?: 'all' | 'active' | 'archived';
  }
): Promise<DatabaseTeam[]>
```

**Parameters**:
- `userId` (string, required): Current user's ID for permission checking
- `options.searchQuery` (string, optional): Search term for team name
- `options.sortBy` (string, optional): Field to sort by, default: 'date'
- `options.sortOrder` (string, optional): Sort direction, default: 'desc'
- `options.status` (string, optional): Filter by status, default: 'all'

**Returns**: Array of `DatabaseTeam` objects

**Example**:
```typescript
const teams = await getAllTeamsForJourney(user.id, {
  searchQuery: 'startup',
  sortBy: 'name',
  sortOrder: 'asc',
  status: 'active'
});
```

**Query Details**:
- Joins: `team_members`, `users`, `revenue_streams`
- Aggregates: `member_count`, `total_revenue`
- Filters: By search term, status, and user visibility
- Permissions: Returns only teams visible to the user

---

#### `getUserTeamsForJourney`
Get teams where the user is a member.

**Signature**:
```typescript
async function getUserTeamsForJourney(
  userId: string,
  options?: QueryOptions
): Promise<DatabaseTeam[]>
```

**Parameters**:
- `userId` (string, required): User's ID
- `options` (QueryOptions, optional): Same as `getAllTeamsForJourney`

**Returns**: Array of `DatabaseTeam` objects where user is a member

**Example**:
```typescript
const myTeams = await getUserTeamsForJourney(user.id, {
  sortBy: 'date',
  sortOrder: 'desc'
});
```

---

#### `getArchivedTeamsForJourney`
Get archived teams visible to the user.

**Signature**:
```typescript
async function getArchivedTeamsForJourney(
  userId: string,
  options?: Omit<QueryOptions, 'status'>
): Promise<DatabaseTeam[]>
```

**Parameters**:
- `userId` (string, required): User's ID
- `options` (QueryOptions, optional): Excludes `status` option

**Returns**: Array of archived `DatabaseTeam` objects

**Example**:
```typescript
const archived = await getArchivedTeamsForJourney(user.id);
```

---

#### `getTeamDetails`
Get detailed information about a specific team.

**Signature**:
```typescript
async function getTeamDetails(
  teamId: string
): Promise<DatabaseTeam>
```

**Parameters**:
- `teamId` (string, required): Team's UUID

**Returns**: Single `DatabaseTeam` object with full details

**Data Included**:
- Team basic info (name, description, status)
- Member list with user details
- Member roles and join dates
- Member XP and points
- Strike count
- Created date

**Example**:
```typescript
const team = await getTeamDetails('uuid-here');
console.log(team.name, team.member_count);
```

---

#### `isUserTeamMember`
Check if a user is a member of a team.

**Signature**:
```typescript
async function isUserTeamMember(
  teamId: string,
  userId: string
): Promise<boolean>
```

**Parameters**:
- `teamId` (string, required): Team's UUID
- `userId` (string, required): User's UUID

**Returns**: `true` if user is a member, `false` otherwise

**Example**:
```typescript
const isMember = await isUserTeamMember(teamId, user.id);
if (isMember) {
  // Show member actions
}
```

---

#### `getUserTeamRole`
Get the user's role in a team.

**Signature**:
```typescript
async function getUserTeamRole(
  teamId: string,
  userId: string
): Promise<string | null>
```

**Parameters**:
- `teamId` (string, required): Team's UUID
- `userId` (string, required): User's UUID

**Returns**: Role string ('founder', 'co_founder', 'leader', 'member') or `null`

**Example**:
```typescript
const role = await getUserTeamRole(teamId, user.id);
if (role === 'founder' || role === 'co_founder') {
  // Show admin actions
}
```

---

#### `transformTeamToProduct`
Transform database team format to Product UI format.

**Signature**:
```typescript
function transformTeamToProduct(
  team: DatabaseTeam
): Product
```

**Parameters**:
- `team` (DatabaseTeam, required): Team from database

**Returns**: `Product` object for UI display

**Transformations**:
- Calculates revenue from `revenue_streams`
- Formats member data
- Adds default values for missing fields
- Structures data for ProductCard component

**Example**:
```typescript
const teams = await getAllTeamsForJourney(userId);
const products = teams.map(transformTeamToProduct);
```

---

### Achievement Functions

#### `getTeamAchievements`
Get all achievements for a team with progress tracking.

**Signature**:
```typescript
async function getTeamAchievements(
  teamId: string
): Promise<Achievement[]>
```

**Parameters**:
- `teamId` (string, required): Team's UUID

**Returns**: Array of `Achievement` objects with progress

**Data Included**:
- Achievement ID and name
- Description
- XP and credits rewards (divided by team size)
- Progress percentage
- Status (in_progress, completed)
- Task counts

**Example**:
```typescript
const achievements = await getTeamAchievements(teamId);
console.log(`Team has ${achievements.length} achievements`);
```

---

#### `getTasksByAchievement`
Get tasks filtered by achievement, optionally for a specific team.

**Signature**:
```typescript
async function getTasksByAchievement(
  achievementId?: string,
  teamId?: string
): Promise<TaskWithAchievement[]>
```

**Parameters**:
- `achievementId` (string, optional): Filter by achievement UUID
- `teamId` (string, optional): Filter by team UUID

**Returns**: Array of `TaskWithAchievement` objects

**Behavior**:
- If both params: Tasks for achievement + team
- If only `achievementId`: All tasks for achievement
- If only `teamId`: All tasks for team
- If neither: All tasks (use with caution)

**Example**:
```typescript
// Get tasks for specific achievement
const tasks = await getTasksByAchievement(achievementId, teamId);

// Get all team tasks
const allTasks = await getTasksByAchievement(undefined, teamId);
```

---

### Strike Functions

#### `getTeamStrikes`
Get all strikes for a team.

**Signature**:
```typescript
async function getTeamStrikes(
  teamId: string
): Promise<Strike[]>
```

**Parameters**:
- `teamId` (string, required): Team's UUID

**Returns**: Array of `Strike` objects

**Data Included**:
- Strike ID
- Reason
- Date
- Explanation (if provided)
- Penalties (XP, credits)
- Created timestamp

**Example**:
```typescript
const strikes = await getTeamStrikes(teamId);
console.log(`Team has ${strikes.length} strikes`);
```

---

### Weekly Report Functions

#### `getTeamWeeklyReports`
Get all weekly reports for a team, grouped by week.

**Signature**:
```typescript
async function getTeamWeeklyReports(
  teamId: string
): Promise<WeeklyReport[]>
```

**Parameters**:
- `teamId` (string, required): Team's UUID

**Returns**: Array of `WeeklyReport` objects

**Data Included**:
- Week number and year
- Date range
- Submissions by team members
- Aggregated metrics (clients, meetings)
- Completion status

**Grouping**: Reports are grouped by week, showing all member submissions per week

**Example**:
```typescript
const reports = await getTeamWeeklyReports(teamId);
reports.forEach(report => {
  console.log(`Week ${report.week}: ${report.submissions.length} submissions`);
});
```

---

#### `hasUserSubmittedThisWeek`
Check if user has submitted a weekly report for the current week.

**Signature**:
```typescript
async function hasUserSubmittedThisWeek(
  userId: string,
  teamId: string
): Promise<boolean>
```

**Parameters**:
- `userId` (string, required): User's UUID
- `teamId` (string, required): Team's UUID

**Returns**: `true` if submitted, `false` otherwise

**Week Calculation**: Uses ISO week number from current date

**Example**:
```typescript
const hasSubmitted = await hasUserSubmittedThisWeek(user.id, teamId);
setButtonDisabled(hasSubmitted);
```

---

## Task Functions

### Task Query Functions

#### `getTeamTasks`
Get all tasks for a team with progress tracking.

**Signature**:
```typescript
async function getTeamTasks(
  teamId: string
): Promise<TaskTableItem[]>
```

**Parameters**:
- `teamId` (string, required): Team's UUID

**Returns**: Array of `TaskTableItem` objects ready for table display

**Data Sources**:
- `tasks` table (master task data)
- `task_progress` table (team progress)
- `users` table (assignee info)

**RPC Used**: `get_team_tasks_simple`

**Example**:
```typescript
const tasks = await getTeamTasks(teamId);
console.log(`Team has ${tasks.length} tasks`);
```

---

#### `getUserTasks`
Get all tasks assigned to a user across all teams.

**Signature**:
```typescript
async function getUserTasks(
  userId: string
): Promise<TaskTableItem[]>
```

**Parameters**:
- `userId` (string, required): User's UUID

**Returns**: Array of `TaskTableItem` objects with peer review feedback

**Additional Data**:
- Review feedback
- Reviewer information
- Team name
- Assignment and completion dates

**RPC Used**: `get_user_tasks_with_feedback`

**Example**:
```typescript
const myTasks = await getUserTasks(user.id);
const inProgress = myTasks.filter(t => t.status === 'In Progress');
```

---

#### `getTaskById`
Get detailed information about a specific task.

**Signature**:
```typescript
async function getTaskById(
  progressId: string
): Promise<TeamTask | null>
```

**Parameters**:
- `progressId` (string, required): Task progress record UUID

**Returns**: `TeamTask` object or `null` if not found

**Data Included**:
- All master task data
- Progress tracking data
- Assignee information
- Reviewer information
- Team context
- Detailed instructions
- Tips, resources, deliverables
- Peer review criteria

**Queries**:
1. Fetch task_progress record
2. Fetch master task data
3. Fetch team data (if applicable)
4. Fetch assignee user data (if applicable)
5. Fetch reviewer user data (if applicable)

**Example**:
```typescript
const task = await getTaskById(progressId);
if (task) {
  console.log(task.title, task.status);
}
```

---

### Task Assignment Functions

#### `assignTaskToMember`
Assign a task to a team member.

**Signature**:
```typescript
async function assignTaskToMember(
  progressId: string,
  userId: string
): Promise<boolean>
```

**Parameters**:
- `progressId` (string, required): Task progress record UUID
- `userId` (string, required): User UUID to assign to

**Returns**: `true` if successful, `false` otherwise

**Side Effects**:
- Updates `task_progress.assigned_to_user_id`
- Sets `task_progress.assigned_at` to NOW()
- May trigger notifications (if implemented)

**RPC Used**: `assign_user_to_task_simple`

**Example**:
```typescript
const success = await assignTaskToMember(progressId, selectedUserId);
if (success) {
  toast.success('Task assigned!');
}
```

---

#### `reassignTask`
Reassign a task from one user to another.

**Signature**:
```typescript
async function reassignTask(
  progressId: string,
  newUserId: string,
  reassignedByUserId: string
): Promise<boolean>
```

**Parameters**:
- `progressId` (string, required): Task progress record UUID
- `newUserId` (string, required): New assignee UUID
- `reassignedByUserId` (string, required): User performing reassignment

**Returns**: `true` if successful, `false` otherwise

**Permission Check**: Requires leader/founder role

**RPC Used**: `reassign_task`

**Example**:
```typescript
const success = await reassignTask(progressId, newUserId, currentUserId);
```

---

### Task Workflow Functions

#### `startTask`
Start a task (move to in_progress).

**Signature**:
```typescript
async function startTask(
  progressId: string,
  userId: string
): Promise<boolean>
```

**Parameters**:
- `progressId` (string, required): Task progress record UUID
- `userId` (string, required): User starting the task

**Returns**: `true` if successful, `false` otherwise

**Workflow**: `not_started` → `in_progress`

**Side Effects**:
- Updates status
- Assigns task to user
- Sets `started_at` timestamp

**Permission Check**: User must have permission to start task

**Example**:
```typescript
const success = await startTask(progressId, user.id);
```

---

#### `completeTask`
Submit a task for review.

**Signature**:
```typescript
async function completeTask(
  progressId: string,
  submissionData: Record<string, unknown>
): Promise<boolean>
```

**Parameters**:
- `progressId` (string, required): Task progress record UUID
- `submissionData` (object, required): Submission form data

**Submission Data**:
```typescript
{
  completed_by: string;       // User ID
  notes?: string;             // Optional notes
  files?: string[];           // File URLs
  [key: string]: unknown;     // Custom fields
}
```

**Returns**: `true` if successful, `false` otherwise

**Workflow**: `in_progress` → `pending_review`

**Side Effects**:
- Updates status
- Stores submission_data
- Sets submission_notes
- May trigger peer review notification

**Example**:
```typescript
const success = await completeTask(progressId, {
  completed_by: user.id,
  notes: 'Task completed successfully',
  files: ['/uploads/file1.pdf']
});
```

---

#### `cancelTask`
Cancel a task.

**Signature**:
```typescript
async function cancelTask(
  progressId: string,
  userId: string
): Promise<boolean>
```

**Parameters**:
- `progressId` (string, required): Task progress record UUID
- `userId` (string, required): User cancelling

**Returns**: `true` if successful, `false` otherwise

**Workflow**: Any status → `cancelled`

**Permission Check**: Leader/founder only

**Example**:
```typescript
const success = await cancelTask(progressId, user.id);
```

---

#### `retryTask`
Retry a rejected/failed task.

**Signature**:
```typescript
async function retryTask(
  progressId: string,
  userId: string
): Promise<boolean>
```

**Parameters**:
- `progressId` (string, required): Task progress record UUID
- `userId` (string, required): User retrying

**Returns**: `true` if successful, `false` otherwise

**Workflow**: `rejected`/`revision_required` → `in_progress`

**Side Effects**:
- Resets status
- Assigns back to user
- Preserves previous submission data

**Example**:
```typescript
const success = await retryTask(progressId, user.id);
```

---

### Permission Functions

#### `checkTaskPermission`
Check if user can perform an action on a task.

**Signature**:
```typescript
async function checkTaskPermission(
  progressId: string,
  userId: string,
  action: 'start' | 'complete' | 'cancel' | 'reassign'
): Promise<{
  canManage: boolean;
  userRole: string;
  isAssignedUser: boolean;
}>
```

**Parameters**:
- `progressId` (string, required): Task progress record UUID
- `userId` (string, required): User to check
- `action` (string, required): Action to perform

**Returns**: Permission object with three properties

**Return Properties**:
- `canManage`: Boolean indicating if action is allowed
- `userRole`: User's role in the team
- `isAssignedUser`: Whether user is assigned to task

**RPC Used**: `user_can_manage_task`

**Example**:
```typescript
const permission = await checkTaskPermission(progressId, user.id, 'complete');
if (!permission.canManage) {
  alert('You do not have permission to complete this task');
  return;
}
```

---

### Utility Functions

#### `convertTeamTaskToTableItem`
Convert TeamTask to TaskTableItem for UI display.

**Signature**:
```typescript
function convertTeamTaskToTableItem(
  task: TeamTask
): TaskTableItem
```

**Parameters**:
- `task` (TeamTask, required): Task from database

**Returns**: `TaskTableItem` ready for table rendering

**Transformations**:
- Maps status values
- Converts difficulty level to label
- Formats dates
- Structures responsible user data

**Example**:
```typescript
const tasks = await getTeamTasks(teamId);
// Already returns TaskTableItem[], but for manual conversion:
const tableItem = convertTeamTaskToTableItem(rawTask);
```

---

## RPC Functions

### Database Remote Procedure Calls

#### `get_team_tasks_simple`
Fetch team tasks with all related data in one call.

**Parameters**:
```typescript
{
  p_team_id: string;  // Team UUID
}
```

**Returns**: Array of task records with joins

**Joins**:
- tasks (master)
- task_progress
- users (assignee)
- teams

**Usage**:
```typescript
const { data, error } = await supabase.rpc('get_team_tasks_simple', {
  p_team_id: teamId
});
```

---

#### `assign_user_to_task_simple`
Assign a user to a task.

**Parameters**:
```typescript
{
  p_progress_id: string;  // Task progress UUID
  p_user_id: string;      // User UUID
}
```

**Returns**: `{ success: boolean }`

**Logic**:
- Updates assigned_to_user_id
- Sets assigned_at timestamp
- Validates user is team member

**Usage**:
```typescript
const { data, error } = await supabase.rpc('assign_user_to_task_simple', {
  p_progress_id: progressId,
  p_user_id: userId
});
```

---

#### `update_task_status`
Update task status with optional submission data.

**Parameters**:
```typescript
{
  p_progress_id: string;       // Task progress UUID
  p_status: string;            // New status
  p_submission_data?: string;  // JSON string
  p_submission_notes?: string; // Notes
}
```

**Returns**: `{ success: boolean }`

**Valid Statuses**:
- not_started
- in_progress
- pending_review
- approved
- rejected
- revision_required
- cancelled

**Usage**:
```typescript
const { data, error } = await supabase.rpc('update_task_status', {
  p_progress_id: progressId,
  p_status: 'pending_review',
  p_submission_data: JSON.stringify(submissionData),
  p_submission_notes: 'Task complete'
});
```

---

#### `user_can_manage_task`
Check user permissions for task management.

**Parameters**:
```typescript
{
  p_progress_id: string;  // Task progress UUID
  p_user_id: string;      // User UUID
  p_action: string;       // Action to check
}
```

**Returns**: 
```typescript
{
  can_manage: boolean;
  user_role: string;
  is_assigned_user: boolean;
}
```

**Actions**:
- start
- complete
- cancel
- reassign

**Usage**:
```typescript
const { data, error } = await supabase.rpc('user_can_manage_task', {
  p_progress_id: progressId,
  p_user_id: userId,
  p_action: 'complete'
});
```

---

#### `reassign_task`
Reassign task to different user.

**Parameters**:
```typescript
{
  p_progress_id: string;         // Task progress UUID
  p_new_user_id: string;         // New assignee UUID
  p_reassigned_by_user_id: string; // User performing action
}
```

**Returns**: `{ success: boolean }`

**Validation**:
- Reassigner must be leader/founder
- New user must be team member
- Task must not be completed

**Usage**:
```typescript
const { data, error } = await supabase.rpc('reassign_task', {
  p_progress_id: progressId,
  p_new_user_id: newUserId,
  p_reassigned_by_user_id: currentUserId
});
```

---

#### `get_user_tasks_with_feedback`
Get user's tasks with peer review feedback.

**Parameters**:
```typescript
{
  p_user_id: string;  // User UUID
}
```

**Returns**: Array of task records with feedback

**Includes**:
- Task details
- Progress data
- Peer review feedback
- Reviewer information
- Team context

**Usage**:
```typescript
const { data, error } = await supabase.rpc('get_user_tasks_with_feedback', {
  p_user_id: userId
});
```

---

## Data Transformation

### Database to UI Transformations

#### Team Transformation
```typescript
DatabaseTeam → Product

// Fields mapped:
{
  id: team.id,
  name: team.name,
  description: team.description || '',
  status: team.status === 'active' ? 'Active' : 'Inactive',
  customers: {
    count: calculateCustomerCount(team),
    label: 'Active users'
  },
  revenue: {
    amount: sumRevenue(team.revenue_streams),
    label: 'Total Revenue'
  },
  points: {
    amount: sumTeamPoints(team.members),
    label: 'Points Earned'
  },
  avatar: team.avatar_url || '/default-avatar.jpg',
  teamMembers: team.members.map(transformMember)
}
```

#### Task Transformation
```typescript
TeamTask → TaskTableItem

// Status mapping:
approved → "Finished"
in_progress → "In Progress"
rejected → "Not Accepted"
pending_review → "Peer Review"
not_started → "Not Started"

// Difficulty mapping:
1-2 → "Easy"
3 → "Medium"
4-5 → "Hard"
```

#### Date Formatting
```typescript
// ISO strings to display format
new Date(isoString).toLocaleDateString('en-US', {
  month: '2-digit',
  day: '2-digit',
  year: 'numeric'
});

// For relative times
import { formatDistanceToNow } from 'date-fns';
formatDistanceToNow(new Date(date), { addSuffix: true });
```

---

## Error Handling

### Standard Error Patterns

#### Try-Catch Pattern
```typescript
async function functionName(...params) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase...;
    
    if (error) {
      console.error('Error message:', error);
      throw error; // or return default value
    }
    
    return data;
  } catch (error) {
    console.error('Error in functionName:', error);
    return defaultValue; // or rethrow
  }
}
```

#### Null Check Pattern
```typescript
const data = await fetchFunction();
if (!data) {
  console.warn('No data returned');
  return []; // or handle appropriately
}
// Use data
```

#### Permission Check Pattern
```typescript
const permission = await checkTaskPermission(id, userId, action);
if (!permission.canManage) {
  console.error('User does not have permission');
  return false;
}
// Proceed with action
```

### Error Types

#### Database Errors
```typescript
// Supabase errors have structure:
{
  message: string;
  details: string;
  hint: string;
  code: string;
}

// Common codes:
// '23505': Unique constraint violation
// '23503': Foreign key violation
// '42501': Insufficient privileges
```

#### Network Errors
```typescript
// Handle fetch failures
try {
  const response = await fetch(...);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
} catch (error) {
  if (error instanceof TypeError) {
    // Network error
  }
}
```

#### Validation Errors
```typescript
// Client-side validation before API call
if (!teamId || !userId) {
  throw new Error('Missing required parameters');
}

if (!/^[0-9a-f-]{36}$/.test(teamId)) {
  throw new Error('Invalid UUID format');
}
```

### Error Recovery

#### Optimistic Update Revert
```typescript
// Save original state
const originalState = [...state];

// Update optimistically
setState(newState);

try {
  await apiCall();
} catch (error) {
  // Revert on error
  setState(originalState);
  toast.error('Failed to update');
}
```

#### Retry Logic
```typescript
async function fetchWithRetry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// Usage
const data = await fetchWithRetry(() => getTeamDetails(id));
```

---

## Best Practices

### Performance
1. Use pagination for large lists
2. Implement debouncing for searches
3. Cache frequently accessed data
4. Use optimistic updates for better UX
5. Batch related queries when possible

### Security
1. Always check permissions before actions
2. Validate input on client and server
3. Use RLS policies for data access
4. Never trust client-side data
5. Sanitize user input before display

### Code Quality
1. Type all function parameters and returns
2. Handle errors gracefully
3. Log errors for debugging
4. Write descriptive error messages
5. Use consistent naming conventions

### Testing
1. Test happy path and error cases
2. Mock database calls in tests
3. Test permission checks
4. Validate data transformations
5. Test edge cases (empty arrays, null values)

---

**Last Updated**: 2025-11-21  
**Version**: 1.0  
**Status**: Complete
