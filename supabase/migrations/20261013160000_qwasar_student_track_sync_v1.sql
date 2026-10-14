-- Program assistant, phase 0 (2026-10-13): weekly sync of `qwasar.student_track`
-- from the Google Sheet "Student Data info Batch 3 → Student info", replacing
-- the manual refresh the Cowork skill depended on. Called by the n8n workflow
-- WF-STUDENT-TRACK-SYNC (Sunday 23:00 Riga) through the REST RPC endpoint with
-- the service role key. Spec:
-- docs/internal/superpowers/specs/2026-10-13-program-assistant-design.md §5.2
--
-- `qwasar.student_track` itself is not altered; this only writes the same
-- columns the manual refresh wrote (email, name, tech_track, study_type,
-- sheet_status, updated_at). Rows for students missing from the sheet are left
-- untouched. Nothing from the sheet's personal-data columns is accepted.
--
-- Matching: the sheet has no Qwasar id, so each row resolves to a
-- qwasar_user_id by the student's org email against the Qwasar snapshot emails
-- (90 of 91 match today), then by normalised full name when exactly one
-- snapshot student matches. Unmatched rows are returned, not written.
--
-- Rollback: drop function public.qwasar_student_track_upsert_v1(jsonb);

-- Name normaliser without the unaccent extension: Latvian/Baltic diacritics
-- folded, lowercased, non-alphanumerics collapsed to single spaces.
create or replace function public._qwasar_norm_name_v1(p text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select btrim(regexp_replace(
    lower(translate(coalesce(p, ''),
      'āčēģīķļņōŗšūžĀČĒĢĪĶĻŅŌŖŠŪŽąęėįųūžĄĘĖĮŲŪŽäöüÄÖÜéèêëÉÈÊËáàâãÁÀÂÃíìîÍÌÎóòôõÓÒÔÕúùûÚÙÛñÑçÇ',
      'acegiklnorsuzacegiklnorsuzaeeiuuzaeeiuuzaouaoueeeeeeeeaaaaaaaaiiiiiioooooooouuuuuunncc')),
    '[^a-z0-9]+', ' ', 'g'));
$$;

revoke all on function public._qwasar_norm_name_v1(text) from public, anon;

create or replace function public.qwasar_student_track_upsert_v1(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, qwasar, pg_temp
as $$
declare
  v_row       jsonb;
  v_email     text;
  v_name      text;
  v_track     text;
  v_study     text;
  v_status    text;
  v_id        integer;
  v_matched   integer := 0;
  v_unmatched jsonb := '[]'::jsonb;
  v_skipped   integer := 0;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array' using errcode = '22023';
  end if;

  -- One row per Qwasar student with the email and name Qwasar knows.
  drop table if exists _snap;
  create temp table _snap on commit drop as
    select distinct on (s.qwasar_user_id)
           s.qwasar_user_id,
           lower(btrim(s.email)) as email,
           public._qwasar_norm_name_v1(s.name) as norm_name
    from qwasar.progress_snapshot s
    order by s.qwasar_user_id, s.snapshot_date desc;

  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_email  := lower(btrim(coalesce(v_row->>'email', '')));
    v_name   := btrim(coalesce(v_row->>'name', ''));
    v_status := nullif(btrim(coalesce(v_row->>'status', '')), '');
    v_study  := nullif(lower(btrim(coalesce(v_row->>'study_type', ''))), '');
    v_track  := case lower(btrim(coalesce(v_row->>'tech_track', '')))
                  when 'fullstack' then 'FS'
                  when 'fs' then 'FS'
                  when 'ml' then 'ML'
                  when 'machine learning' then 'ML'
                  else null
                end;

    if v_email = '' and v_name = '' then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    -- 1. email, 2. unique normalised name
    select qwasar_user_id into v_id from _snap where email = v_email and v_email <> '' limit 1;
    if v_id is null and v_name <> '' then
      select min(qwasar_user_id) into v_id
      from _snap
      where norm_name = public._qwasar_norm_name_v1(v_name)
      having count(*) = 1;
    end if;

    if v_id is null then
      if jsonb_array_length(v_unmatched) < 50 then
        v_unmatched := v_unmatched || jsonb_build_object('name', v_name, 'email', v_email);
      end if;
      continue;
    end if;

    insert into qwasar.student_track as t
      (qwasar_user_id, email, name, tech_track, study_type, sheet_status, updated_at)
    values
      (v_id, nullif(v_email, ''), nullif(v_name, ''), v_track, v_study, v_status, now())
    on conflict (qwasar_user_id) do update
      set email        = coalesce(excluded.email, t.email),
          name         = coalesce(excluded.name, t.name),
          tech_track   = coalesce(excluded.tech_track, t.tech_track),
          study_type   = coalesce(excluded.study_type, t.study_type),
          sheet_status = coalesce(excluded.sheet_status, t.sheet_status),
          updated_at   = now();

    v_matched := v_matched + 1;
    v_id := null;
  end loop;

  return jsonb_build_object(
    'matched', v_matched,
    'skipped', v_skipped,
    'unmatched_count', jsonb_array_length(v_unmatched),
    'unmatched', v_unmatched);
end;
$$;

revoke all on function public.qwasar_student_track_upsert_v1(jsonb) from public, anon, authenticated;
grant execute on function public.qwasar_student_track_upsert_v1(jsonb) to service_role;

comment on function public.qwasar_student_track_upsert_v1(jsonb) is
  'Program assistant: weekly sync of qwasar.student_track from the Student info sheet (service role only). Rows: name, email, status, tech_track (Fullstack|ML), study_type. Resolves qwasar_user_id by email, then unique name.';
