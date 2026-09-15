-- Profile card read for the leaderboard (My Journey + Team Journey boards).
--
-- SECURITY INVOKER on purpose: every row the caller receives is one the
-- existing RLS already lets them read (active users via
-- p_users_select_public_progress, current memberships via
-- team_members_read_all, founder cards via
-- p_founder_profiles_select_authenticated). The function only curates the
-- shape — no email, no role, no legacy combined wallet. Returns NULL when
-- the user is not visible to the caller (unknown id, archived, RLS).
--
-- Purely additive. Rollback:
--   drop function public.get_user_profile_card_v1(uuid);

create or replace function public.get_user_profile_card_v1(p_user_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
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
  where u.id = p_user_id;
$$;

comment on function public.get_user_profile_card_v1(uuid) is
  'Curated public profile card for one user (leaderboard dialog). SECURITY INVOKER — relies on existing RLS.';

revoke all on function public.get_user_profile_card_v1(uuid) from public, anon;
grant execute on function public.get_user_profile_card_v1(uuid)
  to authenticated, service_role;
