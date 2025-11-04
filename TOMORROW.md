# Database Structure Issues - Points & XP Tracking

## 🔴 PROBLEM FOUND: Missing User Team Points Tracking

### Current Structure (INCORRECT):

#### `users` table:

- ✅ `total_xp` - XP for the user
- ✅ `individual_points` - Individual points only
- ❌ **MISSING**: `team_points` - Points this user earned from team tasks
- ❌ **MISSING**: `total_points` - Overall points (individual + team combined)

#### `teams` table:

- ✅ `team_points` - Points earned by the entire team

#### `transactions` table:

- ✅ `xp_change` - XP changes
- ✅ `points_change` - Points changes
- ✅ `points_type` - Can be 'individual' or 'team'

### The Problems:

1. **Users can't track their team points contribution**

   - The `users` table only has `individual_points`
   - When a user completes a team task and earns team points, there's no field to track how many team points THIS USER has earned
   - Team points only get added to the `teams` table, but not tracked per user

2. **No overall/total points field**

   - There's no way to see a user's combined score (individual + team)
   - Need a field that represents the user's total contribution

3. **Current transaction data shows everything as 'individual'**
   - All transactions are marked as `points_type='individual'`
   - Even team tasks should be creating transactions with `points_type='team'`

### Required Solution:

#### Option 1: Add Missing Columns

Add to `users` table:

```sql
ALTER TABLE users ADD COLUMN team_points INTEGER DEFAULT 0 CHECK (team_points >= 0);
ALTER TABLE users ADD COLUMN total_points INTEGER GENERATED ALWAYS AS (individual_points + team_points) STORED;
```

#### Option 2: Computed Field Only

Add to `users` table:

```sql
ALTER TABLE users ADD COLUMN team_points INTEGER DEFAULT 0 CHECK (team_points >= 0);
-- Calculate total_points in application code or via database views
```

### Expected Behavior:

**When user completes an individual task:**

- Transaction: `points_type='individual'`, `points_change=+X`
- User: `individual_points += X`, `total_xp += Y`
- User: `total_points` = individual_points + team_points

**When user completes a team task:**

- Transaction: `points_type='team'`, `points_change=+X`
- User: `team_points += X`, `total_xp += Y`
- Team: `team_points += X`
- User: `total_points` = individual_points + team_points

### Migration Needed:

1. Add `team_points` column to `users` table
2. Optionally add `total_points` as generated/computed column
3. Update any existing team-related transactions to have `points_type='team'`
4. Update application logic to properly set `points_type` when creating transactions

---

**Decision needed:**

- [ ] Add both `team_points` and `total_points` columns
- [ ] Add only `team_points`, calculate total in code
- [ ] Review and fix transaction creation logic for team tasks

---

## 🎯 Combined Action Items from Comprehensive Reviews

_Analysis completed: November 4, 2025_
_Sources: GitHub Copilot Analysis + Supabase AI Agent Review_

### ⚠️ CRITICAL (Do First)

1. **✅ Add `team_points` to users table**

   - _Issue:_ Users cannot track their team point contributions
   - _Impact:_ Incomplete gamification system, cannot show total user score
   - _Action:_ Add `team_points INTEGER DEFAULT 0` column to users table
   - _Found by:_ GitHub Copilot Analysis

2. **✅ Implement SECURITY DEFINER functions for transactions**

   - _Issue:_ Transaction creation can be spoofed, no atomic operations
   - _Impact:_ Points/XP integrity at risk, race conditions possible
   - _Action:_ Create secure stored procedures with SECURITY DEFINER for all point/XP updates
   - _Found by:_ Supabase AI Agent

3. **✅ Fix task_progress FK references (auth.users → public.users)**

   - _Issue:_ task_progress references `auth.users.id` instead of `public.users.id`
   - _Impact:_ Inconsistency across schema, potential RLS complications
   - _Action:_ Update FKs: assigned_to_user_id, assigned_by_user_id, reviewer_user_id, user_id
   - _Found by:_ Both reviews

4. **✅ Add missing indexes on high-traffic FKs**
   - _Issue:_ 30 foreign keys without indexes
   - _Impact:_ Slow JOIN queries, poor dashboard performance
   - _Priority targets:_
     - transactions(user_id, team_id, task_id)
     - team_members(user_id, team_id)
     - weekly_reports(team_id, user_id)
     - client_meetings(team_id, responsible_user_id)
   - _Found by:_ Both reviews

### 🔴 HIGH Priority

5. **✅ Implement JWT custom claims for admin checks**

   - _Issue:_ Admin checks require JOIN to users table every time
   - _Impact:_ Performance overhead on every protected query
   - _Action:_ Use `(auth.jwt() ->> 'role') = 'admin'` in RLS policies
   - _Found by:_ Supabase AI Agent

6. **✅ Add unique constraints: team_members(team_id, user_id)**

   - _Issue:_ No prevention of duplicate team memberships
   - _Impact:_ Data integrity issues, duplicate entries possible
   - _Action:_ `ALTER TABLE team_members ADD CONSTRAINT unique_team_user UNIQUE(team_id, user_id);`
   - _Also:_ user_achievements(user_id, achievement_id)
   - _Found by:_ Both reviews

7. **✅ Restrict auth schema table access**

   - _Issue:_ Auth tables (refresh_tokens, sessions, etc.) need tighter security
   - _Impact:_ Potential security vulnerabilities
   - _Action:_ Implement strict RLS on auth.refresh_tokens, auth.sessions, auth.one_time_tokens
   - _Found by:_ Supabase AI Agent

8. **✅ Fix cascade delete rules**
   - _Issue:_ Most FKs use NO ACTION - cannot delete users/teams with history
   - _Impact:_ Cannot clean up data, failed delete operations
   - _Action:_ Review each FK and implement proper CASCADE/SET NULL/RESTRICT strategy
   - _Examples:_
     - Users with transactions → CASCADE or prevent
     - Teams with members → Require cleanup first
     - Tasks with progress → CASCADE makes sense
   - _Found by:_ Both reviews (detailed by Supabase AI)

### 🟡 MEDIUM Priority

9. **✅ Consolidate duplicate RLS policies**

   - _Issue:_ Multiple overlapping SELECT policies on users, client_meetings tables
   - _Impact:_ Confusion, maintenance overhead, potential security gaps
   - _Action:_ Review and merge redundant policies
   - _Found by:_ GitHub Copilot Analysis

10. **✅ Implement realtime RLS (if using realtime)**

    - _Issue:_ If using Supabase Realtime, need RLS on realtime.messages
    - _Impact:_ Potential data leakage via realtime channels
    - _Action:_ Set up private channels and RLS policies for realtime features
    - _Found by:_ Supabase AI Agent

11. **✅ Add audit log retention policy**

    - _Issue:_ auth.audit_log_entries (54 rows) will grow indefinitely
    - _Impact:_ Storage bloat, slower queries
    - _Action:_ Implement automatic archival/deletion of old audit logs
    - _Found by:_ Supabase AI Agent

12. **✅ Remove unused enums or implement features**
    - _Issue:_ 2 enum types defined but not used anywhere
    - `peer_review_status_type` (values: pending_assignment, assigned, in_review, completed, cancelled)
    - `task_history_action_type` (values: created, assigned, unassigned, status_changed, updated, deleted)
    - _Impact:_ Database clutter, unclear intent
    - _Action:_ Either implement peer review system and task history, or drop enums
    - _Found by:_ GitHub Copilot Analysis

---

### 📝 Implementation Notes

- **Security first:** Prioritize items 2, 5, 7 for production security
- **Performance impact:** Items 1, 4, 8 directly affect user experience
- **Data integrity:** Items 6, 8 prevent data corruption
- **Technical debt:** Items 9, 12 are cleanup but not urgent

### 🔄 Tracking

Mark items completed as migrations are applied:

- [ ] All CRITICAL items completed
- [ ] All HIGH priority items completed
- [ ] All MEDIUM priority items completed
- [ ] Documentation updated after each change
