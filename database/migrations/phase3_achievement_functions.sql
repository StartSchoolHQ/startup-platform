-- Migration: Phase 3 - Dynamic Achievements Database Functions
-- Date: 2025-11-03
-- Description: Create functions for achievement progress tracking, completion checking, and reward system

-- ========================================
-- 3.1 Achievement Progress Function
-- ========================================

CREATE OR REPLACE FUNCTION get_user_achievement_progress(p_user_id uuid)
RETURNS TABLE(
    achievement_id uuid,
    achievement_name text,
    achievement_description text,
    achievement_icon text,
    xp_reward integer,
    credits_reward integer,
    color_theme text,
    sort_order integer,
    total_tasks bigint,
    completed_tasks bigint,
    status text,
    is_completed boolean
) AS $$
BEGIN
    RETURN QUERY
    WITH achievement_progress AS (
        SELECT 
            a.id as achievement_id,
            a.name,
            a.description,
            a.icon,
            a.xp_reward,
            a.credits_reward,
            a.color_theme,
            a.sort_order,
            COUNT(t.id) as total_tasks,
            COUNT(CASE 
                WHEN ttp.status = 'approved' AND ttp.assigned_to_user_id = p_user_id 
                THEN 1 
            END) as completed_tasks,
            EXISTS(
                SELECT 1 FROM user_achievements ua 
                WHERE ua.user_id = p_user_id AND ua.achievement_id = a.id
            ) as is_completed
        FROM achievements a
        LEFT JOIN tasks t ON t.achievement_id = a.id
        LEFT JOIN team_task_progress ttp ON ttp.task_id = t.id
        WHERE a.active = true
        GROUP BY a.id, a.name, a.description, a.icon, a.xp_reward, a.credits_reward, a.color_theme, a.sort_order
    )
    SELECT 
        ap.achievement_id,
        ap.name,
        ap.description,
        ap.icon,
        ap.xp_reward,
        ap.credits_reward,
        ap.color_theme,
        ap.sort_order,
        ap.total_tasks,
        ap.completed_tasks,
        CASE 
            WHEN ap.is_completed THEN 'completed'
            WHEN ap.completed_tasks > 0 THEN 'in-progress'
            ELSE 'not-started'
        END as status,
        ap.is_completed
    FROM achievement_progress ap
    ORDER BY ap.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 3.2 Achievement Completion Check Function
-- ========================================

CREATE OR REPLACE FUNCTION check_and_award_achievement(p_user_id uuid, p_achievement_id uuid)
RETURNS json AS $$
DECLARE
    v_total_tasks integer;
    v_completed_tasks integer;
    v_achievement_record record;
    v_already_completed boolean;
BEGIN
    -- Check if already completed
    SELECT EXISTS(
        SELECT 1 FROM user_achievements 
        WHERE user_id = p_user_id AND achievement_id = p_achievement_id
    ) INTO v_already_completed;
    
    IF v_already_completed THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Achievement already completed',
            'already_completed', true
        );
    END IF;

    -- Get achievement details
    SELECT a.name, a.xp_reward, a.credits_reward INTO v_achievement_record
    FROM achievements a WHERE a.id = p_achievement_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Achievement not found'
        );
    END IF;

    -- Count total tasks and completed tasks for this achievement
    SELECT 
        COUNT(*) as total,
        COUNT(CASE 
            WHEN ttp.status = 'approved' AND ttp.assigned_to_user_id = p_user_id 
            THEN 1 
        END) as completed
    INTO v_total_tasks, v_completed_tasks
    FROM tasks t
    LEFT JOIN team_task_progress ttp ON ttp.task_id = t.id
    WHERE t.achievement_id = p_achievement_id;

    -- Check if all tasks completed
    IF v_completed_tasks >= v_total_tasks AND v_total_tasks > 0 THEN
        -- Award achievement
        INSERT INTO user_achievements (user_id, achievement_id, xp_awarded, credits_awarded)
        VALUES (p_user_id, p_achievement_id, v_achievement_record.xp_reward, v_achievement_record.credits_reward);
        
        -- Update user totals
        UPDATE users 
        SET 
            total_xp = total_xp + v_achievement_record.xp_reward,
            total_credits = total_credits + v_achievement_record.credits_reward
        WHERE id = p_user_id;
        
        -- Create transaction record
        INSERT INTO transactions (
            user_id, 
            achievement_id, 
            type, 
            xp_change, 
            credits_change, 
            description,
            metadata,
            created_at
        ) VALUES (
            p_user_id, 
            p_achievement_id, 
            'achievement', 
            v_achievement_record.xp_reward, 
            v_achievement_record.credits_reward,
            format('Achievement completed: %s', v_achievement_record.name),
            json_build_object(
                'achievement_id', p_achievement_id,
                'achievement_name', v_achievement_record.name,
                'total_tasks', v_total_tasks,
                'completed_tasks', v_completed_tasks
            ),
            now()
        );
        
        RETURN json_build_object(
            'success', true, 
            'message', 'Achievement completed!',
            'achievement_name', v_achievement_record.name,
            'xp_awarded', v_achievement_record.xp_reward,
            'credits_awarded', v_achievement_record.credits_reward,
            'newly_completed', true
        );
    END IF;
    
    RETURN json_build_object(
        'success', false, 
        'message', format('Achievement progress: %s/%s tasks completed', v_completed_tasks, v_total_tasks),
        'progress', json_build_object(
            'completed_tasks', v_completed_tasks,
            'total_tasks', v_total_tasks,
            'achievement_name', v_achievement_record.name
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 3.3 Get Tasks by Achievement Function
-- ========================================

CREATE OR REPLACE FUNCTION get_tasks_by_achievement(p_achievement_id uuid DEFAULT NULL, p_team_id uuid DEFAULT NULL)
RETURNS TABLE(
    progress_id uuid,
    task_id uuid,
    title text,
    description text,
    category text,
    difficulty_level integer,
    base_xp_reward integer,
    base_credits_reward integer,
    status text,
    assigned_to_user_id uuid,
    assignee_name text,
    assignee_avatar_url text,
    assigned_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    is_available boolean,
    achievement_id uuid,
    achievement_name text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ttp.id as progress_id,
        t.id as task_id,
        t.title,
        t.description,
        t.category::text,
        t.difficulty_level,
        t.base_xp_reward,
        t.base_credits_reward,
        ttp.status::text,
        ttp.assigned_to_user_id,
        u.name as assignee_name,
        u.avatar_url as assignee_avatar_url,
        ttp.assigned_at,
        ttp.started_at,
        ttp.completed_at,
        (ttp.assigned_to_user_id IS NULL OR ttp.status IN ('not_started', 'cancelled')) as is_available,
        t.achievement_id,
        a.name as achievement_name
    FROM tasks t
    LEFT JOIN achievements a ON t.achievement_id = a.id
    LEFT JOIN team_task_progress ttp ON ttp.task_id = t.id AND (p_team_id IS NULL OR ttp.team_id = p_team_id)
    LEFT JOIN users u ON ttp.assigned_to_user_id = u.id
    WHERE (p_achievement_id IS NULL OR t.achievement_id = p_achievement_id)
    AND t.is_active = true
    ORDER BY a.sort_order, t.sort_order, t.title;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 3.4 Update Peer Review Function to Check Achievements
-- ========================================

CREATE OR REPLACE FUNCTION submit_external_peer_review(
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
  v_achievement_result json;
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

  -- Get task details including rewards and achievement info
  SELECT 
    t.title,
    t.base_xp_reward,
    t.base_xp_reward as credits_reward,  -- Award same amount as XP
    t.achievement_id
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

    -- NEW: Check if achievement should be awarded to task completer
    IF v_task_record.achievement_id IS NOT NULL THEN
      SELECT check_and_award_achievement(v_progress_record.assigned_to_user_id, v_task_record.achievement_id) 
      INTO v_achievement_result;
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', format('Review completed with decision: %s', p_decision),
    'task_status', v_new_status,
    'rewards_awarded', p_decision = 'accepted',
    'xp_awarded', CASE WHEN p_decision = 'accepted' THEN v_task_xp_reward ELSE 0 END,
    'credits_awarded', CASE WHEN p_decision = 'accepted' THEN v_task_credits_reward ELSE 0 END,
    'achievement_check', COALESCE(v_achievement_result, json_build_object('checked', false))
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

-- ========================================
-- 3.5 Create Comments and Indexes
-- ========================================

-- Add helpful comments
COMMENT ON FUNCTION get_user_achievement_progress(uuid) IS 'Returns user progress for all achievements with task counts and status';
COMMENT ON FUNCTION check_and_award_achievement(uuid, uuid) IS 'Checks if user completed all tasks in achievement and awards rewards if so';  
COMMENT ON FUNCTION get_tasks_by_achievement(uuid, uuid) IS 'Returns tasks filtered by achievement (NULL = all tasks) and optionally by team';

-- Create additional performance indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_completed_at ON user_achievements(completed_at);
CREATE INDEX IF NOT EXISTS idx_team_task_progress_status_user ON team_task_progress(status, assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_active_achievement ON tasks(is_active, achievement_id) WHERE is_active = true;