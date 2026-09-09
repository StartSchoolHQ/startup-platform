-- 20260909120250_ai_review_requeue_guard_v1.sql
-- Fix: ai_review_requeue_stale_v1's terminal ai_review_apply_decision_v1('failed', ...)
-- call can raise (e.g. ai_review_progress_not_pending when the task_progress row is no
-- longer pending_review), which aborted the whole sweeper transaction and stalled every
-- other row in the loop. Wrap it so the row is finalised locally instead and the loop
-- continues. Same signature, same security definer/search_path — no other function touched.

create or replace function public.ai_review_requeue_stale_v1()
returns int
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  rec record;
  n int := 0;
begin
  for rec in
    select id, retry_count from ai_task_reviews
    where (status = 'queued'  and updated_at < now() - interval '2 minutes' and claimed_at is null)
       or (status = 'running' and claimed_at < now() - interval '6 minutes')
    for update skip locked
  loop
    if rec.retry_count < 3 then
      -- created_at is the real submit time and is never rewritten; the
      -- ai_task_reviews_set_updated_at trigger moves updated_at forward, which
      -- is what makes this row non-stale for the next 2 minutes.
      update ai_task_reviews set status = 'queued', claimed_at = null, retry_count = retry_count + 1
      where id = rec.id;
      perform ai_review_kick_worker_v1(rec.id);
    else
      begin
        perform ai_review_apply_decision_v1(rec.id, 'failed', jsonb_build_object('error', 'worker_timeout after 3 retries'));
      exception when others then
        update ai_task_reviews set status = 'failed', error = 'sweeper: ' || sqlerrm, finished_at = now(), decided_by = 'system'
        where id = rec.id;
      end;
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;
