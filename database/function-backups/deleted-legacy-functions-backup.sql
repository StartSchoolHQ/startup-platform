-- BACKUP OF DELETED LEGACY FUNCTIONS
-- Created: December 4, 2025
-- These functions were confirmed as unused legacy code referencing non-existent tables

-- ============================================================================
-- 1. accept_task_for_review - References team_tasks, task_peer_reviews tables
-- ============================================================================
CREATE OR REPLACE FUNCTION public.accept_task_for_review(p_task_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_task_record team_tasks%ROWTYPE;
  v_is_team_member BOOLEAN := false;
  v_review_id UUID;
BEGIN
  -- Get task details and validate
  SELECT * INTO v_task_record
  FROM team_tasks
  WHERE id = p_task_id AND status = 'pending_review';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Task not found or not available for review'
    );
  END IF;

  -- Validate reviewer is a team member (but not the task assignee)
  SELECT EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = v_task_record.team_id
      AND tm.user_id = auth.uid()
      AND tm.left_at IS NULL
      AND tm.user_id != v_task_record.assigned_to_user_id
  ) INTO v_is_team_member;

  IF NOT v_is_team_member THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You cannot review this task. You must be a team member and not the task assignee.'
    );
  END IF;

  -- Check if already has a reviewer assigned
  IF EXISTS (
    SELECT 1 FROM task_peer_reviews
    WHERE team_task_id = p_task_id AND status IN ('assigned', 'in_review')
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Task already has a reviewer assigned'
    );
  END IF;

  -- Create peer review record
  INSERT INTO task_peer_reviews (
    team_task_id,
    reviewer_user_id,
    status
  ) VALUES (
    p_task_id,
    auth.uid(),
    'assigned'
  ) RETURNING id INTO v_review_id;

  -- Log the action
  INSERT INTO team_task_history (
    team_task_id,
    action,
    changed_by_user_id,
    notes
  ) VALUES (
    p_task_id,
    'assigned',
    auth.uid(),
    'Task accepted for peer review'
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Task accepted for review',
    'review_id', v_review_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

-- ============================================================================
-- 2. get_task_for_review - References team_tasks, task_submissions tables
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_task_for_review(p_task_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'task', json_build_object(
      'id', t.id,
      'title', t.title,
      'description', t.description,
      'priority', t.priority,
      'difficulty_level', t.difficulty_level,
      'estimated_hours', t.estimated_hours,
      'xp_reward', t.xp_reward,
      'credits_reward', t.credits_reward,
      'review_instructions', t.review_instructions,
      'created_at', t.created_at,
      'assigned_at', t.assigned_at
    ),
    'assignee', json_build_object(
      'id', u.id,
      'name', u.name,
      'avatar_url', u.avatar_url
    ),
    'submission', json_build_object(
      'id', s.id,
      'submission_data', s.submission_data,
      'submission_notes', s.submission_notes,
      'time_spent_hours', s.time_spent_hours,
      'submitted_at', s.submitted_at,
      'submission_version', s.submission_version
    ),
    'team', json_build_object(
      'id', tm.id,
      'name', tm.name
    )
  ) INTO v_result
  FROM team_tasks t
  JOIN users u ON t.assigned_to_user_id = u.id
  JOIN teams tm ON t.team_id = tm.id
  LEFT JOIN task_submissions s ON t.id = s.team_task_id AND s.is_current_submission = true
  WHERE t.id = p_task_id
    AND t.status = 'pending_review'
    AND EXISTS (
      SELECT 1 FROM team_members ttm
      WHERE ttm.team_id = t.team_id
        AND ttm.user_id = auth.uid()
        AND ttm.left_at IS NULL
    );

  IF v_result IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Task not found or not available for review'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'data', v_result
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

-- ============================================================================
-- 3. submit_task_for_review - References team_tasks, task_submissions tables
-- ============================================================================
CREATE OR REPLACE FUNCTION public.submit_task_for_review(p_task_id uuid, p_submission_data jsonb, p_submission_notes text DEFAULT NULL::text, p_time_spent_hours numeric DEFAULT NULL::numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_task_record team_tasks%ROWTYPE;
  v_submission_id UUID;
  v_result JSON;
BEGIN
  -- Validate task exists and user can submit it
  SELECT * INTO v_task_record
  FROM team_tasks
  WHERE id = p_task_id
    AND assigned_to_user_id = auth.uid()
    AND status = 'in_progress';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Task not found or not in progress for current user'
    );
  END IF;

  -- Check if task requires review
  IF NOT v_task_record.requires_review THEN
    -- Direct completion without review
    UPDATE team_tasks
    SET status = 'completed',
        completed_at = now(),
        updated_at = now()
    WHERE id = p_task_id;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Task completed successfully',
      'requires_review', false
    );
  END IF;

  -- Create or update submission
  INSERT INTO task_submissions (
    team_task_id,
    submitted_by_user_id,
    submission_data,
    submission_notes,
    time_spent_hours
  ) VALUES (
    p_task_id,
    auth.uid(),
    p_submission_data,
    p_submission_notes,
    p_time_spent_hours
  ) 
  ON CONFLICT (team_task_id) WHERE is_current_submission = true
  DO UPDATE SET
    submission_data = EXCLUDED.submission_data,
    submission_notes = EXCLUDED.submission_notes,
    time_spent_hours = EXCLUDED.time_spent_hours,
    submission_version = task_submissions.submission_version + 1,
    submitted_at = now(),
    updated_at = now()
  RETURNING id INTO v_submission_id;

  -- Update task status to pending_review
  UPDATE team_tasks
  SET status = 'pending_review',
      submission_data = p_submission_data,
      updated_at = now()
  WHERE id = p_task_id;

  -- Log the action in task history
  INSERT INTO team_task_history (
    team_task_id,
    action,
    changed_by_user_id,
    old_values,
    new_values,
    notes
  ) VALUES (
    p_task_id,
    'status_changed',
    auth.uid(),
    json_build_object('status', v_task_record.status),
    json_build_object('status', 'pending_review'),
    'Task submitted for peer review'
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Task submitted for peer review',
    'submission_id', v_submission_id,
    'requires_review', true
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

-- ============================================================================
-- 4. create_global_task_template - References global_task_templates table
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_global_task_template(p_template_code text, p_title text, p_description text DEFAULT NULL::text, p_category task_category_type DEFAULT 'development'::task_category_type, p_priority task_priority_type DEFAULT 'medium'::task_priority_type, p_difficulty_level integer DEFAULT 1, p_estimated_hours numeric DEFAULT 0, p_base_xp_reward integer DEFAULT 0, p_base_credits_reward integer DEFAULT 0, p_requires_review boolean DEFAULT false, p_review_instructions text DEFAULT NULL::text, p_sort_order integer DEFAULT 0, p_prerequisite_template_codes text[] DEFAULT '{}'::text[], p_auto_assign_to_new_teams boolean DEFAULT true, p_submission_form_schema jsonb DEFAULT '{}'::jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_template_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND primary_role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only administrators can create global task templates'
    );
  END IF;

  -- Create the template
  INSERT INTO global_task_templates (
    template_code,
    title,
    description,
    category,
    priority,
    difficulty_level,
    estimated_hours,
    base_xp_reward,
    base_credits_reward,
    requires_review,
    review_instructions,
    sort_order,
    prerequisite_template_codes,
    auto_assign_to_new_teams,
    submission_form_schema,
    created_by_user_id
  ) VALUES (
    p_template_code,
    p_title,
    p_description,
    p_category,
    p_priority,
    p_difficulty_level,
    p_estimated_hours,
    p_base_xp_reward,
    p_base_credits_reward,
    p_requires_review,
    p_review_instructions,
    p_sort_order,
    p_prerequisite_template_codes,
    p_auto_assign_to_new_teams,
    p_submission_form_schema,
    auth.uid()
  ) RETURNING id INTO v_template_id;

  -- If auto-assign is enabled, assign to all existing teams
  IF p_auto_assign_to_new_teams THEN
    PERFORM assign_templates_to_team(t.id, ARRAY[v_template_id], auth.uid())
    FROM teams t
    WHERE t.status = 'active';
  END IF;

  RETURN json_build_object(
    'success', true,
    'template_id', v_template_id,
    'message', 'Global task template created successfully'
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Template code "%s" already exists', p_template_code)
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

-- ============================================================================
-- 5. assign_templates_to_team - References multiple non-existent tables
-- ============================================================================
CREATE OR REPLACE FUNCTION public.assign_templates_to_team(p_team_id uuid, p_template_ids uuid[] DEFAULT NULL::uuid[], p_assigned_by_user_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_template_record global_task_templates%ROWTYPE;
  v_assignment_id UUID;
  v_task_id UUID;
  v_assigned_count INTEGER := 0;
  v_errors TEXT[] := '{}';
BEGIN
  -- If no specific templates provided, get all auto-assign templates
  IF p_template_ids IS NULL THEN
    SELECT ARRAY_AGG(id) INTO p_template_ids
    FROM global_task_templates
    WHERE is_active = true AND auto_assign_to_new_teams = true;
  END IF;

  -- Loop through each template
  FOR i IN 1..array_length(p_template_ids, 1) LOOP
    BEGIN
      -- Get template details
      SELECT * INTO v_template_record
      FROM global_task_templates
      WHERE id = p_template_ids[i] AND is_active = true;
      
      IF FOUND THEN
        -- Check if already assigned
        IF NOT EXISTS (
          SELECT 1 FROM team_task_assignments
          WHERE team_id = p_team_id AND template_id = v_template_record.id
        ) THEN
          -- Create assignment
          INSERT INTO team_task_assignments (
            team_id,
            template_id,
            assigned_by_user_id
          ) VALUES (
            p_team_id,
            v_template_record.id,
            p_assigned_by_user_id
          ) RETURNING id INTO v_assignment_id;

          -- Create team task instance
          INSERT INTO team_tasks (
            team_id,
            template_id,
            assignment_id,
            title,
            description,
            priority,
            difficulty_level,
            estimated_hours,
            xp_reward,
            credits_reward,
            requires_review,
            review_instructions,
            category,
            metadata
          ) VALUES (
            p_team_id,
            v_template_record.id,
            v_assignment_id,
            v_template_record.title,
            v_template_record.description,
            v_template_record.priority,
            v_template_record.difficulty_level,
            v_template_record.estimated_hours,
            v_template_record.base_xp_reward,
            v_template_record.base_credits_reward,
            v_template_record.requires_review,
            v_template_record.review_instructions,
            v_template_record.category::text,
            json_build_object('template_code', v_template_record.template_code)
          ) RETURNING id INTO v_task_id;

          v_assigned_count := v_assigned_count + 1;
        END IF;
      ELSE
        v_errors := v_errors || format('Template %s not found or inactive', p_template_ids[i]);
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        v_errors := v_errors || format('Error assigning template %s: %s', p_template_ids[i], SQLERRM);
    END;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'assigned_count', v_assigned_count,
    'errors', v_errors,
    'message', format('Assigned %s templates to team', v_assigned_count)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

-- ============================================================================
-- PROBLEMATIC FUNCTIONS ANALYSIS (December 4, 2025)
-- ============================================================================

-- DUPLICATE: update_task_status (text version) - LEGACY VERSION
CREATE OR REPLACE FUNCTION public.update_task_status(p_progress_id uuid, p_status task_status_type, p_submission_data text DEFAULT NULL::text, p_submission_notes text DEFAULT NULL::text)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE task_progress 
  SET 
    status = p_status,
    started_at = CASE 
      WHEN p_status = 'in_progress' AND started_at IS NULL THEN now()
      ELSE started_at 
    END,
    completed_at = CASE 
      WHEN p_status IN ('completed', 'pending_review') THEN now()
      ELSE completed_at 
    END,
    cancelled_at = CASE 
      WHEN p_status = 'cancelled' THEN now()
      ELSE cancelled_at 
    END,
    -- Clear reviewer and feedback when resubmitting after rejection to allow fresh assignment
    reviewer_user_id = CASE 
      WHEN p_status = 'pending_review' AND status IN ('rejected', 'revision_required') THEN NULL
      ELSE reviewer_user_id 
    END,
    review_feedback = CASE 
      WHEN p_status = 'pending_review' AND status IN ('rejected', 'revision_required') THEN NULL
      ELSE review_feedback 
    END,
    submission_data = COALESCE(p_submission_data, submission_data),
    submission_notes = COALESCE(p_submission_notes, submission_notes),
    updated_at = now()
  WHERE id = p_progress_id;
  
  -- Add history entry when task is submitted for review (including resubmissions)
  IF p_status = 'pending_review' THEN
    PERFORM add_peer_review_history_entry(
      p_progress_id,
      'submitted_for_review',
      NULL,
      NULL,
      NULL
    );
  END IF;
  
  IF FOUND THEN
    RETURN QUERY SELECT true, 'Task status updated successfully';
  ELSE
    RETURN QUERY SELECT false, 'Task progress not found';
  END IF;
END;
$function$;

-- DUPLICATE: submit_external_peer_review (3-parameter version) - OLD VERSION
CREATE OR REPLACE FUNCTION public.submit_external_peer_review(p_progress_id uuid, p_decision text, p_feedback text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    task_record RECORD;
    team_id_var UUID;
    task_xp INTEGER;
    task_points INTEGER;
    distribution_result JSON;
    reviewer_xp INTEGER;
    reviewer_points INTEGER;
    current_user_id UUID;
    task_title TEXT;
    task_id_var UUID;
BEGIN
    -- Get current user ID from auth context
    current_user_id := auth.uid();
    
    -- Get task progress details with task info
    SELECT 
        tp.id,
        tp.task_id,
        tp.team_id,
        tp.context,
        tp.assigned_to_user_id,
        t.base_xp_reward,
        t.base_points_reward,
        t.title
    INTO task_record
    FROM task_progress tp
    JOIN tasks t ON tp.task_id = t.id
    WHERE tp.id = p_progress_id;
    
    -- Check if task exists
    IF task_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Task not found',
            'progress_id', p_progress_id
        );
    END IF;
    
    -- Extract values for easier reference
    task_xp := COALESCE(task_record.base_xp_reward, 0);
    task_points := COALESCE(task_record.base_points_reward, 0);
    reviewer_xp := GREATEST(1, ROUND(task_xp * 0.1)); -- At least 1 XP
    reviewer_points := GREATEST(1, ROUND(task_points * 0.1)); -- At least 1 point
    task_title := task_record.title;
    task_id_var := task_record.task_id;
    
    -- Update task status based on decision
    IF p_decision = 'accepted' THEN
        UPDATE task_progress 
        SET 
            status = 'approved',
            review_feedback = p_feedback,
            reviewer_user_id = current_user_id,
            updated_at = NOW()
        WHERE id = p_progress_id;
        
        -- Add history entry for approval
        PERFORM add_peer_review_history_entry(
            p_progress_id,
            'review_completed',
            current_user_id,
            'approved',
            p_feedback
        );
        
        -- If this is a TEAM context task, distribute rewards among team members
        IF task_record.context = 'team' AND task_record.team_id IS NOT NULL THEN
            -- Distribute team rewards WITH transaction logging
            SELECT distribute_team_rewards(
                task_record.team_id, 
                task_xp, 
                task_points,
                task_id_var,        -- Pass task_id for transaction records
                task_title,         -- Pass task_title for transaction records
                p_progress_id,      -- Pass progress_id for transaction metadata
                current_user_id     -- Pass reviewer_id for transaction metadata
            ) INTO distribution_result;
        ELSIF task_record.context = 'individual' AND task_record.assigned_to_user_id IS NOT NULL THEN
            -- For individual tasks, reward the assigned user directly
            UPDATE users 
            SET 
                total_xp = total_xp + task_xp,
                total_points = total_points + task_points,
                updated_at = NOW()
            WHERE id = task_record.assigned_to_user_id;
            
            -- CREATE TRANSACTION RECORD for individual task completion
            INSERT INTO transactions (
                user_id,
                task_id,
                type,
                xp_change,
                points_change,
                points_type,
                description,
                activity_type,
                metadata
            ) VALUES (
                task_record.assigned_to_user_id,
                task_id_var,
                'task',
                task_xp,
                task_points,
                'individual',
                'Task completed: ' || task_title,
                'individual',
                json_build_object(
                    'task_title', task_title,
                    'progress_id', p_progress_id,
                    'reviewer_id', current_user_id,
                    'context', 'individual',
                    'completion_type', 'peer_review_approved'
                )
            );
            
            distribution_result := json_build_object(
                'success', true,
                'individual_reward', true,
                'user_id', task_record.assigned_to_user_id,
                'xp_awarded', task_xp,
                'points_awarded', task_points
            );
        END IF;
        
    ELSE
        -- Rejected - no rewards for task completion, but reviewer still gets reward
        UPDATE task_progress 
        SET 
            status = 'rejected',
            review_feedback = p_feedback,
            reviewer_user_id = current_user_id,
            updated_at = NOW()
        WHERE id = p_progress_id;
        
        -- Add history entry for rejection
        PERFORM add_peer_review_history_entry(
            p_progress_id,
            'review_completed',
            current_user_id,
            'rejected',
            p_feedback
        );
        
        distribution_result := json_build_object(
            'success', true,
            'task_rejected', true
        );
    END IF;
    
    -- Always reward the reviewer
    UPDATE users 
    SET 
        total_xp = total_xp + reviewer_xp,
        total_points = total_points + reviewer_points,
        updated_at = NOW()
    WHERE id = current_user_id;
    
    -- Create reviewer transaction
    INSERT INTO transactions (
        user_id,
        task_id,
        type,
        xp_change,
        points_change,
        points_type,
        description,
        activity_type,
        metadata
    ) VALUES (
        current_user_id,
        task_id_var,
        'validation',
        reviewer_xp,
        reviewer_points,
        'individual',
        'Peer review completed: ' || task_title,
        'team',
        json_build_object(
            'task_title', task_title,
            'progress_id', p_progress_id,
            'decision', p_decision,
            'reviewer_percentage', '10% of task rewards',
            'base_task_xp', task_xp,
            'base_task_points', task_points,
            'is_actual_reviewer', true,
            'reviewer_user_id', current_user_id
        )
    );
    
    -- Return combined result
    RETURN json_build_object(
        'success', true,
        'progress_id', p_progress_id,
        'decision', p_decision,
        'task_context', task_record.context,
        'team_id', task_record.team_id,
        'task_xp', task_xp,
        'task_points', task_points,
        'task_reward_distribution', distribution_result,
        'reviewer_reward', json_build_object(
            'user_id', current_user_id,
            'xp_earned', reviewer_xp,
            'points_earned', reviewer_points,
            'percentage', '10% of task rewards'
        )
    );
    
EXCEPTION WHEN others THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'progress_id', p_progress_id
    );
END;
$function$;

-- LEGACY: create_team_task - References team_tasks table
CREATE OR REPLACE FUNCTION public.create_team_task(p_team_id uuid, p_title text, p_description text DEFAULT NULL::text, p_priority task_priority_type DEFAULT 'medium'::task_priority_type, p_difficulty_level integer DEFAULT 1, p_xp_reward integer DEFAULT 0, p_credits_reward integer DEFAULT 0, p_estimated_hours numeric DEFAULT 0, p_category text DEFAULT NULL::text, p_requires_review boolean DEFAULT false, p_created_by_user_id uuid DEFAULT auth.uid())
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_task_id uuid;
BEGIN
  -- Validate team membership
  IF NOT EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = p_team_id 
      AND user_id = p_created_by_user_id 
      AND left_at IS NULL
  ) THEN
    RETURN json_build_object('success', false, 'error', 'User is not a team member');
  END IF;
  
  -- Insert new task
  INSERT INTO team_tasks (
    team_id,
    title,
    description,
    priority,
    difficulty_level,
    xp_reward,
    credits_reward,
    estimated_hours,
    category,
    requires_review
  ) VALUES (
    p_team_id,
    p_title,
    p_description,
    p_priority,
    p_difficulty_level,
    p_xp_reward,
    p_credits_reward,
    p_estimated_hours,
    p_category,
    p_requires_review
  ) RETURNING id INTO v_task_id;
  
  -- Log creation
  INSERT INTO team_task_history (
    team_task_id,
    action,
    changed_by_user_id,
    new_values,
    notes
  ) VALUES (
    v_task_id,
    'created',
    p_created_by_user_id,
    json_build_object(
      'title', p_title,
      'priority', p_priority,
      'difficulty_level', p_difficulty_level
    ),
    'Task created via create_team_task function'
  );
  
  RETURN json_build_object('success', true, 'task_id', v_task_id);
END;
$function$;

-- LEGACY: assign_team_task - References team_tasks table
CREATE OR REPLACE FUNCTION public.assign_team_task(p_task_id uuid, p_assigned_to_user_id uuid, p_assigned_by_user_id uuid DEFAULT auth.uid())
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_task_record team_tasks%ROWTYPE;
  v_old_assigned_to uuid;
BEGIN
  -- Get current task state
  SELECT * INTO v_task_record FROM team_tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Task not found');
  END IF;
  
  -- Check if user is team member
  IF NOT EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = v_task_record.team_id 
      AND user_id = p_assigned_to_user_id 
      AND left_at IS NULL
  ) THEN
    RETURN json_build_object('success', false, 'error', 'User is not a team member');
  END IF;
  
  v_old_assigned_to := v_task_record.assigned_to_user_id;
  
  -- Update task assignment
  UPDATE team_tasks 
  SET 
    assigned_to_user_id = p_assigned_to_user_id,
    assigned_by_user_id = p_assigned_by_user_id,
    assigned_at = now(),
    updated_at = now()
  WHERE id = p_task_id;
  
  -- Log the change
  INSERT INTO team_task_history (
    team_task_id,
    action,
    changed_by_user_id,
    old_values,
    new_values,
    notes
  ) VALUES (
    p_task_id,
    'assigned',
    p_assigned_by_user_id,
    json_build_object('assigned_to_user_id', v_old_assigned_to),
    json_build_object('assigned_to_user_id', p_assigned_to_user_id),
    'Task assigned via assign_team_task function'
  );
  
  RETURN json_build_object('success', true, 'task_id', p_task_id);
END;
$function$;

-- LEGACY: get_team_tasks - References team_tasks table  
CREATE OR REPLACE FUNCTION public.get_team_tasks(p_team_id uuid)
 RETURNS TABLE(id uuid, title text, description text, status task_status_type, priority task_priority_type, assigned_to jsonb, assigned_by jsonb, xp_reward integer, credits_reward integer, difficulty_level integer, estimated_hours numeric, category text, requires_review boolean, created_at timestamp with time zone, updated_at timestamp with time zone, assigned_at timestamp with time zone, started_at timestamp with time zone, completed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    tt.id,
    tt.title,
    tt.description,
    tt.status,
    tt.priority,
    CASE 
      WHEN tt.assigned_to_user_id IS NOT NULL THEN
        json_build_object(
          'id', u1.id,
          'name', u1.name,
          'avatar_url', u1.avatar_url
        )::jsonb
      ELSE NULL
    END as assigned_to,
    CASE 
      WHEN tt.assigned_by_user_id IS NOT NULL THEN
        json_build_object(
          'id', u2.id,
          'name', u2.name,
          'avatar_url', u2.avatar_url
        )::jsonb
      ELSE NULL
    END as assigned_by,
    tt.xp_reward,
    tt.credits_reward,
    tt.difficulty_level,
    tt.estimated_hours,
    tt.category,
    tt.requires_review,
    tt.created_at,
    tt.updated_at,
    tt.assigned_at,
    tt.started_at,
    tt.completed_at
  FROM team_tasks tt
  LEFT JOIN users u1 ON tt.assigned_to_user_id = u1.id
  LEFT JOIN users u2 ON tt.assigned_by_user_id = u2.id
  WHERE tt.team_id = p_team_id
  ORDER BY 
    CASE tt.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    tt.created_at DESC;
END;
$function$;

-- LEGACY: update_team_task_status - References team_tasks table
CREATE OR REPLACE FUNCTION public.update_team_task_status(p_task_id uuid, p_new_status task_status_type, p_changed_by_user_id uuid DEFAULT auth.uid())
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_old_status task_status_type;
  v_task_record team_tasks%ROWTYPE;
BEGIN
  -- Get current task
  SELECT * INTO v_task_record FROM team_tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Task not found');
  END IF;
  
  v_old_status := v_task_record.status;
  
  -- Update task status and relevant timestamps
  UPDATE team_tasks 
  SET 
    status = p_new_status,
    started_at = CASE 
      WHEN p_new_status = 'in_progress' AND started_at IS NULL THEN now() 
      ELSE started_at 
    END,
    completed_at = CASE 
      WHEN p_new_status = 'completed' THEN now() 
      WHEN p_new_status != 'completed' THEN NULL 
      ELSE completed_at 
    END,
    cancelled_at = CASE 
      WHEN p_new_status = 'cancelled' THEN now() 
      WHEN p_new_status != 'cancelled' THEN NULL 
      ELSE cancelled_at 
    END,
    updated_at = now()
  WHERE id = p_task_id;
  
  -- Log the change
  INSERT INTO team_task_history (
    team_task_id,
    action,
    changed_by_user_id,
    old_values,
    new_values,
    notes
  ) VALUES (
    p_task_id,
    'status_changed',
    p_changed_by_user_id,
    json_build_object('status', v_old_status),
    json_build_object('status', p_new_status),
    'Status changed via update_team_task_status function'
  );
  
  RETURN json_build_object('success', true, 'old_status', v_old_status, 'new_status', p_new_status);
END;
$function$;

-- END OF BACKUP
-- To restore any function, copy the relevant CREATE OR REPLACE FUNCTION statement and execute it