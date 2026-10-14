-- Program assistant, phase 1 (2026-10-14): run log, data issues, the RPCs the
-- run route uses (service role only), the pg_cron kick + watchdog, and the
-- vault secret placeholder. Spec:
-- docs/internal/superpowers/specs/2026-10-13-program-assistant-design.md §5.3
-- Plan: docs/internal/superpowers/plans/2026-10-14-program-assistant-phase1.md
--
-- Standalone add-on: nothing here reads or writes users/tasks/task_progress or
-- the economies. The only `public` objects are SECURITY DEFINER wrappers owned
-- by this feature with EXECUTE for service_role only (anon/authenticated/PUBLIC
-- revoked explicitly below), plus two keys on the existing settings row.
--
-- Rollback:
--   select cron.unschedule('program-assistant-daily');
--   select cron.unschedule('program-assistant-watchdog');
--   drop function public.program_watchdog_v1(), public.program_kick_run_v1(text),
--     public.program_request_sheet_refresh_v1(),
--     public.program_data_issue_replace_v1(uuid, jsonb),
--     public.program_snapshot_upsert_v1(date, text, jsonb),
--     public.program_run_finish_v1(uuid, text, text, date, text),
--     public.program_run_step_v1(uuid, jsonb),
--     public.program_run_start_v1(text, uuid);
--   drop table program.data_issue; drop table program.run;
--   delete from vault.secrets where name = 'program_assistant_secret';
--   update platform_settings set value = value - 'worker_url' - 'n8n_webhook_base'
--     where key = 'program_assistant';

-- ---------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------
create table program.run (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('scheduled', 'adhoc')),
  status        text not null default 'running'
                check (status in ('running', 'done', 'failed')),
  triggered_by  uuid references public.users (id) on delete set null,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  snapshot_date date,
  steps         jsonb not null default '[]'::jsonb,
  error         text,
  slack_message text,
  slack_posted_at timestamptz
);
create index run_started_at_idx on program.run (started_at desc);

create table program.data_issue (
  id             bigint generated always as identity primary key,
  run_id         uuid not null references program.run (id) on delete cascade,
  qwasar_user_id integer,
  kind           text not null check (kind in (
                   'dropout_but_active', 'wrong_track', 'active_no_track_row',
                   'unmapped_student', 'attendance_unmatched_email',
                   'import_warning')),
  detail         text not null,
  suggested_fix  text,
  resolved_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index data_issue_run_idx on program.data_issue (run_id);

alter table program.run enable row level security;
alter table program.data_issue enable row level security;
create policy run_admin_select on program.run
  for select to authenticated using (public.is_admin_v1());
create policy data_issue_admin_select on program.data_issue
  for select to authenticated using (public.is_admin_v1());
grant select on program.run, program.data_issue to authenticated;
grant select, insert, update, delete on program.run, program.data_issue to service_role;

-- ---------------------------------------------------------------
-- 2. Run bookkeeping RPCs (service role)
-- ---------------------------------------------------------------
create or replace function public.program_run_start_v1(
  p_kind text,
  p_triggered_by uuid default null
) returns uuid
language plpgsql security definer
set search_path = public, program, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_kind not in ('scheduled', 'adhoc') then
    raise exception 'kind must be scheduled or adhoc' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('program.run'));
  -- A run that never finished within 10 minutes is dead (maxDuration is 300 s).
  update program.run
     set status = 'failed',
         finished_at = now(),
         error = coalesce(error, 'no finish within 10 minutes; marked failed by the next start')
   where status = 'running' and started_at <= now() - interval '10 minutes';
  if exists (select 1 from program.run where status = 'running') then
    raise exception 'program_run_in_progress' using errcode = '55P03';
  end if;
  insert into program.run (kind, triggered_by)
  values (p_kind, p_triggered_by)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.program_run_step_v1(p_run_id uuid, p_step jsonb)
returns void
language sql security definer
set search_path = public, program, pg_temp
as $$
  update program.run
     set steps = steps || jsonb_build_array(p_step || jsonb_build_object('at', now()))
   where id = p_run_id;
$$;

create or replace function public.program_run_finish_v1(
  p_run_id uuid,
  p_status text,
  p_error text default null,
  p_snapshot_date date default null,
  p_slack_message text default null
) returns void
language plpgsql security definer
set search_path = public, program, pg_temp
as $$
begin
  if p_status not in ('done', 'failed') then
    raise exception 'status must be done or failed' using errcode = '22023';
  end if;
  update program.run
     set status = p_status,
         finished_at = now(),
         error = p_error,
         snapshot_date = coalesce(p_snapshot_date, snapshot_date),
         slack_message = coalesce(p_slack_message, slack_message)
   where id = p_run_id;
end $$;

-- ---------------------------------------------------------------
-- 3. Snapshot upsert into qwasar.progress_snapshot (same shape the Cowork
--    skill wrote; idempotent per (snapshot_date, qwasar_user_id, module)).
-- ---------------------------------------------------------------
create or replace function public.program_snapshot_upsert_v1(
  p_snapshot_date date,
  p_kind text,
  p_rows jsonb
) returns jsonb
language plpgsql security definer
set search_path = public, qwasar, pg_temp
as $$
declare
  v_upserted integer;
  v_students integer;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array' using errcode = '22023';
  end if;
  if p_kind not in ('scheduled', 'adhoc') then
    raise exception 'kind must be scheduled or adhoc' using errcode = '22023';
  end if;
  insert into qwasar.progress_snapshot as s
    (snapshot_date, qwasar_user_id, login, name, email, status, cohort,
     last_login_at, module, percent, imported_at, kind)
  select p_snapshot_date,
         (r->>'qwasar_user_id')::integer,
         r->>'login',
         r->>'name',
         r->>'email',
         r->>'status',
         r->>'cohort',
         nullif(r->>'last_login_at', '')::timestamptz,
         r->>'module',
         (r->>'percent')::smallint,
         now(),
         p_kind
  from jsonb_array_elements(p_rows) r
  on conflict (snapshot_date, qwasar_user_id, module) do update
    set login = excluded.login,
        name = excluded.name,
        email = excluded.email,
        status = excluded.status,
        cohort = excluded.cohort,
        last_login_at = excluded.last_login_at,
        percent = excluded.percent,
        imported_at = now(),
        kind = excluded.kind;
  get diagnostics v_upserted = row_count;
  select count(distinct qwasar_user_id) into v_students
    from qwasar.progress_snapshot where snapshot_date = p_snapshot_date;
  return jsonb_build_object(
    'upserted', v_upserted,
    'rows_on_date', (select count(*) from qwasar.progress_snapshot where snapshot_date = p_snapshot_date),
    'students_on_date', v_students);
end $$;

-- ---------------------------------------------------------------
-- 4. Data issues for a run (replace = idempotent on re-run of the same run id)
-- ---------------------------------------------------------------
create or replace function public.program_data_issue_replace_v1(p_run_id uuid, p_issues jsonb)
returns integer
language plpgsql security definer
set search_path = public, program, pg_temp
as $$
declare
  v_n integer;
begin
  if p_issues is null or jsonb_typeof(p_issues) <> 'array' then
    raise exception 'p_issues must be a JSON array' using errcode = '22023';
  end if;
  delete from program.data_issue where run_id = p_run_id;
  insert into program.data_issue (run_id, qwasar_user_id, kind, detail)
  select p_run_id,
         nullif(i->>'qwasar_user_id', '')::integer,
         i->>'kind',
         coalesce(i->>'detail', '')
  from jsonb_array_elements(p_issues) i;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ---------------------------------------------------------------
-- 5. Sheet refresh wrapper (the Cowork skill called qwasar.request_sheet_refresh
--    by hand after every import; the daily run does the same).
-- ---------------------------------------------------------------
create or replace function public.program_request_sheet_refresh_v1()
returns bigint
language sql security definer
set search_path = public, qwasar, pg_temp
as $$
  select qwasar.request_sheet_refresh();
$$;

-- ---------------------------------------------------------------
-- 6. Vault secret placeholder + settings keys. Elias sets the real value in
--    the SQL editor (never via MCP):
--      select vault.update_secret(
--        (select id from vault.secrets where name = 'program_assistant_secret'),
--        '<same value as Vercel PROGRAM_ASSISTANT_SECRET>');
-- ---------------------------------------------------------------
select vault.create_secret(
  'REPLACE-WITH-PROGRAM_ASSISTANT_SECRET',
  'program_assistant_secret',
  'Header secret for POST /api/program-assistant/run and the n8n program/* webhooks');

update public.platform_settings
   set value = value
     || jsonb_build_object(
          'worker_url', 'https://startup.startschool.org/api/program-assistant/run',
          'n8n_webhook_base', 'https://startschool.app.n8n.cloud/webhook'),
       updated_at = now()
 where key = 'program_assistant';

-- ---------------------------------------------------------------
-- 7. Kick (pg_net → route) and watchdog (pg_net → n8n alert webhook).
--    Both never raise, both no-op until the vault secret is set.
-- ---------------------------------------------------------------
create or replace function public.program_kick_run_v1(p_kind text default 'scheduled')
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_settings jsonb;
  v_url text;
  v_secret text;
begin
  select value into v_settings from platform_settings where key = 'program_assistant';
  if coalesce((v_settings->>'enabled')::boolean, false) is not true then
    return;
  end if;
  v_url := v_settings->>'worker_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'program_assistant_secret';
  if v_url is null or v_secret is null or v_secret like 'REPLACE-WITH%' then
    raise warning 'program_kick_run_v1: worker_url or secret not configured';
    return;
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-program-secret', v_secret),
    body := jsonb_build_object('kind', p_kind),
    timeout_milliseconds := 5000);
exception when others then
  raise warning 'program_kick_run_v1 failed: %', sqlerrm;
end $$;

create or replace function public.program_watchdog_v1()
returns void
language plpgsql security definer
set search_path = public, program, pg_temp
as $$
declare
  v_settings jsonb;
  v_base text;
  v_secret text;
  v_last program.run%rowtype;
  v_text text;
begin
  select value into v_settings from platform_settings where key = 'program_assistant';
  if coalesce((v_settings->>'enabled')::boolean, false) is not true then
    return;
  end if;
  if exists (
    select 1 from program.run
     where started_at >= date_trunc('day', now()) and status = 'done'
  ) then
    return;
  end if;
  select * into v_last from program.run order by started_at desc limit 1;
  v_text := case
    when v_last.id is null then
      'No program-assistant run has ever been recorded.'
    when v_last.started_at < date_trunc('day', now()) then
      format('No run started today. Last run %s at %s (status %s).',
             v_last.id, to_char(v_last.started_at, 'YYYY-MM-DD HH24:MI UTC'), v_last.status)
    else
      format('Today''s run %s is %s%s.', v_last.id, v_last.status,
             coalesce(': ' || v_last.error, ''))
  end;
  v_base := v_settings->>'n8n_webhook_base';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'program_assistant_secret';
  if v_base is null or v_secret is null or v_secret like 'REPLACE-WITH%' then
    raise warning 'program_watchdog_v1: %', v_text;
    return;
  end if;
  perform net.http_post(
    url := v_base || '/program/alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-program-secret', v_secret),
    body := jsonb_build_object(
      'subject', 'Program assistant: no successful run today',
      'text', v_text || E'\n\nCheck program.run in Supabase, then run: select public.program_kick_run_v1(''adhoc'');'),
    timeout_milliseconds := 5000);
exception when others then
  raise warning 'program_watchdog_v1 failed: %', sqlerrm;
end $$;

-- ---------------------------------------------------------------
-- 8. Grants: service_role only on every function above.
-- ---------------------------------------------------------------
revoke all on function
  public.program_run_start_v1(text, uuid),
  public.program_run_step_v1(uuid, jsonb),
  public.program_run_finish_v1(uuid, text, text, date, text),
  public.program_snapshot_upsert_v1(date, text, jsonb),
  public.program_data_issue_replace_v1(uuid, jsonb),
  public.program_request_sheet_refresh_v1(),
  public.program_kick_run_v1(text),
  public.program_watchdog_v1()
from public, anon, authenticated;
grant execute on function
  public.program_run_start_v1(text, uuid),
  public.program_run_step_v1(uuid, jsonb),
  public.program_run_finish_v1(uuid, text, text, date, text),
  public.program_snapshot_upsert_v1(date, text, jsonb),
  public.program_data_issue_replace_v1(uuid, jsonb),
  public.program_request_sheet_refresh_v1(),
  public.program_kick_run_v1(text),
  public.program_watchdog_v1()
to service_role;

-- ---------------------------------------------------------------
-- 9. Cron (UTC). 06:00 = 08:00 Riga in winter, 09:00 in summer.
-- ---------------------------------------------------------------
select cron.schedule(
  'program-assistant-daily',
  '0 6 * * *',
  $$select public.program_kick_run_v1('scheduled');$$);
select cron.schedule(
  'program-assistant-watchdog',
  '30 6 * * *',
  $$select public.program_watchdog_v1();$$);
