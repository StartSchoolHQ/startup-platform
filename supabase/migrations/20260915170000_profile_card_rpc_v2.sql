-- Profile card read, v2: adds My Journey completion (approved / total active
-- solo tasks) so the leaderboard dialog can show "% of My Journey done" now
-- that My Journey credits are hidden from students.
--
-- SECURITY DEFINER, unlike v1, because `task_progress` rows with
-- context = 'individual' are readable only by their owner under RLS — an
-- invoker function would count 0 for every other student. The function
-- exposes aggregates only (two counts), never a task row, and applies the
-- same visibility rule the `users` policies do: the target must be active,
-- or the caller (auth.uid()) is the target or an admin. anon has no EXECUTE,
-- so an unauthenticated caller never reaches the body.
--
-- Purely additive — v1 is untouched and still callable. Rollback:
--   drop function public.get_user_profile_card_v2(uuid);
-- after pointing src/hooks/use-profile-card.ts back at v1.

create or replace function public.get_user_profile_card_v2(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'user_id', u.id,
    'name', u.name,
    'avatar_url', u.avatar_url,
    'member_since', u.created_at,
    'my_journey_xp', u.my_journey_xp,
    'my_journey_credits', u.my_journey_credits,
    'team_xp', u.team_xp,
    'team_points', u.team_points,
    -- Same definition as get_my_journey_overview_v1 "tasks": every active
    -- solo task counts once; a task is done when its progress is approved.
    'my_journey_tasks_completed', (
      select count(distinct tp.task_id)
      from task_progress tp
      join tasks t on t.id = tp.task_id
      where tp.user_id = u.id
        and tp.context = 'individual'
        and tp.status = 'approved'
        and t.is_active = true
        and t.activity_type = 'individual'
    ),
    'my_journey_tasks_total', (
      select count(*)
      from tasks t
      where t.is_active = true
        and t.activity_type = 'individual'
    ),
    'team', (
      select jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'role', tm.team_role
      )
      from team_members tm
      join teams t on t.id = tm.team_id
      where tm.user_id = u.id
        and tm.left_at is null
        and t.status = 'active'
      order by tm.joined_at desc nulls last
      limit 1
    ),
    'founder_card', (
      select jsonb_build_object(
        'background_lean', fp.background_lean,
        'background_reason', fp.background_reason,
        'bio_energizes', fp.bio_energizes,
        'bio_skills', fp.bio_skills,
        'bio_gaps', fp.bio_gaps,
        'updated_at', fp.updated_at
      )
      from founder_profiles fp
      where fp.user_id = u.id
    )
  )
  from users u
  where u.id = p_user_id
    and (
      u.status = 'active'
      or u.id = auth.uid()
      or public.is_admin_v1()
    );
$$;

comment on function public.get_user_profile_card_v2(uuid) is
  'Curated public profile card for one user (leaderboard dialog) + My Journey completion counts. SECURITY DEFINER (solo task_progress is owner-only under RLS); aggregates only; target must be active, self or caller admin.';

revoke all on function public.get_user_profile_card_v2(uuid) from public, anon;
grant execute on function public.get_user_profile_card_v2(uuid)
  to authenticated, service_role;
