-- Security: close the remaining student-callable write RPCs that had no
-- auth check (follow-up to the 2026-09-15 hardening, which left 8 open).
--
-- Group A — no app path calls these with a user session (the TS wrappers
-- were dead and are deleted in the same commit); service_role keeps EXECUTE:
--   assign_individual_task, start_individual_task,
--   assign_team_task_to_progress, decrement_team_strikes_count
--   (the admin resolve-strike route uses the service role), start_recurring_task.
--
-- Group B — called with a user session, so they get an in-body guard.
-- Signatures and return shapes unchanged; verbatim pre-change bodies kept
-- as <name>_backup_v1 (no EXECUTE for anon/authenticated):
--   reassign_task            caller must be an active member of the row's
--                            team or an admin; assigned_by = auth.uid()
--   resubmit_task_for_review caller must be an active member of the row's
--                            team, the row's owner, or an admin
--   increment_team_member_count
--                            recomputed from active team_members instead of
--                            +1 (idempotent; repeated calls cannot inflate)
--
-- Rollback: group A — grant execute on function public.<fn>(args) to
-- authenticated; group B — pg_get_functiondef of <fn>_backup_v1, rename,
-- re-apply, then drop the backup.

-- ---------------------------------------------------------------------------
-- Group A: revoke
-- ---------------------------------------------------------------------------
revoke execute on function public.assign_individual_task(uuid, uuid)
  from authenticated;
revoke execute on function public.start_individual_task(uuid)
  from authenticated;
revoke execute on function public.assign_team_task_to_progress(uuid, uuid, uuid, uuid)
  from authenticated;
revoke execute on function public.decrement_team_strikes_count(uuid)
  from authenticated;
revoke execute on function public.start_recurring_task(uuid, uuid, uuid)
  from authenticated;

-- ---------------------------------------------------------------------------
-- Group B: backups (verbatim copies)
-- ---------------------------------------------------------------------------
create or replace function public.reassign_task_backup_v1(
  p_progress_id uuid, p_new_user_id uuid, p_reassigned_by_user_id uuid
)
 returns table(success boolean, message text)
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
BEGIN
  UPDATE task_progress
  SET
    assigned_to_user_id = p_new_user_id,
    assigned_by_user_id = p_reassigned_by_user_id,
    assigned_at = now(),
    updated_at = now()
  WHERE id = p_progress_id;

  IF FOUND THEN
    RETURN QUERY SELECT true, 'Task reassigned successfully';
  ELSE
    RETURN QUERY SELECT false, 'Task not found';
  END IF;
END;
$function$;

create or replace function public.increment_team_member_count_backup_v1(team_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
BEGIN
    UPDATE teams SET member_count = member_count + 1 WHERE id = team_id;
END;
$function$;

-- resubmit_task_for_review_backup_v1 is created from the live definition
-- below (long body), see the DO block.
do $$
declare
  v_def text;
begin
  select pg_get_functiondef('public.resubmit_task_for_review(uuid)'::regprocedure)
    into v_def;
  v_def := replace(
    v_def,
    'FUNCTION public.resubmit_task_for_review(',
    'FUNCTION public.resubmit_task_for_review_backup_v1('
  );
  execute v_def;
end $$;

revoke execute on function public.reassign_task_backup_v1(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.increment_team_member_count_backup_v1(uuid)
  from public, anon, authenticated;
revoke execute on function public.resubmit_task_for_review_backup_v1(uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Group B: guarded replacements
-- ---------------------------------------------------------------------------
create or replace function public.reassign_task(
  p_progress_id uuid, p_new_user_id uuid, p_reassigned_by_user_id uuid
)
 returns table(success boolean, message text)
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
DECLARE
  v_team_id uuid;
  v_caller uuid := auth.uid();
BEGIN
  SELECT tp.team_id INTO v_team_id
  FROM task_progress tp
  WHERE tp.id = p_progress_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Task not found';
    RETURN;
  END IF;

  -- Guard: service role (no uid) and admins pass; otherwise the caller must
  -- be an active member of the row's team.
  IF v_caller IS NOT NULL AND NOT public.is_admin_v1() THEN
    IF v_team_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = v_team_id
        AND tm.user_id = v_caller
        AND tm.left_at IS NULL
    ) THEN
      RAISE EXCEPTION 'reassign_task_denied' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE task_progress
  SET
    assigned_to_user_id = p_new_user_id,
    assigned_by_user_id = COALESCE(v_caller, p_reassigned_by_user_id),
    assigned_at = now(),
    updated_at = now()
  WHERE id = p_progress_id;

  RETURN QUERY SELECT true, 'Task reassigned successfully';
END;
$function$;

create or replace function public.increment_team_member_count(team_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
BEGIN
  -- Recompute from the source of truth; idempotent, so a repeated or
  -- malicious call cannot inflate the count.
  UPDATE teams t
  SET member_count = (
    SELECT count(*) FROM team_members tm
    WHERE tm.team_id = t.id AND tm.left_at IS NULL
  )
  WHERE t.id = increment_team_member_count.team_id;
END;
$function$;

-- resubmit_task_for_review: same body as before with a guard after the
-- "Task not found" check. Re-created from the live definition so the long
-- notification body is not duplicated here.
do $$
declare
  v_def text;
  v_marker constant text := E'  -- Validate: must have reviewer assigned';
  v_guard constant text := E'  -- Guard (rpc_auth_guards_v1): service role (no uid) and admins pass;\n'
    || E'  -- otherwise the caller must be the row''s owner or an active member of\n'
    || E'  -- the row''s team.\n'
    || E'  IF auth.uid() IS NOT NULL AND NOT public.is_admin_v1() THEN\n'
    || E'    IF NOT (\n'
    || E'      coalesce(v_task.user_id = auth.uid(), false)\n'
    || E'      OR (v_task.team_id IS NOT NULL AND EXISTS (\n'
    || E'        SELECT 1 FROM team_members tm\n'
    || E'        WHERE tm.team_id = v_task.team_id\n'
    || E'          AND tm.user_id = auth.uid()\n'
    || E'          AND tm.left_at IS NULL))\n'
    || E'    ) THEN\n'
    || E'      RAISE EXCEPTION ''resubmit_task_denied'' USING ERRCODE = ''42501'';\n'
    || E'    END IF;\n'
    || E'  END IF;\n\n';
begin
  select pg_get_functiondef('public.resubmit_task_for_review(uuid)'::regprocedure)
    into v_def;
  if position(v_marker in v_def) = 0 then
    raise exception 'resubmit_task_for_review: guard marker not found';
  end if;
  if position('rpc_auth_guards_v1' in v_def) > 0 then
    raise exception 'resubmit_task_for_review: guard already present';
  end if;
  v_def := replace(v_def, v_marker, v_guard || v_marker);
  execute v_def;
end $$;

-- Grants unchanged for the three guarded functions (authenticated + service_role).
