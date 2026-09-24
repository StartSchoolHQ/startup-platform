-- Analytics v2 review fixes (2026-09-24):
-- 1. _analytics_week_v1: real ISO-week fallback for NULL scope (greatest() ate the NULL)
--    and weeks numbered from the batch's Monday so a Tuesday admission does not
--    produce two "week 1"s.
-- 2. _analytics_outcomes_batch_v1: same Monday-relative numbering.
-- 3. _analytics_settings_v1: non-numeric strings fall back instead of raising.
-- 4. The seven internal helpers lose EXECUTE for authenticated (definers do not need it).

create or replace function public._analytics_week_v1(p_date date, p_batch_id uuid)
returns int
language sql stable security definer set search_path = public, pg_temp
as $$
  select case
    when b.admission_date is null then extract(week from p_date)::int
    else greatest(1, ((p_date - date_trunc('week', b.admission_date::timestamp)::date) / 7) + 1)
  end
  from (select 1) x left join public.diploma_batches b on b.id = p_batch_id;
$$;

create or replace function public._analytics_settings_v1()
returns jsonb
language sql stable security definer set search_path = public, pg_temp
as $$
  with raw as (
    select coalesce((select value from public.platform_settings where key = 'analytics'), '{}'::jsonb) v
  ), n as (
    select
      case when v->>'inactive_days'  ~ '^\d+$' then (v->>'inactive_days')::int end  as inactive_days,
      case when v->>'stuck_days'     ~ '^\d+$' then (v->>'stuck_days')::int end     as stuck_days,
      case when v->>'rejections'     ~ '^\d+$' then (v->>'rejections')::int end     as rejections,
      case when v->>'low_sentiment'  ~ '^\d+$' then (v->>'low_sentiment')::int end  as low_sentiment,
      case when v->>'missed_reports' ~ '^\d+$' then (v->>'missed_reports')::int end as missed_reports,
      case when v->>'behind_phases'  ~ '^\d+$' then (v->>'behind_phases')::int end  as behind_phases,
      case when v->>'dismiss_days'   ~ '^\d+$' then (v->>'dismiss_days')::int end   as dismiss_days
    from raw
  )
  select jsonb_build_object(
    'inactive_days',  greatest(1, coalesce(inactive_days, 7)),
    'stuck_days',     greatest(1, coalesce(stuck_days, 10)),
    'rejections',     greatest(1, coalesce(rejections, 3)),
    'low_sentiment',  greatest(1, coalesce(low_sentiment, 5)),
    'missed_reports', greatest(1, coalesce(missed_reports, 2)),
    'behind_phases',  greatest(1, coalesce(behind_phases, 1)),
    'dismiss_days',   greatest(1, coalesce(dismiss_days, 7)))
  from n;
$$;

create or replace function public._analytics_outcomes_batch_v1(p_batch_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_b record; v_end date; v_monday date; v_students int; v_tasks int; v_weeks jsonb; v_totals jsonb;
begin
  select * into v_b from public.diploma_batches where id = p_batch_id;
  if v_b.id is null then return null; end if;
  v_monday := date_trunc('week', v_b.admission_date::timestamp)::date;
  v_end := least(coalesce(v_b.closed_at::date, now()::date), coalesce(v_b.completion_date, now()::date), now()::date);
  select count(*) into v_students from public.users u where u.batch_id = p_batch_id and u.primary_role = 'user'
    and u.email not like 'test\_%@test.local';
  select count(*) into v_tasks from public.tasks t where t.activity_type = 'individual' and t.is_active;

  select coalesce(jsonb_agg(jsonb_build_object(
    'week', ((g.ws - v_monday) / 7) + 1, 'week_start', g.ws,
    'active_pct', case when v_students = 0 then 0 else round(100.0 * (
      select count(distinct e.user_id) from (
        select coalesce(tp.user_id, tp.assigned_to_user_id) user_id, x.at from public.task_progress tp
          cross join lateral (values (tp.started_at), (tp.submitted_at), (tp.completed_at)) x(at)
        union all select w.user_id, w.submitted_at from public.weekly_reports w
        union all select c.responsible_user_id, c.created_at from public.client_meetings c where c.deleted_at is null
      ) e join public.users u on u.id = e.user_id
      where u.batch_id = p_batch_id and u.primary_role = 'user' and e.at >= g.ws and e.at < g.ws + 7) / v_students) end,
    'completions_cum', (select count(*) from public.task_progress tp join public.users u on u.id = coalesce(tp.user_id, tp.assigned_to_user_id)
      where u.batch_id = p_batch_id and tp.status = 'approved' and tp.completed_at < g.ws + 7),
    'completion_pct', case when v_students = 0 or v_tasks = 0 then 0 else round(100.0 * (
      select count(*) from public.task_progress tp join public.tasks t on t.id = tp.task_id join public.users u on u.id = tp.user_id
      where u.batch_id = p_batch_id and t.activity_type = 'individual' and tp.status = 'approved' and tp.completed_at < g.ws + 7)
      / (v_students * v_tasks), 1) end,
    'reports', (select count(*) from public.weekly_reports w join public.users u on u.id = w.user_id
      where u.batch_id = p_batch_id and w.status = 'submitted' and w.week_start_date = g.ws),
    'sentiment', (select round(avg((w.submission_data->>'alignmentScore')::int), 1) from public.weekly_reports w join public.users u on u.id = w.user_id
      where u.batch_id = p_batch_id and w.status = 'submitted' and w.week_start_date = g.ws and w.submission_data->>'alignmentScore' ~ '^[0-9]+$')
  ) order by g.ws), '[]'::jsonb)
  into v_weeks
  from (select d::date as ws from generate_series(v_monday::timestamp, date_trunc('week', v_end::timestamp), interval '7 days') d) g;

  select jsonb_build_object(
    'students', v_students,
    'still_active', (select count(*) from public.users u where u.batch_id = p_batch_id and u.primary_role = 'user' and u.status = 'active' and u.email not like 'test\_%@test.local'),
    'meetings', (select count(*) from public.client_meetings cm join public.teams t on t.id = cm.team_id where t.batch_id = p_batch_id and cm.deleted_at is null and cm.status::text = 'completed'),
    'mrr', (select coalesce(sum(rs.mrr_amount), 0) from public.revenue_streams rs join public.teams t on t.id = rs.team_id where t.batch_id = p_batch_id and rs.ended_at is null),
    'reports', (select count(*) from public.weekly_reports w join public.users u on u.id = w.user_id where u.batch_id = p_batch_id and w.status = 'submitted'))
  into v_totals;

  return jsonb_build_object('id', v_b.id, 'name', v_b.name, 'admission_date', v_b.admission_date,
    'closed_at', v_b.closed_at, 'weeks', v_weeks, 'totals', v_totals);
end
$$;

revoke execute on function public._analytics_settings_v1() from authenticated;
revoke execute on function public._analytics_scope_students_v1(uuid, boolean) from authenticated;
revoke execute on function public._analytics_week_v1(date, uuid) from authenticated;
revoke execute on function public._analytics_events_v1(uuid, boolean) from authenticated;
revoke execute on function public._analytics_last_active_v1(uuid, boolean) from authenticated;
revoke execute on function public._analytics_phase_v1(uuid, boolean) from authenticated;
revoke execute on function public._analytics_outcomes_batch_v1(uuid) from authenticated;
