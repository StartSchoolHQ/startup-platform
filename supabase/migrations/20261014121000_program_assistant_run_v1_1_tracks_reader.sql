-- Program assistant, phase 1 delta (2026-10-14): the run route needs the
-- current qwasar.student_track rows to build the "Data to fix" list, and the
-- qwasar schema is not exposed over REST. Service-role-only reader, no PII
-- beyond what the sheet sync already stores (org email, name, track).
-- Rollback: drop function public.program_student_tracks_v1();
create or replace function public.program_student_tracks_v1()
returns jsonb
language sql security definer
set search_path = public, qwasar, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'qwasar_user_id', t.qwasar_user_id,
           'email', t.email,
           'name', t.name,
           'tech_track', t.tech_track,
           'study_type', t.study_type,
           'sheet_status', t.sheet_status,
           'updated_at', t.updated_at) order by t.qwasar_user_id), '[]'::jsonb)
  from qwasar.student_track t;
$$;
revoke all on function public.program_student_tracks_v1() from public, anon, authenticated;
grant execute on function public.program_student_tracks_v1() to service_role;
