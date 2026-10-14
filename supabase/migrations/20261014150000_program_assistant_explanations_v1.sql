-- Program assistant, phase 3 (2026-10-14): Claude explanations, data-issue
-- suggestions, and the admin readers behind Admin → People → Tech module.
-- Spec §5.3 step 5, §6:
-- docs/internal/superpowers/specs/2026-10-13-program-assistant-design.md
--
-- Standalone add-on: reads public.users only for is_admin_v1() and the
-- verdict's email match done in phase 2. Service-role writers; one
-- authenticated reader + one authenticated writer, both admin-asserted.
--
-- Rollback: drop function public.program_data_issue_resolve_v1(bigint, boolean),
--   public.get_program_assistant_latest_v1(),
--   public.program_data_issue_fix_v1(uuid, jsonb),
--   public.program_explanations_write_v1(uuid, jsonb);
--   drop table program.explanation;

create table program.explanation (
  id             bigint generated always as identity primary key,
  run_id         uuid not null references program.run (id) on delete cascade,
  qwasar_user_id integer not null,
  line           text not null,
  next_step      text not null,
  model          text not null,
  prompt_version text not null,
  input_tokens   integer not null default 0,
  cached_tokens  integer not null default 0,
  output_tokens  integer not null default 0,
  cost_usd       numeric(10,5) not null default 0,
  created_at     timestamptz not null default now(),
  unique (run_id, qwasar_user_id)
);
alter table program.explanation enable row level security;
create policy explanation_admin_select on program.explanation
  for select to authenticated using (public.is_admin_v1());
grant select on program.explanation to authenticated;
grant select, insert, update, delete on program.explanation to service_role;

-- ---------------------------------------------------------------
-- Writers (service role)
-- ---------------------------------------------------------------
create or replace function public.program_explanations_write_v1(p_run_id uuid, p_rows jsonb)
returns integer
language plpgsql security definer
set search_path = public, program, pg_temp
as $$
declare
  v_n integer;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array' using errcode = '22023';
  end if;
  insert into program.explanation
    (run_id, qwasar_user_id, line, next_step, model, prompt_version,
     input_tokens, cached_tokens, output_tokens, cost_usd)
  select p_run_id,
         (r->>'qwasar_user_id')::integer,
         left(coalesce(r->>'line', ''), 400),
         left(coalesce(r->>'next_step', ''), 400),
         coalesce(r->>'model', ''),
         coalesce(r->>'prompt_version', ''),
         coalesce((r->>'input_tokens')::integer, 0),
         coalesce((r->>'cached_tokens')::integer, 0),
         coalesce((r->>'output_tokens')::integer, 0),
         coalesce((r->>'cost_usd')::numeric, 0)
  from jsonb_array_elements(p_rows) r
  on conflict (run_id, qwasar_user_id) do update
    set line = excluded.line,
        next_step = excluded.next_step,
        model = excluded.model,
        prompt_version = excluded.prompt_version,
        input_tokens = excluded.input_tokens,
        cached_tokens = excluded.cached_tokens,
        output_tokens = excluded.output_tokens,
        cost_usd = excluded.cost_usd,
        created_at = now();
  get diagnostics v_n = row_count;
  return v_n;
end $$;

create or replace function public.program_data_issue_fix_v1(p_run_id uuid, p_fixes jsonb)
returns integer
language plpgsql security definer
set search_path = public, program, pg_temp
as $$
declare
  v_n integer;
begin
  if p_fixes is null or jsonb_typeof(p_fixes) <> 'array' then
    raise exception 'p_fixes must be a JSON array' using errcode = '22023';
  end if;
  update program.data_issue d
     set suggested_fix = left(f.fix, 400)
    from (select (x->>'id')::bigint as id, x->>'suggested_fix' as fix
            from jsonb_array_elements(p_fixes) x) f
   where d.id = f.id and d.run_id = p_run_id and f.fix is not null;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ---------------------------------------------------------------
-- Admin reader: latest run + the last successful run's verdicts, names from
-- that day's snapshot, explanations, data issues, this week's timeline rows.
-- ---------------------------------------------------------------
create or replace function public.get_program_assistant_latest_v1()
returns jsonb
language plpgsql stable security definer
set search_path = public, program, qwasar, pg_temp
as $$
declare
  v_latest program.run%rowtype;
  v_done   program.run%rowtype;
begin
  if not public.is_admin_v1() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select * into v_latest from program.run order by started_at desc limit 1;
  select * into v_done from program.run where status = 'done' order by started_at desc limit 1;
  return jsonb_build_object(
    'latest_run', case when v_latest.id is null then null else to_jsonb(v_latest) end,
    'run', case when v_done.id is null then null else to_jsonb(v_done) end,
    'stale_days', case when v_done.id is null then null else current_date - v_done.snapshot_date end,
    'settings', (select ps.value from public.platform_settings ps where ps.key = 'program_assistant'),
    'verdicts', coalesce((
      select jsonb_agg(
        to_jsonb(v) - 'id' - 'run_id' - 'created_at'
        || jsonb_build_object(
             'name', s.name, 'email', s.email, 'login', s.login,
             'line', e.line, 'next_step', e.next_step)
        order by case v.status when 'Talk to' then 0 when 'Watch' then 1 when 'On pace' then 2 else 3 end,
                 s.name)
      from program.verdict v
      left join lateral (
        select ps.name, ps.email, ps.login
        from qwasar.progress_snapshot ps
        where ps.snapshot_date = v.snapshot_date and ps.qwasar_user_id = v.qwasar_user_id
        limit 1) s on true
      left join program.explanation e
        on e.run_id = v.run_id and e.qwasar_user_id = v.qwasar_user_id
      where v.run_id = v_done.id), '[]'::jsonb),
    'data_issues', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.resolved_at nulls first, d.kind, d.id)
      from program.data_issue d where d.run_id = v_done.id), '[]'::jsonb),
    'timeline', coalesce((
      select jsonb_agg(jsonb_build_object(
        'track', tw.track, 'week', tw.week, 'phase', tw.phase,
        'requirement', tw.requirement, 'flag', tw.flag,
        'threshold_module', tw.threshold_module, 'threshold_percent', tw.threshold_percent)
        order by tw.track)
      from program.timeline_week tw
      where v_done.snapshot_date between tw.starts and tw.ends), '[]'::jsonb)
  );
end $$;

-- Admin writer: resolve / reopen a data issue from the page.
create or replace function public.program_data_issue_resolve_v1(p_id bigint, p_resolved boolean default true)
returns jsonb
language plpgsql security definer
set search_path = public, program, pg_temp
as $$
declare
  v_row program.data_issue%rowtype;
begin
  if not public.is_admin_v1() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  update program.data_issue
     set resolved_at = case when p_resolved then now() else null end
   where id = p_id
  returning * into v_row;
  if v_row.id is null then
    raise exception 'data issue % not found', p_id using errcode = 'P0002';
  end if;
  return to_jsonb(v_row);
end $$;

revoke all on function
  public.program_explanations_write_v1(uuid, jsonb),
  public.program_data_issue_fix_v1(uuid, jsonb),
  public.get_program_assistant_latest_v1(),
  public.program_data_issue_resolve_v1(bigint, boolean)
from public, anon, authenticated;
grant execute on function
  public.program_explanations_write_v1(uuid, jsonb),
  public.program_data_issue_fix_v1(uuid, jsonb)
to service_role;
grant execute on function
  public.get_program_assistant_latest_v1(),
  public.program_data_issue_resolve_v1(bigint, boolean)
to authenticated, service_role;
