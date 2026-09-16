-- My Journey recurring tasks v1
--
-- The five recurring solo tasks (14/28-day cooldowns) sat inside phases 1
-- and 2, so three of them were locked behind the phase gate even though they
-- are habits meant to run from day one. They move into their own phase card,
-- "Recurring Tasks" — the solo twin of the Team Journey achievement of the
-- same name: context individual, always_unlocked, 0 XP / 0 credits, never
-- awarded (check_achievement_completion_on_task_approval returns early on
-- recurring rows; the award / progress / gate readers already exclude them).
--
-- Gate math is unchanged: recurring tasks never counted toward the 50%
-- thresholds. Phase 1 now lists 11 gated tasks, Phase 2 lists 15.
--
-- get_my_journey_recurring_status_v1() is the solo counterpart of
-- get_recurring_task_status(team_id, user_id): the caller's own recurring
-- rows with cooldown state, so the shared TasksTable can show Cooldown /
-- Start again. Same-row model only — trigger handle_recurring_task_cooldown
-- stamps next_available_at on approval and cron job 4
-- (reset_available_recurring_tasks, every 30 min) archives the submission
-- into submission_history and resets the row to not_started. No new rows
-- per cycle (unlike the team-only start_recurring_task).
--
-- Additive: one achievements row, five tasks re-pointed, one new function.
--
-- Rollback:
--   update public.tasks set achievement_id = '1d93efc0-b669-4034-a9b4-937eea01a767',
--     tags = array_append(array_remove(tags, 'phase-recurring'), 'phase-p1')
--     where template_code in ('MJ-P1-05', 'MJ-P1-13');
--   update public.tasks set achievement_id = 'b69c308d-42bd-46e3-931f-7b5c744c40c1',
--     tags = array_append(array_remove(tags, 'phase-recurring'), 'phase-p2')
--     where template_code in ('MJ-P2-11', 'MJ-P2-12', 'MJ-P2-13');
--   delete from public.achievements where context = 'individual' and name = 'Recurring Tasks';
--   drop function public.get_my_journey_recurring_status_v1();

-- ----------------------------------------------------------- achievement
insert into public.achievements (
  name, description, context, sort_order,
  xp_reward, points_reward, color_theme, always_unlocked, active
)
select
  'Recurring Tasks',
  'Founder habits that repeat on a cooldown. Always open, never a prerequisite, never "done" — the value is in doing them again.',
  'individual', 16,
  0, 0, 'amber', true, true
where not exists (
  select 1 from public.achievements
  where context = 'individual' and name = 'Recurring Tasks'
);

-- ---------------------------------------------------------- repoint tasks
-- Before (2026-09-16):
--   MJ-P1-05, MJ-P1-13           -> Know Yourself & Experiment, tag phase-p1
--   MJ-P2-11, MJ-P2-12, MJ-P2-13 -> Get Outside the Building,   tag phase-p2
update public.tasks t
   set achievement_id = a.id,
       tags = array_append(
                array_remove(array_remove(t.tags, 'phase-p1'), 'phase-p2'),
                'phase-recurring'),
       updated_at = now()
  from public.achievements a
 where a.context = 'individual'
   and a.name = 'Recurring Tasks'
   and t.activity_type = 'individual'
   and t.template_code like 'MJ-%'
   and t.is_recurring = true
   and t.achievement_id is distinct from a.id;

-- ---------------------------------------------------------------- reader
-- SECURITY INVOKER: individual task_progress rows are owner-only under RLS,
-- so the join can only ever see the caller's own progress.
create or replace function public.get_my_journey_recurring_status_v1()
returns table (
  task_id uuid,
  template_code text,
  title text,
  is_recurring boolean,
  cooldown_days integer,
  last_completion timestamptz,
  next_available timestamptz,
  latest_progress_id uuid,
  progress_status task_status_type,
  recurring_status text,
  has_active_instance boolean,
  achievement_id uuid,
  achievement_name text
)
language sql
stable
set search_path = public, pg_temp
as $$
  select
    t.id,
    t.template_code,
    t.title,
    t.is_recurring,
    t.cooldown_days,
    tp.last_completed_at,
    -- While cooling down this is the trigger's stamp; after the cron reset
    -- next_available_at is NULL, so fall back to the cycle that just ended
    -- (a past instant = "available again").
    coalesce(
      tp.next_available_at,
      tp.last_completed_at + make_interval(days => coalesce(t.cooldown_days, 7))
    ),
    tp.id,
    coalesce(tp.status, 'not_started'::task_status_type),
    case
      when tp.status = 'approved'              then 'cooldown'
      when tp.last_completed_at is not null    then 'available'
      else                                          'never_completed'
    end,
    coalesce(
      tp.status in ('in_progress', 'pending_review', 'rejected', 'revision_required'),
      false
    ),
    t.achievement_id,
    a.name
  from tasks t
  left join task_progress tp
    on tp.task_id = t.id
   and tp.user_id = auth.uid()
   and tp.context = 'individual'
  left join achievements a on a.id = t.achievement_id
  where t.is_active = true
    and t.activity_type = 'individual'
    and t.is_recurring = true
  order by t.sort_order, t.created_at;
$$;

comment on function public.get_my_journey_recurring_status_v1() is
  'My Journey: the caller''s recurring solo tasks with cooldown state (same-row model; cron resets the row).';

revoke all on function public.get_my_journey_recurring_status_v1() from public, anon;
grant execute on function public.get_my_journey_recurring_status_v1()
  to authenticated, service_role;
