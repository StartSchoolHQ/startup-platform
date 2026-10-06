-- Applied to prod via MCP apply_migration on 2026-10-06 (posthog_sync_views_v1_1_less_pii).
-- Tighten the PostHog warehouse views after a security review:
-- 1) drop email from students (the join key to PostHog persons is id, and
--    PostHog already holds email from the browser identify call);
-- 2) strip the free-text `evidence` field from criteria_results, which quotes
--    student submissions; keep id/label/passed so failing criteria still chart.
drop view posthog_sync.students;
create view posthog_sync.students as
  select id, name, status::text as status, primary_role::text as primary_role,
         batch_id, created_at, updated_at, startup_module_completed,
         my_journey_xp, my_journey_credits, team_xp, team_points
  from public.users;

drop view posthog_sync.ai_task_reviews;
create view posthog_sync.ai_task_reviews as
  select id, progress_id, task_id, user_id, attempt, status, stage, model,
         prompt_version, decision, confidence, reject_reason, decided_by,
         retry_count, input_tokens, output_tokens, cost_usd,
         case when jsonb_typeof(criteria_results) = 'array' then (
           select jsonb_agg(c - 'evidence') from jsonb_array_elements(criteria_results) c
         ) else null end as criteria_results,
         created_at, started_at, finished_at, updated_at
  from public.ai_task_reviews;

grant select on all tables in schema posthog_sync to posthog_reader;
