# Team Journey - Quick Reference Guide

## 🎯 Overview
The Team Journey module manages startup teams, tasks, achievements, and progress tracking within the StartSchool Platform.

## 📁 File Locations

### Pages
```
src/app/dashboard/
├── team-journey/
│   ├── page.tsx                    # Main listing (235 lines)
│   ├── [id]/page.tsx               # Team detail (1222 lines)
│   └── task/[taskId]/page.tsx      # Task detail
└── my-journey/page.tsx             # User's tasks
```

### Components
```
src/components/team-journey/
├── product-card.tsx                # Team card
├── tasks-table.tsx                 # Task table
├── weekly-reports-table.tsx        # Reports table
├── strikes-table.tsx               # Strikes display
├── client-meetings-table.tsx       # Meetings table
├── team-management-modal.tsx       # Team settings
├── add-client-meeting-modal.tsx    # Meeting form
├── add-meeting-modal.tsx           # Alt meeting form
└── avatar-stack.tsx                # Member avatars
```

### Library Functions
```
src/lib/
├── database.ts                     # Database queries
├── tasks.ts                        # Task operations
└── weekly-reports.ts               # Report functions
```

### Types
```
src/types/
└── team-journey.ts                 # TypeScript definitions
```

## 🔑 Key Types

### Product (Team)
```typescript
interface Product {
  id: string;
  name: string;
  description: string;
  status: "Active" | "Inactive";
  customers: { count: number; label: string };
  revenue: { amount: number; label: string };
  points: { amount: number; label: string };
  avatar: string;
  teamMembers: User[];
}
```

### TeamTask
```typescript
interface TeamTask {
  progress_id: string;        // Progress record ID
  task_id: string;            // Master task ID
  title: string;
  description: string;
  category: TaskCategory;
  difficulty_level: number;
  base_xp_reward: number;
  status: TaskStatus;
  assigned_to_user_id?: string;
  assignee_name?: string;
}
```

### Task Status Flow
```
not_started → in_progress → pending_review → approved
                    ↓              ↓
                cancelled      rejected/revision_required
```

## 🛠️ Essential Functions

### Team Management
```typescript
// Get all teams
getAllTeamsForJourney(userId, options)

// Get team details
getTeamDetails(teamId)

// Check membership
isUserTeamMember(teamId, userId)

// Get user role
getUserTeamRole(teamId, userId)
```

### Task Management
```typescript
// Get team tasks
getTeamTasks(teamId)

// Assign task
assignTaskToMember(progressId, userId)

// Get user tasks
getUserTasks(userId)

// Task workflow
startTask(progressId, userId)
completeTask(progressId, submissionData)
cancelTask(progressId, userId)
```

### Weekly Reports
```typescript
// Check submission
hasUserSubmittedThisWeek(userId, teamId)

// Get reports
getTeamWeeklyReports(teamId)
```

### Strikes
```typescript
// Get strikes
getTeamStrikes(teamId)
```

### Achievements
```typescript
// Get achievements
getTeamAchievements(teamId)

// Get tasks by achievement
getTasksByAchievement(achievementId, teamId)
```

## 🗄️ Database Tables

### Core Tables
- **teams**: Team/product information
- **team_members**: Team membership and roles
- **tasks**: Master task definitions
- **task_progress**: Team task progress tracking
- **achievements**: Achievement definitions
- **team_achievements**: Team achievement progress
- **weekly_reports**: Weekly report submissions
- **strikes**: Team penalties
- **client_meetings**: Client interaction logs
- **users**: User profiles and stats

### Key Relationships
```
teams 1:N team_members N:1 users
teams 1:N task_progress N:1 tasks
teams 1:N team_achievements N:1 achievements
teams 1:N weekly_reports N:1 users
```

## 🎨 Pages Overview

### Team Listing (`/dashboard/team-journey`)
**Purpose**: Browse and search teams

**Features**:
- 3 tabs: All Products, My Products, Archive
- Search with debouncing
- Sort by: name, date, status, revenue
- Create team button
- Product cards in grid

**State**:
```typescript
const [allProducts, setAllProducts] = useState<Product[]>([]);
const [myProducts, setMyProducts] = useState<Product[]>([]);
const [archivedProducts, setArchivedProducts] = useState<Product[]>([]);
const [searchQuery, setSearchQuery] = useState("");
const [sortBy, setSortBy] = useState<SortOption>("date");
```

### Team Detail (`/dashboard/team-journey/[id]`)
**Purpose**: Comprehensive team management

**Sections**:
1. **Header**: Name, description, badges, actions
2. **Stats Cards**: Revenue, clients, achievements, points
3. **Team & Experience**: Members, XP totals
4. **Status & Progress**: Dates, strikes, weekly reports
5. **Tabs**:
   - Achievements: Cards + tasks table
   - Weekly Reports: Stats + reports table
   - Client Meetings: Meetings table
   - Strikes: Strikes table

**Modals**:
- Team Management
- Weekly Report Submission
- Add Client Meeting

### Task Detail (`/dashboard/team-journey/task/[taskId]`)
**Purpose**: View and submit task

**Expected Sections**:
- Task header
- Instructions
- Tips & resources
- Deliverables
- Submission form
- Review criteria

### My Journey (`/dashboard/my-journey`)
**Purpose**: User's personal task view

**Features**:
- All assigned tasks
- Peer review feedback
- Team context
- Quick actions

## 👥 User Roles & Permissions

### Founder
- ✅ Full control
- ✅ Delete team
- ✅ Change all roles
- ✅ Manage members
- ✅ Assign tasks

### Co-Founder
- ✅ Nearly full control
- ❌ Can't delete team
- ✅ Change member/leader roles
- ✅ Manage members
- ✅ Assign tasks

### Leader
- ✅ Task management
- ✅ Add/remove members
- ❌ Can't change roles
- ✅ Assign tasks

### Member
- ✅ View team
- ✅ Complete assigned tasks
- ✅ Submit reports
- ❌ Can't manage team

## 🔄 Common Workflows

### Creating a Team
```
1. Click "Add Product"
2. Fill form (name, description)
3. Submit
4. Becomes founder
5. Redirect to team detail
```

### Assigning a Task
```
1. Leader on team detail page
2. Achievements tab
3. Click assignment dropdown
4. Select member
5. Optimistic UI update
6. API call
7. Confirm success
```

### Submitting Weekly Report
```
1. Team detail page
2. Check submission status
3. Click "Submit Weekly Report"
4. Fill form
5. Submit
6. Button disables
7. Avatar gets green indicator
```

### Viewing Strikes
```
1. Team detail page
2. Strikes tab
3. View strike list
4. Click "Explain" if needed
5. Write explanation
6. Submit
```

## 🎮 Gamification System

### Points & XP
- Individual points/XP
- Team points/XP
- User Total = Individual + Team
- Team Total = Sum of member totals

### Rewards
- Tasks award XP and points based on difficulty
- Achievements multiply rewards
- Peer reviews can adjust rewards

### Difficulty Levels
- 1-2: Easy (low rewards)
- 3: Medium (moderate rewards)
- 4-5: Hard (high rewards)

## 🔒 Security

### Row Level Security
- Users can only view teams they're members of
- Task updates restricted by role
- Weekly reports restricted to team members

### Authorization Checks
```typescript
const permission = await checkTaskPermission(
  progressId, 
  userId, 
  action
);

if (!permission.canManage) {
  throw new Error('Unauthorized');
}
```

## 🚀 Automation

### Weekly Strikes
- **Trigger**: Every Monday at 9:00 AM UTC
- **Function**: `weekly-strikes-automation` (Edge Function)
- **Process**: 
  1. Check previous week submissions
  2. Generate strikes for missing reports
  3. Update team strike count
- **Scheduler**: pg_cron

### Monitoring
```sql
-- Check cron jobs
SELECT * FROM cron.job;

-- View execution history
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC LIMIT 10;
```

## 🐛 Debugging Tips

### Check Auth
```typescript
const { user, error } = await debugAuthStatus();
console.log('User:', user);
```

### Query Teams
```typescript
const teams = await getAllTeamsForJourney(userId, {
  searchQuery: undefined,
  sortBy: 'date',
  sortOrder: 'desc',
  status: 'all'
});
```

### Check Membership
```typescript
const isMember = await isUserTeamMember(teamId, userId);
const role = await getUserTeamRole(teamId, userId);
```

## 📊 Data Flow Patterns

### Optimistic Updates
```typescript
// 1. Update UI immediately
setState(optimisticValue);

// 2. Make API call
const success = await apiFunction();

// 3. Revert on error
if (!success) {
  await reloadData();
}
```

### Data Loading
```typescript
const loadData = useCallback(async () => {
  setLoading(true);
  try {
    const data = await fetchFunction();
    setData(data);
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
}, [dependencies]);

useEffect(() => {
  loadData();
}, [loadData]);
```

## 🧪 Testing Checklist

### Team Management
- [ ] Create team
- [ ] Edit team details
- [ ] Add member
- [ ] Remove member
- [ ] Change member role
- [ ] Archive team

### Tasks
- [ ] View tasks
- [ ] Assign task
- [ ] Start task
- [ ] Complete task
- [ ] Submit with files
- [ ] Peer review

### Weekly Reports
- [ ] Submit report
- [ ] Check status
- [ ] View reports history
- [ ] Strike generation

### Permissions
- [ ] Founder actions
- [ ] Co-founder restrictions
- [ ] Leader capabilities
- [ ] Member limitations

## 📈 Performance Tips

### Optimization Opportunities
1. Implement pagination for large task lists
2. Add caching for team details
3. Use React Server Components
4. Optimize database queries with indexes
5. Lazy load modal components
6. Debounce search inputs (already done)

### Current Performance
- Search debounce: 300ms
- Optimistic updates for task assignment
- Parallel data fetching where possible

## 🔮 Future Enhancements

### High Priority
- [ ] Real-time notifications
- [ ] Email notifications
- [ ] Advanced analytics
- [ ] Mobile app

### Medium Priority
- [ ] External tool integrations
- [ ] Enhanced peer review
- [ ] Mentorship system
- [ ] Resource library

### Low Priority
- [ ] Social features
- [ ] Custom achievements
- [ ] Flexible workflows

## 📚 Additional Resources

### Documentation
- `TEAM_JOURNEY_ANALYSIS.md`: Complete functionality analysis
- `docs/team-journey-architecture.md`: Architecture diagrams
- `hierarchy.md`: Points & XP rules
- `README.md`: Project setup and features

### Code References
- Type definitions: `/src/types/team-journey.ts`
- Database helpers: `/src/lib/database.ts`
- Task operations: `/src/lib/tasks.ts`
- Components: `/src/components/team-journey/`

## 🆘 Common Issues

### Issue: Tasks not loading
**Check**:
1. User is team member
2. Team has tasks created
3. Tasks have progress records
4. RLS policies allow access

### Issue: Can't assign tasks
**Check**:
1. User role (founder/co-founder/leader)
2. Task status (not completed)
3. Member is active

### Issue: Weekly report button disabled
**Check**:
1. User already submitted this week
2. User is team member
3. Team is active

### Issue: Strikes not appearing
**Check**:
1. pg_cron is running
2. Edge function deployed
3. Previous week has missing reports
4. Team is active

---

**Last Updated**: 2025-11-21  
**Version**: 1.0  
**Status**: Complete
