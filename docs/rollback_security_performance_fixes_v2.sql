-- ============================================================
-- ROLLBACK: security_performance_fixes_v2
-- Run this via Supabase MCP execute_sql if anything breaks
-- Each section is independent — you can rollback individual fixes
-- ============================================================

-- ============================================================
-- Rollback Fix 1: Restore auth.uid() without (select ...) wrapper
-- on task_edit_suggestions
-- ============================================================
DROP POLICY IF EXISTS "Users can insert their own suggestions" ON task_edit_suggestions;
CREATE POLICY "Users can insert their own suggestions" ON task_edit_suggestions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own suggestions" ON task_edit_suggestions;
CREATE POLICY "Users can view their own suggestions" ON task_edit_suggestions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all suggestions" ON task_edit_suggestions;
CREATE POLICY "Admins can view all suggestions" ON task_edit_suggestions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.primary_role = 'admin'));

DROP POLICY IF EXISTS "Admins can update suggestions" ON task_edit_suggestions;
CREATE POLICY "Admins can update suggestions" ON task_edit_suggestions
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.primary_role = 'admin'));

-- ============================================================
-- Rollback Fix 2: Remove search_path from functions
-- ============================================================
ALTER FUNCTION submit_external_peer_review(uuid, text, text, boolean) RESET search_path;
ALTER FUNCTION submit_external_peer_review_backup_v2(uuid, text, text, boolean) RESET search_path;
ALTER FUNCTION submit_external_peer_review_backup_v3(uuid, text, text, boolean) RESET search_path;
ALTER FUNCTION get_top_teams_with_xp(integer) RESET search_path;
ALTER FUNCTION reset_available_recurring_tasks() RESET search_path;
ALTER FUNCTION reset_available_recurring_tasks_backup_v2() RESET search_path;
ALTER FUNCTION check_missed_weekly_reports_team_context() RESET search_path;
ALTER FUNCTION get_leaderboard_data(integer, integer, integer) RESET search_path;
ALTER FUNCTION has_user_submitted_this_week(uuid, uuid) RESET search_path;
ALTER FUNCTION cancel_meeting(uuid) RESET search_path;
ALTER FUNCTION cancel_client_meeting(uuid) RESET search_path;

-- ============================================================
-- Rollback Fix 3: Recreate duplicate users SELECT policies
-- ============================================================
CREATE POLICY "p_users_select_active_self" ON users
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) AND status = 'active'::status_state);

CREATE POLICY "p_users_select_self_active" ON users
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) AND status = 'active'::status_state);

-- ============================================================
-- Rollback Fix 4: Restore user_achievements INSERT to public role
-- ============================================================
DROP POLICY IF EXISTS "System can insert achievements" ON user_achievements;
CREATE POLICY "System can insert achievements" ON user_achievements
  FOR INSERT TO public WITH CHECK (true);

-- ============================================================
-- Rollback Fix 5: Remove WITH CHECK from task_progress UPDATE policies
-- ============================================================
DROP POLICY IF EXISTS "Assigned reviewers can update task status" ON task_progress;
CREATE POLICY "Assigned reviewers can update task status" ON task_progress
  FOR UPDATE TO authenticated
  USING (reviewer_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own individual tasks" ON task_progress;
CREATE POLICY "Users can update own individual tasks" ON task_progress
  FOR UPDATE TO authenticated
  USING (context = 'individual'::task_context_type AND user_id = (SELECT auth.uid()));
