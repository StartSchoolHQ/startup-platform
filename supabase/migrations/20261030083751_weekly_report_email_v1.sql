-- Weekly report email reminders (n8n workflow WF-SMP-REPORT-REMINDER).
--
-- The in-app reminders (cron jobs 5, 7, 10, 11) only reach students who log
-- in. This adds an email channel without touching them: n8n calls
-- get_weekly_report_email_recipients_v1 on Friday ('2day') and Sunday
-- ('1day'), mails each row through the Workspace Gmail account, then calls
-- weekly_report_email_mark_sent_v1 per row. The log makes the recipients
-- call idempotent (a re-run or a half-failed run never double-mails) and is
-- the audit trail of who was mailed for which week.
--
-- The "who is missing" rule is a verbatim mirror of
-- send_individual_weekly_report_reminders_v1 (solo: Monday 12:00 Riga
-- cutoff, no solo mail for active-team members while Team Journey is on)
-- and send_weekly_report_reminders[_sunday] (team: Monday 10:00 cutoff,
-- 8,000 Team XP exemption). Both journeys respect journey_enabled_v1.
--
-- p_test_emails: when given, the recipients call returns one synthetic row
-- per address (user_id null, nothing read from users) so the workflow can be
-- dry-run against the team without mailing a student. mark_sent ignores
-- rows with a null user_id.
--
-- Purely additive: no existing table, policy, function or cron job touched.
--
-- Rollback:
--   drop function public.get_weekly_report_email_recipients_v1(text, text[]);
--   drop function public.weekly_report_email_mark_sent_v1(uuid, text, text, integer, integer, text);
--   drop table public.weekly_report_email_log;

-- 1. Send log
create table public.weekly_report_email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  context text not null check (context in ('individual', 'team')),
  kind text not null check (kind in ('2day', '1day')),
  week_year integer not null,
  week_number integer not null,
  email text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, context, kind, week_year, week_number)
);

comment on table public.weekly_report_email_log is
  'One row per weekly-report reminder email sent by n8n. Service role only.';

alter table public.weekly_report_email_log enable row level security;
revoke all on table public.weekly_report_email_log from anon, authenticated;

-- 2. Recipients
create or replace function public.get_weekly_report_email_recipients_v1(
  p_kind text,
  p_test_emails text[] default null
)
 returns table (
   user_id uuid,
   name text,
   email text,
   context text,
   team_name text,
   kind text,
   week_year integer,
   week_number integer,
   due_label text
 )
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_solo record;
  v_team record;
  v_team_journey boolean;
begin
  if p_kind not in ('2day', '1day') then
    raise exception 'p_kind must be ''2day'' or ''1day''';
  end if;

  -- Solo cutoff Monday 12:00 Riga; team cutoff Monday 10:00 (shared v1).
  select * into v_solo
  from public.get_riga_week_boundaries_v2(now(), '12:00:00');
  select * into v_team from public.get_riga_week_boundaries();

  -- Dry run: synthetic rows, nothing read from users, nothing logged.
  if p_test_emails is not null then
    return query
    select null::uuid,
           split_part(e, '@', 1),
           e,
           'individual'::text,
           null::text,
           p_kind,
           v_solo.week_year,
           v_solo.week_number,
           'Monday 12:00 Riga time'::text
    from unnest(p_test_emails) as e
    where e <> '';
    return;
  end if;

  v_team_journey := public.journey_enabled_v1('team_journey');

  -- Solo (My Journey) rows.
  if public.journey_enabled_v1('my_journey') then
    return query
    select u.id,
           coalesce(nullif(u.name, ''), split_part(u.email, '@', 1)),
           u.email,
           'individual'::text,
           null::text,
           p_kind,
           v_solo.week_year,
           v_solo.week_number,
           'Monday 12:00 Riga time'::text
    from public.users u
    join auth.users au on au.id = u.id
    where u.status = 'active'
      and coalesce(u.primary_role, 'user') = 'user'
      and au.email_confirmed_at is not null
      and u.email is not null
      and not (v_team_journey and exists (
        select 1
        from public.team_members tm
        join public.teams t on t.id = tm.team_id
        where tm.user_id = u.id and tm.left_at is null and t.status = 'active'))
      and not exists (
        select 1 from public.weekly_reports wr
        where wr.user_id = u.id
          and wr.context = 'individual'
          and wr.status = 'submitted'
          and wr.week_year = v_solo.week_year
          and wr.week_number = v_solo.week_number)
      and not exists (
        select 1 from public.weekly_report_email_log l
        where l.user_id = u.id
          and l.context = 'individual'
          and l.kind = p_kind
          and l.week_year = v_solo.week_year
          and l.week_number = v_solo.week_number)
    order by 2;
  end if;

  -- Team (Team Journey) rows.
  if v_team_journey then
    return query
    select u.id,
           coalesce(nullif(u.name, ''), split_part(u.email, '@', 1)),
           u.email,
           'team'::text,
           t.name,
           p_kind,
           v_team.week_year,
           v_team.week_number,
           'Monday 10:00 Riga time'::text
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    join public.users u on u.id = tm.user_id
    join auth.users au on au.id = u.id
    where t.status = 'active'
      and tm.left_at is null
      and u.status = 'active'
      and au.email_confirmed_at is not null
      and u.email is not null
      and u.team_xp < 8000
      and not exists (
        select 1 from public.weekly_reports wr
        where wr.user_id = tm.user_id
          and wr.team_id = tm.team_id
          and wr.context = 'team'
          and wr.week_number = v_team.week_number
          and wr.week_year = v_team.week_year)
      and not exists (
        select 1 from public.weekly_report_email_log l
        where l.user_id = u.id
          and l.context = 'team'
          and l.kind = p_kind
          and l.week_year = v_team.week_year
          and l.week_number = v_team.week_number)
    order by 2;
  end if;
end;
$function$;

-- 3. Mark sent (idempotent)
create or replace function public.weekly_report_email_mark_sent_v1(
  p_user_id uuid,
  p_context text,
  p_kind text,
  p_week_year integer,
  p_week_number integer,
  p_email text
)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_count integer := 0;
begin
  if p_user_id is null then
    return 0;
  end if;
  insert into public.weekly_report_email_log
    (user_id, context, kind, week_year, week_number, email)
  values
    (p_user_id, p_context, p_kind, p_week_year, p_week_number, p_email)
  on conflict (user_id, context, kind, week_year, week_number) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

-- 4. Grants: service role only (the n8n Supabase credential).
revoke all on function public.get_weekly_report_email_recipients_v1(text, text[])
  from public, anon, authenticated;
grant execute on function public.get_weekly_report_email_recipients_v1(text, text[])
  to service_role;

revoke all on function public.weekly_report_email_mark_sent_v1(uuid, text, text, integer, integer, text)
  from public, anon, authenticated;
grant execute on function public.weekly_report_email_mark_sent_v1(uuid, text, text, integer, integer, text)
  to service_role;
