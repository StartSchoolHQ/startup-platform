-- 20260909120300_ai_review_sweeper_updated_at_and_history_order_v1.sql
--
-- Three additive fixes from the final branch review. All three are also folded
-- into the original migration bodies (20260909120100 / 20260909120250) so a
-- fresh environment ends up in exactly this state.
--
-- (a) ai_review_requeue_stale_v1: a queued row went stale on `created_at`, and
--     the requeue itself rewrote `created_at = now()` — which falsified the
--     row's real submit time and made "stale" mean "requeued 2 min ago". The
--     queued predicate now uses `updated_at` (maintained by the existing
--     ai_task_reviews_set_updated_at trigger) and the requeue leaves
--     `created_at` alone.
--
-- (b) ai_review_apply_decision_v1: add_peer_review_history_entry() ran AFTER
--     the `update task_progress set status = ...`, so the trigger
--     notify_submitter_on_review_completion read `peer_review_history->-1` from
--     the PREVIOUS attempt (or nothing at all on attempt 1) into
--     notifications.data->>'decision' / 'feedback'. The history entry is now
--     appended before the status update; the post-update notification fix-up
--     (route + message) is unchanged.
--
-- (c) new get_ai_review_admin_summary_v1(): the admin audit page computed its
--     summary by selecting every non-in-flight ai_task_reviews row into Node
--     on every request. The aggregates now run in Postgres.

-- ---------------------------------------------------------------
-- (b) ai_review_apply_decision_v1 — history entry before status update
-- ---------------------------------------------------------------
create or replace function public.ai_review_apply_decision_v1(p_review_id uuid, p_outcome text, p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  r ai_task_reviews%rowtype;
  t tasks%rowtype;
  v_feedback text := nullif(p_payload->>'feedback','');
  v_xp int := 0;
  v_pts int := 0;
  v_rows int;
  v_history_decision text;
begin
  if p_outcome not in ('approved','rejected','failed') then
    raise exception 'ai_review_bad_outcome: %', p_outcome using errcode = '22023';
  end if;

  select * into r from ai_task_reviews where id = p_review_id for update;
  if not found then raise exception 'ai_review_not_found' using errcode = 'P0002'; end if;
  if r.status not in ('queued','running') then
    raise exception 'ai_review_already_final: % is %', p_review_id, r.status using errcode = '55000';
  end if;
  if p_outcome = 'approved' and v_feedback is null then
    raise exception 'ai_review_feedback_required' using errcode = '22023';
  end if;
  if p_outcome = 'failed' then
    v_feedback := coalesce(v_feedback, 'We could not complete the automatic review this time. Nothing is wrong with your work — please resubmit.');
  end if;

  select * into t from tasks where id = r.task_id;

  update ai_task_reviews set
    status           = p_outcome,
    stage            = 'finalizing',
    decision         = coalesce((p_payload->>'decision')::boolean, p_outcome = 'approved'),
    confidence       = (p_payload->>'confidence')::numeric,
    criteria_results = p_payload->'criteria_results',
    feedback         = v_feedback,
    reject_reason    = case when p_outcome = 'approved' then null
                            when p_outcome = 'failed' then 'technical_failure'
                            else coalesce(p_payload->>'reject_reason','criteria') end,
    raw_response     = p_payload->'raw_response',
    model            = coalesce(p_payload->>'model', model),
    prompt_version   = coalesce(p_payload->>'prompt_version', prompt_version),
    input_tokens     = (p_payload->>'input_tokens')::int,
    output_tokens    = (p_payload->>'output_tokens')::int,
    cost_usd         = (p_payload->>'cost_usd')::numeric,
    error            = p_payload->>'error',
    decided_by       = coalesce(p_payload->>'decided_by', case when p_outcome = 'failed' then 'system' else 'ai' end),
    finished_at      = now()
  where id = p_review_id;

  v_history_decision := case when p_outcome = 'approved' then 'approved' else 'rejected' end;

  -- BEFORE the status update: notify_submitter_on_review_completion reads
  -- peer_review_history->-1 for the notification's decision/feedback.
  perform add_peer_review_history_entry(r.progress_id, 'review_completed', null, v_history_decision, v_feedback);

  if p_outcome = 'approved' then
    v_xp := coalesce(t.base_xp_reward, 0);
    v_pts := coalesce(t.base_points_reward, 0);

    update task_progress set status = 'approved', completed_at = now(), review_feedback = v_feedback,
           points_awarded = v_pts, updated_at = now()
    where id = r.progress_id and status = 'pending_review';
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      raise exception 'ai_review_progress_not_pending: task_progress % is not pending_review', r.progress_id using errcode = '55000';
    end if;

    update users set total_xp = total_xp + v_xp, total_points = total_points + v_pts, updated_at = now()
    where id = r.user_id;

    insert into transactions (user_id, task_id, type, points_change, points_type, xp_change, description, activity_type, metadata)
    values (r.user_id, r.task_id, 'task', v_pts, 'individual', v_xp,
            'Completed individual task: ' || t.title, 'individual',
            jsonb_build_object('review_id', r.id, 'attempt', r.attempt,
                               'completion_type', 'ai_review_approved',
                               'decided_by', coalesce(p_payload->>'decided_by','ai')));
  else
    update task_progress set status = 'rejected', review_feedback = v_feedback, updated_at = now()
    where id = r.progress_id and status = 'pending_review';
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      raise exception 'ai_review_progress_not_pending: task_progress % is not pending_review', r.progress_id using errcode = '55000';
    end if;
  end if;

  -- The existing trigger notify_submitter_on_review_completion has just inserted a
  -- peer_review_* notification with a Team Journey route. Fix it for My Journey.
  update notifications set
    data = coalesce(data,'{}'::jsonb) || jsonb_build_object(
      'target_route', '/dashboard/my-journey/task/' || r.task_id::text,
      'target_tab', null, 'reviewer', 'ai', 'review_id', r.id),
    message = case when v_history_decision = 'approved'
      then 'Your task "' || t.title || '" passed the AI review. ' || left(v_feedback, 140)
      else 'Your task "' || t.title || '" did not pass yet. Open it to read the feedback and resubmit.' end
  where user_id = r.user_id
    and type in ('peer_review_approved','peer_review_rejected')
    and (data->>'task_progress_id')::uuid = r.progress_id
    and created_at >= now() - interval '5 seconds';

  return jsonb_build_object('success', true, 'outcome', p_outcome, 'xp_awarded', v_xp, 'points_awarded', v_pts);
end $$;

-- ---------------------------------------------------------------
-- (a) ai_review_requeue_stale_v1 — updated_at predicate, no created_at rewrite
-- ---------------------------------------------------------------
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

-- ---------------------------------------------------------------
-- (c) get_ai_review_admin_summary_v1 — admin audit summary, aggregated in SQL
-- ---------------------------------------------------------------
create or replace function public.get_ai_review_admin_summary_v1()
returns jsonb
language sql security definer stable
set search_path = public, pg_temp
as $$
  with finals as (
    select status, reject_reason, cost_usd, created_at
    from ai_task_reviews
    where status not in ('queued','running')
  )
  select jsonb_build_object(
    'today', (select count(*) from finals where created_at >= date_trunc('day', now())),
    'approval_rate', coalesce((
      select round((count(*) filter (where status = 'approved'))::numeric / nullif(count(*), 0), 4)
      from finals), 0),
    'reject_reasons', coalesce((
      select jsonb_object_agg(reject_reason, c)
      from (select reject_reason, count(*) as c from finals
            where reject_reason is not null group by reject_reason) x), '{}'::jsonb),
    'failures', (select count(*) from finals where status = 'failed'),
    'cost_usd', coalesce((select round(sum(coalesce(cost_usd, 0)), 2) from finals), 0)
  );
$$;

revoke execute on function public.get_ai_review_admin_summary_v1() from public, anon, authenticated;
grant execute on function public.get_ai_review_admin_summary_v1() to service_role;
