-- Admin batch scope (2026-09-11). Purely additive; every original function
-- stays untouched.
--
-- Every Team Journey admin page (Analytics, Weekly Reports, Peer Reviews,
-- the overview's weekly trends) now takes a batch scope:
--   p_batch_id NULL  -> "current cohort": users/teams with status = 'active'
--   p_batch_id <id>  -> that diploma batch (users.batch_id / teams.batch_id),
--                       which is how archived Batch 2 stays reachable.
-- Archived rows therefore never count by default.

CREATE OR REPLACE FUNCTION public._admin_scope_users(p_batch_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  SELECT u.id
  FROM users u
  WHERE u.primary_role::text = 'user'
    AND CASE WHEN p_batch_id IS NULL
             THEN u.status::text = 'active'
             ELSE u.batch_id = p_batch_id END;
$function$;

CREATE OR REPLACE FUNCTION public._admin_scope_teams(p_batch_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  SELECT t.id
  FROM teams t
  WHERE t.name NOT ILIKE '[TEST]%'
    AND CASE WHEN p_batch_id IS NULL
             THEN t.status::text = 'active'
             ELSE t.batch_id = p_batch_id END;
$function$;

REVOKE ALL ON FUNCTION public._admin_scope_users(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._admin_scope_teams(uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_analytics_overview_v2(p_batch_id uuid)
RETURNS TABLE(week_start date, reports integer, avg_score numeric, min_score integer, max_score integer, low_scores integer, high_scores integer, real_blockers integer, commitments_total integer, commitments_completed integer, expected_reporters integer, active_teams integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM _analytics_assert_admin();
  RETURN QUERY
  WITH wr AS (
    SELECT
      w.week_start_date,
      w.team_id,
      w.user_id,
      CASE WHEN w.submission_data->>'alignmentScore' ~ '^[0-9]+$'
           THEN (w.submission_data->>'alignmentScore')::int END AS score,
      NULLIF(trim(coalesce(w.submission_data->>'blockers','')),'') AS blockers_text,
      CASE WHEN jsonb_typeof(w.submission_data->'commitments') = 'array'
           THEN w.submission_data->'commitments' ELSE '[]'::jsonb END AS commitments
    FROM weekly_reports w
    WHERE w.status = 'submitted' AND w.submission_data IS NOT NULL
      AND w.user_id IN (SELECT _admin_scope_users(p_batch_id))
  ),
  weekly AS (
    SELECT
      wr.week_start_date,
      count(*)::int AS reports,
      round(avg(wr.score), 2) AS avg_score,
      min(wr.score) AS min_score,
      max(wr.score) AS max_score,
      count(*) FILTER (WHERE wr.score <= 4)::int AS low_scores,
      count(*) FILTER (WHERE wr.score >= 8)::int AS high_scores,
      count(*) FILTER (
        WHERE length(wr.blockers_text) > 5
          AND lower(wr.blockers_text) NOT IN ('none','none.','no','nothing','n/a','-','nope')
      )::int AS real_blockers,
      count(DISTINCT wr.team_id)::int AS active_teams,
      coalesce(sum(jsonb_array_length(wr.commitments)), 0)::int AS commitments_total,
      coalesce(sum((
        SELECT count(*) FROM jsonb_array_elements(wr.commitments) c
        WHERE c->>'status' = 'completed'
      )), 0)::int AS commitments_completed
    FROM wr
    GROUP BY wr.week_start_date
  )
  SELECT
    wk.week_start_date, wk.reports, wk.avg_score, wk.min_score, wk.max_score,
    wk.low_scores, wk.high_scores, wk.real_blockers, wk.commitments_total,
    wk.commitments_completed,
    (
      SELECT count(DISTINCT tm.user_id)::int
      FROM team_members tm
      JOIN users u ON u.id = tm.user_id AND u.primary_role::text = 'user'
      WHERE u.id IN (SELECT _admin_scope_users(p_batch_id))
        AND tm.joined_at::date <= wk.week_start_date + 6
        AND (tm.left_at IS NULL OR tm.left_at::date >= wk.week_start_date)
    ) AS expected_reporters,
    wk.active_teams
  FROM weekly wk
  ORDER BY wk.week_start_date;
END;
$function$;

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_analytics_teams_v2(p_batch_id uuid)
RETURNS TABLE(team_id uuid, team_name text, team_status text, week_start date, avg_score numeric, reports integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM _analytics_assert_admin();
  RETURN QUERY
  SELECT
    t.id, t.name, t.status::text, w.week_start_date,
    round(avg(CASE WHEN w.submission_data->>'alignmentScore' ~ '^[0-9]+$'
                   THEN (w.submission_data->>'alignmentScore')::int END), 2),
    count(*)::int
  FROM weekly_reports w
  JOIN teams t ON t.id = w.team_id
  WHERE w.status = 'submitted' AND w.submission_data IS NOT NULL
    AND t.id IN (SELECT _admin_scope_teams(p_batch_id))
  GROUP BY t.id, t.name, t.status, w.week_start_date
  ORDER BY t.name, w.week_start_date;
END;
$function$;

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_analytics_students_v2(p_batch_id uuid)
RETURNS TABLE(user_id uuid, user_name text, team_name text, latest_score integer, latest_week date, avg_score numeric, recent_avg numeric, prior_avg numeric, weeks_submitted integer, last_submitted timestamp with time zone, scores jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM _analytics_assert_admin();
  RETURN QUERY
  WITH wr AS (
    SELECT
      w.user_id AS uid, w.week_start_date, w.submitted_at,
      CASE WHEN w.submission_data->>'alignmentScore' ~ '^[0-9]+$'
           THEN (w.submission_data->>'alignmentScore')::int END AS score
    FROM weekly_reports w
    WHERE w.status = 'submitted' AND w.submission_data IS NOT NULL
      AND w.user_id IN (SELECT _admin_scope_users(p_batch_id))
  ),
  recent_weeks AS (
    SELECT DISTINCT week_start_date FROM wr ORDER BY week_start_date DESC LIMIT 4
  ),
  prior_weeks AS (
    SELECT DISTINCT week_start_date FROM wr
    WHERE week_start_date NOT IN (SELECT week_start_date FROM recent_weeks)
    ORDER BY week_start_date DESC LIMIT 4
  ),
  per_user AS (
    SELECT
      wr.uid,
      round(avg(wr.score), 2) AS avg_score,
      round(avg(wr.score) FILTER (WHERE wr.week_start_date IN (SELECT week_start_date FROM recent_weeks)), 2) AS recent_avg,
      round(avg(wr.score) FILTER (WHERE wr.week_start_date IN (SELECT week_start_date FROM prior_weeks)), 2) AS prior_avg,
      count(*)::int AS weeks_submitted,
      max(wr.submitted_at) AS last_submitted,
      (array_agg(wr.score ORDER BY wr.week_start_date DESC))[1] AS latest_score,
      max(wr.week_start_date) AS latest_week,
      jsonb_agg(jsonb_build_object('week', wr.week_start_date, 'score', wr.score)
                ORDER BY wr.week_start_date) AS scores
    FROM wr
    GROUP BY wr.uid
  )
  SELECT
    u.id, u.name,
    (
      SELECT t.name FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.user_id = u.id AND tm.left_at IS NULL
      ORDER BY tm.joined_at DESC LIMIT 1
    ),
    pu.latest_score, pu.latest_week, pu.avg_score, pu.recent_avg, pu.prior_avg,
    pu.weeks_submitted, pu.last_submitted, pu.scores
  FROM per_user pu
  JOIN users u ON u.id = pu.uid
  ORDER BY u.name;
END;
$function$;

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_analytics_tasks_v2(p_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result jsonb;
BEGIN
  PERFORM _analytics_assert_admin();
  SELECT jsonb_build_object(
    'top_tasks', (
      SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
        SELECT t.title, count(*)::int AS completions
        FROM task_progress tp JOIN tasks t ON t.id = tp.task_id
        WHERE tp.status::text = 'approved'
          AND (tp.user_id IN (SELECT _admin_scope_users(p_batch_id))
               OR tp.team_id IN (SELECT _admin_scope_teams(p_batch_id)))
        GROUP BY t.id, t.title
        ORDER BY count(*) DESC, t.title
        LIMIT 15
      ) x
    ),
    'status_funnel', (
      SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
        SELECT tp.status::text AS status, count(*)::int AS count
        FROM task_progress tp
        WHERE (tp.user_id IN (SELECT _admin_scope_users(p_batch_id))
               OR tp.team_id IN (SELECT _admin_scope_teams(p_batch_id)))
        GROUP BY tp.status
        ORDER BY count(*) DESC
      ) x
    ),
    'weekly_completions', (
      SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
        SELECT date_trunc('week', tp.completed_at)::date AS week_start,
               count(*)::int AS completions
        FROM task_progress tp
        WHERE tp.status::text = 'approved' AND tp.completed_at IS NOT NULL
          AND (tp.user_id IN (SELECT _admin_scope_users(p_batch_id))
               OR tp.team_id IN (SELECT _admin_scope_teams(p_batch_id)))
        GROUP BY 1
        ORDER BY 1
      ) x
    )
  ) INTO result;
  RETURN result;
END;
$function$;

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_analytics_meetings_v2(p_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result jsonb;
BEGIN
  PERFORM _analytics_assert_admin();
  SELECT jsonb_build_object(
    'weekly', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'week_start', sub.ws, 'meetings', sub.meetings,
        'willingness_to_pay', sub.wtp, 'not_interested', sub.ni
      ) ORDER BY sub.ws), '[]'::jsonb)
      FROM (
        SELECT date_trunc('week', cm.meeting_date)::date AS ws,
               count(*) AS meetings,
               count(*) FILTER (WHERE cm.meeting_data->>'interestLevel' = 'willingness_to_pay') AS wtp,
               count(*) FILTER (WHERE cm.meeting_data->>'interestLevel' = 'not_interested') AS ni
        FROM client_meetings cm
        WHERE cm.deleted_at IS NULL AND cm.status::text = 'completed' AND cm.meeting_date IS NOT NULL
          AND cm.team_id IN (SELECT _admin_scope_teams(p_batch_id))
        GROUP BY 1
      ) sub
    ),
    'interest_funnel', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'level', sub.level, 'count', sub.cnt
      ) ORDER BY sub.cnt DESC), '[]'::jsonb)
      FROM (
        SELECT coalesce(NULLIF(cm.meeting_data->>'interestLevel',''), 'unknown') AS level,
               count(*) AS cnt
        FROM client_meetings cm
        WHERE cm.deleted_at IS NULL AND cm.status::text = 'completed'
          AND cm.team_id IN (SELECT _admin_scope_teams(p_batch_id))
        GROUP BY 1
      ) sub
    ),
    'by_team', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'team_id', sub.team_id, 'team_name', sub.team_name,
        'team_status', sub.team_status, 'meetings', sub.meetings,
        'willingness_to_pay', sub.wtp, 'last_meeting', sub.last_meeting
      ) ORDER BY sub.meetings DESC), '[]'::jsonb)
      FROM (
        SELECT t.id AS team_id, t.name AS team_name, t.status::text AS team_status,
               count(*) AS meetings,
               count(*) FILTER (WHERE cm.meeting_data->>'interestLevel' = 'willingness_to_pay') AS wtp,
               max(cm.meeting_date)::date AS last_meeting
        FROM client_meetings cm
        JOIN teams t ON t.id = cm.team_id
        WHERE cm.deleted_at IS NULL AND cm.status::text = 'completed'
          AND t.id IN (SELECT _admin_scope_teams(p_batch_id))
        GROUP BY t.id, t.name, t.status
      ) sub
    ),
    'learnings', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'meeting_date', sub.meeting_date, 'team_name', sub.team_name,
        'client_name', sub.client_name, 'interest_level', sub.interest_level,
        'main_learnings', sub.main_learnings, 'client_feedback', sub.client_feedback
      ) ORDER BY sub.meeting_date DESC), '[]'::jsonb)
      FROM (
        SELECT cm.meeting_date::date AS meeting_date, t.name AS team_name,
               cm.client_name,
               NULLIF(cm.meeting_data->>'interestLevel','') AS interest_level,
               NULLIF(trim(coalesce(cm.meeting_data->>'mainLearnings','')),'') AS main_learnings,
               NULLIF(trim(coalesce(cm.meeting_data->>'clientFeedback','')),'') AS client_feedback
        FROM client_meetings cm
        JOIN teams t ON t.id = cm.team_id
        WHERE cm.deleted_at IS NULL AND cm.status::text = 'completed'
          AND t.id IN (SELECT _admin_scope_teams(p_batch_id))
          AND length(trim(coalesce(cm.meeting_data->>'mainLearnings',''))) > 5
        ORDER BY cm.meeting_date DESC
        LIMIT 40
      ) sub
    )
  ) INTO result;
  RETURN result;
END;
$function$;

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_analytics_retention_v2(p_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  total_reporters int;
BEGIN
  PERFORM _analytics_assert_admin();
  SELECT count(DISTINCT user_id) INTO total_reporters
  FROM weekly_reports
  WHERE status = 'submitted'
    AND user_id IN (SELECT _admin_scope_users(p_batch_id));

  SELECT jsonb_build_object(
    'total_reporters', total_reporters,
    'cohort', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'week_start', sub.ws, 'reporters', sub.reporters, 'pct_of_all', sub.pct
      ) ORDER BY sub.ws), '[]'::jsonb)
      FROM (
        SELECT week_start_date AS ws,
               count(DISTINCT user_id) AS reporters,
               round(100.0 * count(DISTINCT user_id) / greatest(total_reporters,1), 1) AS pct
        FROM weekly_reports
        WHERE status = 'submitted'
          AND user_id IN (SELECT _admin_scope_users(p_batch_id))
        GROUP BY week_start_date
      ) sub
    ),
    'departures', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'week_start', sub.ws, 'members_left', sub.cnt
      ) ORDER BY sub.ws), '[]'::jsonb)
      FROM (
        SELECT date_trunc('week', left_at)::date AS ws, count(*) AS cnt
        FROM team_members
        WHERE left_at IS NOT NULL
          AND user_id IN (SELECT _admin_scope_users(p_batch_id))
        GROUP BY 1
      ) sub
    ),
    'teams_archived', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'week_start', sub.ws, 'teams', sub.cnt
      ) ORDER BY sub.ws), '[]'::jsonb)
      FROM (
        SELECT date_trunc('week', archived_at)::date AS ws, count(*) AS cnt
        FROM teams
        WHERE archived_at IS NOT NULL
          AND id IN (SELECT _admin_scope_teams(p_batch_id))
        GROUP BY 1
      ) sub
    ),
    'leavers', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'user_id', sub.user_id, 'user_name', sub.user_name,
        'team_name', sub.team_name, 'left_at', sub.left_at,
        'weeks_reported', sub.weeks_reported, 'last_scores', sub.last_scores
      ) ORDER BY sub.left_at DESC), '[]'::jsonb)
      FROM (
        SELECT u.id AS user_id, u.name AS user_name, t.name AS team_name,
          tm.left_at::date AS left_at,
          (SELECT count(*) FROM weekly_reports wr
           WHERE wr.user_id = u.id AND wr.status = 'submitted') AS weeks_reported,
          (SELECT coalesce(jsonb_agg(s.score ORDER BY s.week_start_date), '[]'::jsonb)
           FROM (
             SELECT wr.week_start_date,
               CASE WHEN wr.submission_data->>'alignmentScore' ~ '^[0-9]+$'
                    THEN (wr.submission_data->>'alignmentScore')::int END AS score
             FROM weekly_reports wr
             WHERE wr.user_id = u.id AND wr.status = 'submitted'
               AND wr.week_start_date <= tm.left_at::date
             ORDER BY wr.week_start_date DESC
             LIMIT 3
           ) s) AS last_scores
        FROM team_members tm
        JOIN users u ON u.id = tm.user_id
        JOIN teams t ON t.id = tm.team_id
        WHERE tm.left_at IS NOT NULL
          AND u.id IN (SELECT _admin_scope_users(p_batch_id))
      ) sub
    )
  ) INTO result;
  RETURN result;
END;
$function$;

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_analytics_strikes_v2(p_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result jsonb;
BEGIN
  PERFORM _analytics_assert_admin();
  SELECT jsonb_build_object(
    'weekly', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'week_start', sub.ws, 'strikes', sub.strikes,
        'resolved', sub.resolved, 'explained', sub.explained
      ) ORDER BY sub.ws), '[]'::jsonb)
      FROM (
        SELECT date_trunc('week', ts.created_at)::date AS ws,
               count(*) AS strikes,
               count(*) FILTER (WHERE ts.status = 'resolved') AS resolved,
               count(*) FILTER (WHERE ts.status = 'explained') AS explained
        FROM team_strikes ts
        WHERE ts.team_id IN (SELECT _admin_scope_teams(p_batch_id))
        GROUP BY 1
      ) sub
    ),
    'by_team', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'team_name', sub.team_name, 'strikes', sub.strikes, 'resolved', sub.resolved
      ) ORDER BY sub.strikes DESC), '[]'::jsonb)
      FROM (
        SELECT t.name AS team_name, count(*) AS strikes,
               count(*) FILTER (WHERE ts.status = 'resolved') AS resolved
        FROM team_strikes ts
        JOIN teams t ON t.id = ts.team_id
        WHERE t.id IN (SELECT _admin_scope_teams(p_batch_id))
        GROUP BY t.id, t.name
      ) sub
    ),
    'recent_explanations', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'created_at', sub.created_at, 'team_name', sub.team_name,
        'status', sub.status, 'explanation', sub.explanation
      ) ORDER BY sub.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT ts.created_at::date AS created_at, t.name AS team_name,
               ts.status, trim(ts.explanation) AS explanation
        FROM team_strikes ts
        JOIN teams t ON t.id = ts.team_id
        WHERE length(trim(coalesce(ts.explanation,''))) > 5
          AND t.id IN (SELECT _admin_scope_teams(p_batch_id))
        ORDER BY ts.created_at DESC
        LIMIT 20
      ) sub
    )
  ) INTO result;
  RETURN result;
END;
$function$;

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_analytics_economy_v2(p_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result jsonb;
BEGIN
  PERFORM _analytics_assert_admin();
  SELECT jsonb_build_object(
    'weekly', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'week_start', sub.ws, 'xp_earned', sub.xp_earned,
        'points_earned', sub.points_earned, 'points_lost', sub.points_lost
      ) ORDER BY sub.ws), '[]'::jsonb)
      FROM (
        SELECT date_trunc('week', tr.created_at)::date AS ws,
               coalesce(sum(tr.xp_change) FILTER (WHERE tr.xp_change > 0), 0) AS xp_earned,
               coalesce(sum(tr.points_change) FILTER (WHERE tr.points_change > 0), 0) AS points_earned,
               abs(coalesce(sum(tr.points_change) FILTER (WHERE tr.points_change < 0), 0)) AS points_lost
        FROM transactions tr
        WHERE (tr.user_id IN (SELECT _admin_scope_users(p_batch_id))
               OR tr.team_id IN (SELECT _admin_scope_teams(p_batch_id)))
        GROUP BY 1
      ) sub
    ),
    'by_type', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'type', sub.type, 'count', sub.cnt, 'xp', sub.xp, 'points', sub.points
      ) ORDER BY sub.cnt DESC), '[]'::jsonb)
      FROM (
        SELECT tr.type::text AS type, count(*) AS cnt,
               coalesce(sum(tr.xp_change), 0) AS xp,
               coalesce(sum(tr.points_change), 0) AS points
        FROM transactions tr
        WHERE (tr.user_id IN (SELECT _admin_scope_users(p_batch_id))
               OR tr.team_id IN (SELECT _admin_scope_teams(p_batch_id)))
        GROUP BY tr.type
      ) sub
    ),
    'penalties', (
      SELECT jsonb_build_object(
        'penalty_count', count(*) FILTER (WHERE tr.type::text = 'weekly_report_penalty'),
        'refund_count', count(*) FILTER (WHERE tr.type::text = 'weekly_report_refund'),
        'users_penalized', count(DISTINCT tr.user_id) FILTER (WHERE tr.type::text = 'weekly_report_penalty'),
        'points_lost_to_penalties', abs(coalesce(sum(tr.points_change) FILTER (WHERE tr.type::text = 'weekly_report_penalty'), 0))
      )
      FROM transactions tr
      WHERE (tr.user_id IN (SELECT _admin_scope_users(p_batch_id))
             OR tr.team_id IN (SELECT _admin_scope_teams(p_batch_id)))
    )
  ) INTO result;
  RETURN result;
END;
$function$;

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_analytics_task_friction_v2(p_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result jsonb;
BEGIN
  PERFORM _analytics_assert_admin();
  SELECT jsonb_build_object(
    'least_completed', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'title', sub.title, 'assigned', sub.assigned,
        'approved', sub.approved, 'approval_rate', sub.approval_rate
      ) ORDER BY sub.approval_rate), '[]'::jsonb)
      FROM (
        SELECT t.title, count(*) AS assigned,
               count(*) FILTER (WHERE tp.status::text = 'approved') AS approved,
               round(100.0 * count(*) FILTER (WHERE tp.status::text = 'approved') / count(*), 1) AS approval_rate
        FROM task_progress tp
        JOIN tasks t ON t.id = tp.task_id
        WHERE (tp.user_id IN (SELECT _admin_scope_users(p_batch_id))
               OR tp.team_id IN (SELECT _admin_scope_teams(p_batch_id)))
        GROUP BY t.id, t.title
        HAVING count(*) >= 5
        ORDER BY round(100.0 * count(*) FILTER (WHERE tp.status::text = 'approved') / count(*), 1) ASC
        LIMIT 15
      ) sub
    ),
    'slowest', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'title', sub.title, 'avg_days', sub.avg_days, 'completions', sub.completions
      ) ORDER BY sub.avg_days DESC), '[]'::jsonb)
      FROM (
        SELECT t.title,
               round((avg(EXTRACT(EPOCH FROM (tp.completed_at - tp.started_at)) / 86400))::numeric, 1) AS avg_days,
               count(*) AS completions
        FROM task_progress tp
        JOIN tasks t ON t.id = tp.task_id
        WHERE tp.status::text = 'approved'
          AND tp.started_at IS NOT NULL AND tp.completed_at IS NOT NULL
          AND tp.completed_at > tp.started_at
          AND (tp.user_id IN (SELECT _admin_scope_users(p_batch_id))
               OR tp.team_id IN (SELECT _admin_scope_teams(p_batch_id)))
        GROUP BY t.id, t.title
        HAVING count(*) >= 3
        ORDER BY avg(EXTRACT(EPOCH FROM (tp.completed_at - tp.started_at))) DESC
        LIMIT 10
      ) sub
    ),
    'most_rejected', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'title', sub.title, 'rejections', sub.rejections, 'resubmissions', sub.resubmissions
      ) ORDER BY sub.rejections DESC, sub.resubmissions DESC), '[]'::jsonb)
      FROM (
        SELECT t.title,
               count(*) FILTER (WHERE tp.status::text = 'rejected') AS rejections,
               count(*) FILTER (
                 WHERE jsonb_typeof(tp.submission_history) = 'array'
                   AND jsonb_array_length(tp.submission_history) > 1
               ) AS resubmissions
        FROM task_progress tp
        JOIN tasks t ON t.id = tp.task_id
        WHERE (tp.user_id IN (SELECT _admin_scope_users(p_batch_id))
               OR tp.team_id IN (SELECT _admin_scope_teams(p_batch_id)))
        GROUP BY t.id, t.title
        HAVING count(*) FILTER (WHERE tp.status::text = 'rejected') > 0
           OR count(*) FILTER (
             WHERE jsonb_typeof(tp.submission_history) = 'array'
               AND jsonb_array_length(tp.submission_history) > 1
           ) > 0
        ORDER BY count(*) FILTER (WHERE tp.status::text = 'rejected') DESC
        LIMIT 10
      ) sub
    ),
    'stale_in_progress', (
      SELECT jsonb_build_object(
        'count', count(*),
        'oldest_started', min(tp.started_at)::date
      )
      FROM task_progress tp
      WHERE tp.status::text = 'in_progress'
        AND tp.started_at < now() - interval '21 days'
        AND (tp.user_id IN (SELECT _admin_scope_users(p_batch_id))
             OR tp.team_id IN (SELECT _admin_scope_teams(p_batch_id)))
    )
  ) INTO result;
  RETURN result;
END;
$function$;

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_analytics_week_detail_v2(p_week_start date, p_batch_id uuid)
RETURNS TABLE(report_id uuid, user_id uuid, user_name text, team_id uuid, team_name text, score integer, alignment_reason text, blockers text, submitted_at timestamp with time zone)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM _analytics_assert_admin();
  RETURN QUERY
  SELECT
    w.id, u.id, u.name, t.id, t.name,
    CASE WHEN w.submission_data->>'alignmentScore' ~ '^[0-9]+$'
         THEN (w.submission_data->>'alignmentScore')::int END AS score,
    NULLIF(trim(coalesce(w.submission_data->>'alignmentReason','')),''),
    NULLIF(trim(coalesce(w.submission_data->>'blockers','')),''),
    w.submitted_at
  FROM weekly_reports w
  JOIN users u ON u.id = w.user_id
  LEFT JOIN teams t ON t.id = w.team_id
  WHERE w.week_start_date = p_week_start
    AND w.status = 'submitted' AND w.submission_data IS NOT NULL
    AND w.user_id IN (SELECT _admin_scope_users(p_batch_id))
  ORDER BY score ASC NULLS LAST, u.name;
END;
$function$;

-- Analytics v2: same grants as the originals (authenticated callers are
-- re-checked in SQL by _analytics_assert_admin).
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'get_analytics_overview_v2(uuid)', 'get_analytics_teams_v2(uuid)',
    'get_analytics_students_v2(uuid)', 'get_analytics_tasks_v2(uuid)',
    'get_analytics_meetings_v2(uuid)', 'get_analytics_retention_v2(uuid)',
    'get_analytics_strikes_v2(uuid)', 'get_analytics_economy_v2(uuid)',
    'get_analytics_task_friction_v2(uuid)', 'get_analytics_week_detail_v2(date, uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', f);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Overview weekly trends, scoped. Called with the service-role client.
CREATE OR REPLACE FUNCTION public.get_admin_weekly_trends_v2(p_batch_id uuid)
RETURNS TABLE(week_number integer, week_year integer, week_label text, report_submissions bigint, tasks_completed bigint, active_students bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH weeks AS (
    SELECT generate_series(
      GREATEST(1, EXTRACT(WEEK FROM now())::int - 13),
      EXTRACT(WEEK FROM now())::int
    ) AS wk,
    EXTRACT(YEAR FROM now())::int AS yr
  ),
  report_counts AS (
    SELECT wr.week_number AS wk, wr.week_year AS yr, COUNT(DISTINCT wr.user_id) AS cnt
    FROM weekly_reports wr
    WHERE wr.week_year = EXTRACT(YEAR FROM now())::int
      AND wr.user_id IN (SELECT _admin_scope_users(p_batch_id))
    GROUP BY wr.week_number, wr.week_year
  ),
  task_counts AS (
    SELECT
      EXTRACT(WEEK FROM tp.completed_at)::int AS wk,
      EXTRACT(YEAR FROM tp.completed_at)::int AS yr,
      COUNT(*) AS cnt
    FROM task_progress tp
    WHERE tp.status = 'approved'
      AND tp.completed_at IS NOT NULL
      AND tp.completed_at >= date_trunc('year', now())
      AND (tp.user_id IN (SELECT _admin_scope_users(p_batch_id))
           OR tp.team_id IN (SELECT _admin_scope_teams(p_batch_id)))
    GROUP BY 1, 2
  ),
  active_counts AS (
    SELECT t.week_number AS wk, t.week_year AS yr, COUNT(DISTINCT t.user_id) AS cnt
    FROM transactions t
    WHERE t.week_year = EXTRACT(YEAR FROM now())::int
      AND t.user_id IN (SELECT _admin_scope_users(p_batch_id))
    GROUP BY t.week_number, t.week_year
  )
  SELECT
    w.wk::int, w.yr::int, ('W' || w.wk)::text,
    COALESCE(rc.cnt, 0), COALESCE(tc.cnt, 0), COALESCE(ac.cnt, 0)
  FROM weeks w
  LEFT JOIN report_counts rc ON rc.wk = w.wk AND rc.yr = w.yr
  LEFT JOIN task_counts tc ON tc.wk = w.wk AND tc.yr = w.yr
  LEFT JOIN active_counts ac ON ac.wk = w.wk AND ac.yr = w.yr
  ORDER BY w.yr, w.wk;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_weekly_trends_v2(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_weekly_trends_v2(uuid) TO service_role;
