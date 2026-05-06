-- Fix: admin health/activity signals were inflated by system-generated transactions
--
-- Bug: get_students_health_overview_v2, get_admin_program_health_v2, and (mildly)
-- get_student_progress_overview_v2 derived "last activity" from MAX(transactions.created_at)
-- without filtering on transaction type. The transaction types include:
--   task, validation, meeting           — user-driven (real engagement)
--   weekly_report_penalty, weekly_report_refund, team_cost, admin_grant — system-generated
-- The accountability cron creates `weekly_report_penalty` rows when a student MISSES a
-- report — i.e., the worse a student behaves, the more "Active" they look on the
-- progress dashboard. Audit on 2026-05-06 found 3 students shown 🟢 Active who had
-- not done real work in 16-28 days, and had not signed in for 100+ days.
--
-- Fix: restrict the activity signal to user-driven transaction types only.
-- Function signatures are unchanged, so no frontend changes are required.

CREATE OR REPLACE FUNCTION public.get_students_health_overview_v2()
 RETURNS TABLE(user_id uuid, full_name text, email text, team_id uuid, team_name text, role text, total_xp integer, last_sign_in_at timestamp with time zone, last_transaction_at timestamp with time zone, last_report_at timestamp with time zone, last_active_at timestamp with time zone, days_since_last_active integer, health_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.primary_role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      u.id AS user_id,
      u.name AS full_name,
      u.email,
      u.total_xp,
      au.last_sign_in_at,
      (SELECT MAX(t.created_at) FROM transactions t
        WHERE t.user_id = u.id
          AND t.type IN ('task','validation','meeting')) AS last_transaction_at,
      (SELECT MAX(wr.submitted_at) FROM weekly_reports wr WHERE wr.user_id = u.id) AS last_report_at,
      (SELECT tm.team_id FROM team_members tm
        JOIN teams tmt ON tmt.id = tm.team_id
        WHERE tm.user_id = u.id AND tm.left_at IS NULL
          AND tmt.name NOT ILIKE '[TEST]%'
        ORDER BY tm.joined_at DESC NULLS LAST LIMIT 1) AS team_id,
      (SELECT tm.team_role::text FROM team_members tm
        JOIN teams tmt ON tmt.id = tm.team_id
        WHERE tm.user_id = u.id AND tm.left_at IS NULL
          AND tmt.name NOT ILIKE '[TEST]%'
        ORDER BY tm.joined_at DESC NULLS LAST LIMIT 1) AS tm_role
    FROM users u
    LEFT JOIN auth.users au ON au.id = u.id
    WHERE u.primary_role = 'user'
      AND (
        NOT EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = u.id AND tm.left_at IS NULL)
        OR EXISTS (
          SELECT 1 FROM team_members tm
          JOIN teams tmt ON tmt.id = tm.team_id
          WHERE tm.user_id = u.id AND tm.left_at IS NULL
            AND tmt.name NOT ILIKE '[TEST]%'
        )
      )
  )
  SELECT
    b.user_id, b.full_name, b.email, b.team_id,
    (SELECT tm2.name FROM teams tm2 WHERE tm2.id = b.team_id) AS team_name,
    COALESCE(b.tm_role, 'No team') AS role,
    b.total_xp, b.last_sign_in_at, b.last_transaction_at, b.last_report_at,
    GREATEST(
      COALESCE(b.last_sign_in_at, '1970-01-01'::timestamptz),
      COALESCE(b.last_transaction_at, '1970-01-01'::timestamptz),
      COALESCE(b.last_report_at, '1970-01-01'::timestamptz)
    ) AS last_active_at,
    CASE
      WHEN GREATEST(
        COALESCE(b.last_sign_in_at, '1970-01-01'::timestamptz),
        COALESCE(b.last_transaction_at, '1970-01-01'::timestamptz),
        COALESCE(b.last_report_at, '1970-01-01'::timestamptz)
      ) = '1970-01-01'::timestamptz THEN 9999
      ELSE EXTRACT(DAY FROM NOW() - GREATEST(
        COALESCE(b.last_sign_in_at, '1970-01-01'::timestamptz),
        COALESCE(b.last_transaction_at, '1970-01-01'::timestamptz),
        COALESCE(b.last_report_at, '1970-01-01'::timestamptz)
      ))::integer
    END AS days_since_last_active,
    CASE
      WHEN GREATEST(
        COALESCE(b.last_sign_in_at, '1970-01-01'::timestamptz),
        COALESCE(b.last_transaction_at, '1970-01-01'::timestamptz),
        COALESCE(b.last_report_at, '1970-01-01'::timestamptz)
      ) = '1970-01-01'::timestamptz THEN 'red'
      WHEN GREATEST(
        COALESCE(b.last_sign_in_at, '1970-01-01'::timestamptz),
        COALESCE(b.last_transaction_at, '1970-01-01'::timestamptz),
        COALESCE(b.last_report_at, '1970-01-01'::timestamptz)
      ) > now() - interval '7 days' THEN 'green'
      WHEN GREATEST(
        COALESCE(b.last_sign_in_at, '1970-01-01'::timestamptz),
        COALESCE(b.last_transaction_at, '1970-01-01'::timestamptz),
        COALESCE(b.last_report_at, '1970-01-01'::timestamptz)
      ) > now() - interval '14 days' THEN 'yellow'
      ELSE 'red'
    END AS health_status
  FROM base b
  ORDER BY
    CASE
      WHEN GREATEST(
        COALESCE(b.last_sign_in_at, '1970-01-01'::timestamptz),
        COALESCE(b.last_transaction_at, '1970-01-01'::timestamptz),
        COALESCE(b.last_report_at, '1970-01-01'::timestamptz)
      ) = '1970-01-01'::timestamptz THEN 0
      WHEN GREATEST(
        COALESCE(b.last_sign_in_at, '1970-01-01'::timestamptz),
        COALESCE(b.last_transaction_at, '1970-01-01'::timestamptz),
        COALESCE(b.last_report_at, '1970-01-01'::timestamptz)
      ) <= now() - interval '14 days' THEN 1
      WHEN GREATEST(
        COALESCE(b.last_sign_in_at, '1970-01-01'::timestamptz),
        COALESCE(b.last_transaction_at, '1970-01-01'::timestamptz),
        COALESCE(b.last_report_at, '1970-01-01'::timestamptz)
      ) <= now() - interval '7 days' THEN 2
      ELSE 3
    END,
    b.full_name;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_admin_program_health_v2()
 RETURNS TABLE(total_students bigint, active_7d bigint, active_14d bigint, at_risk_students bigint, reports_this_week bigint, reports_last_week bigint, tasks_this_week bigint, tasks_last_week bigint, pending_strikes bigint, pending_reviews bigint, avg_xp_per_student numeric, total_active_teams bigint, students_active bigint, students_slowing bigint, students_at_risk bigint, teams_active bigint, teams_slowing bigint, teams_at_risk bigint, students_active_wow_delta bigint, students_at_risk_wow_delta bigint, teams_active_wow_delta bigint, teams_at_risk_wow_delta bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
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
    SELECT
      u.id,
      GREATEST(
        COALESCE(au.last_sign_in_at, '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(t.created_at) FROM transactions t
                  WHERE t.user_id = u.id
                    AND t.type IN ('task','validation','meeting')),
                 '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(wr.submitted_at) FROM weekly_reports wr WHERE wr.user_id = u.id), '1970-01-01'::timestamptz)
      ) AS last_active
    FROM users u
    LEFT JOIN auth.users au ON au.id = u.id
    WHERE u.primary_role = 'user'
      AND (
        NOT EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = u.id AND tm.left_at IS NULL)
        OR EXISTS (
          SELECT 1 FROM team_members tm
          JOIN teams tmt ON tmt.id = tm.team_id
          WHERE tm.user_id = u.id AND tm.left_at IS NULL
            AND tmt.name NOT ILIKE '[TEST]%'
        )
      )
  )
  SELECT
    COUNT(*) FILTER (WHERE last_active > now() - interval '7 days'),
    COUNT(*) FILTER (WHERE last_active <= now() - interval '7 days' AND last_active > now() - interval '14 days'),
    COUNT(*) FILTER (WHERE last_active <= now() - interval '14 days')
  INTO v_students_active, v_students_slowing, v_students_at_risk
  FROM s;

  WITH tg AS (
    SELECT
      tm.id,
      COALESCE(
        (SELECT MAX(tr.created_at) FROM transactions tr
          WHERE tr.team_id = tm.id
            AND tr.type IN ('task','validation','meeting')),
        '1970-01-01'::timestamptz
      ) AS last_xp
    FROM teams tm
    WHERE tm.status = 'active' AND tm.name NOT ILIKE '[TEST]%'
  )
  SELECT
    COUNT(*) FILTER (WHERE last_xp > now() - interval '7 days'),
    COUNT(*) FILTER (WHERE last_xp <= now() - interval '7 days' AND last_xp > now() - interval '14 days'),
    COUNT(*) FILTER (WHERE last_xp <= now() - interval '14 days')
  INTO v_teams_active, v_teams_slowing, v_teams_at_risk
  FROM tg;

  WITH s_prev AS (
    SELECT
      u.id,
      GREATEST(
        COALESCE(CASE WHEN au.last_sign_in_at <= now() - interval '7 days' THEN au.last_sign_in_at END, '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(t.created_at) FROM transactions t
                  WHERE t.user_id = u.id
                    AND t.type IN ('task','validation','meeting')
                    AND t.created_at <= now() - interval '7 days'),
                 '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(wr.submitted_at) FROM weekly_reports wr WHERE wr.user_id = u.id AND wr.submitted_at <= now() - interval '7 days'), '1970-01-01'::timestamptz)
      ) AS last_active
    FROM users u
    LEFT JOIN auth.users au ON au.id = u.id
    WHERE u.primary_role = 'user'
      AND u.created_at <= now() - interval '7 days'
      AND (
        NOT EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = u.id AND tm.left_at IS NULL)
        OR EXISTS (
          SELECT 1 FROM team_members tm
          JOIN teams tmt ON tmt.id = tm.team_id
          WHERE tm.user_id = u.id AND tm.left_at IS NULL
            AND tmt.name NOT ILIKE '[TEST]%'
        )
      )
  )
  SELECT
    COUNT(*) FILTER (WHERE last_active > now() - interval '14 days'),
    COUNT(*) FILTER (WHERE last_active <= now() - interval '21 days')
  INTO v_students_active_prev, v_students_at_risk_prev
  FROM s_prev;

  WITH tg_prev AS (
    SELECT
      tm.id,
      COALESCE(
        (SELECT MAX(tr.created_at) FROM transactions tr
         WHERE tr.team_id = tm.id
           AND tr.type IN ('task','validation','meeting')
           AND tr.created_at <= now() - interval '7 days'),
        '1970-01-01'::timestamptz
      ) AS last_xp
    FROM teams tm
    WHERE tm.status = 'active' AND tm.name NOT ILIKE '[TEST]%'
      AND tm.created_at <= now() - interval '7 days'
  )
  SELECT
    COUNT(*) FILTER (WHERE last_xp > now() - interval '14 days'),
    COUNT(*) FILTER (WHERE last_xp <= now() - interval '21 days')
  INTO v_teams_active_prev, v_teams_at_risk_prev
  FROM tg_prev;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM users WHERE primary_role = 'user')::bigint,
    (SELECT COUNT(DISTINCT t.user_id) FROM transactions t
     JOIN users u ON u.id = t.user_id AND u.primary_role = 'user'
     WHERE t.created_at > now() - interval '7 days'
       AND t.type IN ('task','validation','meeting'))::bigint,
    (SELECT COUNT(DISTINCT t.user_id) FROM transactions t
     JOIN users u ON u.id = t.user_id AND u.primary_role = 'user'
     WHERE t.created_at > now() - interval '14 days'
       AND t.type IN ('task','validation','meeting'))::bigint,
    (SELECT COUNT(*) FROM users u
     WHERE u.primary_role = 'user'
       AND NOT EXISTS (
         SELECT 1 FROM transactions t
         WHERE t.user_id = u.id
           AND t.created_at > now() - interval '14 days'
           AND t.type IN ('task','validation','meeting')
       ))::bigint,
    (SELECT COUNT(DISTINCT user_id) FROM weekly_reports
     WHERE week_number = v_current_week AND week_year = v_current_year)::bigint,
    (SELECT COUNT(DISTINCT user_id) FROM weekly_reports
     WHERE week_number = v_last_week AND week_year = v_current_year)::bigint,
    (SELECT COUNT(*) FROM task_progress WHERE status = 'approved' AND completed_at > now() - interval '7 days')::bigint,
    (SELECT COUNT(*) FROM task_progress WHERE status = 'approved'
     AND completed_at BETWEEN (now() - interval '14 days') AND (now() - interval '7 days'))::bigint,
    (SELECT COUNT(*) FROM team_strikes WHERE status = 'pending')::bigint,
    (SELECT COUNT(*) FROM task_progress WHERE status = 'pending_review')::bigint,
    (SELECT ROUND(AVG(total_xp)::numeric, 0) FROM users WHERE primary_role = 'user' AND total_xp > 0),
    (SELECT COUNT(*) FROM teams WHERE status = 'active' AND name NOT ILIKE '[TEST]%')::bigint,
    v_students_active, v_students_slowing, v_students_at_risk,
    v_teams_active, v_teams_slowing, v_teams_at_risk,
    (v_students_active - v_students_active_prev),
    (v_students_at_risk - v_students_at_risk_prev),
    (v_teams_active - v_teams_active_prev),
    (v_teams_at_risk - v_teams_at_risk_prev);
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_student_progress_overview_v2()
 RETURNS TABLE(team_id uuid, team_name text, team_description text, team_status text, member_count bigint, total_team_xp bigint, avg_xp_per_member numeric, tasks_approved bigint, tasks_in_progress bigint, tasks_pending_review bigint, tasks_not_started bigint, weekly_reports_count bigint, last_task_completed_at timestamp with time zone, last_report_at timestamp with time zone, last_xp_gain_at timestamp with time zone, days_since_last_xp integer, health_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.primary_role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    t.id AS team_id,
    t.name AS team_name,
    t.description AS team_description,
    t.status::text AS team_status,
    (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id AND tm.left_at IS NULL) AS member_count,
    (SELECT COALESCE(SUM(usr.total_xp), 0) FROM users usr
     JOIN team_members tmm ON tmm.user_id = usr.id
     WHERE tmm.team_id = t.id AND tmm.left_at IS NULL) AS total_team_xp,
    CASE
      WHEN (SELECT COUNT(*) FROM team_members tm2 WHERE tm2.team_id = t.id AND tm2.left_at IS NULL) = 0 THEN 0::numeric
      ELSE ROUND(
        (SELECT COALESCE(SUM(usr2.total_xp), 0)::numeric FROM users usr2
         JOIN team_members tmm2 ON tmm2.user_id = usr2.id
         WHERE tmm2.team_id = t.id AND tmm2.left_at IS NULL)
        / NULLIF((SELECT COUNT(*) FROM team_members tm3 WHERE tm3.team_id = t.id AND tm3.left_at IS NULL), 0),
      0)
    END AS avg_xp_per_member,
    COUNT(*) FILTER (WHERE tp.status = 'approved') AS tasks_approved,
    COUNT(*) FILTER (WHERE tp.status = 'in_progress') AS tasks_in_progress,
    COUNT(*) FILTER (WHERE tp.status = 'pending_review') AS tasks_pending_review,
    COUNT(*) FILTER (WHERE tp.status = 'not_started') AS tasks_not_started,
    (SELECT COUNT(*) FROM weekly_reports wr WHERE wr.team_id = t.id AND wr.status = 'submitted') AS weekly_reports_count,
    MAX(tp.completed_at) AS last_task_completed_at,
    (SELECT MAX(wr.submitted_at) FROM weekly_reports wr WHERE wr.team_id = t.id) AS last_report_at,
    (SELECT MAX(tr.created_at) FROM transactions tr
      WHERE tr.team_id = t.id
        AND tr.type IN ('task','validation','meeting')) AS last_xp_gain_at,
    COALESCE(
      EXTRACT(DAY FROM NOW() - (SELECT MAX(tr.created_at) FROM transactions tr
        WHERE tr.team_id = t.id
          AND tr.type IN ('task','validation','meeting')))::integer,
      9999
    ) AS days_since_last_xp,
    CASE
      WHEN (SELECT MAX(tr.created_at) FROM transactions tr
            WHERE tr.team_id = t.id
              AND tr.type IN ('task','validation','meeting')) IS NULL THEN 'red'
      WHEN (SELECT MAX(tr.created_at) FROM transactions tr
            WHERE tr.team_id = t.id
              AND tr.type IN ('task','validation','meeting')) > now() - interval '7 days' THEN 'green'
      WHEN (SELECT MAX(tr.created_at) FROM transactions tr
            WHERE tr.team_id = t.id
              AND tr.type IN ('task','validation','meeting')) > now() - interval '14 days' THEN 'yellow'
      ELSE 'red'
    END AS health_status
  FROM teams t
  LEFT JOIN task_progress tp ON tp.team_id = t.id AND tp.context = 'team'
  WHERE t.status = 'active'
    AND t.name NOT ILIKE '[TEST]%'
  GROUP BY t.id, t.name, t.description, t.status
  ORDER BY
    CASE
      WHEN (SELECT MAX(tr.created_at) FROM transactions tr
            WHERE tr.team_id = t.id
              AND tr.type IN ('task','validation','meeting')) IS NULL THEN 0
      WHEN (SELECT MAX(tr.created_at) FROM transactions tr
            WHERE tr.team_id = t.id
              AND tr.type IN ('task','validation','meeting')) <= now() - interval '14 days' THEN 1
      WHEN (SELECT MAX(tr.created_at) FROM transactions tr
            WHERE tr.team_id = t.id
              AND tr.type IN ('task','validation','meeting')) <= now() - interval '7 days' THEN 2
      ELSE 3
    END,
    t.name;
END;
$function$;
