-- Solo (My Journey) weekly report cutoff: Monday 10:00 -> 12:00 Riga (2026-10-26).
--
-- The shared `get_riga_week_boundaries` hard-codes 10:00 and is read by ~25
-- functions (team reports, strikes, leaderboard snapshots, action items), so
-- it is left untouched. Instead:
--
--   get_riga_week_boundaries_v2(input, cutoff) : same algorithm, the Monday
--                                                cutoff is a parameter.
--   submit_individual_weekly_report_v1          \
--   get_individual_weekly_report_status_v1       > re-created on v2 @ 12:00;
--   send_individual_weekly_report_reminders_v1  /  bodies otherwise identical
--                                                  to 20260914112203, reminder
--                                                  copy says 12:00.
--
-- Team Journey keeps 10:00. Rollback: re-apply the three functions from
-- 20260914112203_weekly_reports_individual_v1.sql, then
-- `drop function public.get_riga_week_boundaries_v2(timestamptz, time);`.

create or replace function public.get_riga_week_boundaries_v2(
  input_date timestamptz default now(),
  p_cutoff time default '12:00:00'
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
  riga_date date;
  week_start_calc date;
begin
  riga_timestamp := input_date at time zone 'Europe/Riga';
  riga_date := riga_timestamp::date;

  -- Monday before the cutoff (Riga local time) still belongs to the previous
  -- week. DOW: Monday = 1.
  if extract(dow from riga_timestamp) = 1
     and riga_timestamp::time < p_cutoff then
    riga_date := riga_date - 1;
  end if;

  week_start_calc := riga_date - (extract(dow from riga_date)::integer + 6) % 7;

  return query select
    week_start_calc,
    week_start_calc + 6,
    extract(week from week_start_calc)::integer,
    extract(isoyear from week_start_calc)::integer;
end;
$function$;

revoke all on function public.get_riga_week_boundaries_v2(timestamptz, time)
  from public, anon;
grant execute on function public.get_riga_week_boundaries_v2(timestamptz, time)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
create or replace function public.submit_individual_weekly_report_v1(
  p_submission_data jsonb,
  p_as_draft boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
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

-- ---------------------------------------------------------------------------
create or replace function public.get_individual_weekly_report_status_v1()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
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

-- ---------------------------------------------------------------------------
create or replace function public.send_individual_weekly_report_reminders_v1(
  p_kind text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
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
