-- Admin overview: batch scope (2026-09-15)
--
-- The overview (/api/admin/stats) counted every active student/team via
-- get_admin_program_health_v3 / get_admin_task_pipeline_v1. The other admin
-- pages already scope by diploma batch through _admin_scope_users /
-- _admin_scope_teams (NULL → status = 'active', uuid → batch_id). These V4/V2
-- copies take the same p_batch_id so the overview can default to the open
-- batch like the rest. Purely additive; v3 / v1 untouched.
--
-- Rollback: point src/app/api/admin/stats/route.ts back at v3 / v1 (repo file 20260915131106_*), then
--   drop function public.get_admin_program_health_v4(uuid);
--   drop function public.get_admin_task_pipeline_v2(uuid);

create or replace function public.get_admin_program_health_v4(p_batch_id uuid default null)
returns table(
  total_students bigint, active_7d bigint, active_14d bigint, at_risk_students bigint,
  reports_this_week bigint, reports_last_week bigint, tasks_this_week bigint,
  tasks_last_week bigint, pending_strikes bigint, pending_reviews bigint,
  avg_xp_per_student numeric, total_active_teams bigint,
  students_active bigint, students_slowing bigint, students_at_risk bigint,
  teams_active bigint, teams_slowing bigint, teams_at_risk bigint,
  students_active_wow_delta bigint, students_at_risk_wow_delta bigint,
  teams_active_wow_delta bigint, teams_at_risk_wow_delta bigint
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_current_week int := extract(week from now())::int;
  v_current_year int := extract(year from now())::int;
  v_last_week int := extract(week from now())::int - 1;
  v_students_active bigint; v_students_slowing bigint; v_students_at_risk bigint;
  v_teams_active bigint; v_teams_slowing bigint; v_teams_at_risk bigint;
  v_students_active_prev bigint; v_students_at_risk_prev bigint;
  v_teams_active_prev bigint; v_teams_at_risk_prev bigint;
begin
  -- Scope sets, materialised once per call.
  create temp table _scope_u on commit drop as
    select _admin_scope_users(p_batch_id) as id;
  create temp table _scope_t on commit drop as
    select _admin_scope_teams(p_batch_id) as id;

  with s as (
    select u.id,
      greatest(
        coalesce(au.last_sign_in_at, '1970-01-01'::timestamptz),
        coalesce((select max(t.created_at) from transactions t
                  where t.user_id = u.id and t.type in ('task','validation','meeting')),
                 '1970-01-01'::timestamptz),
        coalesce((select max(wr.submitted_at) from weekly_reports wr where wr.user_id = u.id),
                 '1970-01-01'::timestamptz)
      ) as last_active
    from users u
    left join auth.users au on au.id = u.id
    where u.id in (select id from _scope_u)
      and (
        not exists (select 1 from team_members tm where tm.user_id = u.id and tm.left_at is null)
        or exists (select 1 from team_members tm join teams tmt on tmt.id = tm.team_id
                   where tm.user_id = u.id and tm.left_at is null and tmt.name not ilike '[TEST]%')
      )
  )
  select
    count(*) filter (where last_active > now() - interval '7 days'),
    count(*) filter (where last_active <= now() - interval '7 days' and last_active > now() - interval '14 days'),
    count(*) filter (where last_active <= now() - interval '14 days')
  into v_students_active, v_students_slowing, v_students_at_risk from s;

  with tg as (
    select tm.id,
      coalesce((select max(tr.created_at) from transactions tr
                where tr.team_id = tm.id and tr.type in ('task','validation','meeting')),
               '1970-01-01'::timestamptz) as last_xp
    from teams tm where tm.id in (select id from _scope_t)
  )
  select
    count(*) filter (where last_xp > now() - interval '7 days'),
    count(*) filter (where last_xp <= now() - interval '7 days' and last_xp > now() - interval '14 days'),
    count(*) filter (where last_xp <= now() - interval '14 days')
  into v_teams_active, v_teams_slowing, v_teams_at_risk from tg;

  with s_prev as (
    select u.id,
      greatest(
        coalesce(case when au.last_sign_in_at <= now() - interval '7 days' then au.last_sign_in_at end,
                 '1970-01-01'::timestamptz),
        coalesce((select max(t.created_at) from transactions t
                  where t.user_id = u.id and t.type in ('task','validation','meeting')
                    and t.created_at <= now() - interval '7 days'),
                 '1970-01-01'::timestamptz),
        coalesce((select max(wr.submitted_at) from weekly_reports wr
                  where wr.user_id = u.id and wr.submitted_at <= now() - interval '7 days'),
                 '1970-01-01'::timestamptz)
      ) as last_active
    from users u
    left join auth.users au on au.id = u.id
    where u.id in (select id from _scope_u)
      and u.created_at <= now() - interval '7 days'
      and (
        not exists (select 1 from team_members tm where tm.user_id = u.id and tm.left_at is null)
        or exists (select 1 from team_members tm join teams tmt on tmt.id = tm.team_id
                   where tm.user_id = u.id and tm.left_at is null and tmt.name not ilike '[TEST]%')
      )
  )
  select
    count(*) filter (where last_active > now() - interval '14 days'),
    count(*) filter (where last_active <= now() - interval '21 days')
  into v_students_active_prev, v_students_at_risk_prev from s_prev;

  with tg_prev as (
    select tm.id,
      coalesce((select max(tr.created_at) from transactions tr
                where tr.team_id = tm.id and tr.type in ('task','validation','meeting')
                  and tr.created_at <= now() - interval '7 days'),
               '1970-01-01'::timestamptz) as last_xp
    from teams tm
    where tm.id in (select id from _scope_t)
      and tm.created_at <= now() - interval '7 days'
  )
  select
    count(*) filter (where last_xp > now() - interval '14 days'),
    count(*) filter (where last_xp <= now() - interval '21 days')
  into v_teams_active_prev, v_teams_at_risk_prev from tg_prev;

  return query select
    (select count(*) from _scope_u)::bigint,
    (select count(distinct t.user_id) from transactions t
      where t.user_id in (select id from _scope_u)
        and t.created_at > now() - interval '7 days' and t.type in ('task','validation','meeting'))::bigint,
    (select count(distinct t.user_id) from transactions t
      where t.user_id in (select id from _scope_u)
        and t.created_at > now() - interval '14 days' and t.type in ('task','validation','meeting'))::bigint,
    (select count(*) from _scope_u su
      where not exists (select 1 from transactions t where t.user_id = su.id
                          and t.created_at > now() - interval '14 days'
                          and t.type in ('task','validation','meeting')))::bigint,
    (select count(distinct wr.user_id) from weekly_reports wr
      where wr.user_id in (select id from _scope_u)
        and wr.week_number = v_current_week and wr.week_year = v_current_year)::bigint,
    (select count(distinct wr.user_id) from weekly_reports wr
      where wr.user_id in (select id from _scope_u)
        and wr.week_number = v_last_week and wr.week_year = v_current_year)::bigint,
    (select count(*) from task_progress tp where tp.status = 'approved'
       and tp.completed_at > now() - interval '7 days'
       and (tp.user_id in (select id from _scope_u) or tp.team_id in (select id from _scope_t)))::bigint,
    (select count(*) from task_progress tp where tp.status = 'approved'
       and tp.completed_at between (now() - interval '14 days') and (now() - interval '7 days')
       and (tp.user_id in (select id from _scope_u) or tp.team_id in (select id from _scope_t)))::bigint,
    (select count(*) from team_strikes ts where ts.status = 'pending'
       and ts.team_id in (select id from _scope_t))::bigint,
    (select count(*) from task_progress tp where tp.status = 'pending_review'
       and (tp.user_id in (select id from _scope_u) or tp.team_id in (select id from _scope_t)))::bigint,
    (select round(avg(u.total_xp)::numeric, 0) from users u
      where u.id in (select id from _scope_u) and u.total_xp > 0),
    (select count(*) from _scope_t)::bigint,
    v_students_active, v_students_slowing, v_students_at_risk,
    v_teams_active, v_teams_slowing, v_teams_at_risk,
    (v_students_active - v_students_active_prev),
    (v_students_at_risk - v_students_at_risk_prev),
    (v_teams_active - v_teams_active_prev),
    (v_teams_at_risk - v_teams_at_risk_prev);

  drop table if exists _scope_u;
  drop table if exists _scope_t;
end;
$function$;

revoke all on function public.get_admin_program_health_v4(uuid) from public, anon, authenticated;
grant execute on function public.get_admin_program_health_v4(uuid) to service_role;

create or replace function public.get_admin_task_pipeline_v2(p_batch_id uuid default null)
returns table(activity_type text, status text, count bigint)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select t.activity_type::text, tp.status::text, count(*)::bigint
  from task_progress tp
  join tasks t on t.id = tp.task_id
  where tp.user_id in (select _admin_scope_users(p_batch_id))
     or tp.team_id in (select _admin_scope_teams(p_batch_id))
  group by 1, 2;
$function$;

revoke all on function public.get_admin_task_pipeline_v2(uuid) from public, anon, authenticated;
grant execute on function public.get_admin_task_pipeline_v2(uuid) to service_role;
