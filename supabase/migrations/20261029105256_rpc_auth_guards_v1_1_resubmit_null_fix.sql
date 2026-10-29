-- Delta to rpc_auth_guards_v1: the resubmit_task_for_review guard compared
-- v_task.user_id = auth.uid(), which is NULL on team rows (user_id is NULL
-- there), so NOT (NULL OR false) was NULL and the guard never raised for a
-- non-member. Verified in a rolled-back test before this fix: an outsider
-- reached the "no assigned reviewer" check instead of being denied.
-- The guard text in 20261029105054_rpc_auth_guards_v1.sql is corrected to
-- match; this delta rewrites the live function body in place.
--
-- Rollback: same as rpc_auth_guards_v1 (restore from
-- resubmit_task_for_review_backup_v1).
do $$
declare
  v_def text;
  v_old constant text := E'      v_task.user_id = auth.uid()\n';
  v_new constant text := E'      coalesce(v_task.user_id = auth.uid(), false)\n';
begin
  select pg_get_functiondef('public.resubmit_task_for_review(uuid)'::regprocedure)
    into v_def;
  if position('rpc_auth_guards_v1' in v_def) = 0 then
    raise exception 'resubmit_task_for_review: guard not present, apply rpc_auth_guards_v1 first';
  end if;
  if position(v_old in v_def) = 0 then
    raise exception 'resubmit_task_for_review: comparison line not found (already fixed?)';
  end if;
  v_def := replace(v_def, v_old, v_new);
  execute v_def;
end $$;
