-- ============================================================================
-- ROLLBACK MIGRATION: RLS Security Fixes (2026-02-27)
-- ============================================================================
-- This file restores the ORIGINAL policies before the security fixes.
-- Use this ONLY if the fixes break something and you need to revert.
-- ============================================================================

-- ============================================================================
-- ISSUE #4 ROLLBACK: Restore task_progress policies WITHOUT left_at IS NULL
-- ============================================================================

-- Rollback: Team members can create team tasks (INSERT)
DROP POLICY IF EXISTS "Team members can create team tasks" ON "public"."task_progress";
CREATE POLICY "Team members can create team tasks" ON "public"."task_progress"
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    (context = 'team'::task_context_type)
    AND (team_id IN (
      SELECT team_members.team_id
      FROM team_members
      WHERE (team_members.user_id = ( SELECT auth.uid() AS uid))
    ))
  );

-- Rollback: Team members can update team tasks (UPDATE)
DROP POLICY IF EXISTS "Team members can update team tasks" ON "public"."task_progress";
CREATE POLICY "Team members can update team tasks" ON "public"."task_progress"
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    (context = 'team'::task_context_type)
    AND (team_id IN (
      SELECT team_members.team_id
      FROM team_members
      WHERE (team_members.user_id = ( SELECT auth.uid() AS uid))
    ))
  )
  WITH CHECK (
    status = ANY (ARRAY[
      'not_started'::task_status_type,
      'in_progress'::task_status_type,
      'pending_review'::task_status_type,
      'cancelled'::task_status_type
    ])
  );

-- Rollback: Team members can delete team task progress (DELETE)
DROP POLICY IF EXISTS "Team members can delete team task progress" ON "public"."task_progress";
CREATE POLICY "Team members can delete team task progress" ON "public"."task_progress"
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    (context = 'team'::task_context_type)
    AND (team_id IN (
      SELECT team_members.team_id
      FROM team_members
      WHERE (team_members.user_id = ( SELECT auth.uid() AS uid))
    ))
  );

-- ============================================================================
-- ISSUE #7 ROLLBACK: Restore reviewer WITH CHECK without approved/rejected
-- ============================================================================

DROP POLICY IF EXISTS "Assigned reviewers can update task status" ON "public"."task_progress";
CREATE POLICY "Assigned reviewers can update task status" ON "public"."task_progress"
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (reviewer_user_id = ( SELECT auth.uid() AS uid))
  WITH CHECK (
    status = ANY (ARRAY[
      'not_started'::task_status_type,
      'in_progress'::task_status_type,
      'pending_review'::task_status_type,
      'cancelled'::task_status_type
    ])
  );

-- ============================================================================
-- ISSUE #6 ROLLBACK: Restore EXECUTE grant on distribute_team_rewards
-- ============================================================================
-- If revoking EXECUTE breaks something (it shouldn't), restore with:

GRANT EXECUTE ON FUNCTION public.distribute_team_rewards(uuid, integer, integer, uuid, text, uuid, uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.distribute_team_rewards(uuid, integer, integer, uuid, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.distribute_team_rewards(uuid, integer, integer, uuid, text, uuid, uuid) TO anon;

-- ============================================================================
-- END OF ROLLBACK
-- ============================================================================
