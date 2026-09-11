-- Admin overview RPCs (2026-09-11). Purely additive.
--   get_admin_program_health_v3 : v2 + users.status = 'active' on every
--                                 student aggregate (v2 counted the 69
--                                 archived Batch 2 students as "at risk").
--   get_admin_task_pipeline_v1  : task_progress counts grouped by
--                                 tasks.activity_type + status, done in SQL
--                                 (the route used to select every row and
--                                 hit the 1000-row default cap).

CREATE OR REPLACE FUNCTION public.get_admin_program_health_v3()
RETURNS TABLE(
  total_students bigint, active_7d bigint, active_14d bigint,
  at_risk_students bigint, reports_this_week bigint, reports_last_week bigint,
  tasks_this_week bigint, tasks_last_week bigint, pending_strikes bigint,
  pending_reviews bigint, avg_xp_per_student numeric, total_active_teams bigint,
  students_active bigint, students_slowing bigint, students_at_risk bigint,
  teams_active bigint, teams_slowing bigint, teams_at_risk bigint,
  students_active_wow_delta bigint, students_at_risk_wow_delta bigint,
  teams_active_wow_delta bigint, teams_at_risk_wow_delta bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_current_week int := EXTRACT(WEEK FROM now())::int;
  v_current_year int := EXTRACT(YEAR FROM now())::int;
  v_last_week int := EXTRACT(WEEK FROM now())::int - 1;
  v_students_active bigint; v_students_slowing bigint; v_students_at_risk bigint;
  v_teams_active bigint; v_teams_slowing bigint; v_teams_at_risk bigint;
  v_students_active_prev bigint; v_students_at_risk_prev bigint;
  v_teams_active_prev bigint; v_teams_at_risk_prev bigint;
BEGIN
  WITH s AS (
    SELECT u.id,
      GREATEST(
        COALESCE(au.last_sign_in_at, '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(t.created_at) FROM transactions t
                  WHERE t.user_id = u.id AND t.type IN ('task','validation','meeting')),
                 '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(wr.submitted_at) FROM weekly_reports wr WHERE wr.user_id = u.id),
                 '1970-01-01'::timestamptz)
      ) AS last_active
    FROM users u
    LEFT JOIN auth.users au ON au.id = u.id
    WHERE u.primary_role = 'user'
      AND u.status = 'active'
      AND (
        NOT EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = u.id AND tm.left_at IS NULL)
        OR EXISTS (SELECT 1 FROM team_members tm JOIN teams tmt ON tmt.id = tm.team_id
                   WHERE tm.user_id = u.id AND tm.left_at IS NULL AND tmt.name NOT ILIKE '[TEST]%')
      )
  )
  SELECT
    COUNT(*) FILTER (WHERE last_active > now() - interval '7 days'),
    COUNT(*) FILTER (WHERE last_active <= now() - interval '7 days' AND last_active > now() - interval '14 days'),
    COUNT(*) FILTER (WHERE last_active <= now() - interval '14 days')
  INTO v_students_active, v_students_slowing, v_students_at_risk FROM s;

  WITH tg AS (
    SELECT tm.id,
      COALESCE((SELECT MAX(tr.created_at) FROM transactions tr
                WHERE tr.team_id = tm.id AND tr.type IN ('task','validation','meeting')),
               '1970-01-01'::timestamptz) AS last_xp
    FROM teams tm WHERE tm.status = 'active' AND tm.name NOT ILIKE '[TEST]%'
  )
  SELECT
    COUNT(*) FILTER (WHERE last_xp > now() - interval '7 days'),
    COUNT(*) FILTER (WHERE last_xp <= now() - interval '7 days' AND last_xp > now() - interval '14 days'),
    COUNT(*) FILTER (WHERE last_xp <= now() - interval '14 days')
  INTO v_teams_active, v_teams_slowing, v_teams_at_risk FROM tg;

  WITH s_prev AS (
    SELECT u.id,
      GREATEST(
        COALESCE(CASE WHEN au.last_sign_in_at <= now() - interval '7 days' THEN au.last_sign_in_at END,
                 '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(t.created_at) FROM transactions t
                  WHERE t.user_id = u.id AND t.type IN ('task','validation','meeting')
                    AND t.created_at <= now() - interval '7 days'),
                 '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(wr.submitted_at) FROM weekly_reports wr
                  WHERE wr.user_id = u.id AND wr.submitted_at <= now() - interval '7 days'),
                 '1970-01-01'::timestamptz)
      ) AS last_active
    FROM users u
    LEFT JOIN auth.users au ON au.id = u.id
    WHERE u.primary_role = 'user'
      AND u.status = 'active'
      AND u.created_at <= now() - interval '7 days'
      AND (
        NOT EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = u.id AND tm.left_at IS NULL)
        OR EXISTS (SELECT 1 FROM team_members tm JOIN teams tmt ON tmt.id = tm.team_id
                   WHERE tm.user_id = u.id AND tm.left_at IS NULL AND tmt.name NOT ILIKE '[TEST]%')
      )
  )
  SELECT
    COUNT(*) FILTER (WHERE last_active > now() - interval '14 days'),
    COUNT(*) FILTER (WHERE last_active <= now() - interval '21 days')
  INTO v_students_active_prev, v_students_at_risk_prev FROM s_prev;

  WITH tg_prev AS (
    SELECT tm.id,
      COALESCE((SELECT MAX(tr.created_at) FROM transactions tr
                WHERE tr.team_id = tm.id AND tr.type IN ('task','validation','meeting')
                  AND tr.created_at <= now() - interval '7 days'),
               '1970-01-01'::timestamptz) AS last_xp
    FROM teams tm
    WHERE tm.status = 'active' AND tm.name NOT ILIKE '[TEST]%'
      AND tm.created_at <= now() - interval '7 days'
  )
  SELECT
    COUNT(*) FILTER (WHERE last_xp > now() - interval '14 days'),
    COUNT(*) FILTER (WHERE last_xp <= now() - interval '21 days')
  INTO v_teams_active_prev, v_teams_at_risk_prev FROM tg_prev;

  RETURN QUERY SELECT
    (SELECT COUNT(*) FROM users WHERE primary_role = 'user' AND status = 'active')::bigint,
    (SELECT COUNT(DISTINCT t.user_id) FROM transactions t
       JOIN users u ON u.id = t.user_id AND u.primary_role = 'user' AND u.status = 'active'
      WHERE t.created_at > now() - interval '7 days' AND t.type IN ('task','validation','meeting'))::bigint,
    (SELECT COUNT(DISTINCT t.user_id) FROM transactions t
       JOIN users u ON u.id = t.user_id AND u.primary_role = 'user' AND u.status = 'active'
      WHERE t.created_at > now() - interval '14 days' AND t.type IN ('task','validation','meeting'))::bigint,
    (SELECT COUNT(*) FROM users u
      WHERE u.primary_role = 'user' AND u.status = 'active'
        AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.user_id = u.id
                          AND t.created_at > now() - interval '14 days'
                          AND t.type IN ('task','validation','meeting')))::bigint,
    (SELECT COUNT(DISTINCT wr.user_id) FROM weekly_reports wr
       JOIN users u ON u.id = wr.user_id AND u.status = 'active'
      WHERE wr.week_number = v_current_week AND wr.week_year = v_current_year)::bigint,
    (SELECT COUNT(DISTINCT wr.user_id) FROM weekly_reports wr
       JOIN users u ON u.id = wr.user_id AND u.status = 'active'
      WHERE wr.week_number = v_last_week AND wr.week_year = v_current_year)::bigint,
    (SELECT COUNT(*) FROM task_progress WHERE status = 'approved'
       AND completed_at > now() - interval '7 days')::bigint,
    (SELECT COUNT(*) FROM task_progress WHERE status = 'approved'
       AND completed_at BETWEEN (now() - interval '14 days') AND (now() - interval '7 days'))::bigint,
    (SELECT COUNT(*) FROM team_strikes WHERE status = 'pending')::bigint,
    (SELECT COUNT(*) FROM task_progress WHERE status = 'pending_review')::bigint,
    (SELECT ROUND(AVG(total_xp)::numeric, 0) FROM users
      WHERE primary_role = 'user' AND status = 'active' AND total_xp > 0),
    (SELECT COUNT(*) FROM teams WHERE status = 'active' AND name NOT ILIKE '[TEST]%')::bigint,
    v_students_active, v_students_slowing, v_students_at_risk,
    v_teams_active, v_teams_slowing, v_teams_at_risk,
    (v_students_active - v_students_active_prev),
    (v_students_at_risk - v_students_at_risk_prev),
    (v_teams_active - v_teams_active_prev),
    (v_teams_at_risk - v_teams_at_risk_prev);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_program_health_v3() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_program_health_v3() TO service_role;

CREATE OR REPLACE FUNCTION public.get_admin_task_pipeline_v1()
RETURNS TABLE(activity_type text, status text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  SELECT t.activity_type::text, tp.status::text, COUNT(*)::bigint
  FROM task_progress tp
  JOIN tasks t ON t.id = tp.task_id
  LEFT JOIN users u ON u.id = tp.user_id
  LEFT JOIN teams tm ON tm.id = tp.team_id
  WHERE COALESCE(u.status::text, 'active') = 'active'
    AND COALESCE(tm.status::text, 'active') = 'active'
  GROUP BY 1, 2;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_task_pipeline_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_task_pipeline_v1() TO service_role;
