-- AI review notifications linked to the wrong page.
--
-- ai_review_apply_decision_v1 stamps `data.target_route` with
-- '/dashboard/my-journey/task/' || r.task_id, but the solo task page is
-- keyed by the task_progress id (r.progress_id). Clicking the notification
-- therefore opened "Task not found" (or another student's row under RLS).
-- The client already compensates (notification-center swaps in
-- task_progress_id when the route carries task_id); this fixes the source.
--
-- Rollback: re-create from ai_review_apply_decision_v1_backup_v2 via
-- pg_get_functiondef + rename. Existing notification rows are untouched —
-- the client-side swap keeps them working.

do $$
declare v_def text;
begin
  select pg_get_functiondef('public.ai_review_apply_decision_v1(uuid,text,jsonb)'::regprocedure)
    into v_def;

  -- 1. snapshot
  execute replace(
    v_def,
    'FUNCTION public.ai_review_apply_decision_v1(',
    'FUNCTION public.ai_review_apply_decision_v1_backup_v2('
  );

  -- 2. one-token fix, re-created in place
  if position('''/dashboard/my-journey/task/'' || r.task_id::text' in v_def) = 0 then
    raise exception 'ai_review_apply_decision_v1: expected target_route expression not found — body changed, review before applying';
  end if;
  execute replace(
    v_def,
    '''/dashboard/my-journey/task/'' || r.task_id::text',
    '''/dashboard/my-journey/task/'' || r.progress_id::text'
  );
end $$;
