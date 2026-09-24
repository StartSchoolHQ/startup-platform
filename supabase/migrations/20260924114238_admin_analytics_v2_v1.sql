-- Admin analytics v2: attention rules, dismissals, journey-aware readers.
-- Spec: docs/internal/superpowers/specs/2026-09-24-admin-analytics-v2-design.md
-- Additive except: get_admin_activity_v1 recreated with one more UNION branch
-- (attention_dismissed). Rollback: CLAUDE.md → "Admin analytics v2".

-- ---------------------------------------------------------------------------
-- Settings + dismissals
-- ---------------------------------------------------------------------------
insert into public.platform_settings (key, value)
values ('analytics', jsonb_build_object(
  'inactive_days', 7, 'stuck_days', 10, 'rejections', 3, 'low_sentiment', 5,
  'missed_reports', 2, 'behind_phases', 1, 'dismiss_days', 7))
on conflict (key) do nothing;

create table public.analytics_dismissals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  admin_id uuid references public.users(id) on delete set null,
  note text,
  until timestamptz not null,
  created_at timestamptz not null default now()
);
create index analytics_dismissals_user_until_idx
  on public.analytics_dismissals (user_id, until desc);
alter table public.analytics_dismissals enable row level security;
create policy analytics_dismissals_admin_select on public.analytics_dismissals
  for select to authenticated using (public.is_admin_v1());
-- Inserts go through analytics_dismiss_v1 (SECURITY DEFINER) only.
grant select on public.analytics_dismissals to authenticated;
grant all on public.analytics_dismissals to service_role;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public._analytics_settings_v1()
returns jsonb
language sql stable security definer set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'inactive_days',  greatest(1, coalesce(nullif(v->>'inactive_days', '')::int, 7)),
    'stuck_days',     greatest(1, coalesce(nullif(v->>'stuck_days', '')::int, 10)),
    'rejections',     greatest(1, coalesce(nullif(v->>'rejections', '')::int, 3)),
    'low_sentiment',  greatest(1, coalesce(nullif(v->>'low_sentiment', '')::int, 5)),
    'missed_reports', greatest(1, coalesce(nullif(v->>'missed_reports', '')::int, 2)),
    'behind_phases',  greatest(1, coalesce(nullif(v->>'behind_phases', '')::int, 1)),
    'dismiss_days',   greatest(1, coalesce(nullif(v->>'dismiss_days', '')::int, 7)))
  from (select coalesce((select value from public.platform_settings where key = 'analytics'), '{}'::jsonb) v) s;
$$;

-- Students (role user) in scope. Test accounts excluded unless asked.
create or replace function public._analytics_scope_students_v1(p_batch_id uuid, p_include_test boolean default false)
returns table (user_id uuid, name text, batch_id uuid, created_at timestamptz)
language sql stable security definer set search_path = public, pg_temp
as $$
  select u.id, coalesce(nullif(btrim(u.name), ''), split_part(u.email, '@', 1)), u.batch_id, u.created_at
  from public.users u
  where u.id in (select public._admin_scope_users(p_batch_id))
    and u.primary_role = 'user'
    and (p_include_test or u.email not like 'test\_%@test.local');
$$;

-- Programme week (1-based) when a batch is given; ISO week number otherwise.
create or replace function public._analytics_week_v1(p_date date, p_batch_id uuid)
returns int
language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce(greatest(1, ((p_date - b.admission_date) / 7) + 1), extract(week from p_date)::int)
  from (select 1) x left join public.diploma_batches b on b.id = p_batch_id;
$$;

-- Every timestamp that counts as "did something": one row per event.
create or replace function public._analytics_events_v1(p_batch_id uuid, p_include_test boolean default false)
returns table (user_id uuid, at timestamptz)
language sql stable security definer set search_path = public, pg_temp
as $$
  with s as (select user_id from public._analytics_scope_students_v1(p_batch_id, p_include_test))
  select coalesce(tp.user_id, tp.assigned_to_user_id), x.at
  from public.task_progress tp
  cross join lateral (values (tp.started_at), (tp.submitted_at), (tp.completed_at)) x(at)
  where coalesce(tp.user_id, tp.assigned_to_user_id) in (select user_id from s) and x.at is not null
  union all
  select w.user_id, w.submitted_at from public.weekly_reports w
  where w.user_id in (select user_id from s) and w.submitted_at is not null
  union all
  select m.user_id, m.created_at from public.assistant_messages m
  where m.user_id in (select user_id from s) and m.role = 'user'
  union all
  select c.responsible_user_id, c.created_at from public.client_meetings c
  where c.responsible_user_id in (select user_id from s) and c.deleted_at is null
  union all
  select au.id, au.last_sign_in_at from auth.users au
  where au.id in (select user_id from s) and au.last_sign_in_at is not null;
$$;

create or replace function public._analytics_last_active_v1(p_batch_id uuid, p_include_test boolean default false)
returns table (user_id uuid, last_active timestamptz)
language sql stable security definer set search_path = public, pg_temp
as $$
  select s.user_id, (select max(e.at) from public._analytics_events_v1(p_batch_id, p_include_test) e where e.user_id = s.user_id)
  from public._analytics_scope_students_v1(p_batch_id, p_include_test) s;
$$;

-- Highest unlocked gated phase (1-based order among gated phases) per student.
create or replace function public._analytics_phase_v1(p_batch_id uuid, p_include_test boolean default false)
returns table (user_id uuid, highest_phase int, phases_total int, completed int, total int)
language sql stable security definer set search_path = public, pg_temp
as $$
  with phases as (
    select a.id, row_number() over (order by a.sort_order)::int as ord
    from public.achievements a
    where a.context = 'individual' and a.active and not a.always_unlocked),
  s as (select user_id from public._analytics_scope_students_v1(p_batch_id, p_include_test))
  select s.user_id,
    coalesce((select max(p.ord) from phases p where public.my_journey_phase_unlocked_v1(s.user_id, p.id)), 1),
    (select count(*)::int from phases),
    (select count(distinct tp.task_id)::int from public.task_progress tp join public.tasks t on t.id = tp.task_id
      where tp.user_id = s.user_id and tp.status = 'approved' and t.activity_type = 'individual' and t.is_active),
    (select count(*)::int from public.tasks t where t.activity_type = 'individual' and t.is_active)
  from s;
$$;

-- ---------------------------------------------------------------------------
-- Attention list
-- ---------------------------------------------------------------------------
create or replace function public.get_analytics_attention_v1(p_batch_id uuid, p_include_test boolean default false)
returns table (
  user_id uuid, name text, team_name text, last_active timestamptz,
  severity int, reasons text[], dismissed_until timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare v_s jsonb := public._analytics_settings_v1();
begin
  perform public._analytics_assert_admin();
  return query
  with s as (select * from public._analytics_scope_students_v1(p_batch_id, p_include_test)),
  la as (select * from public._analytics_last_active_v1(p_batch_id, p_include_test)),
  ph as (select * from public._analytics_phase_v1(p_batch_id, p_include_test)),
  med as (select percentile_disc(0.5) within group (order by highest_phase)::int as median_phase from ph),
  stuck as (
    select distinct on (u) u as user_id, t.title, (extract(epoch from now() - tp.started_at) / 86400)::int as days
    from (select coalesce(tp0.user_id, tp0.assigned_to_user_id) u, tp0.* from public.task_progress tp0) tp
    join public.tasks t on t.id = tp.task_id
    where tp.u in (select user_id from s) and tp.status = 'in_progress' and tp.submitted_at is null
      and tp.started_at < now() - (v_s->>'stuck_days')::int * interval '1 day'
    order by u, tp.started_at asc),
  rej as (
    select distinct on (x.user_id) x.user_id, x.title, x.n from (
      select r.user_id, t.title, count(*) n
      from public.ai_task_reviews r join public.tasks t on t.id = r.task_id
      where r.user_id in (select user_id from s) and r.decision = false
      group by r.user_id, t.title
      union all
      select coalesce(tp.user_id, tp.assigned_to_user_id), t.title,
             (select count(*) from jsonb_array_elements(coalesce(tp.peer_review_history, '[]'::jsonb)) e
               where e->>'event_type' = 'review_completed' and e->>'decision' = 'rejected')
      from public.task_progress tp join public.tasks t on t.id = tp.task_id
      where coalesce(tp.user_id, tp.assigned_to_user_id) in (select user_id from s)
    ) x where x.n > 0 order by x.user_id, x.n desc),
  sc as (
    select distinct on (w.user_id) w.user_id,
      case when w.submission_data->>'alignmentScore' ~ '^[0-9]+$' then (w.submission_data->>'alignmentScore')::int end as score,
      nullif(btrim(coalesce(w.submission_data->>'alignmentReason', '')), '') as reason
    from public.weekly_reports w
    where w.user_id in (select user_id from s) and w.status = 'submitted'
    order by w.user_id, w.week_start_date desc),
  mr as (
    select s.user_id, count(*) filter (where not exists (
        select 1 from public.weekly_reports w where w.user_id = s.user_id and w.status = 'submitted'
          and w.week_start_date = wk.ws)) as missed
    from s cross join lateral (
      select (date_trunc('week', now())::date - 7 * g) as ws
      from generate_series(1, (v_s->>'missed_reports')::int) g) wk
    where s.created_at < date_trunc('week', now()) - (v_s->>'missed_reports')::int * interval '1 week'
    group by s.user_id),
  os as (
    select ts.user_id, min(ts.created_at) as since from public.team_strikes ts
    where ts.user_id in (select user_id from s) and ts.status = 'active' group by ts.user_id),
  dis as (
    select d.user_id, max(d.until) as until from public.analytics_dismissals d
    where d.until > now() group by d.user_id),
  built as (
    select s.user_id, s.name,
      (select t.name from public.team_members tm join public.teams t on t.id = tm.team_id
        where tm.user_id = s.user_id and tm.left_at is null order by tm.joined_at desc limit 1) as team_name,
      la.last_active,
      (la.last_active is null or la.last_active < now() - (v_s->>'inactive_days')::int * interval '1 day') as inactive,
      array_remove(array[
        case when la.last_active is null then 'No activity recorded yet'
             when la.last_active < now() - (v_s->>'inactive_days')::int * interval '1 day'
             then 'No activity for ' || (extract(epoch from now() - la.last_active) / 86400)::int || ' days' end,
        case when st.title is not null then 'Stuck on “' || st.title || '” for ' || st.days || ' days' end,
        case when rj.n >= (v_s->>'rejections')::int then '“' || rj.title || '” rejected ' || rj.n || ' times' end,
        case when sc.score is not null and sc.score <= (v_s->>'low_sentiment')::int
             then 'Sentiment ' || sc.score || coalesce(': “' || left(sc.reason, 80) || '”', '') end,
        case when mr.missed >= (v_s->>'missed_reports')::int then 'No weekly report for ' || mr.missed || ' weeks' end,
        case when med.median_phase - ph.highest_phase >= (v_s->>'behind_phases')::int
             then (med.median_phase - ph.highest_phase) || ' phase(s) behind the cohort' end,
        case when os.since is not null then 'Unresolved strike since ' || to_char(os.since, 'DD Mon') end
      ], null) as reasons,
      dis.until as dismissed_until
    from s
    left join la on la.user_id = s.user_id
    left join ph on ph.user_id = s.user_id
    cross join med
    left join stuck st on st.user_id = s.user_id
    left join rej rj on rj.user_id = s.user_id
    left join sc on sc.user_id = s.user_id
    left join mr on mr.user_id = s.user_id
    left join os on os.user_id = s.user_id
    left join dis on dis.user_id = s.user_id)
  select b.user_id, b.name, b.team_name, b.last_active,
         (cardinality(b.reasons) + case when b.inactive then 1 else 0 end)::int as severity,
         b.reasons, b.dismissed_until
  from built b
  where cardinality(b.reasons) > 0
  order by 5 desc, b.last_active asc nulls first;
end
$$;

create or replace function public.analytics_dismiss_v1(p_user_id uuid, p_note text)
returns timestamptz
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_until timestamptz;
begin
  perform public._analytics_assert_admin();
  if not exists (select 1 from public.users where id = p_user_id) then
    raise exception 'analytics: unknown user';
  end if;
  v_until := now() + ((public._analytics_settings_v1()->>'dismiss_days')::int) * interval '1 day';
  insert into public.analytics_dismissals (user_id, admin_id, note, until)
  values (p_user_id, auth.uid(), nullif(btrim(coalesce(p_note, '')), ''), v_until);
  return v_until;
end
$$;

-- ---------------------------------------------------------------------------
-- Pulse (This week)
-- ---------------------------------------------------------------------------
create or replace function public.get_analytics_pulse_v1(p_batch_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_ws date := date_trunc('week', now())::date;
  v_prev date := date_trunc('week', now())::date - 7;
  v_prev2 date := date_trunc('week', now())::date - 14;
  v_total int; v_active int; v_active_prev int; v_comp int; v_comp_prev int;
  v_sent numeric; v_sent_prev numeric; v_risk int; v_moved jsonb;
begin
  perform public._analytics_assert_admin();
  select count(*) into v_total from public._analytics_scope_students_v1(p_batch_id);
  select count(distinct e.user_id) into v_active from public._analytics_events_v1(p_batch_id) e where e.at >= v_ws;
  select count(distinct e.user_id) into v_active_prev from public._analytics_events_v1(p_batch_id) e where e.at >= v_prev and e.at < v_ws;
  select count(*) into v_comp from public.task_progress tp
    where coalesce(tp.user_id, tp.assigned_to_user_id) in (select user_id from public._analytics_scope_students_v1(p_batch_id))
      and tp.status = 'approved' and tp.completed_at >= v_ws;
  select count(*) into v_comp_prev from public.task_progress tp
    where coalesce(tp.user_id, tp.assigned_to_user_id) in (select user_id from public._analytics_scope_students_v1(p_batch_id))
      and tp.status = 'approved' and tp.completed_at >= v_prev and tp.completed_at < v_ws;
  select round(avg((w.submission_data->>'alignmentScore')::int), 1) into v_sent from public.weekly_reports w
    where w.user_id in (select user_id from public._analytics_scope_students_v1(p_batch_id)) and w.status = 'submitted'
      and w.week_start_date = v_prev and w.submission_data->>'alignmentScore' ~ '^[0-9]+$';
  select round(avg((w.submission_data->>'alignmentScore')::int), 1) into v_sent_prev from public.weekly_reports w
    where w.user_id in (select user_id from public._analytics_scope_students_v1(p_batch_id)) and w.status = 'submitted'
      and w.week_start_date = v_prev2 and w.submission_data->>'alignmentScore' ~ '^[0-9]+$';
  select count(*) into v_risk from public.get_analytics_attention_v1(p_batch_id) a where a.dismissed_until is null;

  select coalesce(jsonb_agg(m order by m.occurred_at desc), '[]'::jsonb) into v_moved from (
    select * from (
      -- first ever approval per student
      select 'first_approval' as kind, s.name || ' got their first task approved: “' || t.title || '”' as text,
             x.first_at as occurred_at, s.user_id
      from (select coalesce(tp.user_id, tp.assigned_to_user_id) u, min(tp.completed_at) first_at,
                   (array_agg(tp.task_id order by tp.completed_at))[1] task_id
            from public.task_progress tp where tp.status = 'approved' and tp.completed_at is not null
            group by 1) x
      join public._analytics_scope_students_v1(p_batch_id) s on s.user_id = x.u
      join public.tasks t on t.id = x.task_id
      where x.first_at >= now() - interval '7 days'
      union all
      select 'phase_completed', s.name || ' completed the phase “' || a.name || '”', ua.completed_at, s.user_id
      from public.user_achievements ua join public.achievements a on a.id = ua.achievement_id
      join public._analytics_scope_students_v1(p_batch_id) s on s.user_id = ua.user_id
      where ua.completed_at >= now() - interval '7 days'
      union all
      select 'sentiment_up', s.name || ' feels better: ' || cur.score || ' (was ' || prev.score || ')', cur.at, s.user_id
      from public._analytics_scope_students_v1(p_batch_id) s
      join lateral (select (w.submission_data->>'alignmentScore')::int score, w.submitted_at at, w.week_start_date wsd
                    from public.weekly_reports w where w.user_id = s.user_id and w.status = 'submitted'
                      and w.submission_data->>'alignmentScore' ~ '^[0-9]+$' order by w.week_start_date desc limit 1) cur on true
      join lateral (select (w.submission_data->>'alignmentScore')::int score
                    from public.weekly_reports w where w.user_id = s.user_id and w.status = 'submitted'
                      and w.week_start_date < cur.wsd and w.submission_data->>'alignmentScore' ~ '^[0-9]+$'
                    order by w.week_start_date desc limit 1) prev on true
      where cur.at >= now() - interval '7 days' and cur.score - prev.score >= 2
      union all
      select 'revenue', coalesce(tm.name, s.name) || ' added revenue: ' || rs.product_name || ' (' || rs.mrr_amount || ' MRR)',
             rs.created_at, rs.user_id
      from public.revenue_streams rs
      left join public.teams tm on tm.id = rs.team_id
      left join public._analytics_scope_students_v1(p_batch_id) s on s.user_id = rs.user_id
      where rs.created_at >= now() - interval '7 days'
        and (rs.team_id in (select public._admin_scope_teams(p_batch_id)) or s.user_id is not null)
    ) all_moves order by occurred_at desc limit 10
  ) m;

  return jsonb_build_object(
    'students_total', v_total,
    'active_this_week', v_active,
    'active_pct', case when v_total = 0 then 0 else round(100.0 * v_active / v_total) end,
    'at_risk', v_risk,
    'completions_this_week', v_comp,
    'avg_sentiment', v_sent,
    'deltas', jsonb_build_object(
      'active', v_active - v_active_prev,
      'completions', v_comp - v_comp_prev,
      'sentiment', case when v_sent is null or v_sent_prev is null then null else round(v_sent - v_sent_prev, 1) end),
    'what_moved', v_moved);
end
$$;

-- ---------------------------------------------------------------------------
-- My Journey
-- ---------------------------------------------------------------------------
create or replace function public.get_analytics_my_journey_v1(p_batch_id uuid, p_include_test boolean default false)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_start date; v_total int; v_funnel jsonb; v_weekly jsonb; v_pace jsonb; v_students jsonb;
begin
  perform public._analytics_assert_admin();
  select coalesce((select b.admission_date from public.diploma_batches b where b.id = p_batch_id),
                  date_trunc('week', now())::date - 56) into v_start;
  select count(*) into v_total from public._analytics_scope_students_v1(p_batch_id, p_include_test);

  select coalesce(jsonb_agg(jsonb_build_object('phase_order', p.ord, 'phase_name', p.name,
           'students', (select count(*) from public._analytics_phase_v1(p_batch_id, p_include_test) ph where ph.highest_phase = p.ord))
           order by p.ord), '[]'::jsonb)
  into v_funnel
  from (select a.name, row_number() over (order by a.sort_order)::int ord from public.achievements a
        where a.context = 'individual' and a.active and not a.always_unlocked) p;

  select coalesce(jsonb_agg(jsonb_build_object(
           'week', public._analytics_week_v1(wk.ws, p_batch_id), 'week_start', wk.ws,
           'active', wk.active, 'active_pct', case when v_total = 0 then 0 else round(100.0 * wk.active / v_total) end,
           'completions', wk.completions, 'sentiment', wk.sentiment) order by wk.ws), '[]'::jsonb)
  into v_weekly
  from (
    select g.ws,
      (select count(distinct e.user_id) from public._analytics_events_v1(p_batch_id, p_include_test) e
        where e.at >= g.ws and e.at < g.ws + 7) active,
      (select count(*) from public.task_progress tp join public.tasks t on t.id = tp.task_id
        where tp.user_id in (select user_id from public._analytics_scope_students_v1(p_batch_id, p_include_test))
          and t.activity_type = 'individual' and tp.status = 'approved'
          and tp.completed_at >= g.ws and tp.completed_at < g.ws + 7) completions,
      (select round(avg((w.submission_data->>'alignmentScore')::int), 1) from public.weekly_reports w
        where w.user_id in (select user_id from public._analytics_scope_students_v1(p_batch_id, p_include_test))
          and w.status = 'submitted' and w.context = 'individual' and w.week_start_date = g.ws
          and w.submission_data->>'alignmentScore' ~ '^[0-9]+$') sentiment
    from (select d::date as ws from generate_series(date_trunc('week', v_start::timestamp), date_trunc('week', now()), interval '7 days') d) g
  ) wk;

  -- Pace: cohort median of the phase each student had reached by the end of each week
  -- (phase N counts as reached once ≥50% of phase N-1's gated tasks were approved).
  select coalesce(jsonb_agg(jsonb_build_object(
           'week', public._analytics_week_v1(pw.ws, p_batch_id), 'week_start', pw.ws,
           'median_phase', pw.median_phase,
           'points', case when pw.ws = date_trunc('week', now())::date then pw.points else '[]'::jsonb end)
           order by pw.ws), '[]'::jsonb)
  into v_pace
  from (
    select g.ws,
      percentile_disc(0.5) within group (order by up.phase)::int as median_phase,
      jsonb_agg(jsonb_build_object('user_id', up.user_id, 'phase', up.phase)) as points
    from (select d::date as ws from generate_series(date_trunc('week', v_start::timestamp), date_trunc('week', now()), interval '7 days') d) g
    cross join lateral (
      select s.user_id, 1 + count(*) filter (where ph.approved >= ceil(ph.total * 0.5)) as phase
      from public._analytics_scope_students_v1(p_batch_id, p_include_test) s
      cross join lateral (
        select a.id,
          (select count(*) from public.tasks t where t.achievement_id = a.id and t.is_active and coalesce(t.is_recurring, false) = false) total,
          (select count(*) from public.task_progress tp join public.tasks t on t.id = tp.task_id
            where t.achievement_id = a.id and tp.user_id = s.user_id and tp.status = 'approved' and tp.completed_at < g.ws + 7) approved
        from public.achievements a
        where a.context = 'individual' and a.active and not a.always_unlocked
          and a.sort_order < (select max(sort_order) from public.achievements where context = 'individual' and active and not always_unlocked)
      ) ph
      group by s.user_id
    ) up
    group by g.ws
  ) pw;

  select coalesce(jsonb_agg(jsonb_build_object(
           'user_id', s.user_id, 'name', s.name, 'highest_phase', ph.highest_phase,
           'completed', ph.completed, 'total', ph.total, 'last_active', la.last_active,
           'mean_attempts', (select round(avg(r.attempt), 1) from public.ai_task_reviews r where r.user_id = s.user_id and r.decision = true),
           'sentiment', (select (w.submission_data->>'alignmentScore')::int from public.weekly_reports w
                          where w.user_id = s.user_id and w.status = 'submitted' and w.submission_data->>'alignmentScore' ~ '^[0-9]+$'
                          order by w.week_start_date desc limit 1))
           order by ph.highest_phase desc, ph.completed desc, s.name), '[]'::jsonb)
  into v_students
  from public._analytics_scope_students_v1(p_batch_id, p_include_test) s
  join public._analytics_phase_v1(p_batch_id, p_include_test) ph on ph.user_id = s.user_id
  left join public._analytics_last_active_v1(p_batch_id, p_include_test) la on la.user_id = s.user_id;

  return jsonb_build_object('students_total', v_total, 'funnel', v_funnel, 'weekly', v_weekly, 'pace', v_pace, 'students', v_students);
end
$$;

-- ---------------------------------------------------------------------------
-- Curriculum / review quality
-- ---------------------------------------------------------------------------
create or replace function public.get_analytics_review_quality_v1(p_batch_id uuid, p_include_test boolean default false)
returns table (
  task_id uuid, title text, journey text, phase text, started int, approved int,
  first_pass_rate numeric, mean_attempts numeric, median_hours numeric,
  rejections int, stale_in_progress int, sample_feedback text[])
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_stuck int := (public._analytics_settings_v1()->>'stuck_days')::int;
begin
  perform public._analytics_assert_admin();
  return query
  with s as (select user_id from public._analytics_scope_students_v1(p_batch_id, p_include_test)),
  tp as (
    select tp0.*, coalesce(tp0.user_id, tp0.assigned_to_user_id) subject,
      (select count(*) from jsonb_array_elements(coalesce(tp0.peer_review_history, '[]'::jsonb)) e
        where e->>'event_type' = 'review_completed' and e->>'decision' = 'rejected') peer_rejections
    from public.task_progress tp0
    where coalesce(tp0.user_id, tp0.assigned_to_user_id) in (select user_id from s)),
  ai as (
    select r.progress_id, r.task_id, r.attempt, r.decision, r.feedback, r.finished_at
    from public.ai_task_reviews r where r.user_id in (select user_id from s) and r.decision is not null)
  select t.id, t.title,
    case when t.activity_type = 'individual' then 'My Journey' else 'Team Journey' end,
    a.name,
    (select count(*)::int from tp where tp.task_id = t.id and tp.started_at is not null),
    (select count(*)::int from tp where tp.task_id = t.id and tp.status = 'approved'),
    case when t.activity_type = 'individual' then
      round(100.0 * (select count(*) from ai where ai.task_id = t.id and ai.attempt = 1 and ai.decision)
        / nullif((select count(distinct ai.progress_id) from ai where ai.task_id = t.id), 0), 0)
    else
      round(100.0 * (select count(*) from tp where tp.task_id = t.id and tp.status = 'approved' and tp.peer_rejections = 0)
        / nullif((select count(*) from tp where tp.task_id = t.id and (tp.status in ('approved', 'rejected') or tp.peer_rejections > 0)), 0), 0)
    end,
    case when t.activity_type = 'individual' then
      (select round(avg(ai.attempt), 1) from ai where ai.task_id = t.id and ai.decision)
    else
      (select round(avg(1 + tp.peer_rejections), 1) from tp where tp.task_id = t.id and tp.status = 'approved')
    end,
    (select round(percentile_cont(0.5) within group (order by extract(epoch from tp.completed_at - tp.started_at) / 3600)::numeric, 1)
      from tp where tp.task_id = t.id and tp.status = 'approved' and tp.completed_at is not null and tp.started_at is not null),
    ((select count(*) from ai where ai.task_id = t.id and not ai.decision)
      + (select coalesce(sum(tp.peer_rejections), 0) from tp where tp.task_id = t.id))::int,
    (select count(*)::int from tp where tp.task_id = t.id and tp.status = 'in_progress' and tp.submitted_at is null
      and tp.started_at < now() - v_stuck * interval '1 day'),
    coalesce((select array_agg(left(ai.feedback, 200) order by ai.finished_at desc)
      from (select * from ai where ai.task_id = t.id and not ai.decision and ai.feedback is not null order by ai.finished_at desc limit 3) ai), '{}'::text[])
  from public.tasks t
  left join public.achievements a on a.id = t.achievement_id
  where t.is_active and exists (select 1 from tp where tp.task_id = t.id)
  order by 10 desc, 7 asc nulls last, 2;
end
$$;

-- ---------------------------------------------------------------------------
-- Team milestones (meetings + revenue)
-- ---------------------------------------------------------------------------
create or replace function public.get_analytics_milestones_v1(p_batch_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare result jsonb;
begin
  perform public._analytics_assert_admin();
  select jsonb_build_object(
    'meetings_weekly', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'week', public._analytics_week_v1(sub.ws, p_batch_id), 'week_start', sub.ws,
        'meetings', sub.meetings, 'willingness_to_pay', sub.wtp) order by sub.ws), '[]'::jsonb)
      from (
        select date_trunc('week', cm.meeting_date)::date ws, count(*) meetings,
               count(*) filter (where cm.meeting_data->>'interestLevel' = 'willingness_to_pay') wtp
        from public.client_meetings cm
        where cm.deleted_at is null and cm.status::text = 'completed' and cm.meeting_date is not null
          and cm.team_id in (select public._admin_scope_teams(p_batch_id))
        group by 1) sub),
    'by_team', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'team_id', t.id, 'team_name', t.name, 'team_status', t.status::text,
        'meetings', (select count(*) from public.client_meetings cm where cm.team_id = t.id and cm.deleted_at is null and cm.status::text = 'completed'),
        'willingness_to_pay', (select count(*) from public.client_meetings cm where cm.team_id = t.id and cm.deleted_at is null and cm.status::text = 'completed' and cm.meeting_data->>'interestLevel' = 'willingness_to_pay'),
        'intent_to_try', (select count(*) from public.client_meetings cm where cm.team_id = t.id and cm.deleted_at is null and cm.status::text = 'completed' and cm.meeting_data->>'interestLevel' = 'intent_to_try'),
        'not_interested', (select count(*) from public.client_meetings cm where cm.team_id = t.id and cm.deleted_at is null and cm.status::text = 'completed' and cm.meeting_data->>'interestLevel' = 'not_interested'),
        'revenue_streams', (select count(*) from public.revenue_streams rs where rs.team_id = t.id and rs.ended_at is null),
        'mrr', (select coalesce(sum(rs.mrr_amount), 0) from public.revenue_streams rs where rs.team_id = t.id and rs.ended_at is null),
        'verified_mrr', (select coalesce(sum(rs.mrr_amount), 0) from public.revenue_streams rs where rs.team_id = t.id and rs.ended_at is null and rs.verified)
      ) order by t.name), '[]'::jsonb)
      from public.teams t where t.id in (select public._admin_scope_teams(p_batch_id)))
  ) into result;
  return result;
end
$$;

-- ---------------------------------------------------------------------------
-- Outcomes (batch vs batch on programme week)
-- ---------------------------------------------------------------------------
create or replace function public._analytics_outcomes_batch_v1(p_batch_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_b record; v_end date; v_students int; v_tasks int; v_weeks jsonb; v_totals jsonb;
begin
  select * into v_b from public.diploma_batches where id = p_batch_id;
  if v_b.id is null then return null; end if;
  v_end := least(coalesce(v_b.closed_at::date, now()::date), coalesce(v_b.completion_date, now()::date), now()::date);
  select count(*) into v_students from public.users u where u.batch_id = p_batch_id and u.primary_role = 'user'
    and u.email not like 'test\_%@test.local';
  select count(*) into v_tasks from public.tasks t where t.activity_type = 'individual' and t.is_active;

  select coalesce(jsonb_agg(jsonb_build_object(
    'week', ((g.ws - v_b.admission_date) / 7) + 1, 'week_start', g.ws,
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
  from (select d::date as ws from generate_series(date_trunc('week', v_b.admission_date::timestamp), date_trunc('week', v_end::timestamp), interval '7 days') d) g;

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

create or replace function public.get_analytics_outcomes_v1(p_batch_a uuid, p_batch_b uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  perform public._analytics_assert_admin();
  return jsonb_build_object(
    'a', coalesce(public._analytics_outcomes_batch_v1(p_batch_a), jsonb_build_object('weeks', '[]'::jsonb, 'totals', '{}'::jsonb)),
    'b', case when p_batch_b is null then null else public._analytics_outcomes_batch_v1(p_batch_b) end);
end
$$;

-- ---------------------------------------------------------------------------
-- Overview v3: participation denominator includes solo students while My Journey is on
-- ---------------------------------------------------------------------------
create or replace function public.get_analytics_overview_v3(p_batch_id uuid)
returns table (week_start date, reports int, avg_score numeric, min_score int, max_score int,
  low_scores int, high_scores int, real_blockers int, commitments_total int, commitments_completed int,
  expected_reporters int, active_teams int)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  perform public._analytics_assert_admin();
  return query
  with wr as (
    select w.week_start_date, w.team_id, w.user_id,
      case when w.submission_data->>'alignmentScore' ~ '^[0-9]+$' then (w.submission_data->>'alignmentScore')::int end as score,
      nullif(trim(coalesce(w.submission_data->>'blockers', '')), '') as blockers_text,
      case when jsonb_typeof(w.submission_data->'commitments') = 'array' then w.submission_data->'commitments' else '[]'::jsonb end as commitments
    from public.weekly_reports w
    where w.status = 'submitted' and w.submission_data is not null
      and w.user_id in (select public._admin_scope_users(p_batch_id))),
  weekly as (
    select wr.week_start_date, count(*)::int reports, round(avg(wr.score), 2) avg_score, min(wr.score) min_score, max(wr.score) max_score,
      count(*) filter (where wr.score <= 4)::int low_scores, count(*) filter (where wr.score >= 8)::int high_scores,
      count(*) filter (where length(wr.blockers_text) > 5 and lower(wr.blockers_text) not in ('none', 'none.', 'no', 'nothing', 'n/a', '-', 'nope'))::int real_blockers,
      count(distinct wr.team_id)::int active_teams,
      coalesce(sum(jsonb_array_length(wr.commitments)), 0)::int commitments_total,
      coalesce(sum((select count(*) from jsonb_array_elements(wr.commitments) c where c->>'status' = 'completed')), 0)::int commitments_completed
    from wr group by wr.week_start_date)
  select wk.week_start_date, wk.reports, wk.avg_score, wk.min_score, wk.max_score, wk.low_scores, wk.high_scores,
    wk.real_blockers, wk.commitments_total, wk.commitments_completed,
    (
      -- team members that week
      (select count(distinct tm.user_id)::int from public.team_members tm join public.users u on u.id = tm.user_id and u.primary_role::text = 'user'
        where u.id in (select public._admin_scope_users(p_batch_id))
          and tm.joined_at::date <= wk.week_start_date + 6 and (tm.left_at is null or tm.left_at::date >= wk.week_start_date))
      +
      -- solo students that week (no team membership), only while My Journey is on
      case when public.journey_enabled_v1('my_journey') then
        (select count(*)::int from public.users u
          where u.id in (select public._admin_scope_users(p_batch_id)) and u.primary_role::text = 'user'
            and u.created_at::date <= wk.week_start_date + 6
            and not exists (select 1 from public.team_members tm where tm.user_id = u.id
              and tm.joined_at::date <= wk.week_start_date + 6 and (tm.left_at is null or tm.left_at::date >= wk.week_start_date)))
      else 0 end
    ) as expected_reporters,
    wk.active_teams
  from weekly wk order by wk.week_start_date;
end
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    '_analytics_settings_v1()',
    '_analytics_scope_students_v1(uuid, boolean)',
    '_analytics_week_v1(date, uuid)',
    '_analytics_events_v1(uuid, boolean)',
    '_analytics_last_active_v1(uuid, boolean)',
    '_analytics_phase_v1(uuid, boolean)',
    '_analytics_outcomes_batch_v1(uuid)',
    'get_analytics_attention_v1(uuid, boolean)',
    'analytics_dismiss_v1(uuid, text)',
    'get_analytics_pulse_v1(uuid)',
    'get_analytics_my_journey_v1(uuid, boolean)',
    'get_analytics_review_quality_v1(uuid, boolean)',
    'get_analytics_milestones_v1(uuid)',
    'get_analytics_outcomes_v1(uuid, uuid)',
    'get_analytics_overview_v3(uuid)']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Activity log: dismissals become visible as kind 'attention_dismissed'
-- (get_admin_activity_v1 recreated in place with one more UNION branch)
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_activity_v1(
  p_user_id uuid default null,
  p_kinds text[] default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit int default 50,
  p_offset int default 0)
returns table (
  id text,
  occurred_at timestamptz,
  kind text,
  subject_user_id uuid,
  subject_name text,
  actor_user_id uuid,
  actor_name text,
  team_name text,
  object_title text,
  amount_xp int,
  amount_points int,
  status text,
  detail text,
  ref_id uuid,
  extra jsonb)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin_v1() then
    raise exception 'Unauthorized: Admin access required' using errcode = '42501';
  end if;

  return query
  with ev (id, occurred_at, kind, subject_user_id, actor_user_id, team_id,
           object_title, amount_xp, amount_points, status, detail, ref_id, extra) as (
    -- tasks: started
    select 'tp_start:' || tp.id::text, tp.started_at, 'task_started',
           coalesce(tp.user_id, tp.assigned_to_user_id), null::uuid, tp.team_id,
           t.title, null::int, null::int, null::text, null::text, tp.task_id, '{}'::jsonb
    from public.task_progress tp join public.tasks t on t.id = tp.task_id
    where tp.started_at is not null
    union all
    -- tasks: submitted
    select 'tp_submit:' || tp.id::text, tp.submitted_at, 'task_submitted',
           coalesce(tp.user_id, tp.assigned_to_user_id), null, tp.team_id,
           t.title, null, null, null, null, tp.task_id, '{}'::jsonb
    from public.task_progress tp join public.tasks t on t.id = tp.task_id
    where tp.submitted_at is not null
    union all
    -- tasks: peer-review outcome (team tasks; solo outcomes come from ai_task_reviews)
    select 'tp_review:' || tp.id::text, coalesce(tp.completed_at, tp.updated_at),
           case when tp.status = 'approved' then 'task_approved' else 'task_rejected' end,
           coalesce(tp.user_id, tp.assigned_to_user_id), tp.reviewer_user_id, tp.team_id,
           t.title, case when tp.status = 'approved' then tp.points_awarded end, null,
           tp.status::text, tp.review_feedback, tp.task_id, '{}'::jsonb
    from public.task_progress tp join public.tasks t on t.id = tp.task_id
    where tp.status in ('approved', 'rejected') and tp.activity_type <> 'individual'
    union all
    -- tasks: AI review attempts (solo)
    select 'ai:' || r.id::text, coalesce(r.finished_at, r.updated_at),
           case when r.decision then 'task_approved' else 'task_rejected' end,
           r.user_id, null, null, t.title,
           case when r.decision then t.base_xp_reward end, null,
           r.decided_by, r.feedback, r.task_id,
           jsonb_build_object('attempt', r.attempt, 'decided_by', r.decided_by)
    from public.ai_task_reviews r join public.tasks t on t.id = r.task_id
    where r.decision is not null
    union all
    -- XP ledger
    select 'tx:' || x.id::text, x.created_at, 'xp', x.user_id, x.validated_by_user_id, x.team_id,
           coalesce(t.title, a.name), x.xp_change, x.points_change, x.type::text, x.description,
           coalesce(x.task_id, x.achievement_id),
           jsonb_build_object('economy', case when x.activity_type = 'individual' then 'my_journey' else 'team' end,
                              'type', x.type)
    from public.transactions x
    left join public.tasks t on t.id = x.task_id
    left join public.achievements a on a.id = x.achievement_id
    where x.user_id is not null
    union all
    -- strikes
    select 'strike:' || s.id::text, s.created_at, 'strike_issued', s.user_id, null, s.team_id,
           s.title, -s.xp_penalty, -s.points_penalty, s.status::text, s.description, s.id, '{}'::jsonb
    from public.team_strikes s
    union all
    select 'strike_expl:' || s.id::text, s.explained_at, 'strike_explained', s.user_id, s.explained_by_user_id, s.team_id,
           s.title, null, null, s.status::text, s.explanation, s.id, '{}'::jsonb
    from public.team_strikes s where s.explained_at is not null
    union all
    select 'strike_res:' || s.id::text, s.resolved_at, 'strike_resolved', s.user_id, s.resolved_by_user_id, s.team_id,
           s.title, null, null, s.status::text, null, s.id, '{}'::jsonb
    from public.team_strikes s where s.resolved_at is not null
    union all
    -- client meetings
    select 'meet:' || m.id::text, coalesce(m.completed_at, m.created_at), 'meeting_logged',
           m.responsible_user_id, null, m.team_id, m.client_name, null, null, m.status::text,
           m.how_it_went, m.id, jsonb_build_object('client_type', m.client_type, 'call_type', m.call_type)
    from public.client_meetings m where m.deleted_at is null and m.responsible_user_id is not null
    union all
    -- weekly reports
    select 'wr:' || w.id::text, coalesce(w.submitted_at, w.updated_at), 'weekly_report', w.user_id, null, w.team_id,
           null, null, null, w.context, null, w.id,
           jsonb_build_object('week_number', w.week_number, 'week_year', w.week_year)
    from public.weekly_reports w where w.status = 'submitted'
    union all
    -- phase achievements
    select 'ach:' || ua.id::text, coalesce(ua.completed_at, ua.created_at), 'achievement', ua.user_id, null, null,
           a.name, ua.xp_awarded, ua.points_awarded, null, null, ua.achievement_id, '{}'::jsonb
    from public.user_achievements ua join public.achievements a on a.id = ua.achievement_id
    union all
    -- support tickets
    select 'ticket:' || st.id::text, st.created_at, 'ticket', st.user_id, null, null, st.title, null, null,
           st.status, st.description, st.id, jsonb_build_object('priority', st.priority, 'category', st.category)
    from public.support_tickets st
    union all
    select 'ticket_res:' || st.id::text, st.resolved_at, 'ticket_resolved', st.user_id, st.resolved_by_user_id, null,
           st.title, null, null, st.status, st.admin_note, st.id, '{}'::jsonb
    from public.support_tickets st where st.resolved_at is not null
    union all
    -- task suggestions
    select 'sug:' || sg.id::text, sg.created_at, 'suggestion', sg.user_id, null, null, sg.title, null, null,
           sg.status, sg.description, sg.id, '{}'::jsonb
    from public.task_suggestions sg
    union all
    select 'sug_rev:' || sg.id::text, sg.reviewed_at, 'suggestion_reviewed', sg.user_id, sg.reviewed_by_user_id, null,
           sg.title, null, null, sg.status, sg.admin_note, sg.id, '{}'::jsonb
    from public.task_suggestions sg where sg.reviewed_at is not null
    union all
    -- Startie
    select 'chat:' || th.id::text, th.created_at, 'startie_chat', th.user_id, null, null, th.title, null, null,
           null, null, th.id, '{}'::jsonb
    from public.assistant_threads th
    union all
    -- accounts (audit_log, only the rows that mean something)
    select 'audit:' || al.id::text, al.created_at, 'account_joined', al.record_id, al.changed_by_user_id, null,
           null, null, null, null, null, al.record_id, '{}'::jsonb
    from public.audit_log al where al.table_name = 'users' and al.action = 'INSERT'
    union all
    select 'audit:' || al.id::text, al.created_at,
           case when 'status' = any(al.changed_fields) then 'account_status'
                when 'primary_role' = any(al.changed_fields) then 'account_role'
                when 'batch_id' = any(al.changed_fields) then 'account_batch'
                else 'account_name' end,
           al.record_id, al.changed_by_user_id, null,
           (select b.name from public.diploma_batches b where b.id = (al.new_data->>'batch_id')::uuid),
           null, null, coalesce(al.new_data->>'status', al.new_data->>'primary_role'), null, al.record_id,
           jsonb_build_object('old_name', al.old_data->>'name')
    from public.audit_log al
    where al.table_name = 'users' and al.action = 'UPDATE'
      and al.changed_fields && array['status', 'primary_role', 'batch_id', 'name']::text[]
    union all
    select 'audit:' || al.id::text, al.created_at, 'team_joined', (al.new_data->>'user_id')::uuid,
           al.changed_by_user_id, (al.new_data->>'team_id')::uuid, null, null, null, null, null,
           (al.new_data->>'team_id')::uuid, '{}'::jsonb
    from public.audit_log al where al.table_name = 'team_members' and al.action = 'INSERT'
    union all
    select 'audit:' || al.id::text, al.created_at, 'team_left', (al.new_data->>'user_id')::uuid,
           al.changed_by_user_id, (al.new_data->>'team_id')::uuid, null, null, null, null, null,
           (al.new_data->>'team_id')::uuid, '{}'::jsonb
    from public.audit_log al
    where al.table_name = 'team_members' and al.action = 'UPDATE'
      and al.new_data->>'left_at' is not null and al.old_data->>'left_at' is null
    union all
    -- attention list dismissals (analytics v2)
    select 'dismiss:' || d.id::text, d.created_at, 'attention_dismissed', d.user_id, d.admin_id, null,
           null, null, null, null, d.note, d.id, jsonb_build_object('until', d.until)
    from public.analytics_dismissals d
  )
  select e.id, e.occurred_at, e.kind, e.subject_user_id,
         coalesce(nullif(btrim(su.name), ''), split_part(su.email, '@', 1)),
         e.actor_user_id, coalesce(nullif(btrim(au.name), ''), split_part(au.email, '@', 1)),
         tm.name, e.object_title, e.amount_xp, e.amount_points, e.status, e.detail, e.ref_id, e.extra
  from ev e
  join public.users su on su.id = e.subject_user_id
  left join public.users au on au.id = e.actor_user_id
  left join public.teams tm on tm.id = e.team_id
  where e.occurred_at is not null
    and su.email not like 'test\_%@test.local'
    and (tm.id is null or tm.name not like '[TEST]%')
    and (p_user_id is null or e.subject_user_id = p_user_id)
    and (p_kinds is null or e.kind = any(p_kinds))
    and (p_from is null or e.occurred_at >= p_from)
    and (p_to is null or e.occurred_at <= p_to)
  order by e.occurred_at desc
  limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset);
end
$$;

