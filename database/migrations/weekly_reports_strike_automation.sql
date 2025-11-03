-- Migration: Weekly Reports Strike Automation System
-- Date: 2025-11-03
-- Description: Create functions for automatic strike generation when weekly reports are missed

-- ========================================
-- 1. Function to Check for Missed Weekly Reports and Create Strikes
-- ========================================

CREATE OR REPLACE FUNCTION check_and_create_missed_report_strikes(p_week_number integer, p_week_year integer)
RETURNS json AS $$
DECLARE
    v_strikes_created integer := 0;
    v_team_record record;
    v_member_record record;
    v_week_boundaries record;
    v_strike_id uuid;
BEGIN
    -- Get week boundaries for the specified week
    SELECT 
        make_date(p_week_year, 1, 1) + (interval '1 week' * (p_week_number - 1)) as week_start,
        make_date(p_week_year, 1, 1) + (interval '1 week' * p_week_number) - interval '1 day' as week_end
    INTO v_week_boundaries;

    -- Loop through all active teams
    FOR v_team_record IN 
        SELECT id, name 
        FROM teams 
        WHERE status = 'active'
    LOOP
        -- Loop through all active team members
        FOR v_member_record IN
            SELECT tm.user_id, u.name as user_name, u.email
            FROM team_members tm
            JOIN users u ON tm.user_id = u.id
            WHERE tm.team_id = v_team_record.id 
            AND tm.left_at IS NULL
        LOOP
            -- Check if this member submitted a weekly report for the specified week
            IF NOT EXISTS (
                SELECT 1 
                FROM weekly_reports wr
                WHERE wr.user_id = v_member_record.user_id
                AND wr.team_id = v_team_record.id
                AND wr.week_number = p_week_number
                AND wr.week_year = p_week_year
            ) THEN
                -- Check if strike already exists for this week/user/team
                IF NOT EXISTS (
                    SELECT 1 
                    FROM team_strikes ts
                    WHERE ts.team_id = v_team_record.id
                    AND ts.user_id = v_member_record.user_id
                    AND ts.strike_type = 'missed_weekly_report'
                    AND ts.created_at::date >= v_week_boundaries.week_start::date
                    AND ts.created_at::date <= (v_week_boundaries.week_end + interval '7 days')::date
                ) THEN
                    -- Create strike for missed weekly report
                    INSERT INTO team_strikes (
                        id,
                        team_id,
                        user_id,
                        strike_type,
                        title,
                        description,
                        xp_penalty,
                        credits_penalty,
                        status,
                        created_at
                    ) VALUES (
                        gen_random_uuid(),
                        v_team_record.id,
                        v_member_record.user_id,
                        'missed_weekly_report',
                        'Missed Weekly Report Submission',
                        format('Failed to submit weekly report for week %s of %s (period: %s to %s)', 
                               p_week_number, p_week_year, 
                               v_week_boundaries.week_start::date, 
                               v_week_boundaries.week_end::date),
                        500, -- XP penalty
                        250, -- Credits penalty  
                        'waiting-explanation',
                        now()
                    )
                    RETURNING id INTO v_strike_id;

                    -- Apply penalties by creating negative transactions
                    INSERT INTO transactions (
                        user_id,
                        type,
                        xp_change,
                        credits_change,
                        description,
                        metadata,
                        created_at
                    ) VALUES (
                        v_member_record.user_id,
                        'team_cost', -- penalty transaction type
                        -500, -- negative XP
                        -250, -- negative credits
                        format('Strike penalty: Missed weekly report (Week %s/%s)', p_week_number, p_week_year),
                        json_build_object(
                            'strike_id', v_strike_id,
                            'strike_type', 'missed_weekly_report',
                            'team_id', v_team_record.id,
                            'team_name', v_team_record.name,
                            'week_number', p_week_number,
                            'week_year', p_week_year
                        ),
                        now()
                    );

                    -- Update user totals
                    UPDATE users 
                    SET 
                        total_xp = GREATEST(0, total_xp - 500),
                        total_credits = GREATEST(0, total_credits - 250)
                    WHERE id = v_member_record.user_id;

                    -- Increment team strikes count
                    UPDATE teams 
                    SET strikes_count = COALESCE(strikes_count, 0) + 1
                    WHERE id = v_team_record.id;

                    v_strikes_created := v_strikes_created + 1;
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'message', format('Strike check completed for week %s/%s', p_week_number, p_week_year),
        'strikes_created', v_strikes_created,
        'week_checked', format('%s/%s', p_week_number, p_week_year)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 2. Function to Check Current Week and Create Strikes
-- ========================================

CREATE OR REPLACE FUNCTION check_current_week_missed_reports()
RETURNS json AS $$
DECLARE
    v_previous_week record;
    v_result json;
BEGIN
    -- Get previous week boundaries (we check for strikes when new week starts)
    SELECT * FROM get_riga_week_boundaries() INTO v_previous_week;
    
    -- Check previous week (since we're now in a new week)
    SELECT check_and_create_missed_report_strikes(
        v_previous_week.week_number - 1,
        CASE 
            WHEN v_previous_week.week_number = 1 THEN v_previous_week.week_year - 1
            ELSE v_previous_week.week_year 
        END
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 3. Function to Get Team Strikes (for dynamic data display)
-- ========================================

CREATE OR REPLACE FUNCTION get_team_strikes(p_team_id uuid)
RETURNS TABLE(
    id uuid,
    title text,
    strike_type text,
    description text,
    xp_penalty integer,
    credits_penalty integer,
    status text,
    user_id uuid,
    user_name text,
    user_avatar text,
    explanation text,
    explained_at timestamp with time zone,
    created_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.id,
        ts.title,
        ts.strike_type,
        ts.description,
        ts.xp_penalty,
        ts.credits_penalty,
        COALESCE(ts.status, 'waiting-explanation') as status,
        ts.user_id,
        u.name as user_name,
        u.avatar_url as user_avatar,
        ts.explanation,
        ts.explained_at,
        ts.created_at
    FROM team_strikes ts
    LEFT JOIN users u ON ts.user_id = u.id
    WHERE ts.team_id = p_team_id
    ORDER BY ts.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 4. Function to Submit Strike Explanation
-- ========================================

CREATE OR REPLACE FUNCTION submit_strike_explanation(p_strike_id uuid, p_explanation text)
RETURNS json AS $$
DECLARE
    v_strike_record record;
BEGIN
    -- Verify the strike belongs to the current user and is waiting for explanation
    SELECT ts.*, u.name as user_name
    INTO v_strike_record
    FROM team_strikes ts
    JOIN users u ON ts.user_id = u.id
    WHERE ts.id = p_strike_id 
    AND ts.user_id = auth.uid()
    AND ts.status = 'waiting-explanation';
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Strike not found or explanation not required'
        );
    END IF;
    
    -- Update strike with explanation
    UPDATE team_strikes
    SET 
        explanation = p_explanation,
        explained_by_user_id = auth.uid(),
        explained_at = now(),
        status = 'explained',
        updated_at = now()
    WHERE id = p_strike_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Strike explanation submitted successfully',
        'strike_id', p_strike_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 5. Function to Get Team Weekly Reports (for dynamic data display)
-- ========================================

CREATE OR REPLACE FUNCTION get_team_weekly_reports(p_team_id uuid, p_limit integer DEFAULT 10)
RETURNS TABLE(
    id uuid,
    week_number integer,
    week_year integer,
    week_start_date date,
    week_end_date date,
    submitted_count bigint,
    total_members bigint,
    status text,
    member_submissions json
) AS $$
BEGIN
    RETURN QUERY
    WITH team_members_count AS (
        SELECT COUNT(*) as total
        FROM team_members tm
        WHERE tm.team_id = p_team_id AND tm.left_at IS NULL
    ),
    weekly_submissions AS (
        SELECT 
            wr.week_number,
            wr.week_year,
            wr.week_start_date::date,
            wr.week_end_date::date,
            COUNT(wr.id) as submitted_count,
            json_agg(
                json_build_object(
                    'user_id', wr.user_id,
                    'user_name', u.name,
                    'user_avatar', u.avatar_url,
                    'submitted_at', wr.submitted_at
                )
            ) as submissions
        FROM weekly_reports wr
        JOIN users u ON wr.user_id = u.id
        WHERE wr.team_id = p_team_id
        GROUP BY wr.week_number, wr.week_year, wr.week_start_date, wr.week_end_date
        ORDER BY wr.week_year DESC, wr.week_number DESC
        LIMIT p_limit
    )
    SELECT 
        gen_random_uuid() as id, -- Synthetic ID for the report summary
        ws.week_number,
        ws.week_year,
        ws.week_start_date,
        ws.week_end_date,
        ws.submitted_count,
        tmc.total as total_members,
        CASE 
            WHEN ws.submitted_count = tmc.total THEN 'complete'
            WHEN ws.submitted_count > 0 THEN 'partial'
            ELSE 'missed'
        END as status,
        ws.submissions as member_submissions
    FROM weekly_submissions ws
    CROSS JOIN team_members_count tmc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 6. Grant Permissions
-- ========================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION check_and_create_missed_report_strikes(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION check_current_week_missed_reports() TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_strikes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_strike_explanation(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_weekly_reports(uuid, integer) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION check_and_create_missed_report_strikes(integer, integer) IS 'Creates strikes for team members who missed weekly reports in specified week';
COMMENT ON FUNCTION check_current_week_missed_reports() IS 'Checks and creates strikes for missed reports when new week starts';
COMMENT ON FUNCTION get_team_strikes(uuid) IS 'Returns all strikes for a team with user details';
COMMENT ON FUNCTION submit_strike_explanation(uuid, text) IS 'Allows users to submit explanations for their strikes';
COMMENT ON FUNCTION get_team_weekly_reports(uuid, integer) IS 'Returns team weekly report summary with submission statistics';