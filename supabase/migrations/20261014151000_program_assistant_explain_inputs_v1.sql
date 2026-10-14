-- Program assistant, phase 3 delta (2026-10-14): what the run route reads
-- after writing verdicts, to build Claude inputs and the Slack text.
-- Returns every verdict of the run with the week requirements attached and
-- the student's name (the Slack digest needs it); the explain module strips
-- the name before anything reaches the model.
-- Rollback: drop function public.program_explain_inputs_v1(uuid);
create or replace function public.program_explain_inputs_v1(p_run_id uuid)
returns jsonb
language sql stable security definer
set search_path = public, program, qwasar, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'qwasar_user_id', v.qwasar_user_id,
    'name', s.name,
    'track', v.track,
    'study_type', v.study_type,
    'week', v.week,
    'requirement_this_week', tw.requirement,
    'requirement_last_week', tp.requirement,
    'phase', tw.phase,
    'progress', v.progress,
    'prev_progress', v.prev_progress,
    'prev_snapshot_date', v.prev_snapshot_date,
    'trend', v.trend,
    'days_since_login', v.days_since_login,
    'attendance_pct', v.attendance_pct,
    'attendance_sessions', v.attendance_sessions,
    'attendance_incomplete', v.attendance_incomplete,
    'status', v.status,
    'reason', v.reason,
    'not_evaluated_reason', v.not_evaluated_reason
  ) order by v.status, v.qwasar_user_id), '[]'::jsonb)
  from program.verdict v
  left join lateral (
    select ps.name from qwasar.progress_snapshot ps
    where ps.snapshot_date = v.snapshot_date and ps.qwasar_user_id = v.qwasar_user_id
    limit 1) s on true
  left join program.timeline_week tw
    on tw.track = case when coalesce(v.study_type, '') like 'part-time%' then 'PT' else v.track end
   and tw.week = v.week
  left join program.timeline_week tp
    on tp.track = tw.track and tp.week = tw.week - 1
  where v.run_id = p_run_id;
$$;
revoke all on function public.program_explain_inputs_v1(uuid) from public, anon, authenticated;
grant execute on function public.program_explain_inputs_v1(uuid) to service_role;
