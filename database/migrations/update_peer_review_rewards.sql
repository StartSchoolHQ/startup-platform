-- Migration: Update submit_external_peer_review function to award equal rewards to both task completer and peer reviewer
-- Date: 2025-10-24
-- Description: Both task completer and peer reviewer should receive the same full XP and Credits amounts, with proper transaction records

CREATE OR REPLACE FUNCTION public.submit_external_peer_review(
  p_progress_id uuid,
  p_decision text,
  p_feedback text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_progress_record team_task_progress%ROWTYPE;
  v_task_record record;
  v_new_status task_status_type;
  v_task_xp_reward integer;
  v_task_credits_reward integer;
BEGIN
  -- Validate decision
  IF p_decision NOT IN ('accepted', 'rejected') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Decision must be either "accepted" or "rejected"'
    );
  END IF;

  -- Get task progress record and validate reviewer
  SELECT * INTO v_progress_record
  FROM team_task_progress
  WHERE id = p_progress_id 
    AND status = 'pending_review'
    AND reviewer_user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Task not found or you are not assigned as reviewer'
    );
  END IF;

  -- Get task details including rewards
  -- Based on UI showing equal XP and Points values, award same amount for both
  SELECT 
    t.title,
    t.base_xp_reward,
    t.base_xp_reward as credits_reward  -- Award same amount as XP
  INTO v_task_record
  FROM tasks t
  WHERE t.id = v_progress_record.task_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Task details not found'
    );
  END IF;

  -- Set reward amounts
  v_task_xp_reward := COALESCE(v_task_record.base_xp_reward, 0);
  v_task_credits_reward := COALESCE(v_task_record.credits_reward, 0);

  -- Determine new status
  v_new_status := CASE 
    WHEN p_decision = 'accepted' THEN 'approved'::task_status_type
    ELSE 'rejected'::task_status_type
  END;

  -- Update task status
  UPDATE team_task_progress
  SET 
    status = v_new_status,
    completed_at = CASE WHEN p_decision = 'accepted' THEN now() ELSE NULL END,
    submission_notes = COALESCE(submission_notes || E'\n\nPeer Review: ' || p_feedback, 'Peer Review: ' || p_feedback),
    updated_at = now()
  WHERE id = p_progress_id;

  -- If accepted, award rewards to BOTH task completer and peer reviewer
  IF p_decision = 'accepted' THEN
    -- Award XP and Credits to the TASK COMPLETER
    UPDATE users 
    SET 
      total_xp = total_xp + v_task_xp_reward,
      total_credits = total_credits + v_task_credits_reward
    WHERE id = v_progress_record.assigned_to_user_id;

    -- Create "task" transaction record for TASK COMPLETER
    INSERT INTO transactions (
      user_id,
      task_id,
      type,
      xp_change,
      credits_change,
      description,
      metadata,
      created_at
    ) VALUES (
      v_progress_record.assigned_to_user_id,
      NULL,  -- task_id references achievement_tasks, not tasks table
      'task',
      v_task_xp_reward,
      v_task_credits_reward,
      format('Task completed: %s', v_task_record.title),
      json_build_object(
        'progress_id', p_progress_id,
        'reviewer_id', auth.uid(),
        'task_id', v_progress_record.task_id,
        'task_title', v_task_record.title
      ),
      now()
    );

    -- Award SAME XP and Credits to the PEER REVIEWER
    UPDATE users 
    SET 
      total_xp = total_xp + v_task_xp_reward,
      total_credits = total_credits + v_task_credits_reward,
      daily_validation_xp = daily_validation_xp + v_task_xp_reward
    WHERE id = auth.uid();

    -- Create "validation" transaction record for PEER REVIEWER
    INSERT INTO transactions (
      user_id,
      task_id,
      type,
      xp_change,
      credits_change,
      description,
      metadata,
      created_at
    ) VALUES (
      auth.uid(),
      NULL,  -- task_id references achievement_tasks, not tasks table
      'validation',
      v_task_xp_reward,
      v_task_credits_reward,
      format('Peer review completed: %s', v_task_record.title),
      json_build_object(
        'progress_id', p_progress_id,
        'task_completer_id', v_progress_record.assigned_to_user_id,
        'task_id', v_progress_record.task_id,
        'task_title', v_task_record.title
      ),
      now()
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', format('Review completed with decision: %s', p_decision),
    'task_status', v_new_status,
    'rewards_awarded', p_decision = 'accepted',
    'xp_awarded', CASE WHEN p_decision = 'accepted' THEN v_task_xp_reward ELSE 0 END,
    'credits_awarded', CASE WHEN p_decision = 'accepted' THEN v_task_credits_reward ELSE 0 END
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;