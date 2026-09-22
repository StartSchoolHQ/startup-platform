-- My Journey leaderboard V2: v1 + the founder card's background lean, so the
-- board can show whether a student leans tech, business or both (team
-- matching signal). Purely additive — get_live_my_journey_leaderboard_v1 is
-- untouched and stays callable; the app switches to v2.
--
-- founder_profiles is authenticated-readable under RLS anyway
-- (p_founder_profiles_select_authenticated), so exposing background_lean
-- here leaks nothing new. NULL when the student has no founder card yet.
--
-- Rollback: point the app back at v1 (git), then
--   drop function public.get_live_my_journey_leaderboard_v2(integer);

create or replace function public.get_live_my_journey_leaderboard_v2(
  p_limit integer default 50
)
returns table (
  rank_position integer,
  user_id uuid,
  user_name text,
  user_avatar_url text,
  my_journey_xp integer,
  my_journey_credits integer,
  tasks_completed integer,
  background_lean text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    row_number() over (
      order by u.my_journey_xp desc, u.my_journey_credits desc, u.name, u.id
    )::integer as rank_position,
    u.id as user_id,
    coalesce(u.name, 'Unknown User') as user_name,
    u.avatar_url as user_avatar_url,
    coalesce(u.my_journey_xp, 0)::integer as my_journey_xp,
    coalesce(u.my_journey_credits, 0)::integer as my_journey_credits,
    (select count(*)::integer from public.task_progress tp
      where tp.user_id = u.id
        and tp.context = 'individual'
        and tp.status = 'approved') as tasks_completed,
    fp.background_lean
  from public.users u
  inner join auth.users au on au.id = u.id
  left join public.founder_profiles fp on fp.user_id = u.id
  where u.status = 'active'
    and coalesce(u.primary_role, 'user') = 'user'
    and au.email_confirmed_at is not null
  order by 1
  limit p_limit;
$$;

revoke all on function public.get_live_my_journey_leaderboard_v2(integer)
  from public, anon;
grant execute on function public.get_live_my_journey_leaderboard_v2(integer)
  to authenticated, service_role;
