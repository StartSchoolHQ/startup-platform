-- Applied to prod via MCP apply_migration on 2026-10-06 (posthog_sync_views_v1).
-- PostHog data warehouse source: a dedicated schema of read-only views so the
-- warehouse syncs curated columns only (no submission text, no chat content,
-- no personal codes). Views run as their owner (postgres), so RLS on the base
-- tables does not apply; the role below can read nothing else.
create schema if not exists posthog_sync;

create or replace view posthog_sync.students as
  select id, name, email, status::text as status, primary_role::text as primary_role,
         batch_id, created_at, updated_at, startup_module_completed,
         my_journey_xp, my_journey_credits, team_xp, team_points
  from public.users;

create or replace view posthog_sync.batches as
  select id, name, admission_date, completion_date, closed_at, created_at
  from public.diploma_batches;

create or replace view posthog_sync.tasks as
  select id, template_code, title, category::text as category, activity_type,
         difficulty_level, estimated_hours, base_xp_reward, base_points_reward,
         requires_review, is_active, is_recurring, cooldown_days, achievement_id,
         tags, sort_order, created_at, updated_at
  from public.tasks;

create or replace view posthog_sync.achievements as
  select id, name, context::text as context, sort_order, active, always_unlocked,
         xp_reward, points_reward, created_at
  from public.achievements;

create or replace view posthog_sync.task_progress as
  select id, context::text as context, task_id, team_id, user_id, status::text as status,
         activity_type, assigned_at, started_at, submitted_at, completed_at,
         cancelled_at, last_completed_at, next_available_at, points_awarded,
         created_at, updated_at
  from public.task_progress;

create or replace view posthog_sync.ai_task_reviews as
  select id, progress_id, task_id, user_id, attempt, status, stage, model,
         prompt_version, decision, confidence, reject_reason, decided_by,
         retry_count, input_tokens, output_tokens, cost_usd, criteria_results,
         created_at, started_at, finished_at, updated_at
  from public.ai_task_reviews;

create or replace view posthog_sync.assistant_threads as
  select id, user_id, created_at, updated_at
  from public.assistant_threads;

create or replace view posthog_sync.assistant_messages as
  select id, thread_id, user_id, role, model, input_tokens, cached_tokens,
         cache_write_tokens, output_tokens, cost_usd, prompt_version,
         flagged_message_id, created_at
  from public.assistant_messages;

create or replace view posthog_sync.weekly_reports as
  select id, user_id, team_id, context, status, week_start_date, week_end_date,
         week_number, week_year, submitted_at, created_at, updated_at
  from public.weekly_reports;

create or replace view posthog_sync.support_tickets as
  select id, user_id, priority, category, status, created_at, resolved_at, updated_at
  from public.support_tickets;

create or replace view posthog_sync.teams as
  select id, name, status::text as status, batch_id, member_count, founder_id,
         created_at, archived_at
  from public.teams;

create or replace view posthog_sync.team_members as
  select id, team_id, user_id, team_role::text as team_role, joined_at, left_at
  from public.team_members;

-- Login role with NO password: it cannot authenticate until an admin runs
--   alter role posthog_reader password '<strong secret>';
-- in the Supabase SQL editor, keeping the secret out of any transcript.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'posthog_reader') then
    create role posthog_reader login nosuperuser nocreatedb nocreaterole noinherit;
  end if;
end $$;

revoke all on schema public from posthog_reader;
grant usage on schema posthog_sync to posthog_reader;
grant select on all tables in schema posthog_sync to posthog_reader;
alter default privileges in schema posthog_sync grant select on tables to posthog_reader;
-- Keep it off anon/authenticated/PUBLIC entirely.
revoke all on schema posthog_sync from public;
alter role posthog_reader set statement_timeout = '120s';
