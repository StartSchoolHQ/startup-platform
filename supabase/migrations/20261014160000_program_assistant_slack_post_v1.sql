-- Program assistant (2026-10-14): Slack posting bookkeeping. The digest text
-- already lives on program.run.slack_message; these two service-role RPCs let
-- the run route and the admin "Post to Slack" route read it and stamp
-- slack_posted_at. The webhook URL itself is a Vercel env var
-- (SLACK_WEBHOOK_URL), never stored in the database.
-- Rollback: drop function public.program_run_mark_posted_v1(uuid),
--           public.program_run_digest_v1(uuid);

create or replace function public.program_run_digest_v1(p_run_id uuid default null)
returns jsonb
language sql stable security definer
set search_path = public, program, pg_temp
as $$
  select to_jsonb(r) - 'steps'
  from program.run r
  where r.status = 'done'
    and (p_run_id is null or r.id = p_run_id)
  order by r.started_at desc
  limit 1;
$$;

create or replace function public.program_run_mark_posted_v1(p_run_id uuid)
returns timestamptz
language sql security definer
set search_path = public, program, pg_temp
as $$
  update program.run
     set slack_posted_at = now()
   where id = p_run_id
  returning slack_posted_at;
$$;

revoke all on function
  public.program_run_digest_v1(uuid),
  public.program_run_mark_posted_v1(uuid)
from public, anon, authenticated;
grant execute on function
  public.program_run_digest_v1(uuid),
  public.program_run_mark_posted_v1(uuid)
to service_role;
