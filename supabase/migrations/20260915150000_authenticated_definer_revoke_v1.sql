-- Authenticated EXECUTE revoked on SECURITY DEFINER functions no signed-in
-- caller needs (2026-09-15, advisor item "authenticated can execute
-- SECURITY DEFINER function"). service_role keeps EXECUTE everywhere.
--
-- Method: every definer function callable by `authenticated` was classified
-- against (a) every string-literal reference in src/ and supabase/functions,
-- (b) RLS policy bodies, (c) bodies of SECURITY INVOKER functions students can
-- run, (d) cron.job commands, (e) trigger attachments. Revoked here:
--   * 17 `_backup_*` copies (never called by anything),
--   * 12 trigger functions (fired by the table owner, no caller EXECUTE needed),
--   * 4 cron-only functions (pg_cron runs as postgres),
--   * 52 functions with zero references in the app.
-- Kept: everything the app calls with a user session, every helper an RLS
-- policy or an invoker function evaluates, and the analytics/admin RPCs that
-- assert admin inside.
--
-- Still callable by students and worth a body-level guard (not changed here):
--   check_and_award_achievement, complete_individual_task, increment_user_points,
--   assign_individual_task, assign_team_task_to_progress, decrement_team_strikes_count,
--   increment_team_member_count, reassign_task, resubmit_task_for_review,
--   start_individual_task, start_recurring_task.
--
-- Rollback: grant execute on function public.<fn>(args) to authenticated for
-- any name below.

do $$
declare
  v_names text[] := array[
    -- backups
    'ai_review_apply_decision_v1_backup_v2','check_missed_weekly_reports_team_context_backup_v1',
    'check_missed_weekly_reports_team_context_backup_v2','complete_meeting_backup_v1',
    'get_dashboard_action_items_backup_v1','get_students_health_overview_v2_backup_v1',
    'get_team_progress_details_backup_v1','get_user_progress_details_backup_v1',
    'prevent_sensitive_column_updates_backup_v1','reset_available_recurring_tasks_backup_v2',
    'send_weekly_report_reminders_backup_v1','send_weekly_report_reminders_backup_v2',
    'send_weekly_report_reminders_sunday_backup_v1','send_weekly_report_reminders_sunday_backup_v2',
    'submit_external_peer_review_backup_v2','submit_external_peer_review_backup_v3',
    'submit_external_peer_review_backup_v4',
    -- trigger functions
    'assign_individual_tasks_to_new_user','audit_trigger_func','auto_decline_invalid_invitations',
    'award_client_meeting_rewards','notify_achievement_completion','notify_admins_on_confidential_submission',
    'notify_invitation_response','notify_team_invitation','prevent_sensitive_column_updates',
    'sync_team_founder_from_role','track_task_resubmission_trigger','transactions_split_economy_v1',
    -- cron only
    'generate_weekly_leaderboard_snapshots_v2','reset_available_recurring_tasks',
    'send_weekly_report_reminders','send_weekly_report_reminders_sunday',
    -- unused by the app
    '_analytics_assert_admin','ai_review_normalize_submission_v1','assert_admin_or_service_v1',
    'assign_user_to_template_task','cancel_client_meeting','cancel_meeting','check_simple_rate_limit',
    'create_individual_task_and_assign_to_users','deprecated_decrement_team_member_count',
    'distribute_team_rewards_v2','get_admin_program_health','get_admin_program_health_v2',
    'get_admin_weekly_trends','get_analytics_economy','get_analytics_meetings','get_analytics_overview',
    'get_analytics_retention','get_analytics_strikes','get_analytics_students','get_analytics_task_friction',
    'get_analytics_tasks','get_analytics_teams','get_analytics_week_detail','get_audit_logs',
    'get_available_templates_for_team','get_dashboard_overview','get_enhanced_team_tasks',
    'get_invitation_status','get_student_progress_overview','get_student_progress_overview_v2',
    'get_students_health_overview_v2','get_task_history','get_task_templates_for_admin',
    'get_task_update_impact','get_tasks_available_for_review','get_team_meetings',
    'get_team_progress_details','get_team_tasks_enhanced','get_team_tasks_with_availability',
    'get_teams_with_stats','get_user_pending_tasks','is_task_recurring','journey_enabled_v1',
    'mark_all_notifications_seen','mark_notification_read','retry_rejected_task',
    'scholarship_submit_form_v2','start_task','submit_peer_review','submit_peer_review_with_rate_limit',
    'update_meeting_draft','update_task_template'
  ];
  r record;
begin
  for r in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
      and p.proname = any (v_names)
  loop
    execute format('revoke execute on function public.%I(%s) from authenticated', r.proname, r.args);
    execute format('grant execute on function public.%I(%s) to service_role', r.proname, r.args);
  end loop;
end $$;

-- Correction, same day: is_task_recurring(uuid) is evaluated by the partial
-- unique indexes task_progress_unique_{user,team}_task_non_recurring
-- (WHERE NOT is_task_recurring(task_id)), i.e. by whoever INSERTs into
-- task_progress — students starting a task. Index predicates are not visible
-- to a code/trigger/policy reference scan. Re-granted:
grant execute on function public.is_task_recurring(uuid) to authenticated;
