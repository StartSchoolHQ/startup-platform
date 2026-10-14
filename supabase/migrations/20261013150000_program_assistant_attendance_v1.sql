-- Program assistant, phase 0 (2026-10-13): schema `program` and the attendance
-- table the nightly n8n reader (WF-ATTENDANCE-TO-SUPABASE) upserts into through
-- `public.program_attendance_upsert_v1`. Spec:
-- docs/internal/superpowers/specs/2026-10-13-program-assistant-design.md
--
-- Purely additive. No existing table, function, policy or workflow is touched.
-- Rollback: drop function public.program_attendance_upsert_v1(jsonb);
--           drop schema program cascade;

create schema if not exists program;

revoke all on schema program from public;
revoke all on schema program from anon;
grant usage on schema program to authenticated, service_role;

-- Nothing in this schema is ever readable by anon, and new tables/functions
-- default to service_role + (RLS-guarded) authenticated only.
alter default privileges in schema program revoke all on tables from public, anon;
alter default privileges in schema program revoke all on functions from public, anon;

-- One row per expected student per calendar event, the full matrix (Present
-- included). Source of truth stays the Google Sheet written by
-- WF-ATTENDANCE-NEW v2; this is a nightly read-only copy derived from its
-- Roster, Event Ledger and Attendance Log tabs.
create table program.attendance_event (
  id            bigint generated always as identity primary key,
  event_id      text        not null,
  event_name    text,
  event_date    date        not null,
  student_email text        not null,            -- org email, lowercased
  student_name  text,
  status        text        not null check (status in ('present', 'absent', 'excused')),
  method        text,                            -- On-site | Zoom | Registered Absence | Unexcused No-Show | null
  required_by   text,                            -- roster groups that made the student expected
  source        text        not null default 'n8n',
  imported_at   timestamptz not null default now(),
  unique (event_id, student_email)
);

create index attendance_event_student_date_idx
  on program.attendance_event (student_email, event_date);
create index attendance_event_date_idx
  on program.attendance_event (event_date);

alter table program.attendance_event enable row level security;

-- Admins read; nobody else. Writes only through the RPC below (service role).
create policy attendance_event_admin_select
  on program.attendance_event
  for select
  to authenticated
  using (public.is_admin_v1());

grant select on program.attendance_event to authenticated;
grant select, insert, update, delete on program.attendance_event to service_role;

-- Upsert endpoint for n8n: POST /rest/v1/rpc/program_attendance_upsert_v1
-- with {"p_rows": [...]} and the service role key. Lives in `public` so the
-- `program` schema never has to be exposed over REST. Validates each row,
-- lowercases the email, upserts on (event_id, student_email), and returns
-- counts so the workflow can log them.
create or replace function public.program_attendance_upsert_v1(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, program, pg_temp
as $$
declare
  v_row      jsonb;
  v_status   text;
  v_email    text;
  v_date     date;
  v_upserted integer := 0;
  v_rejected integer := 0;
  v_errors   jsonb := '[]'::jsonb;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array' using errcode = '22023';
  end if;

  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_status := lower(btrim(coalesce(v_row->>'status', '')));
    v_email  := lower(btrim(coalesce(v_row->>'student_email', '')));
    begin
      v_date := (v_row->>'event_date')::date;
    exception when others then
      v_date := null;
    end;

    if coalesce(btrim(v_row->>'event_id'), '') = ''
       or v_email = ''
       or v_date is null
       or v_status not in ('present', 'absent', 'excused') then
      v_rejected := v_rejected + 1;
      if jsonb_array_length(v_errors) < 20 then
        v_errors := v_errors || jsonb_build_object(
          'event_id', v_row->>'event_id',
          'student_email', v_row->>'student_email',
          'reason', 'missing event_id/email/date or bad status');
      end if;
      continue;
    end if;

    insert into program.attendance_event as a
      (event_id, event_name, event_date, student_email, student_name,
       status, method, required_by, source, imported_at)
    values
      (btrim(v_row->>'event_id'),
       nullif(btrim(v_row->>'event_name'), ''),
       v_date,
       v_email,
       nullif(btrim(v_row->>'student_name'), ''),
       v_status,
       nullif(btrim(v_row->>'method'), ''),
       nullif(btrim(v_row->>'required_by'), ''),
       coalesce(nullif(btrim(v_row->>'source'), ''), 'n8n'),
       now())
    on conflict (event_id, student_email) do update
      set event_name   = excluded.event_name,
          event_date   = excluded.event_date,
          student_name = coalesce(excluded.student_name, a.student_name),
          status       = excluded.status,
          method       = excluded.method,
          required_by  = excluded.required_by,
          source       = excluded.source,
          imported_at  = now();

    v_upserted := v_upserted + 1;
  end loop;

  return jsonb_build_object(
    'upserted', v_upserted,
    'rejected', v_rejected,
    'errors', v_errors);
end;
$$;

revoke all on function public.program_attendance_upsert_v1(jsonb) from public, anon, authenticated;
grant execute on function public.program_attendance_upsert_v1(jsonb) to service_role;

comment on function public.program_attendance_upsert_v1(jsonb) is
  'Program assistant: nightly attendance upsert from n8n (service role only). Rows: event_id, event_name, event_date, student_email, student_name, status present|absent|excused, method, required_by.';
