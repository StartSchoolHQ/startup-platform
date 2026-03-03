# Student Progress Dashboard — Implementation Plan

## Goal

Build a **read-only** admin dashboard at `/dashboard/admin/progress` that gives coaches/admins a clear view of:
- Which students/teams are on track
- Who needs help (inactive, low XP, no reports)
- Overall cohort health at a glance

---

## Risk Assessment

### Database Risk: ZERO

| Question | Answer |
|----------|--------|
| Schema changes? | **NO** — no new tables, columns, or migrations |
| Existing function changes? | **NO** — we don't touch any existing RPC functions |
| Data mutations? | **NO** — 100% read-only queries (SELECT only) |
| RLS policy changes? | **NO** — new RPC is SECURITY DEFINER (admin-checked internally) |
| Risk to existing features? | **NONE** — new page, new components, new RPC. Zero overlap with existing code |

### What we CREATE (all new, nothing modified):

| Type | Item | Risk |
|------|------|------|
| SQL Function | `get_student_progress_overview()` — READ ONLY | None (new function, SELECT only) |
| SQL Function | `get_team_progress_details()` — READ ONLY | None (new function, SELECT only) |
| Page | `src/app/dashboard/admin/progress/page.tsx` | None (new file) |
| Components | `src/components/admin/student-progress-*.tsx` | None (new files) |
| Nav Entry | Add card to admin page `adminSections` array | Minimal (1-line addition) |

### What we DON'T touch:
- ❌ No existing database functions
- ❌ No existing tables or columns
- ❌ No existing components
- ❌ No existing API routes
- ❌ No RLS policies
- ❌ No middleware changes

**Verdict: This is the safest possible feature — purely additive, 100% read-only.**

---

## Phases

### Phase 1: Database Layer (RPC Functions) — ~30 min

Create two read-only RPC functions:

**`get_student_progress_overview()`**
Returns aggregated data for all students:
```
- user_id, name, email, team_name, team_id
- total_xp, total_points
- tasks_completed (team tasks approved for their team)
- tasks_in_progress
- last_activity_at (most recent transaction)
- days_inactive (calculated)
- weekly_reports_submitted (count for their team)
- xp_graduation_percent (total_xp / 8000 * 100)
- health_status: 'green' | 'yellow' | 'red' (derived from inactivity + progress)
```

**`get_team_progress_details(p_team_id UUID)`**
Returns detailed team breakdown:
```
- team name, member count, total team XP
- tasks by status (approved, in_progress, pending_review, not_started)
- per-member stats within the team
- last weekly report date
- task completion rate (approved / total assigned)
- category breakdown (which task categories they've tackled)
```

**Validation:** Run both functions via SQL to confirm output before writing any frontend.

---

### Phase 2: Main Page + Overview Cards — ~30 min

**File:** `src/app/dashboard/admin/progress/page.tsx`

Pattern: Same as other admin pages (`"use client"`, `useApp()` guard, `AdminSkeleton`).

**Top Row — 4 KPI Cards:**
| Card | Data | Icon |
|------|------|------|
| Total Students | Active user count | Users |
| Avg XP | Average total_xp across all students | TrendingUp |
| At-Risk Students | Count where health = 'red' | AlertTriangle |
| Tasks Completed (This Week) | Transactions with type='task' this week | CheckCircle |

**ShadCN components used:** `Card`, `Badge`, `Skeleton`

---

### Phase 3: Team Health Table — ~45 min

**Component:** `src/components/admin/student-progress-team-table.tsx`

Main table showing one row per team, sortable:

| Column | Data |
|--------|------|
| Team | Name + member count |
| Tasks Done | Approved count |
| In Progress | Active task count |
| Completion Rate | % bar |
| Last Activity | Relative time ("2 days ago") |
| Weekly Reports | Submitted count |
| Health | 🟢🟡🔴 badge |

**Health logic:**
- 🟢 Green: Active in last 7 days + tasks progressing
- 🟡 Yellow: Active in last 7-14 days OR low task completion
- 🔴 Red: Inactive 14+ days OR zero tasks completed

**Expandable rows:** Click team → shows individual member stats inline.

**ShadCN components:** `Table`, `Badge`, `Button` (expand/collapse)

---

### Phase 4: At-Risk Students Panel — ~30 min

**Component:** `src/components/admin/student-progress-alerts.tsx`

Flagged students list (filterable):

| Flag Type | Condition | Severity |
|-----------|-----------|----------|
| Inactive | No transactions in 7+ days | 🔴 if 14+, 🟡 if 7-14 |
| Zero Tasks | 0 approved tasks | 🔴 |
| Low XP | Below 25th percentile | 🟡 |
| No Reports | Team has 0 weekly reports in last 2 weeks | 🟡 |

Each alert shows: Student name, team, last active date, XP, and a suggested action.

**ShadCN components:** `Card`, `Badge`, `ScrollArea`

---

### Phase 5: Student Detail Modal — ~30 min

**Component:** `src/components/admin/student-detail-modal.tsx`

Click any student name → modal with:

1. **XP Progress Bar** — toward 8,000 graduation target
2. **Activity Timeline** — last 10 transactions (tasks, reviews, meetings)
3. **Category Coverage** — which task categories done vs not (idea-validation, product-foundation, etc.)
4. **Weekly Report History** — submission dates for their team
5. **Team Context** — which team, how many tasks they were the assignee for vs passive recipient

**ShadCN components:** `Dialog`, `Badge`, `Separator`, `ScrollArea`

---

### Phase 6: Navigation + Polish — ~15 min

1. Add "Student Progress" card to `adminSections` in `/dashboard/admin/page.tsx`
2. Add navigation link in admin sidebar if applicable
3. Loading skeletons for all data states
4. Empty states for new cohorts with no data
5. Build verification (`npm run build`)

---

## Data Sources (all existing, read-only)

| Table | What We Read |
|-------|-------------|
| `users` | name, email, total_xp, total_points, status, primary_role, created_at |
| `teams` | name, status |
| `team_members` | user→team mapping, left_at for active filter |
| `task_progress` | status, completed_at, team_id, context |
| `tasks` | title, category, base_xp_reward, activity_type |
| `transactions` | created_at (for last activity), type, xp_change |
| `weekly_reports` | team_id, status, submitted_at |

---

## Estimated Total Time

| Phase | Time |
|-------|------|
| Phase 1: RPC Functions | 30 min |
| Phase 2: Page + KPI Cards | 30 min |
| Phase 3: Team Health Table | 45 min |
| Phase 4: At-Risk Alerts | 30 min |
| Phase 5: Student Detail Modal | 30 min |
| Phase 6: Nav + Polish | 15 min |
| **Total** | **~3 hours** |

---

## File Structure (all new files)

```
src/app/dashboard/admin/progress/
  page.tsx                              # Main page (tabs: Overview / Alerts)

src/components/admin/
  student-progress-overview.tsx         # KPI cards + team table
  student-progress-team-table.tsx       # Expandable team table
  student-progress-alerts.tsx           # At-risk students panel
  student-detail-modal.tsx              # Student detail modal
```

## Implementation Rules

- **V2 pattern**: All new files. Zero modifications to existing components/functions.
- **Read-only**: No INSERT/UPDATE/DELETE in any query.
- **Admin-only**: All RPC functions check `auth.uid()` is admin before returning data.
- **Existing patterns**: Follow exact same page/component structure as other admin pages.
- **Test on develop first**: Push to `develop`, verify on Vercel preview, then merge to `master`.
