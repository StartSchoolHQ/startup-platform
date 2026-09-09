-- 20260909120500_ai_review_self_check_requires_phrase_v1.sql
--
-- Tightens the self-check branch added by 20260909120400. That branch fired on
-- `tasks.requires_review = false` alone — but false is the column's DEFAULT, and
-- `create_individual_task_and_assign_to_users` also defaults
-- `p_requires_review = false`, so any task an admin created without touching the
-- review toggle would have been approved instantly on submit and paid its XP
-- without ever being reviewed.
--
-- The branch now needs BOTH conditions: `requires_review = false` AND
-- `review_instructions ilike '%self-check%'` — the persona doc's literal signal
-- ("Self-Check (no peer review)", docs/documentation/ai-reviewer-persona.md).
-- Every other task, an accidental default-false one included, goes through the
-- normal AI review path.
--
-- Folded back into 20260909120400 and 20260909120100 so a fresh environment
-- ends up in exactly this state. Nothing else in the function changed.

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
  -- BOTH conditions are required: `requires_review = false` alone is the column's
  -- default (and create_individual_task_and_assign_to_users defaults
  -- p_requires_review = false), so an admin who never touched the toggle would
  -- otherwise get a free-XP instant approval. The task must also carry the
  -- persona doc's literal signal in review_instructions ("Self-Check (no peer
  -- review)"); anything else goes through the normal AI review path.
  if coalesce(t.requires_review, true) = false
     and coalesce(t.review_instructions, '') ilike '%self-check%' then
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
