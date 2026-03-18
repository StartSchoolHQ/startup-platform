# Dashboard System

> The Dashboard is the central hub of the StartSchool Platform, providing users with personalized views of their progress, team activities, tasks, and achievements. Built with Next.js 16, React 19, TypeScript, Tailwind CSS, and Supabase, the dashboard uses a server/client hybrid architecture with React Query for state management and PostHog for analytics.

## Overview

The Dashboard serves two distinct audiences:

1. **Students** — Track personal progress, manage tasks, view team journey, participate in peer reviews, and check leaderboard rankings
2. **Admins** — Monitor platform health, manage users/teams/tasks, review peer submissions, track student progress, and view audit logs

The dashboard lives at `/dashboard` and all sub-routes are protected — unauthenticated users are redirected to `/login`.

---

## Architecture

### Component Hierarchy

```
Server Layout (layout.tsx)
  └─ DashboardLayoutWrapper (client)
       └─ ErrorBoundary
            └─ AppProvider (global state + PostHog)
                 └─ DashboardLayoutClient
                      ├─ SidebarProvider
                      │   ├─ AppSidebar (nav + logo)
                      │   └─ SidebarInset
                      │       ├─ Header (breadcrumb + sidebar trigger)
                      │       ├─ WeeklyReportBanner (conditional)
                      │       └─ Content Area (page children)
                      └─ ...
```

### Key Files

| Layer | File | Role |
|-------|------|------|
| Server Layout | `src/app/dashboard/layout.tsx` | Auth check, redirects unauthenticated users |
| Client Wrapper | `src/app/dashboard/dashboard-layout-wrapper.tsx` | ErrorBoundary + AppProvider bridge |
| Layout Client | `src/components/dashboard-layout-client.tsx` | Sidebar + header + content layout |
| App Context | `src/contexts/app-context.tsx` | Global user state, PostHog identification |
| Sidebar | `src/components/app-sidebar.tsx` | Navigation items, notifications, user menu |

### Data Loading Strategy

The dashboard uses a hybrid approach:
- **Server Components** — Auth checks, initial data for leaderboard (ISR with 60s revalidation)
- **Client Components** — Interactive pages using React Query for data fetching
- **Optimistic Updates** — Task actions, invitation responses

---

## Layout & Navigation

### AppSidebar Component

**File:** `src/components/app-sidebar.tsx`

```
Sidebar (inset variant)
├─ SidebarHeader
│  └─ Logo + NotificationCenter
├─ SidebarContent
│  └─ NavMain (navigation items)
└─ SidebarFooter
   └─ NavUser (profile dropdown)
```

### Navigation Items

| Title | Route | Icon | Visibility |
|-------|-------|------|------------|
| Overview | `/dashboard` | BarChart3 | All users |
| Leaderboard | `/dashboard/leaderboard` | Trophy | All users |
| My Journey | `/dashboard/my-journey` | User | Hidden (flag) |
| All Products | `/dashboard/team-journey` | Users | All users |
| `{teamName} Team` | `/dashboard/team-journey/{teamId}` | Users | Dynamic (fetched) |
| Peer Review | `/dashboard/peer-review` | FileText | All users |
| Support | `/dashboard/support` | HelpCircle | All users |
| Admin | `/dashboard/admin` | Settings | Admin only |

The team link is dynamically inserted after "Leaderboard" by fetching the user's first active team via React Query (`["userTeamNav", user?.id]`).

### NavUser Dropdown

**File:** `src/components/nav-user.tsx`

| Item | Route | Notes |
|------|-------|-------|
| Account Settings | `/dashboard/account` | |
| Invitations | `/dashboard/invitations` | Badge with pending count |
| Transaction History | `/dashboard/transaction-history` | |
| Log out | `/login` | Clears session + React Query cache |

Features: Avatar with initials fallback, PostHog event on logout, `queryClient.clear()` on sign out.

### NavMain Component

**File:** `src/components/nav-main.tsx`

- Memoized with `React.memo()`
- Active route detection via `usePathname()`
- Framer Motion hover animations
- Radix Collapsible for sub-items

---

## Global App State (AppContext)

**File:** `src/contexts/app-context.tsx`

### Interface

```typescript
interface AppContextType {
  user: User | null;
  loading: boolean;
  firstName: string;
  refreshUserData: () => void;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  primary_role: string | null;      // "admin" | "student" | null
  total_xp: number | null;
  total_points: number | null;
  graduation_level: number | null;
  created_at: string | null;
}
```

### Implementation Details

- **React Query Config:** `staleTime: 5min`, `gcTime: 10min`, enabled after client mount
- **Query Key:** `["user", "profile"]`
- **PostHog:** Auto-identifies users with email, name, role, XP, points, graduation level
- **Hooks:** `useApp()` or `useAppContext()` — safe defaults during SSR
- **Data Source:** Joins Supabase Auth user with custom `users` table
- Handles new users gracefully (PGRST116 error code)

---

## Main Dashboard Page

**File:** `src/app/dashboard/page.tsx`
**Route:** `/dashboard`
**Type:** Client Component

### Content Sections

1. **Header Greeting** — "Hi {firstName} 👋" with subtitle
2. **Stats Cards** (4-column grid, responsive)
   - XP Balance (Zap icon)
   - Points Balance (CreditCard icon)
   - Team Tasks Completed
   - Achievements Completed
   - Fetched via `getStatsCards(user.id)`, query key: `["dashboard", "stats", userId]`
   - Spring animation with stagger delay
3. **Team Progress Card**
   - Member count, tasks completed, total points, total XP
   - Fetched via `getTeamProgressData(user.id)`, query key: `["dashboard", "teamProgress", userId]`
   - Action button to browse/join teams
4. **Personal Progress Card** — Currently disabled (TODO toggle in code)
5. **Weekly Report Banner** — Shows for teams with unsubmitted reports (Friday–Monday 10:00 Riga time)

---

## Student-Facing Pages

### My Journey (`/dashboard/my-journey`)

**File:** `src/app/dashboard/my-journey/page.tsx`

- **Profile Header:** Name, status badge, "Submit Weekly Report" button
- **Stats Cards:** Total XP, Total Credits, Tasks Completed (%), Achievement Rate (%)
- **Tabs:**
  - **Achievements** — Grid of achievement cards (filterable), clicking filters task table below
  - **Weekly Reports** — `IndividualWeeklyReportsTable`
  - **Strikes** — Penalty records with XP/points impact
- **Tasks Table:** Task name, difficulty, status, XP, points, action buttons
  - Actions: Start, Continue, Done, Retry, Waiting (for peer review)
  - Expandable peer review feedback rows
  - Difficulty badges: Easy (1), Medium (2), Hard (3+)
  - Status badges: approved, rejected, pending_review, in_progress, not_started

### Team Journey / All Products (`/dashboard/team-journey`)

**File:** `src/app/dashboard/team-journey/page.tsx`

- **Tabs:** All Products, My Products, Archive
- **Search:** Debounced 300ms, filters by name + description
- **Sort:** Name (A→Z) or Status
- **Product Cards:** Team name, status, description, stats (members/tasks/points/XP), member avatars, Join/View button
- **Create Product:** `CreateTeamDialog` with validation
- Client-side sorting prioritizes user's teams first

### Team Detail (`/dashboard/team-journey/{teamId}`)

**File:** `src/app/dashboard/team-journey/[id]/page.tsx`

- Team overview with members, tasks, statistics
- Task assignment interface
- Team member management (join/leave)

### Peer Review (`/dashboard/peer-review`)

**File:** `src/app/dashboard/peer-review/page.tsx`

- **Tabs:**
  - **Tasks to Review** — Available submissions with review criteria checklist
  - **My Submissions** — Status tracking (Waiting/Approved/Rejected) with reviewer feedback
- **Stats Cards:** Available reviews, completed reviews, XP earned, points earned

### Leaderboard (`/dashboard/leaderboard`)

**Files:** `src/app/dashboard/leaderboard/page.tsx` (Server) + `page-client.tsx` (Client)

- **Hybrid rendering:** Server-side initial fetch, client-side interactivity
- **ISR:** Revalidates every 60 seconds
- **Tabs:** Individual vs Team rankings
- **Week Selector:** Dropdown of available snapshot weeks
- **Columns:** Rank (with medal), name, avatar, XP, points, tasks, achievements
- Current user highlighted in rankings

### Other Student Pages

| Page | Route | Key Feature |
|------|-------|-------------|
| Account | `/dashboard/account` | Profile edit, avatar upload (5MB max, Supabase Storage), password change |
| Invitations | `/dashboard/invitations` | Pending (accept/decline) + Sent tabs, PostHog tracking |
| Transaction History | `/dashboard/transaction-history` | Timeline of all XP/point transactions |
| Support | `/dashboard/support` | Help/FAQ placeholder |

---

## Admin Dashboard

All admin pages verify `user.primary_role === "admin"` and redirect non-admins to `/dashboard`.

### Admin Overview (`/dashboard/admin`)

**File:** `src/app/dashboard/admin/page.tsx`

- **Platform Overview Card:** Total users, teams, tasks, points distributed
- **Quick Navigation Grid** (6 cards):

| Section | Route | Description |
|---------|-------|-------------|
| Task Management | `/dashboard/admin/tasks` | Create/edit/delete task templates |
| User Management | `/dashboard/admin/users` | All users table, bulk invite, roles |
| Team Management | `/dashboard/admin/teams` | Teams table, members, strikes |
| Peer Reviews | `/dashboard/admin/peer-reviews` | Review oversight and decisions |
| Student Progress | `/dashboard/admin/progress` | Team health monitoring |
| Audit Logs | `/dashboard/admin/audit-logs` | Database change timeline |

### Admin Users (`/dashboard/admin/users`)

- **Tabs:** All Users, Bulk Invitations, Roles & Permissions (coming soon)
- `AdminUsersTable` — Columns: User, Email, Role, Last Login, Created At, Actions
- `BulkInviteTab` — CSV upload or manual email entry

### Admin Tasks (`/dashboard/admin/tasks`)

- `AdminTasksTable` — Name, context (team/individual), difficulty, XP/points rewards
- `CreateTaskDialog` / `EditTaskDialog` — Full form with Zod validation
- Fields: title, description, difficulty, context, rewards, peer review criteria, resources, tips

### Admin Teams (`/dashboard/admin/teams`)

- `AdminTeamsTable` — Name, status, members, created at
- Actions: View details, manage members, manage strikes, archive
- `AdminStrikesTable` — Team penalties with review modal

### Admin Peer Reviews (`/dashboard/admin/peer-reviews`)

- `AdminPeerReviewsTable` — Task, reviewer, date, status, feedback
- Modal detail view for full review + decision history

### Admin Student Progress (`/dashboard/admin/progress`)

- `StudentProgressAlerts` — Team health monitoring
- **Health Status:** Green (Active), Yellow (Slow), Red (Needs Help)
- **Columns:** Team, members, XP, task breakdown, reports, days since activity, health badge
- Click row → `TeamDetailModal` with member stats, recent tasks, report history
- Uses `get_student_progress_overview()` RPC function

### Admin Audit Logs (`/dashboard/admin/audit-logs`)

- Timeline/table of database changes
- Columns: Action (INSERT/UPDATE/DELETE), table, record ID, user, old→new data, timestamp
- Filtering: by table, date range, user, action type

---

## Route Structure

| Route | Access | Rendering | Page |
|-------|--------|-----------|------|
| `/dashboard` | All authenticated | Client | Overview |
| `/dashboard/my-journey` | Student | Client | Individual progress |
| `/dashboard/my-journey/task/[id]` | Student | Client | Task detail |
| `/dashboard/team-journey` | All | Client | Team browser |
| `/dashboard/team-journey/[id]` | All | Client | Team detail |
| `/dashboard/leaderboard` | All | Hybrid (SSR+Client) | Rankings |
| `/dashboard/peer-review` | All | Client | Peer reviews |
| `/dashboard/account` | All | Client | Profile settings |
| `/dashboard/invitations` | All | Client | Invitation management |
| `/dashboard/transaction-history` | All | Client | XP/point history |
| `/dashboard/support` | All | Client | Help |
| `/dashboard/admin` | Admin only | Client | Admin hub |
| `/dashboard/admin/users` | Admin only | Client | User management |
| `/dashboard/admin/tasks` | Admin only | Client | Task management |
| `/dashboard/admin/teams` | Admin only | Client | Team management |
| `/dashboard/admin/peer-reviews` | Admin only | Client | Review oversight |
| `/dashboard/admin/progress` | Admin only | Client | Student health |
| `/dashboard/admin/audit-logs` | Admin only | Client | Change history |

---

## Data Loading Patterns

### Pattern 1: Server Component + Client Hydration

Used in: Leaderboard, Dashboard Layout

```typescript
// Server: fetch initial data
const data = await getServerSideLeaderboardData();
// Pass as props to client component
<ClientComponent initialData={data} />
```

### Pattern 2: Pure Client Query

Used in: My Journey, Team Journey, Account

```typescript
const { data, isPending, isError } = useQuery({
  queryKey: ["scope", "name", userId],
  queryFn: () => databaseFunction(userId),
  enabled: !!userId,
});
```

### Pattern 3: Optimistic Updates

Used in: Starting tasks, responding to invitations

```typescript
const mutation = useMutation({
  mutationFn: async (vars) => { /* api call */ },
  onMutate: async (vars) => {
    await queryClient.cancelQueries({ queryKey: [...] });
    queryClient.setQueryData([...], (old) => { /* update */ });
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: [...] }),
  onError: () => queryClient.invalidateQueries({ queryKey: [...] }),
});
```

### Pattern 4: Memoized Derived Data

Used in: All pages with heavy computation

```typescript
const statsCards = useMemo(() => computeStats(data), [data]);
```

---

## Key Components

### Dashboard Components (`src/components/dashboard/`)

| Component | Purpose |
|-----------|---------|
| `stats-card.tsx` | Single stat card with icon and value |
| `dashboard-items.tsx` | TeamItem, ActivityItem, StatItem subcomponents |
| `achievement-card.tsx` | Achievement display with progress |
| `create-team-dialog.tsx` | Team creation form |
| `weekly-report-banner.tsx` | Warning banner for unsubmitted reports |
| `bordered-container.tsx` | Layout container with border |
| `icon-container.tsx` | Icon background wrapper |
| `tasks-table.tsx` | Reusable tasks table |

### Admin Components (`src/components/admin/`)

| Component | Purpose |
|-----------|---------|
| `admin-overview.tsx` | Platform statistics dashboard |
| `admin-users-table.tsx` | User management table |
| `admin-tasks-table.tsx` | Task management table |
| `admin-teams-table.tsx` | Team management table |
| `admin-peer-reviews-table.tsx` | Peer review oversight |
| `admin-strikes-table.tsx` | Strike management |
| `student-progress-alerts.tsx` | Team health monitoring |
| `team-detail-modal.tsx` | Team detail inspector |
| `review-strike-modal.tsx` | Strike review and decision |
| `create-task-dialog.tsx` | Task template creation |
| `edit-task-dialog.tsx` | Task template editing |

---

## Error Handling

- **Form Validation:** Inline errors (red border + text), Zod schemas
- **API Errors:** Toast notifications (Sonner), console logging, fallback messages
- **Error Boundary:** `ErrorBoundary` wraps entire dashboard, catches React errors
- **Loading States:** Skeleton screens, disabled buttons during submission, spinner icons

---

## Performance Optimizations

1. **ISR** — Leaderboard cached for 60 seconds server-side
2. **React Query Caching** — Stale time prevents unnecessary refetches, background refetch on focus
3. **Memoization** — `useMemo()`, `React.memo()` (NavMain), `useCallback()`
4. **Code Splitting** — Dynamic imports for modals, route-based splitting (Next.js default)
5. **Image Optimization** — Next.js `Image` component for avatars with priority loading

---

## File Reference

### Database Layer

| File | Purpose |
|------|---------|
| `src/lib/database.ts` | Facade for all database functions |
| `src/lib/data/*.ts` | Modular functions: users, teams, tasks, reviews, achievements, invitations, notifications, leaderboard, utilities, core |
| `src/lib/supabase/client.ts` | Browser client (frontend auth) |
| `src/lib/supabase/server.ts` | Server components (cookie auth) |
| `src/lib/supabase/admin.ts` | Service role (bypasses RLS) |
| `src/lib/supabase/middleware.ts` | Auth middleware |

### Utilities

| File | Purpose |
|------|---------|
| `src/lib/weekly-reports.ts` | Week boundaries, submission checks |
| `src/lib/validation-schemas.ts` | Zod schemas for forms |
| `src/lib/leaderboard-server.ts` | Server-side leaderboard queries |
| `src/data/dashboard-data.ts` | Dashboard data helpers |

### Types

| File | Purpose |
|------|---------|
| `src/types/database.ts` | Auto-generated Supabase types |
| `src/types/dashboard.ts` | Dashboard-specific types |
| `src/types/team-journey.ts` | Team journey types |
| `src/types/my-journey.ts` | My journey types |

### Custom Hooks

| File | Purpose |
|------|---------|
| `src/hooks/use-invitation-count.ts` | Subscribe to invitation count |
| `src/hooks/use-task-notifications.ts` | Real-time task updates |
| `src/hooks/use-recurring-tasks.ts` | Recurring task logic |
