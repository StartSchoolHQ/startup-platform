-- My Journey phase gate v1
--
-- Phases (achievements with context = 'individual') open in sort_order.
-- A phase is unlocked when the previous gated phase has >= 50% of its
-- non-recurring active tasks approved for that student — the same task set
-- the progress ring on the achievement card counts. Phases flagged
-- always_unlocked (Founder Reading List) never gate and are never a
-- prerequisite.
--
-- Starting a solo task is a direct task_progress write from the browser
-- under RLS (no RPC), so the rule is enforced by a BEFORE trigger on
-- task_progress. Service role and admins bypass it.
--
-- Additive: new column, new functions, new trigger, V2 readers. The one
-- edited function, get_my_journey_overview_v1 (next_up must skip locked
-- phases), is snapshotted as get_my_journey_overview_v1_backup_v1.
--
-- Rollback:
--   drop trigger trg_my_journey_phase_gate on public.task_progress;
--   drop function public.my_journey_phase_gate_trigger_v1();
--   drop function public.get_user_tasks_visible_v2(uuid);
--   drop function public.get_user_achievement_progress_v2(uuid);
--   -- restore overview from get_my_journey_overview_v1_backup_v1
--   --   (pg_get_functiondef + rename), then drop the backup
--   drop function public.my_journey_phase_unlocked_v1(uuid, uuid);
--   alter table public.achievements drop column always_unlocked;

-- ---------------------------------------------------------------- column
alter table public.achievements
  add column if not exists always_unlocked boolean not null default false;

comment on column public.achievements.always_unlocked is
  'My Journey: phase is open regardless of progress and never gates the next one (Founder Reading List).';

update public.achievements
   set always_unlocked = true
 where context = 'individual' and name = 'Founder Reading List';

-- ------------------------------------------------------------------ rule
create or replace function public.my_journey_phase_unlocked_v1(
  p_user_id uuid,
  p_achievement_id uuid
) returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
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
    when not exists (select 1 from prev)                 then true   -- first phase
    when coalesce((select total from stats), 0) = 0      then true
    else (select approved * 2 >= total from stats)                   -- >= 50%
  end;
$$;

comment on function public.my_journey_phase_unlocked_v1(uuid, uuid) is
  'True when the student may start tasks in this My Journey phase: previous gated phase >= 50% approved (non-recurring tasks), or phase is first / always_unlocked.';

revoke all on function public.my_journey_phase_unlocked_v1(uuid, uuid) from public, anon;
grant execute on function public.my_journey_phase_unlocked_v1(uuid, uuid)
  to authenticated, service_role;

-- --------------------------------------------------------------- trigger
create or replace function public.my_journey_phase_gate_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_achievement uuid;
  v_phase text;
begin
  if new.context::text <> 'individual' or new.status::text <> 'in_progress' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status::text = 'in_progress' then
    return new;                                     -- not a start transition
  end if;
  if auth.uid() is null or public.is_admin_v1() then
    return new;                                     -- service role / admin
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
$$;

revoke all on function public.my_journey_phase_gate_trigger_v1() from public, anon, authenticated;

drop trigger if exists trg_my_journey_phase_gate on public.task_progress;
create trigger trg_my_journey_phase_gate
  before insert or update of status on public.task_progress
  for each row
  execute function public.my_journey_phase_gate_trigger_v1();

-- ------------------------------------------------- readers (V2, additive)
create or replace function public.get_user_tasks_visible_v2(p_user_id uuid)
returns table(
  progress_id uuid, task_id uuid, task_title text, task_description text,
  detailed_instructions text, category task_category_type, priority task_priority_type,
  difficulty_level integer, estimated_hours numeric, base_xp_reward integer,
  base_points_reward integer, tips_content text, peer_review_criteria text,
  learning_objectives text, deliverables text, resources text,
  progress_status task_status_type, assigned_to_user_id uuid, assignee_name text,
  assignee_avatar_url text, assigned_at timestamptz, started_at timestamptz,
  completed_at timestamptz, is_available boolean, sort_order integer,
  achievement_id uuid, achievement_name text, reviewer_notes text,
  phase_locked boolean
)
language plpgsql
set search_path = public, pg_temp
as $$
begin
  return query
  select
    tp.id, t.id, t.title, t.description, t.detailed_instructions,
    t.category, t.priority, t.difficulty_level, t.estimated_hours,
    t.base_xp_reward, t.base_points_reward,
    coalesce(t.tips_content::text, ''),
    coalesce(t.peer_review_criteria::text, ''),
    coalesce(array_to_string(t.learning_objectives, ', '), ''),
    coalesce(array_to_string(t.deliverables, ', '), ''),
    coalesce(t.resources::text, ''),
    coalesce(tp.status, 'not_started'::task_status_type),
    tp.assigned_to_user_id, u.name, u.avatar_url,
    tp.assigned_at, tp.started_at, tp.completed_at,
    (tp.id is null or tp.status = 'not_started'),
    t.sort_order, t.achievement_id, ach.name,
    coalesce(tp.review_feedback, ''),
    (t.achievement_id is not null
      and not public.my_journey_phase_unlocked_v1(p_user_id, t.achievement_id))
  from tasks t
  left join task_progress tp
    on t.id = tp.task_id and tp.user_id = p_user_id and tp.context = 'individual'
  left join users u on tp.assigned_to_user_id = u.id
  left join achievements ach on t.achievement_id = ach.id
  where t.is_active = true
    and t.activity_type = 'individual'
  order by t.sort_order, t.created_at;
end;
$$;

revoke all on function public.get_user_tasks_visible_v2(uuid) from public, anon;
grant execute on function public.get_user_tasks_visible_v2(uuid) to authenticated, service_role;

create or replace function public.get_user_achievement_progress_v2(p_user_id uuid)
returns table(
  achievement_id uuid, achievement_name text, achievement_description text,
  achievement_icon text, xp_reward integer, points_reward integer,
  color_theme text, sort_order integer, total_tasks bigint, completed_tasks bigint,
  status text, is_completed boolean, always_unlocked boolean, is_unlocked boolean
)
language plpgsql
set search_path = public, pg_temp
as $$
begin
  return query
  with ap as (
    select
      a.id, a.name, a.description, a.icon, a.xp_reward, a.points_reward,
      a.color_theme, a.sort_order, a.always_unlocked,
      count(distinct t.id) as total_tasks,
      count(distinct case
        when tp.status = 'approved' and tp.user_id = p_user_id and tp.context = 'individual'
        then tp.id end) as completed_tasks,
      exists (select 1 from user_achievements ua
              where ua.user_id = p_user_id and ua.achievement_id = a.id) as is_completed
    from achievements a
    left join tasks t
      on t.achievement_id = a.id and t.is_active = true
     and coalesce(t.is_recurring, false) = false
    left join task_progress tp
      on tp.task_id = t.id and tp.user_id = p_user_id and tp.context = 'individual'
    where a.active = true and a.context = 'individual'
    group by a.id, a.name, a.description, a.icon, a.xp_reward, a.points_reward,
             a.color_theme, a.sort_order, a.always_unlocked
  )
  select
    ap.id, ap.name, ap.description, ap.icon, ap.xp_reward, ap.points_reward,
    ap.color_theme, ap.sort_order, ap.total_tasks, ap.completed_tasks,
    case when ap.is_completed then 'completed'
         when ap.completed_tasks > 0 then 'in-progress'
         else 'not-started' end,
    ap.is_completed,
    ap.always_unlocked,
    public.my_journey_phase_unlocked_v1(p_user_id, ap.id)
  from ap
  order by ap.sort_order;
end;
$$;

revoke all on function public.get_user_achievement_progress_v2(uuid) from public, anon;
grant execute on function public.get_user_achievement_progress_v2(uuid) to authenticated, service_role;

-- ------------------------------ overview: next_up must skip locked phases
do $$
declare d text;
begin
  if not exists (select 1 from pg_proc
                 where proname = 'get_my_journey_overview_v1_backup_v1'
                   and pronamespace = 'public'::regnamespace) then
    select pg_get_functiondef(oid) into d
    from pg_proc
    where proname = 'get_my_journey_overview_v1'
      and pronamespace = 'public'::regnamespace;
    execute replace(d, 'get_my_journey_overview_v1(', 'get_my_journey_overview_v1_backup_v1(');
  end if;
end $$;

revoke all on function public.get_my_journey_overview_v1_backup_v1(uuid) from public, anon, authenticated;

create or replace function public.get_my_journey_overview_v1(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if auth.uid() is distinct from p_user_id and not public.is_admin_v1() then
    raise exception 'Unauthorized: can only read your own overview' using errcode = '42501';
  end if;

  with visible_tasks as (
    select t.id, t.title, t.category, t.sort_order, t.created_at,
           t.base_xp_reward, t.base_points_reward, t.achievement_id,
           tp.id as progress_id, tp.status, tp.started_at
    from tasks t
    left join task_progress tp
      on tp.task_id = t.id and tp.user_id = p_user_id and tp.context = 'individual'
    where t.is_active = true and t.activity_type = 'individual'
  ),
  eligible as (
    select u.id, u.my_journey_xp, u.my_journey_credits, u.name
    from users u
    join auth.users au on au.id = u.id
    where u.status = 'active'
      and coalesce(u.primary_role, 'user') = 'user'
      and au.email_confirmed_at is not null
  ),
  ranked as (
    select id, row_number() over (order by my_journey_xp desc, my_journey_credits desc, name, id)::int as pos
    from eligible
  )
  select jsonb_build_object(
    'balances', coalesce((
      select jsonb_build_object(
        'my_journey_xp', coalesce(u.my_journey_xp, 0),
        'my_journey_credits', coalesce(u.my_journey_credits, 0))
      from users u where u.id = p_user_id
    ), '{"my_journey_xp": 0, "my_journey_credits": 0}'::jsonb),
    'has_active_team', exists (
      select 1 from team_members tm join teams t on t.id = tm.team_id
      where tm.user_id = p_user_id and tm.left_at is null and t.status = 'active'
    ),
    'tasks', (
      select jsonb_build_object(
        'completed', count(*) filter (where vt.status = 'approved'),
        'total', count(*))
      from visible_tasks vt
    ),
    'achievements', (
      select jsonb_build_object(
        'completed', count(*) filter (where exists (
          select 1 from user_achievements ua where ua.user_id = p_user_id and ua.achievement_id = a.id)),
        'total', count(*))
      from achievements a where a.active = true and a.context = 'individual'
    ),
    'rank', jsonb_build_object(
      'position', (select r.pos from ranked r where r.id = p_user_id),
      'total', (select count(*) from eligible)
    ),
    'in_progress', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'task_id', vt.id, 'progress_id', vt.progress_id, 'title', vt.title,
        'status', vt.status, 'started_at', vt.started_at,
        'xp_reward', vt.base_xp_reward, 'points_reward', vt.base_points_reward
      ) order by vt.started_at desc nulls last, vt.sort_order), '[]'::jsonb)
      from (
        select * from visible_tasks
        where status in ('in_progress', 'pending_review', 'rejected')
        order by started_at desc nulls last, sort_order
        limit 3
      ) vt
    ),
    'next_up', (
      select jsonb_build_object(
        'task_id', vt.id, 'title', vt.title, 'category', vt.category,
        'xp_reward', vt.base_xp_reward, 'points_reward', vt.base_points_reward)
      from visible_tasks vt
      where (vt.progress_id is null or vt.status = 'not_started')
        and (vt.achievement_id is null
             or public.my_journey_phase_unlocked_v1(p_user_id, vt.achievement_id))
      order by vt.sort_order, vt.created_at
      limit 1
    ),
    'achievement_progress', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'achievement_id', ap.achievement_id, 'name', ap.achievement_name,
        'completed_tasks', ap.completed_tasks, 'total_tasks', ap.total_tasks,
        'status', ap.status, 'xp_reward', ap.xp_reward, 'points_reward', ap.points_reward,
        'is_unlocked', ap.is_unlocked, 'always_unlocked', ap.always_unlocked
      ) order by ap.sort_order), '[]'::jsonb)
      from get_user_achievement_progress_v2(p_user_id) ap
    ),
    'recent_activity', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'type', tr.type, 'description', tr.description,
        'xp_change', tr.xp_change, 'points_change', tr.points_change,
        'created_at', tr.created_at
      ) order by tr.created_at desc), '[]'::jsonb)
      from (
        select type, description, xp_change, points_change, created_at
        from transactions
        where user_id = p_user_id and activity_type = 'individual'
        order by created_at desc
        limit 5
      ) tr
    )
  ) into result;

  return result;
end;
$$;
