-- Individual (My Journey) achievement awards: align the award function with
-- the trigger that calls it.
--
-- Problem: check_achievement_completion_on_task_approval decides an
-- achievement is complete once every NON-recurring task is approved, then
-- calls check_and_award_achievement, which re-verifies completeness over
-- ALL tasks (recurring and inactive included) and raises. The trigger
-- swallows the exception as a WARNING, so phases that contain recurring
-- tasks ("Know Yourself & Experiment": 2 of 13, "Get Outside the Building":
-- 3 of 18) can never be awarded. If the last approval happens to be a
-- recurring task the trigger returns early and never checks at all.
--
-- Fix (V2 pattern, old award function untouched):
--   * new check_and_award_achievement_v2 -- same body, verification skips
--     recurring and inactive tasks, idempotent, SECURITY DEFINER.
--   * trigger function re-created to call the v2 (pre-edit copy kept as
--     check_achievement_completion_on_task_approval_backup_v2).
--
-- Rollback: re-create the trigger function from the _backup_v2 copy
-- (pg_get_functiondef + rename) and drop check_and_award_achievement_v2.
-- Rewards it paid are transactions rows with type = 'achievement' and
-- activity_type = 'individual'.

-- 1. Snapshot the trigger function as it is today.
do $$
declare v_def text;
begin
  select pg_get_functiondef('public.check_achievement_completion_on_task_approval()'::regprocedure)
    into v_def;
  v_def := replace(
    v_def,
    'FUNCTION public.check_achievement_completion_on_task_approval()',
    'FUNCTION public.check_achievement_completion_on_task_approval_backup_v2()'
  );
  execute v_def;
end $$;

-- 2. Award function v2: completeness ignores recurring + inactive tasks.
create or replace function public.check_and_award_achievement_v2(
  p_user_id uuid,
  p_achievement_id uuid
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_achievement record;
  v_user_achievement_id uuid;
begin
  select * into v_achievement
  from achievements
  where id = p_achievement_id and context = 'individual';

  if not found then
    raise exception 'Individual achievement not found: %', p_achievement_id;
  end if;

  -- Idempotent: a second call is a no-op, not an error.
  if exists (
    select 1 from user_achievements
    where user_id = p_user_id and achievement_id = p_achievement_id
  ) then
    return jsonb_build_object('success', false, 'reason', 'already_awarded');
  end if;

  -- Every active, non-recurring task of the achievement must be approved for
  -- this user. Recurring tasks are excluded on purpose (they cycle back to
  -- not-approved after their cooldown) -- same rule as the trigger.
  if exists (
    select 1
    from tasks t
    where t.achievement_id = p_achievement_id
      and t.is_active = true
      and coalesce(t.is_recurring, false) = false
      and not exists (
        select 1 from task_progress tp
        where tp.task_id = t.id
          and tp.user_id = p_user_id
          and tp.context = 'individual'
          and tp.status = 'approved'
      )
  ) then
    raise exception 'Not all individual tasks completed for this achievement';
  end if;

  insert into user_achievements (user_id, achievement_id, completed_at)
  values (p_user_id, p_achievement_id, now())
  returning id into v_user_achievement_id;

  if coalesce(v_achievement.xp_reward, 0) > 0
     or coalesce(v_achievement.points_reward, 0) > 0 then
    -- The transactions row feeds my_journey_xp / my_journey_credits through
    -- trg_transactions_split_economy; the users update below keeps the
    -- legacy combined wallet in step.
    insert into transactions (
      user_id, xp_change, points_change, type, activity_type,
      description, achievement_id
    ) values (
      p_user_id,
      coalesce(v_achievement.xp_reward, 0),
      coalesce(v_achievement.points_reward, 0),
      'achievement',
      'individual',
      'Individual Achievement: ' || v_achievement.name,
      p_achievement_id
    );

    update users
    set total_xp = total_xp + coalesce(v_achievement.xp_reward, 0),
        total_points = total_points + coalesce(v_achievement.points_reward, 0),
        updated_at = now()
    where id = p_user_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'user_achievement_id', v_user_achievement_id,
    'xp_awarded', coalesce(v_achievement.xp_reward, 0),
    'points_awarded', coalesce(v_achievement.points_reward, 0)
  );
end
$function$;

revoke all on function public.check_and_award_achievement_v2(uuid, uuid) from public, anon, authenticated;

-- 3. Trigger function: identical to today's, except the individual branch
--    calls the v2 award function and also filters on is_active.
create or replace function public.check_achievement_completion_on_task_approval()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_task record;
  v_achievement_id uuid;
  v_all_tasks_complete boolean;
begin
  if new.status = 'approved' and (old.status is null or old.status != 'approved') then

    select t.id, t.achievement_id, t.is_recurring
    into v_task
    from tasks t
    where t.id = new.task_id;

    -- Recurring approvals never trigger an achievement check (anti-spam).
    if v_task.is_recurring = true then
      return new;
    end if;

    if v_task.achievement_id is not null then
      v_achievement_id := v_task.achievement_id;

      -- TEAM branch: unchanged.
      if new.context = 'team' and new.team_id is not null then
        select not exists (
          select 1
          from tasks t
          where t.achievement_id = v_achievement_id
            and (t.is_recurring = false or t.is_recurring is null)
            and not exists (
              select 1 from task_progress tp
              where tp.task_id = t.id
                and tp.team_id = new.team_id
                and tp.context = 'team'
                and tp.status = 'approved'
            )
        ) into v_all_tasks_complete;

        if v_all_tasks_complete then
          begin
            perform award_team_achievement(new.team_id, v_achievement_id);
          exception when others then
            raise warning 'Could not award team achievement: %', sqlerrm;
          end;
        end if;
      end if;

      -- INDIVIDUAL branch: active, non-recurring tasks only; award via v2.
      if new.context = 'individual' and new.user_id is not null then
        select not exists (
          select 1
          from tasks t
          where t.achievement_id = v_achievement_id
            and t.is_active = true
            and coalesce(t.is_recurring, false) = false
            and not exists (
              select 1 from task_progress tp
              where tp.task_id = t.id
                and tp.user_id = new.user_id
                and tp.context = 'individual'
                and tp.status = 'approved'
            )
        ) into v_all_tasks_complete;

        if v_all_tasks_complete then
          begin
            perform check_and_award_achievement_v2(new.user_id, v_achievement_id);
          exception when others then
            raise warning 'Could not award individual achievement: %', sqlerrm;
          end;
        end if;
      end if;
    end if;
  end if;

  return new;
end
$function$;

-- 4. Progress counts: exclude recurring tasks so a phase awarded at "11 of 13"
--    reads 11 of 11 / 100%. Same recurring rule as the trigger and award v2.
--    Pre-edit copy kept as get_user_achievement_progress_backup_v1. Callers
--    (get_my_journey_overview_v1, the My Journey page) read the same columns.
do $$
declare v_def text;
begin
  select pg_get_functiondef('public.get_user_achievement_progress(uuid)'::regprocedure)
    into v_def;
  v_def := replace(
    v_def,
    'FUNCTION public.get_user_achievement_progress(p_user_id uuid)',
    'FUNCTION public.get_user_achievement_progress_backup_v1(p_user_id uuid)'
  );
  execute v_def;
end $$;

create or replace function public.get_user_achievement_progress(p_user_id uuid)
returns table(
  achievement_id uuid, achievement_name text, achievement_description text,
  achievement_icon text, xp_reward integer, points_reward integer,
  color_theme text, sort_order integer, total_tasks bigint,
  completed_tasks bigint, status text, is_completed boolean
)
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
begin
  return query
  with achievement_progress as (
    select
      a.id as achievement_id, a.name, a.description, a.icon, a.xp_reward,
      a.points_reward, a.color_theme, a.sort_order,
      count(distinct t.id) as total_tasks,
      count(distinct case
        when tp.status = 'approved' and tp.user_id = p_user_id and tp.context = 'individual'
        then tp.id end) as completed_tasks,
      exists(
        select 1 from user_achievements ua
        where ua.user_id = p_user_id and ua.achievement_id = a.id
      ) as is_completed
    from achievements a
    left join tasks t
      on t.achievement_id = a.id
     and t.is_active = true
     and coalesce(t.is_recurring, false) = false
    left join task_progress tp
      on tp.task_id = t.id and tp.user_id = p_user_id and tp.context = 'individual'
    where a.active = true and a.context = 'individual'
    group by a.id, a.name, a.description, a.icon, a.xp_reward, a.points_reward,
             a.color_theme, a.sort_order
  )
  select
    ap.achievement_id, ap.name, ap.description, ap.icon, ap.xp_reward,
    ap.points_reward, ap.color_theme, ap.sort_order, ap.total_tasks,
    ap.completed_tasks,
    case
      when ap.is_completed then 'completed'
      when ap.completed_tasks > 0 then 'in-progress'
      else 'not-started'
    end as status,
    ap.is_completed
  from achievement_progress ap
  order by ap.sort_order;
end;
$function$;
