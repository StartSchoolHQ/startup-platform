# Team Journey - Complete Functionality Analysis

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Core Concepts](#core-concepts)
4. [File Structure](#file-structure)
5. [Data Models](#data-models)
6. [Pages & Routes](#pages--routes)
7. [Components](#components)
8. [Database Schema](#database-schema)
9. [API Functions](#api-functions)
10. [Business Logic](#business-logic)
11. [User Workflows](#user-workflows)
12. [Features & Capabilities](#features--capabilities)
13. [Integration Points](#integration-points)
14. [Security & Permissions](#security--permissions)
15. [Future Enhancements](#future-enhancements)

---

## Executive Summary

The **Team Journey** module is a comprehensive team management and progress tracking system within the StartSchool Platform. It enables teams to collaborate on startup projects, track achievements, manage tasks, submit weekly reports, and monitor revenue streams in a gamified environment.

### Key Statistics
- **Pages**: 3 main pages (listing, detail, task detail)
- **Components**: 9 specialized components
- **Type Definitions**: 7 major interfaces
- **Database Functions**: 15+ helper functions
- **Features**: Team management, task tracking, achievements, weekly reports, strikes, client meetings

### Primary Users
- **Founders**: Create and manage teams
- **Team Members**: Collaborate on tasks and submit reports
- **Admins**: Monitor progress and validate achievements

---

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15.4.4 (App Router), React 19.1.0
- **UI Framework**: shadcn/ui, Radix UI, Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with SSR
- **State Management**: React Context API (AppContext)
- **Type Safety**: TypeScript with full database types

### Architecture Pattern
```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  Pages → Components → Hooks → Context → State               │
└───────────────────┬─────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────┐
│                    Application Layer                         │
│  /lib functions → Business Logic → Validation               │
└───────────────────┬─────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────┐
│                      Data Layer                              │
│  Supabase Client → Database → RPC Functions                 │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles
1. **Separation of Concerns**: UI components separate from business logic
2. **Type Safety**: Full TypeScript coverage with database-generated types
3. **Optimistic Updates**: Immediate UI feedback with server sync
4. **Progressive Enhancement**: Works without JavaScript, enhanced with it
5. **Mobile-First**: Responsive design for all screen sizes

---

## Core Concepts

### 1. Teams (Products)
- Teams represent startup projects/products
- Can have multiple members with different roles
- Track collective progress, achievements, and metrics
- Have statuses: `active` or `archived`

### 2. Achievements
- Predefined milestones/goals for teams to accomplish
- Contain multiple related tasks
- Track completion progress
- Award XP and credits upon completion

### 3. Tasks
- Individual work items within achievements
- Can be assigned to team members
- Track status through workflow: `not_started` → `in_progress` → `pending_review` → `approved`
- Award XP and points based on difficulty

### 4. Weekly Reports
- Required weekly submission from all team members
- Track productivity, meetings, and blockers
- Used to generate team strikes if missed
- Viewable by all team members

### 5. Strikes
- Penalties for missed weekly reports
- Automated tracking via scheduled functions
- Can be explained by team members
- Affect team standing

### 6. Client Meetings
- Track customer/client interactions
- Record meeting details and outcomes
- Contribute to weekly report metrics

---

## File Structure

### Directory Tree
```
src/
├── app/
│   └── dashboard/
│       ├── team-journey/
│       │   ├── page.tsx                 # Team listing page
│       │   ├── [id]/
│       │   │   └── page.tsx             # Team detail page
│       │   └── task/
│       │       └── [taskId]/
│       │           └── page.tsx         # Task detail page
│       └── my-journey/
│           └── page.tsx                 # User's personal journey
│
├── components/
│   └── team-journey/
│       ├── product-card.tsx             # Team card component
│       ├── tasks-table.tsx              # Task listing table
│       ├── weekly-reports-table.tsx     # Reports table
│       ├── strikes-table.tsx            # Strikes display
│       ├── client-meetings-table.tsx    # Meetings table
│       ├── team-management-modal.tsx    # Team settings
│       ├── add-client-meeting-modal.tsx # Meeting form
│       ├── add-meeting-modal.tsx        # Alt meeting form
│       └── avatar-stack.tsx             # Member avatars
│
├── lib/
│   ├── database.ts                      # Database queries
│   ├── tasks.ts                         # Task operations
│   └── weekly-reports.ts                # Report functions
│
├── types/
│   └── team-journey.ts                  # Type definitions
│
└── data/
    └── team-journey-data.ts             # Mock/seed data
```

### Key Files Analysis

#### `/src/app/dashboard/team-journey/page.tsx` (235 lines)
**Purpose**: Main team listing page with search, filter, and tabs
**Features**:
- Tabs: All Products, My Products, Archive
- Search and sort functionality
- Create new team dialog
- Real-time data loading
- Responsive grid layout

#### `/src/app/dashboard/team-journey/[id]/page.tsx` (1222 lines)
**Purpose**: Detailed team view with comprehensive management
**Features**:
- Team header with breadcrumbs
- Statistics cards (revenue, clients, achievements, points)
- Team & experience section
- Status & progress tracking
- 4 tabs: Achievements, Weekly Reports, Client Meetings, Strikes
- Task assignment and management
- Weekly report submission
- Client meeting tracking
- Strike management

#### `/src/types/team-journey.ts` (151 lines)
**Purpose**: TypeScript type definitions for the module
**Key Types**:
- `Product`: Team/product representation
- `TeamTask`: Task with team progress
- `TaskTableItem`: UI-ready task format
- `User`: User information
- Enums: `TaskStatus`, `TaskPriority`, `TaskCategory`

---

## Data Models

### Product (Team)
```typescript
interface Product {
  id: string;
  name: string;
  description: string;
  status: "Active" | "Inactive";
  customers: {
    count: number;
    label: string;
  };
  revenue: {
    amount: number;
    label: string;
  };
  points: {
    amount: number;
    label: string;
  };
  avatar: string;
  teamMembers: User[];
  category?: string;
}
```

### TeamTask
```typescript
interface TeamTask {
  // Progress record data
  progress_id: string;
  task_id: string;
  
  // Master task data
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  difficulty_level: number;
  base_xp_reward: number;
  
  // Team progress data
  status: TaskStatus;
  assigned_to_user_id?: string;
  assignee_name?: string;
  assignee_avatar_url?: string;
  assigned_at?: string;
  started_at?: string;
  completed_at?: string;
  
  // Metadata
  detailed_instructions?: string;
  tips_content?: Array<{title: string; content: string}>;
  peer_review_criteria?: Array<{category: string; points: string[]}>;
  learning_objectives?: string[];
  deliverables?: string[];
  resources?: Array<{title: string; type: string; url: string}>;
}
```

### TaskTableItem (UI Format)
```typescript
interface TaskTableItem {
  id: string;
  title: string;
  description: string;
  responsible?: {
    name: string;
    avatar: string;
    date: string;
  };
  difficulty: "Easy" | "Medium" | "Hard";
  xp: number;
  points: number;
  status: "Finished" | "In Progress" | "Not Accepted" | "Peer Review" | "Not Started";
  action: "complete" | "done";
  hasTips?: boolean;
  isAvailable?: boolean;
  // My Journey fields
  reviewFeedback?: string | null;
  reviewerName?: string | null;
  reviewerAvatarUrl?: string | null;
  teamName?: string;
  assignedAt?: string;
  completedAt?: string;
}
```

### Status Enums
```typescript
type TaskStatus = 
  | "not_started"
  | "in_progress"
  | "pending_review"
  | "approved"
  | "rejected"
  | "revision_required"
  | "cancelled";

type TaskPriority = "low" | "medium" | "high";

type TaskCategory = 
  | "onboarding"
  | "development"
  | "design"
  | "marketing"
  | "business"
  | "testing"
  | "deployment"
  | "milestone";
```

---

## Pages & Routes

### 1. Team Listing Page
**Route**: `/dashboard/team-journey`
**File**: `src/app/dashboard/team-journey/page.tsx`

**Features**:
- Three tabs with different team views:
  - **All Products**: All teams in the platform
  - **My Products**: Teams the user created or leads
  - **Archive**: Inactive/archived teams
- Search functionality with debouncing (300ms)
- Sort options: name, date, status, revenue
- "Add Product" button to create new teams
- Responsive grid layout (1-3 columns based on screen size)
- Loading states with skeletons

**State Management**:
- `allProducts`: All teams
- `myProducts`: User's teams
- `archivedProducts`: Archived teams
- `searchQuery`: Current search filter
- `sortBy`: Active sort criterion

**Data Flow**:
```
User Input → Debounce → Query Update → Database Fetch → Transform → Render
```

### 2. Team Detail Page
**Route**: `/dashboard/team-journey/[id]`
**File**: `src/app/dashboard/team-journey/[id]/page.tsx`

**Sections**:

#### A. Header Section
- Team name and description
- Status badges (Active/Archived, View Only, Role)
- Action buttons (Website, Submit Weekly Report)
- Breadcrumb navigation

#### B. Stats Cards (4 cards)
- Total Revenue
- Clients count
- Achievements progress
- Points earned

#### C. Team & Experience Card
- Team size display
- Total experience earned
- Team member list (up to 4 visible)
- Each member shows: Avatar, Name, XP, Points
- "Modify Team" button (for leaders/founders)

#### D. Status & Progress Card
- Date created
- Strikes count with visual indicators (5 dots)
- Total points earned
- Total points invested
- Weekly report status (member avatars with submission indicators)

#### E. Tabs Section (4 tabs)

**Tab 1: Achievements**
- Achievement cards grid
- Click to filter tasks by achievement
- Tasks table with:
  - Task details
  - Assigned member
  - Difficulty, XP, Points
  - Status badge
  - Action button
  - Assignment dropdown (for leaders)

**Tab 2: Weekly Reports**
- This week progress stats (4 cards)
- Weekly reports table showing:
  - Week number and date range
  - Team member submission status
  - Clients contacted
  - Meetings held
  - Completion status

**Tab 3: Client Meetings**
- Add meeting button
- Meetings table with client interaction details

**Tab 4: Strikes**
- Strikes table showing:
  - Strike title/reason
  - Date and time
  - Status (explained/waiting explanation)
  - XP/Points penalties
  - Action button (explain)

**Modals**:
- Team Management Modal
- Weekly Report Modal
- Add Client Meeting Modal

### 3. Task Detail Page
**Route**: `/dashboard/team-journey/task/[taskId]`
**File**: `src/app/dashboard/team-journey/task/[taskId]/page.tsx`

**Purpose**: Detailed view of a single task with submission capability

**Expected Sections** (based on architecture):
- Task header with title and description
- Detailed instructions
- Tips and resources
- Learning objectives
- Deliverables checklist
- Submission form
- Peer review criteria
- Status history

### 4. My Journey Page
**Route**: `/dashboard/my-journey`
**File**: `src/app/dashboard/my-journey/page.tsx`

**Purpose**: Personal view of user's assigned tasks across all teams
**Features**:
- All tasks assigned to the user
- Filter and sort capabilities
- Status tracking
- Peer review feedback display
- Quick actions (start, complete, retry)

---

## Components

### 1. ProductCard
**File**: `src/components/team-journey/product-card.tsx`
**Purpose**: Display team summary in card format

**Props**:
```typescript
interface ProductCardProps {
  product: Product;
}
```

**Layout**:
```
┌─────────────────────────────────┐
│ [Name]             [Status]     │
│ Description                     │
├─────────────────────────────────┤
│ 👥 Clients: X                   │
│ 💵 Revenue: $X                  │
│ 🏆 Points: X                    │
├─────────────────────────────────┤
│ [Avatars] [View Product Button] │
└─────────────────────────────────┘
```

**Features**:
- Status badge (Active/Inactive)
- Three metric rows with icons
- Avatar stack for team members
- Clickable "View Product" button
- Hover effects

### 2. TasksTable
**File**: `src/components/team-journey/tasks-table.tsx`
**Purpose**: Display and manage team tasks in table format

**Props**:
```typescript
interface TasksTableProps {
  tasks: TaskTableItem[];
  isTeamMember?: boolean;
  teamMembers?: Array<{id: string; name: string; avatar: string}>;
  onAssignTask?: (taskId: string, userId: string) => void;
}
```

**Columns**:
1. Task (icon, title, description)
2. Responsible (avatar, name, date)
3. Difficulty (Easy/Medium/Hard badge)
4. XP (experience points)
5. Points (credits)
6. Status (colored badge)
7. Action (button or dropdown)

**Features**:
- Row click navigation to task detail
- Inline assignment dropdown (for leaders)
- Status badges with colors
- Difficulty badges
- Responsive overflow handling
- Empty state support

### 3. WeeklyReportsTable
**File**: `src/components/team-journey/weekly-reports-table.tsx`
**Purpose**: Display team's weekly report submissions

**Props**:
```typescript
interface WeeklyReportsTableProps {
  reports: WeeklyReport[];
}
```

**Columns**:
1. Week (number and date range)
2. Weekly Fill (avatars of submitters)
3. Clients (total contacted)
4. Meetings (total held)
5. Status (complete/missed badge)
6. Action (view details)

**Features**:
- Avatar tooltips with names
- Color-coded status
- Expandable rows for details
- Sort by week

### 4. StrikesTable
**File**: `src/components/team-journey/strikes-table.tsx`
**Purpose**: Display and manage team strikes

**Props**:
```typescript
interface StrikesTableProps {
  strikes: Strike[];
  isTeamMember?: boolean;
}
```

**Columns**:
1. Title (strike reason)
2. Date & Time
3. Status (explained/waiting explanation)
4. XP Penalty
5. Points Penalty
6. Action (explain/view)

**Features**:
- Conditional actions based on membership
- Status badges
- Penalty display
- Explanation modal

### 5. ClientMeetingsTable
**File**: `src/components/team-journey/client-meetings-table.tsx`
**Purpose**: Track and display client meetings

**Expected Features**:
- Meeting date and time
- Client name
- Meeting type
- Outcome/notes
- Action buttons (edit/delete for owner)

### 6. TeamManagementModal
**File**: `src/components/team-journey/team-management-modal.tsx`
**Purpose**: Manage team settings and members

**Sections**:
- Team information (name, description)
- Member list with roles
- Add/remove members
- Change member roles
- Archive team option

**Permissions**:
- Only founders/co-founders/leaders can access
- Role-based action restrictions

### 7. AvatarStack
**File**: `src/components/team-journey/avatar-stack.tsx`
**Purpose**: Display multiple user avatars in a compact stack

**Props**:
```typescript
interface AvatarStackProps {
  users: User[];
  maxVisible?: number;
  size?: "sm" | "md" | "lg";
}
```

**Features**:
- Overlapping avatars
- "+X more" indicator
- Tooltip on hover
- Configurable size
- Responsive behavior

### 8. AddClientMeetingModal
**File**: `src/components/team-journey/add-client-meeting-modal.tsx`
**Purpose**: Form to log new client meetings

**Form Fields**:
- Client name
- Meeting date/time
- Meeting type
- Duration
- Outcome
- Notes

### 9. AddMeetingModal
**File**: `src/components/team-journey/add-meeting-modal.tsx`
**Purpose**: Alternative meeting form (possibly simplified)

---

## Database Schema

### Core Tables

#### teams
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  founder_id UUID REFERENCES users(id),
  strikes_count INTEGER DEFAULT 0,
  member_count INTEGER
);
```

#### team_members
```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  team_role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP,
  UNIQUE(team_id, user_id)
);
```

#### tasks (Master Task Table)
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  priority VARCHAR(20),
  difficulty_level INTEGER,
  base_xp_reward INTEGER,
  base_credits_reward INTEGER,
  detailed_instructions TEXT,
  tips_content JSONB,
  peer_review_criteria JSONB,
  learning_objectives JSONB,
  deliverables JSONB,
  resources JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### task_progress (Team Task Progress)
```sql
CREATE TABLE task_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id),
  team_id UUID REFERENCES teams(id),
  assigned_to_user_id UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'not_started',
  context VARCHAR(20), -- 'individual' or 'team'
  assigned_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  submission_data JSONB,
  submission_notes TEXT,
  reviewer_user_id UUID REFERENCES users(id),
  is_available BOOLEAN DEFAULT TRUE
);
```

#### achievements
```sql
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  xp_reward INTEGER,
  credits_reward INTEGER,
  category VARCHAR(50),
  level INTEGER,
  icon VARCHAR(255),
  requirements JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### team_achievements
```sql
CREATE TABLE team_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id),
  status VARCHAR(50) DEFAULT 'in_progress',
  progress_percentage DECIMAL(5,2),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, achievement_id)
);
```

#### weekly_reports
```sql
CREATE TABLE weekly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  team_id UUID REFERENCES teams(id),
  week_number INTEGER,
  week_year INTEGER,
  week_start_date DATE,
  week_end_date DATE,
  submission_data JSONB,
  submitted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, team_id, week_number, week_year)
);
```

#### strikes
```sql
CREATE TABLE strikes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  reason TEXT,
  strike_date DATE,
  explanation TEXT,
  xp_penalty INTEGER DEFAULT 0,
  credits_penalty INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### client_meetings
```sql
CREATE TABLE client_meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  client_name VARCHAR(255),
  meeting_date TIMESTAMP,
  meeting_type VARCHAR(100),
  duration INTEGER,
  outcome TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### users (relevant fields)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url VARCHAR(500),
  total_xp INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  graduation_level INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Key Relationships

```
teams (1) ←→ (N) team_members ←→ (1) users
teams (1) ←→ (N) task_progress ←→ (1) tasks
teams (1) ←→ (N) team_achievements ←→ (1) achievements
teams (1) ←→ (N) weekly_reports ←→ (1) users
teams (1) ←→ (N) strikes
teams (1) ←→ (N) client_meetings ←→ (1) users
```

---

## API Functions

### Database Query Functions (`/src/lib/database.ts`)

#### Team Functions

```typescript
// Get all teams with optional filters
async function getAllTeamsForJourney(
  userId: string,
  options?: {
    searchQuery?: string;
    sortBy?: 'name' | 'date' | 'status' | 'revenue';
    sortOrder?: 'asc' | 'desc';
    status?: 'all' | 'active' | 'archived';
  }
): Promise<DatabaseTeam[]>

// Get teams where user is a member
async function getUserTeamsForJourney(
  userId: string,
  options?: QueryOptions
): Promise<DatabaseTeam[]>

// Get archived teams
async function getArchivedTeamsForJourney(
  userId: string,
  options?: Omit<QueryOptions, 'status'>
): Promise<DatabaseTeam[]>

// Get detailed team information
async function getTeamDetails(
  teamId: string
): Promise<DatabaseTeam>

// Check if user is team member
async function isUserTeamMember(
  teamId: string,
  userId: string
): Promise<boolean>

// Get user's role in team
async function getUserTeamRole(
  teamId: string,
  userId: string
): Promise<string | null>

// Transform database team to Product format
function transformTeamToProduct(
  team: DatabaseTeam
): Product
```

#### Achievement Functions

```typescript
// Get team achievements with progress
async function getTeamAchievements(
  teamId: string
): Promise<Achievement[]>

// Get tasks by achievement
async function getTasksByAchievement(
  achievementId?: string,
  teamId?: string
): Promise<TaskWithAchievement[]>
```

#### Strike Functions

```typescript
// Get team strikes
async function getTeamStrikes(
  teamId: string
): Promise<Strike[]>
```

#### Weekly Report Functions

```typescript
// Get team's weekly reports
async function getTeamWeeklyReports(
  teamId: string
): Promise<WeeklyReport[]>

// Check if user submitted this week
async function hasUserSubmittedThisWeek(
  userId: string,
  teamId: string
): Promise<boolean>
```

### Task Functions (`/src/lib/tasks.ts`)

```typescript
// Get team tasks (simplified architecture)
async function getTeamTasks(
  teamId: string
): Promise<TaskTableItem[]>

// Assign task to team member
async function assignTaskToMember(
  progressId: string,
  userId: string
): Promise<boolean>

// Get user's tasks across all teams
async function getUserTasks(
  userId: string
): Promise<TaskTableItem[]>

// Get task by progress ID
async function getTaskById(
  progressId: string
): Promise<TeamTask | null>

// Check task permissions
async function checkTaskPermission(
  progressId: string,
  userId: string,
  action: 'start' | 'complete' | 'cancel' | 'reassign'
): Promise<{
  canManage: boolean;
  userRole: string;
  isAssignedUser: boolean;
}>

// Task workflow functions
async function startTask(progressId: string, userId: string): Promise<boolean>
async function completeTask(progressId: string, submissionData: object): Promise<boolean>
async function cancelTask(progressId: string, userId: string): Promise<boolean>
async function retryTask(progressId: string, userId: string): Promise<boolean>
async function reassignTask(progressId: string, newUserId: string, reassignedBy: string): Promise<boolean>

// Convert database format to UI format
function convertTeamTaskToTableItem(
  task: TeamTask
): TaskTableItem
```

### Database RPC Functions

These are PostgreSQL functions called from the client:

```typescript
// Task management
rpc('get_team_tasks_simple', {p_team_id: string})
rpc('assign_user_to_task_simple', {p_progress_id: string, p_user_id: string})
rpc('update_task_status', {p_progress_id: string, p_status: string})
rpc('user_can_manage_task', {p_progress_id: string, p_user_id: string, p_action: string})
rpc('reassign_task', {p_progress_id: string, p_new_user_id: string})

// User data
rpc('get_user_tasks_with_feedback', {p_user_id: string})

// Weekly reports
rpc('check_missed_weekly_reports')
rpc('get_team_strikes', {p_team_id: string})
rpc('update_team_strikes_count', {p_team_id: string})
```

---

## Business Logic

### Points & XP System

As documented in `/hierarchy.md`:

**Rules**:
1. User Total = Individual + Team (separately for Points and XP)
2. Team Total = SUM(User Totals) of its members
3. When transferring teams: Old team loses, new team gains user's total

**Example**:
```
User 1:
  Individual: 120 points, 450 XP
  Team: 200 points, 380 XP
  Total: 320 points, 830 XP

Team Total = Sum of all member totals
```

### Task Workflow

```
not_started → in_progress → pending_review → approved
                    ↓              ↓              ↓
                cancelled    rejected      completed
                              ↓
                        revision_required → in_progress
```

**State Transitions**:
- `not_started` → `in_progress`: User accepts/starts task
- `in_progress` → `pending_review`: User submits task
- `pending_review` → `approved`: Peer reviewer approves
- `pending_review` → `rejected`: Peer reviewer rejects
- `pending_review` → `revision_required`: Needs changes
- `revision_required` → `in_progress`: User resubmits
- Any → `cancelled`: Leader cancels task

### Weekly Report System

**Requirements**:
- Every team member must submit weekly
- Submission window: Monday-Sunday
- Tracks: work done, blockers, achievements, clients, meetings

**Strike Generation**:
- Automated via `weekly-strikes-automation` Edge Function
- Runs every Monday at 9:00 AM UTC via pg_cron
- Checks previous week's submissions
- Generates strike if team member missed report

**Process Flow**:
```
Monday 9:00 AM UTC
    ↓
Check previous week (Week N-1)
    ↓
For each team:
    ↓
    Count expected submissions (active members)
    ↓
    Count actual submissions
    ↓
    If actual < expected:
        ↓
        Generate strike
        ↓
        Update team.strikes_count
```

### Achievement System

**Structure**:
- Achievements contain multiple tasks
- Progress tracked as: completed_tasks / total_tasks
- Team gets achievement rewards when all tasks approved
- Rewards divided among team members

**Example**:
```
Achievement: "Launch MVP"
├── Task 1: Create landing page (50 XP, 100 points)
├── Task 2: Set up hosting (30 XP, 50 points)
├── Task 3: Deploy application (70 XP, 150 points)
└── Total Reward: 150 XP, 300 points

Team of 3 members:
Each member gets: 50 XP, 100 points
```

### Permission System

**Team Roles**:
- `founder`: Full control, can delete team
- `co_founder`: Nearly full control, can't delete team
- `leader`: Can manage tasks and members
- `member`: Can complete assigned tasks

**Task Permissions**:
- `start`: Members can start unassigned tasks
- `complete`: Only assigned user can submit
- `cancel`: Leaders and founders only
- `reassign`: Leaders and founders only

**Access Control**:
```typescript
if (userRole === 'founder' || userRole === 'co_founder' || userRole === 'leader') {
  // Can modify team
  // Can assign tasks
  // Can manage members
}

if (isAssignedUser) {
  // Can start task
  // Can submit task
  // Can update progress
}
```

---

## User Workflows

### Workflow 1: Creating a Team

```
1. User navigates to /dashboard/team-journey
2. Clicks "Add Product" button
3. CreateTeamDialog opens
4. User fills in:
   - Team name
   - Description
   - (Optional) Team members
5. Clicks "Create"
6. Team created in database
7. User becomes founder
8. Redirected to team detail page
```

### Workflow 2: Viewing Team Details

```
1. User on team listing page
2. Clicks "View Product" on ProductCard
3. Navigates to /dashboard/team-journey/[id]
4. System checks:
   - Is user a team member?
   - What's user's role?
5. Page loads with appropriate permissions:
   - If member: Can submit reports, view data
   - If leader: + Can assign tasks, manage team
   - If view-only: Read-only access
6. User sees:
   - Team stats
   - Member list
   - Achievements progress
   - Tasks table
   - Reports, meetings, strikes
```

### Workflow 3: Assigning a Task

```
1. Leader on team detail page, Achievements tab
2. Sees tasks in table
3. Clicks assignment dropdown on task row
4. Selects team member from list
5. optimistic UI update (immediate feedback)
6. API call: assignTaskToMember()
7. Database updates task_progress:
   - assigned_to_user_id = selected_member
   - assigned_at = NOW()
8. If success: UI stays updated
9. If failure: Revert UI, show error
```

### Workflow 4: Completing a Task

```
1. User on My Journey page
2. Sees assigned task
3. Clicks "View Task" or "Complete"
4. Task detail page opens
5. User reviews:
   - Instructions
   - Tips
   - Deliverables
6. Clicks "Start Task" (if not started)
   - Status: not_started → in_progress
7. User completes work
8. Clicks "Submit Task"
9. Submission form opens:
   - Upload files
   - Add notes
   - Answer questions
10. User submits
11. Status: in_progress → pending_review
12. Peer reviewer gets notification
13. Reviewer approves/rejects
14. If approved:
    - Status → approved
    - XP and points awarded
    - Achievement progress updated
```

### Workflow 5: Submitting Weekly Report

```
1. User on team detail page
2. Checks if already submitted this week
3. If not, "Submit Weekly Report" button active
4. User clicks button
5. WeeklyReportModal opens
6. User fills form:
   - What did you do this week?
   - What were your blockers?
   - What was your biggest achievement?
   - Clients contacted (number)
   - Meetings held (number)
7. User submits
8. Database insert into weekly_reports
9. Button changes to "Report Submitted" (disabled)
10. Team member avatar gets green indicator
11. Weekly reports table updates
```

### Workflow 6: Viewing and Explaining Strikes

```
1. User on team detail page, Strikes tab
2. Sees list of strikes
3. Each strike shows:
   - Reason (e.g., "Missed weekly report")
   - Date
   - Status (explained/waiting)
4. If waiting explanation:
   - User clicks "Explain" button
   - Modal opens with text area
   - User writes explanation
   - Submits
   - Status changes to "explained"
5. Strike remains on record but explained
```

---

## Features & Capabilities

### Core Features

#### 1. Team Management
- ✅ Create new teams
- ✅ Edit team details
- ✅ Add/remove members
- ✅ Assign member roles
- ✅ Archive teams
- ✅ View team statistics
- ✅ Track team progress

#### 2. Task Management
- ✅ View team tasks
- ✅ Assign tasks to members
- ✅ Track task status
- ✅ Submit task deliverables
- ✅ Peer review system
- ✅ Task reassignment
- ✅ Task cancellation
- ✅ Difficulty-based rewards

#### 3. Achievement System
- ✅ View achievements
- ✅ Track progress (X/Y tasks)
- ✅ Filter tasks by achievement
- ✅ Visual progress indicators
- ✅ Rewards on completion
- ✅ Team vs individual achievements

#### 4. Weekly Reports
- ✅ Submit weekly reports
- ✅ View submission status
- ✅ Team-wide tracking
- ✅ Metrics (clients, meetings)
- ✅ Historical data
- ✅ Automated strike generation

#### 5. Strikes System
- ✅ Automated strike detection
- ✅ Strike display with details
- ✅ Explanation capability
- ✅ Penalty tracking
- ✅ Visual strike indicators (5 dots)
- ✅ Historical strikes view

#### 6. Client Meetings
- ✅ Log client meetings
- ✅ View meeting history
- ✅ Edit/delete meetings
- ✅ Meeting metrics
- ✅ Integration with weekly reports

#### 7. Search & Filter
- ✅ Search teams by name
- ✅ Filter by status (active/archived)
- ✅ Sort by multiple criteria
- ✅ Tab-based organization
- ✅ Real-time updates

#### 8. User Experience
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Loading states
- ✅ Optimistic updates
- ✅ Error handling
- ✅ Toast notifications
- ✅ Breadcrumb navigation
- ✅ Tooltips and help text
- ✅ Empty states

#### 9. Gamification
- ✅ XP system
- ✅ Points/Credits system
- ✅ Difficulty badges
- ✅ Status badges
- ✅ Progress indicators
- ✅ Achievement badges
- ✅ Leaderboard (implied)

### Advanced Features

#### 10. Automation
- ✅ Scheduled weekly report checks
- ✅ Automatic strike generation
- ✅ pg_cron integration
- ✅ Edge Functions for serverless tasks

#### 11. Analytics
- ✅ Team statistics
- ✅ Individual metrics
- ✅ Revenue tracking
- ✅ Client acquisition metrics
- ✅ Productivity metrics

#### 12. Collaboration
- ✅ Team chat (implied)
- ✅ Peer reviews
- ✅ Task comments (structure exists)
- ✅ Member mentions (implied)

---

## Integration Points

### Authentication Integration
```typescript
// AppContext provides user data
const { user } = useAppContext();

// Protected routes via middleware
// Checks authentication before rendering pages
```

### Database Integration
```typescript
// Supabase client for all queries
import { createClient } from "@/lib/supabase/client";

// Example query
const supabase = createClient();
const { data, error } = await supabase
  .from('teams')
  .select('*')
  .eq('id', teamId);
```

### File Upload Integration
```typescript
// File upload for avatars, task submissions
import { uploadFile } from "@/lib/file-upload";

const url = await uploadFile(file, 'avatars');
```

### Real-time Integration
```typescript
// Supabase real-time subscriptions (potential)
supabase
  .channel('team_updates')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'tasks' },
    payload => {
      // Handle new task
    }
  )
  .subscribe();
```

### Email Notifications
```typescript
// Edge Functions can send emails
// Triggered by database events
// Examples:
// - Task assigned
// - Weekly report reminder
// - Strike notification
// - Achievement unlocked
```

### Analytics Integration
```typescript
// Track user actions
// Possible integrations:
// - Google Analytics
// - Mixpanel
// - PostHog
// - Custom analytics
```

---

## Security & Permissions

### Row Level Security (RLS)

**Teams Table**:
```sql
-- Users can view teams they're members of
CREATE POLICY "Users can view their teams"
ON teams FOR SELECT
USING (
  id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
);

-- Only founders can delete teams
CREATE POLICY "Only founders can delete teams"
ON teams FOR DELETE
USING (
  founder_id = auth.uid()
);
```

**Task Progress Table**:
```sql
-- Users can view tasks for their teams
CREATE POLICY "Users can view team tasks"
ON task_progress FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
);

-- Users can update assigned tasks
CREATE POLICY "Users can update assigned tasks"
ON task_progress FOR UPDATE
USING (
  assigned_to_user_id = auth.uid() OR
  team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid() 
    AND team_role IN ('founder', 'co_founder', 'leader')
  )
);
```

**Weekly Reports Table**:
```sql
-- Users can insert their own reports
CREATE POLICY "Users can insert own reports"
ON weekly_reports FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
);

-- Users can view reports for their teams
CREATE POLICY "Users can view team reports"
ON weekly_reports FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
);
```

### Input Validation

**Client-side**:
```typescript
// Form validation using Zod or similar
const teamSchema = z.object({
  name: z.string().min(3).max(255),
  description: z.string().max(1000).optional(),
});
```

**Server-side**:
```sql
-- Database constraints
ALTER TABLE teams
ADD CONSTRAINT check_name_length 
CHECK (length(name) >= 3 AND length(name) <= 255);
```

### XSS Prevention
```typescript
// All user input sanitized
// React automatically escapes HTML
// For rich text, use DOMPurify

import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput);
```

### CSRF Protection
```typescript
// Supabase handles CSRF tokens
// Next.js server actions have built-in protection
```

### Authorization Checks

**Permission Helper**:
```typescript
async function checkTaskPermission(
  progressId: string,
  userId: string,
  action: 'start' | 'complete' | 'cancel' | 'reassign'
): Promise<{canManage: boolean; userRole: string}> {
  // Query database for user role
  // Check action against role permissions
  // Return authorization result
}
```

**Usage**:
```typescript
const permission = await checkTaskPermission(taskId, userId, 'complete');
if (!permission.canManage) {
  throw new Error('Unauthorized');
}
```

---

## Future Enhancements

### Planned Features

#### High Priority
1. **Real-time Notifications**
   - Task assignments
   - Peer review requests
   - Weekly report reminders
   - Achievement unlocks
   - Strike alerts

2. **Email Notifications**
   - Weekly report reminder emails
   - Strike notification emails
   - Task deadline reminders
   - Achievement celebration emails

3. **Advanced Analytics Dashboard**
   - Team performance charts
   - Individual contribution graphs
   - Revenue trend analysis
   - Task completion rates
   - Time tracking

4. **Mobile App**
   - React Native companion app
   - Push notifications
   - Offline support
   - Camera for task submissions

#### Medium Priority
5. **Integration with External Tools**
   - GitHub integration for code tasks
   - Figma integration for design tasks
   - Slack notifications
   - Google Calendar sync
   - Stripe for revenue verification

6. **Enhanced Peer Review**
   - Multi-reviewer system
   - Review templates
   - Rating system
   - Review comments
   - Revision tracking

7. **Mentorship System**
   - Mentor assignment
   - Office hours scheduling
   - One-on-one tracking
   - Feedback system

8. **Resource Library**
   - Curated learning resources
   - Video tutorials
   - Template downloads
   - Best practices guides
   - Case studies

#### Low Priority
9. **Social Features**
   - Team chat
   - Activity feed
   - Celebration posts
   - Team photos
   - Member profiles

10. **Customization**
    - Custom achievement creation
    - Custom task templates
    - Branded team pages
    - Custom reward tiers
    - Flexible workflow states

### Technical Improvements

#### Performance
- Implement React Server Components where possible
- Add query result caching
- Optimize database queries with indexes
- Implement pagination for large datasets
- Add image optimization
- Use code splitting for large components

#### Developer Experience
- Add comprehensive unit tests
- Add E2E tests with Playwright
- Improve error logging
- Add performance monitoring
- Create component documentation
- Add Storybook for component library

#### Infrastructure
- Set up CI/CD pipelines
- Add automated database backups
- Implement blue-green deployments
- Add health check endpoints
- Set up error tracking (Sentry)
- Add performance monitoring (New Relic)

---

## Appendix

### Glossary

- **Product**: Synonym for team/startup project
- **Journey**: User's or team's progress through tasks and achievements
- **Strike**: Penalty for missed obligations (e.g., weekly reports)
- **XP**: Experience points, gamification metric
- **Credits/Points**: Currency for platform rewards
- **Founder**: Team creator with full permissions
- **Co-founder**: Second-level leadership role
- **Leader**: Team manager with task assignment permissions
- **Member**: Regular team participant

### Quick Reference

**Key URLs**:
- Team Listing: `/dashboard/team-journey`
- Team Detail: `/dashboard/team-journey/[id]`
- Task Detail: `/dashboard/team-journey/task/[taskId]`
- My Journey: `/dashboard/my-journey`

**Key Components**:
- `ProductCard`: Team summary card
- `TasksTable`: Task management table
- `WeeklyReportsTable`: Report tracking
- `StrikesTable`: Penalty display
- `TeamManagementModal`: Team settings

**Key Functions**:
- `getAllTeamsForJourney()`: Fetch all teams
- `getTeamDetails()`: Get team info
- `assignTaskToMember()`: Assign task
- `hasUserSubmittedThisWeek()`: Check report status
- `getTeamStrikes()`: Get penalties

### Common Patterns

**Data Fetching Pattern**:
```typescript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchFunction();
      setData(result);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  loadData();
}, [dependencies]);
```

**Optimistic Update Pattern**:
```typescript
const handleUpdate = async (id, newData) => {
  // Update UI immediately
  setData(prev => prev.map(item => 
    item.id === id ? {...item, ...newData} : item
  ));
  
  try {
    // Make API call
    await updateFunction(id, newData);
  } catch (error) {
    // Revert on error
    await loadData();
  }
};
```

**Permission Check Pattern**:
```typescript
if (userRole === 'founder' || userRole === 'co_founder' || userRole === 'leader') {
  // Show management UI
}

if (isTeamMember) {
  // Show member actions
} else {
  // Show view-only message
}
```

---

## Conclusion

The Team Journey module is a sophisticated, well-architected system for managing startup teams within the StartSchool Platform. It combines gamification, collaboration tools, and progress tracking into a cohesive experience.

**Strengths**:
- Clear separation of concerns
- Type-safe implementation
- Comprehensive permission system
- Scalable architecture
- User-friendly interface
- Automated workflows

**Areas for Improvement**:
- Add comprehensive testing
- Implement real-time features
- Enhance mobile experience
- Add more analytics
- Improve documentation
- Add monitoring and alerting

This analysis provides a complete understanding of the team-journey functionality, enabling developers to maintain, extend, and improve the system effectively.

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-21  
**Author**: GitHub Copilot Analysis  
**Status**: Complete
