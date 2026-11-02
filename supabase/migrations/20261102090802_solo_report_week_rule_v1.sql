-- Solo (My Journey) weekly report: which week a submission belongs to (2026-11-02).
--
-- Problem: the week closed and opened in one instant (Monday 12:00 Riga since
-- 2026-10-26, 10:00 before), so a report submitted Monday afternoon — a
-- retrospective on LAST week — was filed under the NEW week and then blocked
-- the student's real report on Friday with ALREADY_SUBMITTED. 7-8 students a
-- week since launch; 7 blocked on 2026-11-02 (rows re-stamped the same day,
-- previous values in public.solo_report_week_restamp_backup_20261102).
--
-- Rule now: a solo report submitted Monday-Thursday (Riga) belongs to the
-- PREVIOUS week; Friday-Sunday to the current week. Monday 12:00 stays as the
-- reminder nudge only (banner, copy, cron/email reminders unchanged).
--
--   get_solo_report_week_v1(input)             new, invoker, authenticated + service_role
--   submit_individual_weekly_report_v1          \
--   get_individual_weekly_report_status_v1       > re-created on the new rule; bodies
--   send_individual_weekly_report_reminders_v1  /  otherwise identical to 20261026124623
--   get_weekly_report_email_recipients_v1       /  (status also returns reminder_open)
--
-- Verbatim pre-change bodies: <fn>_backup_v1 (no EXECUTE for anon/authenticated).
-- Team Journey untouched (shared get_riga_week_boundaries @ 10:00).
--
-- Rollback: for each of the four, `select pg_get_functiondef('<fn>_backup_v1'::regproc)`,
-- rename to <fn>, re-apply (grants persist), drop the backups, then
-- `drop function public.get_solo_report_week_v1(timestamptz);`.
-- Data: per row in public.solo_report_week_restamp_backup_20261102, newest
-- week first (one row at a time, to respect the partial unique index):
--   update public.weekly_reports wr
--      set week_year = b.week_year, week_number = b.week_number,
--          week_start_date = b.week_start_date, week_end_date = b.week_end_date
--     from public.solo_report_week_restamp_backup_20261102 b where b.id = wr.id;
-- then drop the backup table.

-- ---------------------------------------------------------------------------
-- 1. The rule
-- ---------------------------------------------------------------------------
create or replace function public.get_solo_report_week_v1(
  input_date timestamptz default now()
)
returns table (
  week_start date,
  week_end date,
  week_number integer,
  week_year integer
)
language plpgsql
stable
set search_path = public, pg_temp
as $function$
declare
  riga_timestamp timestamp;
  anchor date;
  week_start_calc date;
begin
  riga_timestamp := input_date at time zone 'Europe/Riga';
  -- Shift back four days in Riga local time: Friday 00:00 becomes Monday
  -- 00:00 (new week opens), Thursday 23:59 becomes Sunday 23:59 (still the
  -- previous week). Done on the local timestamp so DST changes never move
  -- the boundary.
  anchor := (riga_timestamp - interval '4 days')::date;
  week_start_calc := anchor - (extract(dow from anchor)::integer + 6) % 7;

  return query select
    week_start_calc,
    week_start_calc + 6,
    extract(week from week_start_calc)::integer,
    extract(isoyear from week_start_calc)::integer;
end;
$function$;

revoke all on function public.get_solo_report_week_v1(timestamptz) from public, anon;
grant execute on function public.get_solo_report_week_v1(timestamptz) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Verbatim backups of the four functions as they were before this migration
--    (bodies = 20261026124623_solo_weekly_report_cutoff_12_v1.sql and
--    20261030083751_weekly_report_email_v1.sql, under the _backup_v1 names)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_individual_weekly_report_v1_backup_v1(p_submission_data jsonb, p_as_draft boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_week record;
  v_commitments jsonb;
  v_next jsonb;
  v_score numeric;
  v_reason text;
  v_blockers text;
  v_data jsonb;
  v_existing_id uuid;
  v_existing_status text;
  v_id uuid;
  v_status text;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if not public.journey_enabled_v1('my_journey') then
    raise exception 'MY_JOURNEY_DISABLED';
  end if;
  if p_submission_data is null
     or jsonb_typeof(p_submission_data) <> 'object' then
    raise exception 'Submission must be a JSON object';
  end if;

  -- Solo cutoff: Monday 12:00 Riga (team reports stay on the 10:00 v1).
  select * into v_week
  from public.get_riga_week_boundaries_v2(now(), '12:00:00');

  -- Q1: commitments — keep only rows with text, whitelist keys, default status.
  select coalesce(jsonb_agg(jsonb_build_object(
           'text', btrim(c->>'text'),
           'status', case when c->>'status' in ('completed','in_progress','not_done')
                          then c->>'status' else 'completed' end,
           'explanation', coalesce(c->>'explanation', '')
         ) order by ord), '[]'::jsonb)
    into v_commitments
  from jsonb_array_elements(
         case when jsonb_typeof(p_submission_data->'commitments') = 'array'
              then p_submission_data->'commitments' else '[]'::jsonb end
       ) with ordinality as t(c, ord)
  where jsonb_typeof(c) = 'object'
    and length(btrim(coalesce(c->>'text', ''))) > 0;

  -- Q3: next-week commitments — drop blanks, trim.
  select coalesce(jsonb_agg(to_jsonb(btrim(n)) order by ord), '[]'::jsonb)
    into v_next
  from jsonb_array_elements_text(
         case when jsonb_typeof(p_submission_data->'nextWeekCommitments') = 'array'
              then p_submission_data->'nextWeekCommitments' else '[]'::jsonb end
       ) with ordinality as t(n, ord)
  where length(btrim(coalesce(n, ''))) > 0;

  v_blockers := coalesce(p_submission_data->>'blockers', '');
  v_reason   := coalesce(p_submission_data->>'alignmentReason', '');
  begin
    v_score := (p_submission_data->>'alignmentScore')::numeric;
  exception when others then
    v_score := null;
  end;

  if not p_as_draft then
    if jsonb_array_length(v_commitments) = 0 then
      raise exception 'At least one commitment is required';
    end if;
    if exists (select 1 from jsonb_array_elements(v_commitments) c
               where length(c->>'text') < 5) then
      raise exception 'Commitment must be at least 5 characters';
    end if;
    if jsonb_array_length(v_next) = 0 then
      raise exception 'At least one commitment for next week is required';
    end if;
    if exists (select 1 from jsonb_array_elements_text(v_next) n
               where length(n) < 5) then
      raise exception 'Next week commitment must be at least 5 characters';
    end if;
    if v_score is null or v_score <> trunc(v_score)
       or v_score < 1 or v_score > 10 then
      raise exception 'Alignment score must be a whole number between 1 and 10';
    end if;
    if length(btrim(v_reason)) < 5 then
      raise exception 'Alignment reason must be at least 5 characters';
    end if;
  end if;

  v_data := jsonb_build_object(
    'commitments', v_commitments,
    'blockers', v_blockers,
    'nextWeekCommitments', v_next,
    'alignmentScore', case when v_score is null then null else v_score::int end,
    'alignmentReason', v_reason
  );
  if not p_as_draft then
    v_data := v_data || jsonb_build_object('submittedAt', now());
  end if;

  select id, status into v_existing_id, v_existing_status
  from public.weekly_reports
  where user_id = v_uid
    and context = 'individual'
    and week_year = v_week.week_year
    and week_number = v_week.week_number
  order by (status = 'submitted') desc, created_at desc
  limit 1;

  if v_existing_status = 'submitted' then
    raise exception 'ALREADY_SUBMITTED';
  end if;

  v_status := case when p_as_draft then 'draft' else 'submitted' end;

  if v_existing_id is not null then
    update public.weekly_reports
       set submission_data = v_data,
           status = v_status,
           submitted_at = case when p_as_draft then null else now() end,
           updated_at = now()
     where id = v_existing_id
     returning id into v_id;
  else
    begin
      insert into public.weekly_reports (
        user_id, team_id, context, week_start_date, week_end_date,
        week_number, week_year, submission_data, status, submitted_at
      ) values (
        v_uid, null, 'individual', v_week.week_start, v_week.week_end,
        v_week.week_number, v_week.week_year, v_data, v_status,
        case when p_as_draft then null else now() end
      )
      returning id into v_id;
    exception when unique_violation then
      raise exception 'ALREADY_SUBMITTED';
    end;
  end if;

  return jsonb_build_object(
    'report_id', v_id,
    'status', v_status,
    'week_number', v_week.week_number,
    'week_year', v_week.week_year,
    'week_start', v_week.week_start,
    'week_end', v_week.week_end
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_individual_weekly_report_status_v1_backup_v1()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with w as (
    -- Solo cutoff: Monday 12:00 Riga.
    select * from public.get_riga_week_boundaries_v2(now(), '12:00:00')
  ),
  cur as (
    select wr.status, wr.submitted_at, wr.submission_data
    from public.weekly_reports wr, w
    where wr.user_id = auth.uid()
      and wr.context = 'individual'
      and wr.week_year = w.week_year
      and wr.week_number = w.week_number
    order by (wr.status = 'submitted') desc, wr.created_at desc
    limit 1
  ),
  hist as (
    select wr.id, wr.week_number, wr.week_year, wr.week_start_date,
           wr.week_end_date, wr.submitted_at, wr.submission_data
    from public.weekly_reports wr
    where wr.user_id = auth.uid()
      and wr.context = 'individual'
      and wr.status = 'submitted'
    order by wr.week_year desc, wr.week_number desc
    limit 8
  )
  select jsonb_build_object(
    'week', (select jsonb_build_object(
               'week_start', w.week_start, 'week_end', w.week_end,
               'week_number', w.week_number, 'week_year', w.week_year)
             from w),
    'submitted', coalesce((select status = 'submitted' from cur), false),
    'submitted_at', (select submitted_at from cur where status = 'submitted'),
    'draft', (select submission_data from cur where status = 'draft'),
    'history', coalesce((select jsonb_agg(to_jsonb(h)
                                order by h.week_year desc, h.week_number desc)
                         from hist h), '[]'::jsonb)
  );
$function$;

CREATE OR REPLACE FUNCTION public.send_individual_weekly_report_reminders_v1_backup_v1(p_kind text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_week record;
  v_type text;
  v_title text;
  v_message text;
  v_count integer := 0;
  v_team_journey boolean;
begin
  if p_kind not in ('2day', '1day') then
    raise exception 'p_kind must be ''2day'' or ''1day''';
  end if;
  -- Solo weekly reports are a My Journey feature: no reminders while it is off.
  if not public.journey_enabled_v1('my_journey') then
    return 0;
  end if;

  v_team_journey := public.journey_enabled_v1('team_journey');
  -- Solo cutoff: Monday 12:00 Riga.
  select * into v_week
  from public.get_riga_week_boundaries_v2(now(), '12:00:00');

  if p_kind = '2day' then
    v_type := 'weekly_report_reminder_2day';
    v_title := 'Weekly report reminder';
    v_message := 'Don''t forget to submit your My Journey weekly report before Monday 12:00!';
  else
    v_type := 'weekly_report_reminder_1day';
    v_title := 'Last chance — weekly report due tomorrow!';
    v_message := 'Submit your My Journey weekly report before Monday 12:00!';
  end if;

  insert into public.notifications (user_id, type, title, message, data)
  select u.id, v_type, v_title, v_message,
         jsonb_build_object(
           'context', 'individual',
           'week_number', v_week.week_number,
           'week_year', v_week.week_year)
  from public.users u
  join auth.users au on au.id = u.id
  where u.status = 'active'
    and coalesce(u.primary_role, 'user') = 'user'
    and au.email_confirmed_at is not null
    -- Mode rule: a member of an active team gets the TEAM form while Team
    -- Journey is on, so no solo reminder for them.
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
        and wr.week_year = v_week.week_year
        and wr.week_number = v_week.week_number)
    and not exists (
      select 1 from public.notifications n
      where n.user_id = u.id
        and n.type = v_type
        and n.data->>'context' = 'individual'
        and n.created_at >= v_week.week_start::timestamptz);

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_weekly_report_email_recipients_v1_backup_v1(p_kind text, p_test_emails text[] DEFAULT NULL::text[])
 RETURNS TABLE(user_id uuid, name text, email text, context text, team_name text, kind text, week_year integer, week_number integer, due_label text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

revoke all on function public.submit_individual_weekly_report_v1_backup_v1(jsonb, boolean) from public, anon, authenticated;
revoke all on function public.get_individual_weekly_report_status_v1_backup_v1() from public, anon, authenticated;
revoke all on function public.send_individual_weekly_report_reminders_v1_backup_v1(text) from public, anon, authenticated;
revoke all on function public.get_weekly_report_email_recipients_v1_backup_v1(text, text[]) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. The four functions on the new rule (same names, signatures, grants)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_individual_weekly_report_v1(p_submission_data jsonb, p_as_draft boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_week record;
  v_commitments jsonb;
  v_next jsonb;
  v_score numeric;
  v_reason text;
  v_blockers text;
  v_data jsonb;
  v_existing_id uuid;
  v_existing_status text;
  v_id uuid;
  v_status text;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if not public.journey_enabled_v1('my_journey') then
    raise exception 'MY_JOURNEY_DISABLED';
  end if;
  if p_submission_data is null
     or jsonb_typeof(p_submission_data) <> 'object' then
    raise exception 'Submission must be a JSON object';
  end if;

  -- Solo rule: Mon-Thu files for the previous week, Fri-Sun for the current
  -- one (team reports stay on the 10:00 shared v1).
  select * into v_week
  from public.get_solo_report_week_v1(now());

  -- Q1: commitments — keep only rows with text, whitelist keys, default status.
  select coalesce(jsonb_agg(jsonb_build_object(
           'text', btrim(c->>'text'),
           'status', case when c->>'status' in ('completed','in_progress','not_done')
                          then c->>'status' else 'completed' end,
           'explanation', coalesce(c->>'explanation', '')
         ) order by ord), '[]'::jsonb)
    into v_commitments
  from jsonb_array_elements(
         case when jsonb_typeof(p_submission_data->'commitments') = 'array'
              then p_submission_data->'commitments' else '[]'::jsonb end
       ) with ordinality as t(c, ord)
  where jsonb_typeof(c) = 'object'
    and length(btrim(coalesce(c->>'text', ''))) > 0;

  -- Q3: next-week commitments — drop blanks, trim.
  select coalesce(jsonb_agg(to_jsonb(btrim(n)) order by ord), '[]'::jsonb)
    into v_next
  from jsonb_array_elements_text(
         case when jsonb_typeof(p_submission_data->'nextWeekCommitments') = 'array'
              then p_submission_data->'nextWeekCommitments' else '[]'::jsonb end
       ) with ordinality as t(n, ord)
  where length(btrim(coalesce(n, ''))) > 0;

  v_blockers := coalesce(p_submission_data->>'blockers', '');
  v_reason   := coalesce(p_submission_data->>'alignmentReason', '');
  begin
    v_score := (p_submission_data->>'alignmentScore')::numeric;
  exception when others then
    v_score := null;
  end;

  if not p_as_draft then
    if jsonb_array_length(v_commitments) = 0 then
      raise exception 'At least one commitment is required';
    end if;
    if exists (select 1 from jsonb_array_elements(v_commitments) c
               where length(c->>'text') < 5) then
      raise exception 'Commitment must be at least 5 characters';
    end if;
    if jsonb_array_length(v_next) = 0 then
      raise exception 'At least one commitment for next week is required';
    end if;
    if exists (select 1 from jsonb_array_elements_text(v_next) n
               where length(n) < 5) then
      raise exception 'Next week commitment must be at least 5 characters';
    end if;
    if v_score is null or v_score <> trunc(v_score)
       or v_score < 1 or v_score > 10 then
      raise exception 'Alignment score must be a whole number between 1 and 10';
    end if;
    if length(btrim(v_reason)) < 5 then
      raise exception 'Alignment reason must be at least 5 characters';
    end if;
  end if;

  v_data := jsonb_build_object(
    'commitments', v_commitments,
    'blockers', v_blockers,
    'nextWeekCommitments', v_next,
    'alignmentScore', case when v_score is null then null else v_score::int end,
    'alignmentReason', v_reason
  );
  if not p_as_draft then
    v_data := v_data || jsonb_build_object('submittedAt', now());
  end if;

  select id, status into v_existing_id, v_existing_status
  from public.weekly_reports
  where user_id = v_uid
    and context = 'individual'
    and week_year = v_week.week_year
    and week_number = v_week.week_number
  order by (status = 'submitted') desc, created_at desc
  limit 1;

  if v_existing_status = 'submitted' then
    raise exception 'ALREADY_SUBMITTED';
  end if;

  v_status := case when p_as_draft then 'draft' else 'submitted' end;

  if v_existing_id is not null then
    update public.weekly_reports
       set submission_data = v_data,
           status = v_status,
           submitted_at = case when p_as_draft then null else now() end,
           updated_at = now()
     where id = v_existing_id
     returning id into v_id;
  else
    begin
      insert into public.weekly_reports (
        user_id, team_id, context, week_start_date, week_end_date,
        week_number, week_year, submission_data, status, submitted_at
      ) values (
        v_uid, null, 'individual', v_week.week_start, v_week.week_end,
        v_week.week_number, v_week.week_year, v_data, v_status,
        case when p_as_draft then null else now() end
      )
      returning id into v_id;
    exception when unique_violation then
      raise exception 'ALREADY_SUBMITTED';
    end;
  end if;

  return jsonb_build_object(
    'report_id', v_id,
    'status', v_status,
    'week_number', v_week.week_number,
    'week_year', v_week.week_year,
    'week_start', v_week.week_start,
    'week_end', v_week.week_end
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_individual_weekly_report_status_v1()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with w as (
    -- Solo rule: Mon-Thu = previous week, Fri-Sun = current week.
    select * from public.get_solo_report_week_v1(now())
  ),
  cur as (
    select wr.status, wr.submitted_at, wr.submission_data
    from public.weekly_reports wr, w
    where wr.user_id = auth.uid()
      and wr.context = 'individual'
      and wr.week_year = w.week_year
      and wr.week_number = w.week_number
    order by (wr.status = 'submitted') desc, wr.created_at desc
    limit 1
  ),
  hist as (
    select wr.id, wr.week_number, wr.week_year, wr.week_start_date,
           wr.week_end_date, wr.submitted_at, wr.submission_data
    from public.weekly_reports wr
    where wr.user_id = auth.uid()
      and wr.context = 'individual'
      and wr.status = 'submitted'
    order by wr.week_year desc, wr.week_number desc
    limit 8
  )
  select jsonb_build_object(
    'week', (select jsonb_build_object(
               'week_start', w.week_start, 'week_end', w.week_end,
               'week_number', w.week_number, 'week_year', w.week_year)
             from w),
    'submitted', coalesce((select status = 'submitted' from cur), false),
    'submitted_at', (select submitted_at from cur where status = 'submitted'),
    'draft', (select submission_data from cur where status = 'draft'),
    -- Banner window: Friday 00:00 to Monday 12:00 Riga of the reported week.
    -- The week itself stays open until Thursday night; this only drives the nudge.
    'reminder_open', (select (now() at time zone 'Europe/Riga') >= (w.week_start + 4)::timestamp
                         and (now() at time zone 'Europe/Riga') < (w.week_start + 7)::timestamp + interval '12 hours'
                      from w),
    'history', coalesce((select jsonb_agg(to_jsonb(h)
                                order by h.week_year desc, h.week_number desc)
                         from hist h), '[]'::jsonb)
  );
$function$;

CREATE OR REPLACE FUNCTION public.send_individual_weekly_report_reminders_v1(p_kind text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_week record;
  v_type text;
  v_title text;
  v_message text;
  v_count integer := 0;
  v_team_journey boolean;
begin
  if p_kind not in ('2day', '1day') then
    raise exception 'p_kind must be ''2day'' or ''1day''';
  end if;
  -- Solo weekly reports are a My Journey feature: no reminders while it is off.
  if not public.journey_enabled_v1('my_journey') then
    return 0;
  end if;

  v_team_journey := public.journey_enabled_v1('team_journey');
  -- Solo rule: Mon-Thu = previous week, Fri-Sun = current week. The jobs run
  -- Fri + Sun, so this is the week that closes for the nudge on Monday 12:00.
  select * into v_week
  from public.get_solo_report_week_v1(now());

  if p_kind = '2day' then
    v_type := 'weekly_report_reminder_2day';
    v_title := 'Weekly report reminder';
    v_message := 'Don''t forget to submit your My Journey weekly report before Monday 12:00!';
  else
    v_type := 'weekly_report_reminder_1day';
    v_title := 'Last chance — weekly report due tomorrow!';
    v_message := 'Submit your My Journey weekly report before Monday 12:00!';
  end if;

  insert into public.notifications (user_id, type, title, message, data)
  select u.id, v_type, v_title, v_message,
         jsonb_build_object(
           'context', 'individual',
           'week_number', v_week.week_number,
           'week_year', v_week.week_year)
  from public.users u
  join auth.users au on au.id = u.id
  where u.status = 'active'
    and coalesce(u.primary_role, 'user') = 'user'
    and au.email_confirmed_at is not null
    -- Mode rule: a member of an active team gets the TEAM form while Team
    -- Journey is on, so no solo reminder for them.
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
        and wr.week_year = v_week.week_year
        and wr.week_number = v_week.week_number)
    and not exists (
      select 1 from public.notifications n
      where n.user_id = u.id
        and n.type = v_type
        and n.data->>'context' = 'individual'
        and n.created_at >= v_week.week_start::timestamptz);

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_weekly_report_email_recipients_v1(p_kind text, p_test_emails text[] DEFAULT NULL::text[])
 RETURNS TABLE(user_id uuid, name text, email text, context text, team_name text, kind text, week_year integer, week_number integer, due_label text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_solo record;
  v_team record;
  v_team_journey boolean;
begin
  if p_kind not in ('2day', '1day') then
    raise exception 'p_kind must be ''2day'' or ''1day''';
  end if;

  -- Solo rule: Mon-Thu = previous week, Fri-Sun = current week (mirrors
  -- send_individual_weekly_report_reminders_v1); team cutoff Monday 10:00 (shared v1).
  select * into v_solo
  from public.get_solo_report_week_v1(now());
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
