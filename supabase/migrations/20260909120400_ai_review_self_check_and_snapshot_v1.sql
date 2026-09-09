-- 20260909120400_ai_review_self_check_and_snapshot_v1.sql
--
-- Task 20 (persona prompt v2). Two additive changes, both folded back into the
-- original migration bodies (20260909120000 / 20260909120100) so a fresh
-- environment ends up in exactly this state.
--
-- (a) ai_task_reviews.decided_by gains 'self_check'.
--
-- (b) submit_individual_task_v1:
--     - criteria_snapshot now carries the task's full bar for the reviewer:
--       `detailed_instructions` (the Requirements / Evidence Required text),
--       `is_recurring`, and `previous_submissions` (up to 3 prior submission
--       descriptions, newest first, `[]` unless the task is recurring) so the
--       prompt can reject a reused entry on a recurring task.
--     - Self-check tasks (`tasks.requires_review = false`) are recorded as
--       complete immediately, before the mode switch — the model is never
--       called and the review row is finalised with `decided_by = 'self_check'`.
--       Returns mode 'self_check'.
--
-- Nothing existing is dropped and no other function or trigger is touched.

-- ---------------------------------------------------------------
-- (a) decided_by CHECK + 'self_check'
-- ---------------------------------------------------------------
alter table public.ai_task_reviews
  drop constraint ai_task_reviews_decided_by_check,
  add constraint ai_task_reviews_decided_by_check
    check (decided_by is null or decided_by in ('ai','system','auto_approve_fallback','self_check'));

-- ---------------------------------------------------------------
-- (b) submit_individual_task_v1 — full task bar in the snapshot + self-check
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
  v_history jsonb;
  v_previous jsonb := '[]'::jsonb;
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

  -- Recurring task: the reviewer needs the earlier entries to spot a repeat.
  -- Newest first = the submission being replaced right now (ord 0), then
  -- submission_history from the back. Read from `tp`, i.e. BEFORE the update
  -- below appends the current submission to the history.
  if coalesce(t.is_recurring, false) then
    v_history := case when jsonb_typeof(tp.submission_history) = 'array'
                      then tp.submission_history else '[]'::jsonb end;
    select coalesce(jsonb_agg(descr order by ord), '[]'::jsonb)
      into v_previous
      from (
        select ord, descr
        from (
          select 0 as ord,
                 nullif(btrim(left(coalesce(ai_review_normalize_submission_v1(tp.submission_data)->>'description', ''), 4000)), '') as descr
          union all
          select (jsonb_array_length(v_history) - h.idx + 1)::int as ord,
                 nullif(btrim(left(coalesce(ai_review_normalize_submission_v1(h.entry->'submission_data')->>'description', ''), 4000)), '') as descr
          from jsonb_array_elements(v_history) with ordinality as h(entry, idx)
        ) candidates
        where descr is not null
        order by ord
        limit 3
      ) recent;
  end if;

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
                             'title', t.title, 'description', t.description,
                             'detailed_instructions', t.detailed_instructions,
                             'is_recurring', coalesce(t.is_recurring, false),
                             'previous_submissions', v_previous))
  returning id into v_review_id;

  -- Self-check task: an honesty check the founder does with themselves. Recorded
  -- as complete instantly; the model is never called. Checked BEFORE the mode
  -- switch so the kill switch cannot change the outcome either way.
  if coalesce(t.requires_review, true) = false then
    perform ai_review_apply_decision_v1(v_review_id, 'approved', jsonb_build_object(
      'decided_by', 'self_check',
      'feedback', 'Self-check task — recorded as complete. This one is between you and yourself: be honest in your own notes.'));
    return jsonb_build_object('success', true, 'review_id', v_review_id, 'attempt', v_attempt, 'mode', 'self_check');
  end if;

  if v_mode = 'auto_approve' then
    perform ai_review_apply_decision_v1(v_review_id, 'approved', jsonb_build_object(
      'decided_by', 'auto_approve_fallback',
      'feedback', 'Approved automatically (AI review is switched off).'));
  else
    perform ai_review_kick_worker_v1(v_review_id);
  end if;

  return jsonb_build_object('success', true, 'review_id', v_review_id, 'attempt', v_attempt, 'mode', v_mode);
end $$;

revoke execute on function public.submit_individual_task_v1(uuid, jsonb) from public, anon;
grant execute on function public.submit_individual_task_v1(uuid, jsonb) to authenticated, service_role;
