-- Simple Weekly Reports Strike System
-- Keep it simple - just create strikes for missed reports

-- 1. Function to create strikes for missed weekly reports
CREATE OR REPLACE FUNCTION check_missed_weekly_reports(p_week_number integer, p_week_year integer)
RETURNS json AS $$
DECLARE
    v_strikes_created integer := 0;
    v_team_record record;
    v_member_record record;
BEGIN
    -- Loop through active teams
    FOR v_team_record IN 
        SELECT id, name FROM teams WHERE status = 'active'
    LOOP
        -- Loop through team members
        FOR v_member_record IN
            SELECT tm.user_id, u.name as user_name
            FROM team_members tm
            JOIN users u ON tm.user_id = u.id
            WHERE tm.team_id = v_team_record.id AND tm.left_at IS NULL
        LOOP
            -- Check if weekly report is missing
            IF NOT EXISTS (
                SELECT 1 FROM weekly_reports
                WHERE user_id = v_member_record.user_id
                AND team_id = v_team_record.id
                AND week_number = p_week_number
                AND week_year = p_week_year
            ) THEN
                -- Create simple strike (no penalties)
                INSERT INTO team_strikes (
                    team_id,
                    user_id,
                    strike_type,
                    title,
                    description,
                    status,
                    created_at
                ) VALUES (
                    v_team_record.id,
                    v_member_record.user_id,
                    'missed_weekly_report',
                    'Missed Weekly Meeting Submission',
                    format('Failed to submit weekly report for week %s of %s', p_week_number, p_week_year),
                    'waiting-explanation',
                    now()
                );
                
                -- Update team strikes count
                UPDATE teams 
                SET strikes_count = COALESCE(strikes_count, 0) + 1
                WHERE id = v_team_record.id;
                
                v_strikes_created := v_strikes_created + 1;
            END IF;
        END LOOP;
    END LOOP;

    RETURN json_build_object('strikes_created', v_strikes_created);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Simple function to get team strikes  
CREATE OR REPLACE FUNCTION get_team_strikes(p_team_id uuid)
RETURNS TABLE(
    id text,
    title text,
    datetime text,
    status text,
    xpPenalty integer,
    pointsPenalty integer,
    action text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.id::text,
        ts.title,
        to_char(ts.created_at, 'YYYY-MM-DD HH24:MI AM') as datetime,
        CASE 
            WHEN ts.explanation IS NOT NULL THEN 'explained'
            ELSE 'waiting-explanation'
        END as status,
        0 as xpPenalty,  -- No penalties for now
        0 as pointsPenalty,
        CASE 
            WHEN ts.explanation IS NOT NULL THEN 'done'
            ELSE 'explain'
        END as action
    FROM team_strikes ts
    WHERE ts.team_id = p_team_id
    ORDER BY ts.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Simple function to submit explanation
CREATE OR REPLACE FUNCTION submit_strike_explanation(p_strike_id uuid, p_explanation text)
RETURNS json AS $$
BEGIN
    UPDATE team_strikes
    SET 
        explanation = p_explanation,
        explained_by_user_id = auth.uid(),
        explained_at = now()
    WHERE id = p_strike_id AND user_id = auth.uid();
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_missed_weekly_reports(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_strikes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_strike_explanation(uuid, text) TO authenticated;