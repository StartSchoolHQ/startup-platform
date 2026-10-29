-- Program assistant: qwasar_student_track_upsert_v1 — blank cells no longer abort the sync.
--
-- Why: on 2026-10-28 a column was inserted into the "Student info" sheet, so the
-- n8n reader's range stopped covering "Study type" and every row arrived with a
-- blank study_type. The function turned that into NULL and the INSERT failed on
-- the NOT NULL constraint *before* ON CONFLICT could run, so the coalesce-with-
-- existing-row branch never had a chance and the whole daily track_sync step
-- answered 500 (28 + 29 Oct). Also btrim() only strips spaces; one sheet email
-- starts with a tab.
--
-- Change (edited in place, same name/signature/grants so the n8n node is untouched):
--   * each sheet row is merged with the existing track row first (new value wins
--     when present, otherwise the stored one), so a blank cell keeps the old value;
--   * a row that is still missing a required field after the merge (only possible
--     for a brand-new student) is counted as `skipped` and listed under
--     `incomplete` instead of aborting the call;
--   * whitespace trimming covers tabs/CR/LF as well as spaces.
-- Verbatim pre-change body: public.qwasar_student_track_upsert_v1_backup_v1
-- (no EXECUTE for anon/authenticated).
--
-- Rollback:
--   select pg_get_functiondef('public.qwasar_student_track_upsert_v1_backup_v1'::regproc);
--   -- rename to qwasar_student_track_upsert_v1, re-apply, then
--   drop function public.qwasar_student_track_upsert_v1_backup_v1(jsonb);

create or replace function public.qwasar_student_track_upsert_v1_backup_v1(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'qwasar', 'pg_temp'
as $function$
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
$function$;

revoke execute on function public.qwasar_student_track_upsert_v1_backup_v1(jsonb) from public, anon, authenticated;
comment on function public.qwasar_student_track_upsert_v1_backup_v1(jsonb) is
  'Rollback snapshot (2026-10-29) of qwasar_student_track_upsert_v1 from before the blank-cell fix. Not called by anything.';

create or replace function public.qwasar_student_track_upsert_v1(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'qwasar', 'pg_temp'
as $function$
declare
  c_ws constant text := E' \t\r\n';
  v_row        jsonb;
  v_email      text;
  v_name       text;
  v_track      text;
  v_study      text;
  v_status     text;
  v_id         integer;
  v_old        qwasar.student_track%rowtype;
  v_matched    integer := 0;
  v_skipped    integer := 0;
  v_unmatched  jsonb := '[]'::jsonb;
  v_incomplete jsonb := '[]'::jsonb;
  v_missing    text[];
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array' using errcode = '22023';
  end if;

  -- One row per Qwasar student with the email and name Qwasar knows.
  drop table if exists _snap;
  create temp table _snap on commit drop as
    select distinct on (s.qwasar_user_id)
           s.qwasar_user_id,
           lower(btrim(s.email, c_ws)) as email,
           public._qwasar_norm_name_v1(s.name) as norm_name
    from qwasar.progress_snapshot s
    order by s.qwasar_user_id, s.snapshot_date desc;

  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_email  := lower(btrim(coalesce(v_row->>'email', ''), c_ws));
    v_name   := btrim(coalesce(v_row->>'name', ''), c_ws);
    v_status := nullif(btrim(coalesce(v_row->>'status', ''), c_ws), '');
    v_study  := nullif(lower(btrim(coalesce(v_row->>'study_type', ''), c_ws)), '');
    v_track  := case lower(btrim(coalesce(v_row->>'tech_track', ''), c_ws))
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

    -- Merge with what is already stored: a blank cell keeps the old value.
    -- NOT NULL is checked before ON CONFLICT, so this must happen before the insert.
    v_old := null;
    select * into v_old from qwasar.student_track where qwasar_user_id = v_id;
    v_email  := coalesce(nullif(v_email, ''), v_old.email);
    v_name   := coalesce(nullif(v_name, ''), v_old.name);
    v_track  := coalesce(v_track, v_old.tech_track);
    v_study  := coalesce(v_study, v_old.study_type);
    v_status := coalesce(v_status, v_old.sheet_status);

    v_missing := array_remove(array[
      case when v_email is null then 'email' end,
      case when v_name  is null then 'name' end,
      case when v_track is null then 'tech_track' end,
      case when v_study is null then 'study_type' end], null);

    if cardinality(v_missing) > 0 then
      v_skipped := v_skipped + 1;
      if jsonb_array_length(v_incomplete) < 50 then
        v_incomplete := v_incomplete || jsonb_build_object(
          'qwasar_user_id', v_id, 'name', v_name, 'email', v_email, 'missing', to_jsonb(v_missing));
      end if;
      v_id := null;
      continue;
    end if;

    insert into qwasar.student_track as t
      (qwasar_user_id, email, name, tech_track, study_type, sheet_status, updated_at)
    values
      (v_id, v_email, v_name, v_track, v_study, v_status, now())
    on conflict (qwasar_user_id) do update
      set email        = excluded.email,
          name         = excluded.name,
          tech_track   = excluded.tech_track,
          study_type   = excluded.study_type,
          sheet_status = excluded.sheet_status,
          updated_at   = now();

    v_matched := v_matched + 1;
    v_id := null;
  end loop;

  return jsonb_build_object(
    'matched', v_matched,
    'skipped', v_skipped,
    'unmatched_count', jsonb_array_length(v_unmatched),
    'unmatched', v_unmatched,
    'incomplete_count', jsonb_array_length(v_incomplete),
    'incomplete', v_incomplete);
end;
$function$;

comment on function public.qwasar_student_track_upsert_v1(p_rows jsonb) is
  'Program assistant: daily sync of qwasar.student_track from the Student info sheet (service role only). Rows: name, email, status, tech_track (Fullstack|ML), study_type. Resolves qwasar_user_id by email, then unique name. Blank cells keep the stored value; rows still missing a required field are skipped and listed under incomplete.';
