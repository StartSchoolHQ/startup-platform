# Database Schema Documentation

**Last Updated:** November 4, 2025  
**Database:** Supabase PostgreSQL

---

## 📊 Overview

- **Total Tables:** 15
- **Total Rows:** 112 (across all tables)
- **All Tables:** RLS Enabled ✅
- **Foreign Key Relationships:** 29 constraints
- **Custom Enums:** 11 types

---

## 🗄️ Tables Summary

### Core Tables

| Table              | Rows | Purpose                              | RLS |
| ------------------ | ---- | ------------------------------------ | --- |
| `users`            | 3    | User profiles, XP, individual points | ✅  |
| `teams`            | 2    | Team information, team points        | ✅  |
| `team_members`     | 3    | Team membership tracking             | ✅  |
| `team_invitations` | 1    | Team invitation management           | ✅  |

### Task Management

| Table                   | Rows | Purpose                                 | RLS |
| ----------------------- | ---- | --------------------------------------- | --- |
| `tasks`                 | 18   | Global task templates                   | ✅  |
| `task_progress`         | 53   | Unified individual & team task tracking | ✅  |
| `user_task_completions` | 0    | Task completion statistics              | ✅  |

### Gamification & Rewards

| Table               | Rows | Purpose                     | RLS |
| ------------------- | ---- | --------------------------- | --- |
| `achievements`      | 4    | Achievement definitions     | ✅  |
| `user_achievements` | 0    | User achievement tracking   | ✅  |
| `transactions`      | 12   | XP & points transaction log | ✅  |

### Business & Reporting

| Table             | Rows | Purpose                   | RLS |
| ----------------- | ---- | ------------------------- | --- |
| `revenue_streams` | 0    | Product revenue tracking  | ✅  |
| `client_meetings` | 8    | Client meeting management | ✅  |
| `weekly_reports`  | 3    | Weekly team reports       | ✅  |
| `team_strikes`    | 2    | Team penalty tracking     | ✅  |

---

## 🔗 Foreign Key Relationships

### Users Table (15 incoming relationships)

References from:

- `teams.founder_id`
- `team_members.user_id`
- `team_invitations.invited_user_id`, `invited_by_user_id`
- `team_strikes.user_id`, `explained_by_user_id`, `resolved_by_user_id`
- `tasks.created_by_user_id`
- `client_meetings.responsible_user_id`
- `transactions.user_id`, `validated_by_user_id`
- `user_achievements.user_id`
- `user_task_completions.user_id`
- `revenue_streams.user_id`
- `weekly_reports.user_id`

### Teams Table (9 incoming relationships)

References from:

- `team_members.team_id`
- `team_invitations.team_id`
- `team_strikes.team_id`
- `task_progress.team_id`
- `client_meetings.team_id`
- `transactions.team_id`
- `revenue_streams.team_id`
- `weekly_reports.team_id`

### Tasks Table (2 incoming relationships)

References from:

- `task_progress.task_id` (CASCADE on delete)
- `transactions.task_id`

### Achievements Table (3 incoming relationships)

References from:

- `tasks.achievement_id`
- `user_achievements.achievement_id`
- `transactions.achievement_id`

### Revenue Streams Table (1 incoming relationship)

References from:

- `transactions.revenue_stream_id`

---

## 🔐 RLS Policies (54 total)

### Users Table (11 policies)

✅ Users can view/update their own profile  
✅ Public can view active users (for leaderboard)  
✅ Service role has full access  
✅ Users can insert their own profile

### Teams Table (4 policies)

✅ All authenticated users can read teams  
✅ Founders can create/update their teams  
✅ Only active teams visible

### Task Progress Table (7 policies)

✅ Users can CRUD their own individual tasks  
✅ Team members can CRUD team tasks  
✅ All users can view team tasks (transparency)

### Tasks Table (2 policies)

✅ Everyone can view active task templates  
✅ Admins can manage all tasks

### Team Members Table (4 policies)

✅ All can read active members  
✅ Users can join/leave teams  
✅ Founders can manage members

### Team Invitations Table (4 policies)

✅ Users can view invitations they sent/received  
✅ Team leaders can create invitations  
✅ Invited users can update (accept/decline)

### Transactions Table (4 policies)

✅ Users can CRUD their own transactions

### Client Meetings Table (7 policies)

✅ Team members can view/create team meetings  
✅ Responsible user can update meeting status

### Weekly Reports Table (3 policies)

✅ Team members can submit/view team reports  
✅ Users can update their own reports

### Team Strikes Table (2 policies)

✅ Team members can view their team strikes  
✅ Team leaders/admins can manage strikes

### Achievements Table (1 policy)

✅ All authenticated users can read

### User Achievements Table (2 policies)

✅ Users can view own achievements  
✅ System can insert achievements

### Revenue Streams Table (4 policies)

✅ Users can CRUD their own revenue streams

### User Task Completions Table (4 policies)

✅ Users can CRUD their own task completions

---

## 📋 Unique Constraints

| Table           | Constraint           | Columns                                        |
| --------------- | -------------------- | ---------------------------------------------- |
| `users`         | Unique Email         | `email`                                        |
| `tasks`         | Unique Template Code | `template_code`                                |
| `task_progress` | Unique Team Task     | `task_id, team_id` (when context='team')       |
| `task_progress` | Unique User Task     | `task_id, user_id` (when context='individual') |

---

## ✅ Check Constraints

### Users

- `total_xp >= 0`
- `individual_points >= 0`
- `daily_validation_xp >= 0`

### Teams

- `team_points >= 0`
- `formation_cost >= 0`
- `weekly_maintenance_cost >= 0`
- `member_count >= 0`
- `strikes_count >= 0`

### Tasks

- `template_code` length >= 3
- `title` length >= 3
- `difficulty_level` between 1 and 5
- `estimated_hours >= 0`
- `base_xp_reward >= 0`
- `base_points_reward >= 0`

### Task Progress

- **CRITICAL:** Context validation - ensures:
  - If `context='team'`: `team_id` NOT NULL and `user_id` IS NULL
  - If `context='individual'`: `user_id` NOT NULL and `team_id` IS NULL

### Transactions

- `points_type` IN ('individual', 'team')

### Team Invitations

- `status` IN ('pending', 'accepted', 'declined')

### Team Strikes

- `strike_type` IN ('missed_weekly_report', 'missed_meetings', 'missed_task_deadline', 'other')
- `status` IN ('active', 'explained', 'resolved')
- `xp_penalty >= 0`
- `points_penalty >= 0`

### Client Meetings

- `status` IN ('scheduled', 'completed', 'cancelled')

### Revenue Streams

- `mrr_amount >= 0`

### User Task Completions

- `completion_count >= 0`
- `total_xp_earned >= 0`

---

## 🔍 Indexes

### Task Progress (9 indexes - WELL OPTIMIZED ✅)

- Primary key on `id`
- `idx_task_progress_context` - on `context` field
- `idx_task_progress_status` - on `status` field
- `idx_task_progress_task_id` - on `task_id`
- `idx_task_progress_team_id` - on `team_id` (where team_id IS NOT NULL)
- `idx_task_progress_user_id` - on `user_id` (where user_id IS NOT NULL)
- `idx_task_progress_assigned_to` - on `assigned_to_user_id` (where NOT NULL)
- `task_progress_unique_team_task` - unique on `task_id, team_id` for team context
- `task_progress_unique_user_task` - unique on `task_id, user_id` for individual context

### Other Tables (Basic indexes only)

- All tables have primary key indexes on `id`
- `users`: unique index on `email`
- `tasks`: unique index on `template_code`

---

## ⚠️ Missing Indexes (Performance Issue)

**30 foreign keys WITHOUT indexes!** This can cause serious performance issues on JOIN operations.

### High Priority (Frequently Queried)

- ❌ `transactions.user_id` - Very frequent queries
- ❌ `transactions.team_id`
- ❌ `transactions.task_id`
- ❌ `team_members.user_id` - Join on every team query
- ❌ `team_members.team_id`
- ❌ `weekly_reports.team_id`
- ❌ `weekly_reports.user_id`
- ❌ `client_meetings.team_id`
- ❌ `client_meetings.responsible_user_id`

### Medium Priority

- ❌ `user_achievements.user_id`
- ❌ `user_achievements.achievement_id`
- ❌ `team_invitations.team_id`
- ❌ `team_invitations.invited_user_id`
- ❌ `team_invitations.invited_by_user_id`
- ❌ `team_strikes.team_id`
- ❌ `team_strikes.user_id`
- ❌ `revenue_streams.user_id`
- ❌ `revenue_streams.team_id`
- ❌ `tasks.achievement_id`

### Lower Priority

- ❌ `tasks.created_by_user_id`
- ❌ `teams.founder_id`
- ❌ `team_strikes.explained_by_user_id`
- ❌ `team_strikes.resolved_by_user_id`
- ❌ `transactions.validated_by_user_id`
- ❌ `transactions.achievement_id`
- ❌ `transactions.revenue_stream_id`
- ❌ `user_task_completions.user_id`

---

## 🎮 Enum Types

| Enum Name                  | Values                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `status_state`             | active, archived                                                                                      |
| `primary_role_type`        | user, admin                                                                                           |
| `team_role_type`           | member, leader, founder, co_founder                                                                   |
| `task_context_type`        | individual, team                                                                                      |
| `task_status_type`         | not_started, in_progress, completed, cancelled, pending_review, approved, rejected, revision_required |
| `task_category_type`       | onboarding, development, design, marketing, business, testing, deployment, milestone                  |
| `task_priority_type`       | low, medium, high, urgent                                                                             |
| `transaction_type`         | task, revenue, validation, team_cost, achievement, meeting                                            |
| `revenue_type`             | recurring, one_time                                                                                   |
| `peer_review_status_type`  | pending_assignment, assigned, in_review, completed, cancelled ⚠️ (UNUSED)                             |
| `task_history_action_type` | created, assigned, unassigned, status_changed, updated, deleted ⚠️ (UNUSED)                           |

---

## ⚡ Triggers

| Table           | Trigger                           | Event         | Purpose                            |
| --------------- | --------------------------------- | ------------- | ---------------------------------- |
| `task_progress` | `update_task_progress_updated_at` | BEFORE UPDATE | Auto-update `updated_at` timestamp |

---

## 🔴 Critical Issues Found

### 1. **MISSING: User Team Points Tracking** ⚠️ HIGH PRIORITY

**Problem:** Users table only has `individual_points` but no `team_points` field

- When users complete team tasks, points go to `teams.team_points`
- But there's NO tracking of how many team points each USER has earned
- Cannot show user's total contribution (individual + team)

**Impact:**

- Cannot display user's total score
- Cannot track individual contribution to team
- Gamification incomplete

**Required Action:** See `TOMORROW.md` for solution options

### 2. **Missing Indexes on Foreign Keys** ⚠️ HIGH PRIORITY

**Problem:** 30 foreign key columns without indexes
**Impact:**

- Slow JOIN queries
- Poor performance on dashboard loading
- Inefficient leaderboard queries
- Slow transaction history

**Required Action:** Add indexes (see Missing Indexes section)

### 3. **Unused Enums** ⚠️ LOW PRIORITY

**Problem:** 2 enum types defined but not used in any tables

- `peer_review_status_type`
- `task_history_action_type`

**Impact:** Database clutter, potential confusion

**Action:** Remove or implement features using these enums

### 4. **Inconsistent Foreign Key Delete Rules** ⚠️ MEDIUM PRIORITY

**Problem:** Most foreign keys use `NO ACTION` on delete

- Only `task_progress` uses `CASCADE` on `task_id` and `team_id`
- Other tables will fail deletion if referenced

**Impact:**

- Cannot delete users who have created content
- Cannot archive teams with history
- May require complex cleanup procedures

**Example Issues:**

- Cannot delete a user who has transactions
- Cannot delete a team with members
- Cannot delete an achievement linked to tasks

**Action:** Review and implement proper cascade/restrict policies

### 5. **RLS Policy Conflicts** ⚠️ LOW PRIORITY

**Problem:** Some tables have duplicate/overlapping policies

- `users`: Multiple SELECT policies with similar conditions
- `client_meetings`: Duplicate policies for same actions

**Impact:** Confusion, potential security gaps

**Action:** Consolidate redundant policies

### 6. **task_progress Foreign Keys Point to auth.users** ⚠️ MEDIUM PRIORITY

**Problem:** Some task_progress foreign keys reference `auth.users` instead of `public.users`

- `assigned_to_user_id` → auth.users.id
- `assigned_by_user_id` → auth.users.id
- `reviewer_user_id` → auth.users.id
- `user_id` → auth.users.id

**Impact:**

- Inconsistency with other tables
- May cause issues if auth.users and public.users diverge
- Potential RLS policy complications

**Action:** Standardize all user references to `public.users.id`

---

## 📝 Missing Features/Tables

Based on enum types and app structure, these features may need implementation:

1. **Peer Review System** - enum exists but no table
2. **Task History Tracking** - enum exists but no audit table
3. **User Notifications** - no table for app notifications
4. **Team Activity Log** - no audit trail for team actions
5. **Achievement Progress Tracking** - only completion, no progress %

---

## 🎯 Recommended Actions (Priority Order)

### URGENT

1. ✅ Add `team_points` column to `users` table
2. ✅ Add indexes on high-priority foreign keys (transactions, team_members)

### HIGH

3. ✅ Add remaining missing indexes
4. ✅ Fix task_progress foreign key references to use public.users
5. ✅ Review and fix cascade delete rules

### MEDIUM

6. ✅ Consolidate duplicate RLS policies
7. ✅ Add unique constraint on `team_members(team_id, user_id)` to prevent duplicates
8. ✅ Add unique constraint on `user_task_completions(user_id, task_id)`

### LOW

9. ✅ Remove unused enum types or implement features
10. ✅ Add composite indexes for common query patterns
11. ✅ Document RLS policies in separate security doc

---

## 🔄 Data Consistency Checks Needed

Run these queries periodically:

```sql
-- 1. Check for orphaned records (should be empty)
SELECT COUNT(*) FROM transactions WHERE user_id NOT IN (SELECT id FROM users);
SELECT COUNT(*) FROM team_members WHERE team_id NOT IN (SELECT id FROM teams);

-- 2. Check for constraint violations
SELECT COUNT(*) FROM users WHERE total_xp < 0;
SELECT COUNT(*) FROM teams WHERE team_points < 0;

-- 3. Check task_progress context consistency
SELECT COUNT(*) FROM task_progress
WHERE (context = 'team' AND (team_id IS NULL OR user_id IS NOT NULL))
   OR (context = 'individual' AND (user_id IS NULL OR team_id IS NOT NULL));

-- 4. Check for duplicate team memberships (should be 0)
SELECT user_id, team_id, COUNT(*)
FROM team_members
WHERE left_at IS NULL
GROUP BY user_id, team_id
HAVING COUNT(*) > 1;
```

---

## 📊 Storage Estimates

Based on current row counts and growth projections:

| Table          | Current | Est. 1 Year | Storage/Row | Total Est.  |
| -------------- | ------- | ----------- | ----------- | ----------- |
| users          | 3       | 1,000       | ~500 bytes  | 500 KB      |
| teams          | 2       | 200         | ~400 bytes  | 80 KB       |
| tasks          | 18      | 100         | ~2 KB       | 200 KB      |
| task_progress  | 53      | 50,000      | ~800 bytes  | 40 MB       |
| transactions   | 12      | 100,000     | ~400 bytes  | 40 MB       |
| **Total Est.** | -       | -           | -           | **~100 MB** |

Current DB size is negligible. Projected 1-year size ~100MB with moderate usage.

---

## 🔄 Recent Changes

- ✅ November 4, 2025: Dropped `team_task_progress` table (migrated to unified `task_progress`)
- ✅ November 4, 2025: Dropped 15 `_copy` tables (users_copy, teams_copy, etc.)
- ✅ November 4, 2025: Comprehensive schema analysis completed

---

_This document should be updated whenever schema changes are made._
