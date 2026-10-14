-- Program assistant, phase 3 delta (2026-10-14): data issues carry their
-- suggested fix from the run itself (deterministic per kind, no model call,
-- so names never leave the database). Same signature, additive column read.
-- Rollback: re-apply the body from migration program_assistant_run_v1.
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
  insert into program.data_issue (run_id, qwasar_user_id, kind, detail, suggested_fix)
  select p_run_id,
         nullif(i->>'qwasar_user_id', '')::integer,
         i->>'kind',
         coalesce(i->>'detail', ''),
         left(i->>'suggested_fix', 400)
  from jsonb_array_elements(p_issues) i;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
