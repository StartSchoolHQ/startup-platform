-- Program assistant, phase 2 (2026-10-14): the verdict engine. Spec §5.3 step 4:
-- docs/internal/superpowers/specs/2026-10-13-program-assistant-design.md
--
-- program.student_status_v2(date) = qwasar.student_status v1.5 (untouched,
-- the Cowork skill and the Sheet export keep using it) with:
--   - bars read from program.timeline_week instead of hard-coded numbers
--     (NULL threshold = not evaluated against a bar, login rules only);
--   - trend against the latest *scheduled* snapshot at least 6 days older;
--   - cumulative attendance since 2026-09-02 (present / (present + absent),
--     excused removed from the denominator): below attendance_rule_pct with
--     at least attendance_min_sessions sessions → Talk to;
--   - not_evaluated_reason for hackathon / catch-up / break / review weeks;
--   - part-time students stay Not tracked (spec §13 default);
--   - platform user_id attached by lowercased email (read only).
-- program.verdict stores one row per student per run; written by
-- public.program_verdicts_write_v1 (service role) from the run route.
--
-- Rollback: drop function public.program_verdicts_write_v1(uuid, date);
--           drop table program.verdict;
--           drop function program.student_status_v2(date);

create or replace function program.student_status_v2(p_snapshot date)
returns table (
  qwasar_user_id        integer,
  track                 text,
  study_type            text,
  week                  integer,
  progress              smallint,
  prev_progress         smallint,
  prev_snapshot_date    date,
  trend                 text,
  days_since_login      integer,
  attendance_pct        numeric,
  attendance_sessions   integer,
  attendance_incomplete boolean,
  status                text,
  reason                text,
  not_evaluated_reason  text,
  user_id               uuid
)
language sql stable security definer
set search_path = public, program, qwasar, pg_temp
as $$
with settings as (
  select coalesce((ps.value->>'attendance_rule_pct')::numeric, 75)   as rule_pct,
         coalesce((ps.value->>'attendance_min_sessions')::integer, 8) as min_sessions
  from public.platform_settings ps where ps.key = 'program_assistant'
  union all
  select 75, 8 where not exists (select 1 from public.platform_settings where key = 'program_assistant')
  limit 1
),
prev_date as (
  select max(s.snapshot_date) as d
  from qwasar.progress_snapshot s
  where s.kind = 'scheduled' and s.snapshot_date <= p_snapshot - 6
),
cur as (
  select s.qwasar_user_id, lower(s.email) as email, s.last_login_at,
         coalesce(max(s.percent) filter (where s.module = 'Preseason Web'), 0)    as web,
         coalesce(max(s.percent) filter (where s.module = 'Preseason Data'), 0)   as data,
         coalesce(max(s.percent) filter (where s.module = 'Season 01 Arc 01'), 0) as a01
  from qwasar.progress_snapshot s
  where s.snapshot_date = p_snapshot
  group by s.qwasar_user_id, lower(s.email), s.last_login_at
),
prv as (
  select s.qwasar_user_id,
         coalesce(max(s.percent) filter (where s.module = 'Preseason Web'), 0)  as web,
         coalesce(max(s.percent) filter (where s.module = 'Preseason Data'), 0) as data
  from qwasar.progress_snapshot s, prev_date
  where s.snapshot_date = prev_date.d
  group by s.qwasar_user_id
),
j as (
  select c.qwasar_user_id, c.email, c.a01,
         coalesce(t.tech_track, 'FS') as trk,
         t.study_type,
         coalesce(t.study_type, '') like 'part-time%' as pt,
         case when coalesce(t.study_type, '') like 'part-time%' then 'PT'
              when t.tech_track = 'ML' then 'ML' else 'FS' end as tl_track,
         case t.tech_track when 'FS' then 'Preseason Web' when 'ML' then 'Preseason Data' end as own_module,
         greatest(c.web, c.data) as pre_any,
         case t.tech_track when 'FS' then c.web when 'ML' then c.data
              else greatest(c.web, c.data) end::smallint as progress,
         case when p.qwasar_user_id is null then null
              when t.tech_track = 'FS' then p.web
              when t.tech_track = 'ML' then p.data
              else greatest(p.web, p.data) end::smallint as prev_progress,
         case when c.last_login_at is null then null
              else p_snapshot - (c.last_login_at at time zone 'UTC')::date end as days
  from cur c
  left join qwasar.student_track t on t.qwasar_user_id = c.qwasar_user_id
  left join prv p on p.qwasar_user_id = c.qwasar_user_id
),
w as (
  select j.*,
         tw.week as wk, tw.flag,
         case when tw.threshold_percent is not null
               and (j.own_module is null or tw.threshold_module = j.own_module)
              then tw.threshold_percent end as bar
  from j
  left join program.timeline_week tw
    on tw.track = j.tl_track and p_snapshot between tw.starts and tw.ends
),
att as (
  select a.student_email,
         count(*) filter (where a.status in ('present', 'absent'))::integer as sessions,
         count(*) filter (where a.status = 'present')::integer as present
  from program.attendance_event a
  where a.event_date >= date '2026-09-02' and a.event_date <= p_snapshot
  group by a.student_email
),
k as (
  select w.*,
         (w.progress - w.prev_progress) as gain,
         (w.bar is not null and w.progress >= w.bar) as on_timeline,
         (w.days is null) as r_never,
         (w.days >= 7) as r_nologin,
         (w.progress = 0 and w.days >= 4) as r_zero,
         (w.progress = 0) as a_zero,
         (w.progress <= 6 and w.days >= 3) as a_low,
         (w.prev_progress is not null and (w.progress - w.prev_progress) <= 0 and w.progress < 100) as a_nogain,
         (w.days is null or w.days >= 7) as quiet,
         at.sessions, at.present,
         (at.student_email is null) as att_incomplete,
         case when at.sessions > 0 then round(at.present * 100.0 / at.sessions, 1) end as att_pct
  from w
  left join att at on at.student_email = w.email
),
v as (
  select k.*, s.rule_pct, s.min_sessions,
    case
      when k.pt then 'Not tracked'
      when k.wk >= 6 and k.bar is not null and k.progress >= k.bar
           and (k.a01 > 0 or (k.wk = 6 and k.trk = 'FS')) then 'On pace'
      when k.wk >= 6 and k.bar is not null and k.progress >= k.bar then
           case when k.quiet then 'Talk to' else 'Watch' end
      when k.wk >= 6 and k.bar is not null then
           case when k.quiet or k.progress = 0 then 'Talk to' else 'Watch' end
      when k.on_timeline then 'On pace'
      when k.r_never or k.r_nologin or k.r_zero then 'Talk to'
      when k.a_zero or k.a_low or k.a_nogain then 'Watch'
      else 'On pace'
    end as base_status,
    case
      when k.pt then 'part-time: not actively tracked'
      when k.wk >= 6 and k.bar is not null and k.progress >= k.bar
           and (k.a01 > 0 or (k.wk = 6 and k.trk = 'FS')) then
        concat_ws('; ', format('on timeline (Preseason %s%%, S01A01 %s%%)', k.progress, k.a01),
          case when k.days >= 7 then format('quiet %s d', k.days) end)
      when k.wk >= 6 and k.bar is not null and k.progress >= k.bar then
        concat_ws('; ', 'S01A01 not started',
          case when k.days is null then 'never logged in'
               when k.days >= 7 then format('no login %s d', k.days) end)
      when k.wk >= 6 and k.bar is not null then
        concat_ws('; ', format('behind: Preseason %s%% < %s%%', k.progress, k.bar),
          case when k.days is null then 'never logged in'
               when k.days >= 7 then format('no login %s d', k.days) end)
      when k.on_timeline then
        concat_ws('; ', format('on timeline (≥%s%%)', k.bar),
          case when k.days >= 7 then format('quiet %s d', k.days) end)
      when k.r_never or k.r_nologin or k.r_zero then
        concat_ws('; ',
          case when k.r_never then 'never logged in' end,
          case when k.r_nologin then format('no login %s d', k.days) end,
          case when k.r_zero then format('0%% and no login %s d', k.days) end)
      when k.a_zero or k.a_low or k.a_nogain then
        concat_ws('; ',
          case when k.a_zero then '0% progress' end,
          case when k.a_low and not k.a_zero then format('%s%%, no login %s d', k.progress, k.days) end,
          case when k.a_nogain then 'no gain this week' end)
      else case when k.gain > 0 then format('+%s%%', k.gain) else '' end
    end as base_reason,
    (not k.pt and not k.att_incomplete
       and k.sessions >= s.min_sessions and k.att_pct < s.rule_pct) as att_fail
  from k cross join settings s
)
select v.qwasar_user_id,
       v.trk as track,
       v.study_type,
       v.wk as week,
       v.progress,
       v.prev_progress,
       (select d from prev_date) as prev_snapshot_date,
       case when v.pt or v.prev_progress is null then 'na'
            when v.gain > 0 then 'up' when v.gain < 0 then 'down' else 'flat' end as trend,
       v.days as days_since_login,
       case when v.pt then null else v.att_pct end as attendance_pct,
       case when v.pt then null else coalesce(v.sessions, 0) end as attendance_sessions,
       (not v.pt and v.att_incomplete) as attendance_incomplete,
       case when v.att_fail then 'Talk to' else v.base_status end as status,
       nullif(concat_ws('; ', nullif(v.base_reason, ''),
         case when v.att_fail then format('attendance %s%% (< %s%%)', v.att_pct, v.rule_pct) end), '') as reason,
       case when v.wk is null then 'outside the timeline'
            when v.flag = 'hackathon' then 'hackathon week'
            when v.flag = 'catchup' then 'catch-up week'
            when v.flag = 'break' then 'break week'
            when v.flag = 'review' then 'performance review week' end as not_evaluated_reason,
       (select u.id from public.users u where lower(u.email) = v.email limit 1) as user_id
from v
$$;

revoke all on function program.student_status_v2(date) from public, anon, authenticated;
grant execute on function program.student_status_v2(date) to service_role;

-- ---------------------------------------------------------------
-- Verdicts per run
-- ---------------------------------------------------------------
create table program.verdict (
  id                    bigint generated always as identity primary key,
  run_id                uuid not null references program.run (id) on delete cascade,
  qwasar_user_id        integer not null,
  snapshot_date         date not null,
  track                 text,
  study_type            text,
  week                  integer,
  progress              smallint,
  prev_progress         smallint,
  prev_snapshot_date    date,
  trend                 text not null check (trend in ('up', 'flat', 'down', 'na')),
  days_since_login      integer,
  attendance_pct        numeric(5,1),
  attendance_sessions   integer,
  attendance_incomplete boolean not null default false,
  status                text not null check (status in ('On pace', 'Watch', 'Talk to', 'Not tracked')),
  reason                text,
  not_evaluated_reason  text,
  user_id               uuid,
  created_at            timestamptz not null default now(),
  unique (run_id, qwasar_user_id)
);
create index verdict_snapshot_idx on program.verdict (snapshot_date desc, status);
create index verdict_user_idx on program.verdict (user_id) where user_id is not null;

alter table program.verdict enable row level security;
create policy verdict_admin_select on program.verdict
  for select to authenticated using (public.is_admin_v1());
grant select on program.verdict to authenticated;
grant select, insert, update, delete on program.verdict to service_role;

create or replace function public.program_verdicts_write_v1(p_run_id uuid, p_snapshot_date date)
returns jsonb
language plpgsql security definer
set search_path = public, program, pg_temp
as $$
declare
  v_n integer;
begin
  delete from program.verdict where run_id = p_run_id;
  insert into program.verdict
    (run_id, qwasar_user_id, snapshot_date, track, study_type, week, progress,
     prev_progress, prev_snapshot_date, trend, days_since_login, attendance_pct,
     attendance_sessions, attendance_incomplete, status, reason,
     not_evaluated_reason, user_id)
  select p_run_id, s.qwasar_user_id, p_snapshot_date, s.track, s.study_type, s.week,
         s.progress, s.prev_progress, s.prev_snapshot_date, s.trend, s.days_since_login,
         s.attendance_pct, s.attendance_sessions, s.attendance_incomplete, s.status,
         s.reason, s.not_evaluated_reason, s.user_id
  from program.student_status_v2(p_snapshot_date) s;
  get diagnostics v_n = row_count;
  return (
    select jsonb_build_object(
      'written', v_n,
      'by_status', coalesce((select jsonb_object_agg(status, n) from (
         select status, count(*) n from program.verdict where run_id = p_run_id group by 1) x), '{}'::jsonb),
      'by_trend', coalesce((select jsonb_object_agg(trend, n) from (
         select trend, count(*) n from program.verdict where run_id = p_run_id group by 1) y), '{}'::jsonb),
      'attendance_incomplete', (select count(*) from program.verdict where run_id = p_run_id and attendance_incomplete),
      'matched_users', (select count(*) from program.verdict where run_id = p_run_id and user_id is not null))
  );
end $$;

revoke all on function public.program_verdicts_write_v1(uuid, date) from public, anon, authenticated;
grant execute on function public.program_verdicts_write_v1(uuid, date) to service_role;
