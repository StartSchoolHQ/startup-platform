-- Close the three "pay yourself" paths (2026-09-15).
--
-- All three are SECURITY DEFINER and were still executable by every signed-in
-- user. None is called with a user session any more:
--   * increment_user_points(uuid, int)  — adds points to ANY user, no checks.
--       Real callers: admin strike-resolution route + weekly-strikes edge
--       function, both service_role.
--   * complete_individual_task(uuid, jsonb, text) — pre-AI-review completion:
--       approves + pays a solo task with no ownership or review check.
--       Superseded by submit_individual_task_v1 on 2026-09-09; TS wrapper unused.
--   * check_and_award_achievement(uuid, uuid) — awards a phase bonus. Verifies
--       completion, but the award trigger uses check_and_award_achievement_v2
--       internally; TS wrapper unused.
-- service_role keeps EXECUTE. Rollback: grant execute … to authenticated.

revoke execute on function public.increment_user_points(uuid, integer) from authenticated;
revoke execute on function public.complete_individual_task(uuid, jsonb, text) from authenticated;
revoke execute on function public.check_and_award_achievement(uuid, uuid) from authenticated;

grant execute on function public.increment_user_points(uuid, integer) to service_role;
grant execute on function public.complete_individual_task(uuid, jsonb, text) to service_role;
grant execute on function public.check_and_award_achievement(uuid, uuid) to service_role;
