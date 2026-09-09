-- 20260909120100_ai_review_rpcs_v1.sql
-- AI task reviewer RPCs. All new, all _v1, nothing existing touched.

-- ---------------------------------------------------------------
-- helper: normalise raw submission_data into the frozen snapshot
-- (double-encoded strings, string-or-object url/file items, url-in-title)
-- ---------------------------------------------------------------
create or replace function public.ai_review_normalize_submission_v1(p_raw jsonb)
returns jsonb
language plpgsql immutable security definer
set search_path = public, pg_temp
as $$
declare
  v jsonb := p_raw;
  v_links jsonb := '[]'::jsonb;
  v_files jsonb := '[]'::jsonb;
  item jsonb;
  u text;
begin
  if v is null then return jsonb_build_object('description','', 'links','[]'::jsonb, 'files','[]'::jsonb); end if;
  if jsonb_typeof(v) = 'string' then
    begin v := (v #>> '{}')::jsonb; exception when others then v := jsonb_build_object('description', v #>> '{}'); end;
  end if;
  if jsonb_typeof(v) <> 'object' then v := '{}'::jsonb; end if;

  -- links: external_urls[] (string | {url,title,type}) + top-level url
  if jsonb_typeof(v->'external_urls') = 'array' then
    for item in select * from jsonb_array_elements(v->'external_urls') loop
      if jsonb_typeof(item) = 'string' then
        u := item #>> '{}';
        if coalesce(u,'') <> '' then v_links := v_links || jsonb_build_object('url', u, 'title', ''); end if;
      elsif jsonb_typeof(item) = 'object' then
        u := coalesce(nullif(item->>'url',''), case when item->>'title' ~* '^(https?://|www\.)' then item->>'title' end);
        if u is not null then v_links := v_links || jsonb_build_object('url', u, 'title', coalesce(item->>'title','')); end if;
      end if;
    end loop;
  end if;
  if coalesce(v->>'url','') <> '' and not (v_links @> jsonb_build_array(jsonb_build_object('url', v->>'url', 'title', ''))) then
    v_links := v_links || jsonb_build_object('url', v->>'url', 'title', '');
  end if;

  -- files: files[] (string url | {url,name,size,type}); also legacy screenshots[]
  for item in select * from jsonb_array_elements(coalesce(v->'files','[]'::jsonb) || coalesce(v->'screenshots','[]'::jsonb)) loop
    if jsonb_typeof(item) = 'string' then
      u := item #>> '{}';
      if coalesce(u,'') <> '' then v_files := v_files || jsonb_build_object('url', u, 'name', regexp_replace(u,'^.*/',''), 'size', null, 'type', null); end if;
    elsif jsonb_typeof(item) = 'object' and coalesce(item->>'url','') <> '' then
      v_files := v_files || jsonb_build_object('url', item->>'url', 'name', coalesce(item->>'name', regexp_replace(item->>'url','^.*/','')), 'size', item->'size', 'type', item->>'type');
    end if;
  end loop;

  return jsonb_build_object(
    'description', coalesce(v->>'description', v->>'notes', ''),
    'links', v_links,
    'files', v_files
  );
end $$;

-- ---------------------------------------------------------------
-- helper: fire the worker via pg_net (async). Never raises.
-- ---------------------------------------------------------------
create or replace function public.ai_review_kick_worker_v1(p_review_id uuid)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_url text;
  v_secret text;
begin
  select value->>'worker_url' into v_url from platform_settings where key = 'ai_review';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'ai_review_worker_secret';
  if v_url is null or v_secret is null or v_url like '%REPLACE-WITH%' then
    return; -- sweeper will retry once configured
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type','application/json','x-ai-review-secret', v_secret),
    body := jsonb_build_object('review_id', p_review_id),
    timeout_milliseconds := 5000
  );
exception when others then
  raise warning 'ai_review_kick_worker_v1 failed for %: %', p_review_id, sqlerrm;
end $$;

-- ---------------------------------------------------------------
-- 1. submit_individual_task_v1 (authenticated, owner only)
-- ---------------------------------------------------------------
create or replace function public.submit_individual_task_v1(p_progress_id uuid, p_submission_data jsonb)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  tp task_progress%rowtype;
  t  tasks%rowtype;
  v_settings jsonb;
  v_attempt int;
  v_review_id uuid;
  v_mode text;
begin
  select * into tp from task_progress where id = p_progress_id for update;
  if not found or tp.context <> 'individual' or tp.user_id is distinct from auth.uid() then
    raise exception 'ai_review_submit_denied: not your individual task' using errcode = '42501';
  end if;
  if tp.status not in ('in_progress','rejected') then
    raise exception 'ai_review_submit_denied: task is % and cannot be submitted', tp.status using errcode = '22023';
  end if;
  if p_submission_data is null or jsonb_typeof(p_submission_data) <> 'object' then
    raise exception 'ai_review_submit_denied: submission_data must be a JSON object' using errcode = '22023';
  end if;
  select * into t from tasks where id = tp.task_id;

  update task_progress set
    submission_history = case when tp.submission_data is not null
      then coalesce(submission_history,'[]'::jsonb) || jsonb_build_object('status', tp.status, 'submitted_at', tp.submitted_at, 'submission_data', tp.submission_data)
      else coalesce(submission_history,'[]'::jsonb) end,
    submission_data = p_submission_data,
    submitted_at = now(),
    status = 'pending_review',
    reviewer_user_id = null,
    review_feedback = null,
    updated_at = now()
  where id = p_progress_id;

  select coalesce(max(attempt),0) + 1 into v_attempt from ai_task_reviews where progress_id = p_progress_id;
  select value into v_settings from platform_settings where key = 'ai_review';
  v_mode := case when coalesce((v_settings->>'enabled')::boolean, true) = false or v_settings->>'mode' = 'auto_approve'
                 then 'auto_approve' else 'ai' end;

  insert into ai_task_reviews (progress_id, task_id, user_id, attempt, status, submission_snapshot, criteria_snapshot)
  values (p_progress_id, tp.task_id, tp.user_id, v_attempt, 'queued',
          ai_review_normalize_submission_v1(p_submission_data),
          jsonb_build_object('criteria', coalesce(t.peer_review_criteria,'[]'::jsonb),
                             'review_instructions', t.review_instructions,
                             'deliverables', to_jsonb(coalesce(t.deliverables, '{}'::text[])),
                             'title', t.title, 'description', t.description))
  returning id into v_review_id;

  if v_mode = 'auto_approve' then
    perform ai_review_apply_decision_v1(v_review_id, 'approved', jsonb_build_object(
      'decided_by', 'auto_approve_fallback',
      'feedback', 'Approved automatically (AI review is switched off).'));
  else
    perform ai_review_kick_worker_v1(v_review_id);
  end if;

  return jsonb_build_object('success', true, 'review_id', v_review_id, 'attempt', v_attempt, 'mode', v_mode);
end $$;

-- ---------------------------------------------------------------
-- 2. ai_review_claim_v1 (service_role)
-- ---------------------------------------------------------------
create or replace function public.ai_review_claim_v1(p_review_id uuid)
returns setof ai_task_reviews
language sql security definer
set search_path = public, pg_temp
as $$
  update ai_task_reviews
  set status = 'running', claimed_at = now(), started_at = coalesce(started_at, now()), stage = 'fetching_evidence'
  where id = p_review_id and status = 'queued'
  returning *;
$$;

-- ---------------------------------------------------------------
-- 3. ai_review_apply_decision_v1 (service_role; also called internally)
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
-- 4. ai_review_requeue_stale_v1 (cron / service_role)
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
-- 5. get_ai_review_status_v1 (authenticated, owner only, sanitised)
-- ---------------------------------------------------------------
create or replace function public.get_ai_review_status_v1(p_progress_id uuid)
returns jsonb
language sql security definer stable
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'review_id', r.id, 'attempt', r.attempt, 'status', r.status, 'stage', r.stage,
    'decision', r.decision, 'feedback', r.feedback, 'criteria_results', r.criteria_results,
    'started_at', r.started_at, 'finished_at', r.finished_at, 'created_at', r.created_at)
  from ai_task_reviews r
  join task_progress tp on tp.id = r.progress_id
  where r.progress_id = p_progress_id
    and tp.context = 'individual'
    and tp.user_id = auth.uid()
  order by r.attempt desc
  limit 1;
$$;

-- ---------------------------------------------------------------
-- grants
-- ---------------------------------------------------------------
revoke execute on function public.ai_review_normalize_submission_v1(jsonb) from public, anon;
revoke execute on function public.ai_review_kick_worker_v1(uuid) from public, anon, authenticated;
revoke execute on function public.ai_review_claim_v1(uuid) from public, anon, authenticated;
revoke execute on function public.ai_review_apply_decision_v1(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.ai_review_requeue_stale_v1() from public, anon, authenticated;
revoke execute on function public.submit_individual_task_v1(uuid, jsonb) from public, anon;
revoke execute on function public.get_ai_review_status_v1(uuid) from public, anon;
grant execute on function public.ai_review_claim_v1(uuid) to service_role;
grant execute on function public.ai_review_apply_decision_v1(uuid, text, jsonb) to service_role;
grant execute on function public.ai_review_requeue_stale_v1() to service_role;
grant execute on function public.submit_individual_task_v1(uuid, jsonb) to authenticated, service_role;
grant execute on function public.get_ai_review_status_v1(uuid) to authenticated, service_role;
