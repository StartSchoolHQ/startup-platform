-- My Journey phase gate v1.1 — unlock threshold 50% → 75%
--
-- Programme decision (board of 2026-10-09): a phase opens once the previous
-- gated phase has >= 75% of its active non-recurring tasks approved —
-- 9 of 11 opens phase 2, 12 of 15 opens phase 3, 9 of 12 opens phase 4.
-- Was 50% (6 / 8 / 6) since 2026-09-15.
--
-- Edited in place: the trigger, get_user_tasks_visible_v2,
-- get_user_achievement_progress_v2, get_my_journey_overview_v1 and
-- _analytics_phase_v1 all call my_journey_phase_unlocked_v1, so they pick up
-- the new rule untouched. The trigger function only changes its error text.
-- Verbatim pre-change bodies: my_journey_phase_unlocked_v1_backup_v1 and
-- my_journey_phase_gate_trigger_v1_backup_v1 (no EXECUTE for anyone but
-- postgres / service_role, like the other _backup_ copies).
--
-- Rollback:
--   restore both functions from their _backup_v1 (pg_get_functiondef +
--   rename, re-apply), then drop the two backups. The task_progress trigger
--   keeps pointing at my_journey_phase_gate_trigger_v1 either way.

-- 1. Snapshots -----------------------------------------------------------

create or replace function public.my_journey_phase_unlocked_v1_backup_v1(p_user_id uuid, p_achievement_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  with a as (
    select id, sort_order, always_unlocked, context
    from achievements
    where id = p_achievement_id
  ),
  prev as (
    select p.id
    from achievements p, a
    where p.context = 'individual'
      and p.active = true
      and p.always_unlocked = false
      and p.sort_order < a.sort_order
    order by p.sort_order desc
    limit 1
  ),
  stats as (
    select count(distinct t.id) as total,
           count(distinct t.id) filter (where tp.status = 'approved') as approved
    from prev
    join tasks t
      on t.achievement_id = prev.id
     and t.is_active = true
     and coalesce(t.is_recurring, false) = false
    left join task_progress tp
      on tp.task_id = t.id
     and tp.user_id = p_user_id
     and tp.context = 'individual'
  )
  select case
    when not exists (select 1 from a)                    then true
    when (select context::text from a) <> 'individual'   then true
    when (select always_unlocked from a)                 then true
    when not exists (select 1 from prev)                 then true
    when coalesce((select total from stats), 0) = 0      then true
    else (select approved * 2 >= total from stats)
  end;
$function$;

create or replace function public.my_journey_phase_gate_trigger_v1_backup_v1()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_achievement uuid;
  v_phase text;
begin
  if new.context::text <> 'individual' or new.status::text <> 'in_progress' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status::text = 'in_progress' then
    return new;
  end if;
  if auth.uid() is null or public.is_admin_v1() then
    return new;
  end if;

  select t.achievement_id, a.name
    into v_achievement, v_phase
  from tasks t
  left join achievements a on a.id = t.achievement_id
  where t.id = new.task_id;

  if v_achievement is null then
    return new;
  end if;

  if not public.my_journey_phase_unlocked_v1(new.user_id, v_achievement) then
    raise exception 'my_journey_phase_locked: "%" is locked — complete half of the previous phase first', v_phase
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

revoke execute on function public.my_journey_phase_unlocked_v1_backup_v1(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.my_journey_phase_gate_trigger_v1_backup_v1() from public, anon, authenticated;

-- 2. The rule: >= 75% of the previous gated phase approved -----------------

create or replace function public.my_journey_phase_unlocked_v1(p_user_id uuid, p_achievement_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  with a as (
    select id, sort_order, always_unlocked, context
    from achievements
    where id = p_achievement_id
  ),
  prev as (
    select p.id
    from achievements p, a
    where p.context = 'individual'
      and p.active = true
      and p.always_unlocked = false
      and p.sort_order < a.sort_order
    order by p.sort_order desc
    limit 1
  ),
  stats as (
    select count(distinct t.id) as total,
           count(distinct t.id) filter (where tp.status = 'approved') as approved
    from prev
    join tasks t
      on t.achievement_id = prev.id
     and t.is_active = true
     and coalesce(t.is_recurring, false) = false
    left join task_progress tp
      on tp.task_id = t.id
     and tp.user_id = p_user_id
     and tp.context = 'individual'
  )
  select case
    when not exists (select 1 from a)                    then true
    when (select context::text from a) <> 'individual'   then true
    when (select always_unlocked from a)                 then true
    when not exists (select 1 from prev)                 then true
    when coalesce((select total from stats), 0) = 0      then true
    -- 75%: approved / total >= 3 / 4, in integers
    else (select approved * 4 >= total * 3 from stats)
  end;
$function$;

-- 3. Trigger error text ---------------------------------------------------

create or replace function public.my_journey_phase_gate_trigger_v1()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_achievement uuid;
  v_phase text;
begin
  if new.context::text <> 'individual' or new.status::text <> 'in_progress' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status::text = 'in_progress' then
    return new;
  end if;
  if auth.uid() is null or public.is_admin_v1() then
    return new;
  end if;

  select t.achievement_id, a.name
    into v_achievement, v_phase
  from tasks t
  left join achievements a on a.id = t.achievement_id
  where t.id = new.task_id;

  if v_achievement is null then
    return new;
  end if;

  if not public.my_journey_phase_unlocked_v1(new.user_id, v_achievement) then
    raise exception 'my_journey_phase_locked: "%" is locked — complete 75%% of the previous phase first', v_phase
      using errcode = '42501';
  end if;

  return new;
end;
$function$;
