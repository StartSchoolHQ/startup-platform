-- 20260909120150_ai_review_rpcs_v1_grant_fix.sql
-- Fix round 1 for ai_review_rpcs_v1: close the anon grant-hygiene gap on the
-- two student-facing RPCs, and add SECURITY DEFINER + search_path to the
-- normalise helper (binding rule for every new function in this file).

alter function public.ai_review_normalize_submission_v1(jsonb)
  security definer
  set search_path = public, pg_temp;

revoke execute on function public.submit_individual_task_v1(uuid, jsonb) from public, anon;
revoke execute on function public.get_ai_review_status_v1(uuid) from public, anon;
