-- Form autosave: private drafts for half-written task submissions.
--
-- Students lose half-written submissions when a modal closes or the tab
-- reloads. Drafts live in their own table so they never touch
-- task_progress.submission_data, which feeds the AI reviewer and the
-- reviewers' screens. One row per task_progress row (PK = progress_id).
--
-- Writes only through save_task_submission_draft_v1 (no insert/update
-- policy). Visibility in every RPC: an individual row owned by the caller,
-- or a team row of a team the caller is an active member of. Saving is
-- allowed only while the task is editable (not_started, in_progress,
-- rejected, revision_required); reading and deleting are allowed in any
-- status, so the client can clear a draft after submit. The `files` key is
-- stripped on save: uploaded files are not draft material.
--
-- Purely additive: no existing table, policy or function is touched.
--
-- Rollback:
--   drop function public.save_task_submission_draft_v1(uuid, jsonb),
--     public.get_task_submission_draft_v1(uuid),
--     public.delete_task_submission_draft_v1(uuid);
--   drop table public.task_submission_drafts;

-- 1. Table
create table public.task_submission_drafts (
  progress_id uuid primary key
    references public.task_progress (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  draft jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index task_submission_drafts_user_id_idx
  on public.task_submission_drafts (user_id);

alter table public.task_submission_drafts enable row level security;

create policy task_submission_drafts_owner_select
  on public.task_submission_drafts
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy task_submission_drafts_owner_delete
  on public.task_submission_drafts
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.task_submission_drafts from anon, authenticated;
grant select, delete on table public.task_submission_drafts to authenticated;

-- 2. save: upsert the caller's draft for a row they can see.
create or replace function public.save_task_submission_draft_v1(
  p_progress_id uuid,
  p_draft jsonb
)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_status task_status_type;
  v_updated_at timestamptz;
begin
  select tp.status into v_status
  from public.task_progress tp
  where tp.id = p_progress_id
    and ((tp.context = 'individual' and tp.user_id = auth.uid())
      or (tp.context = 'team' and exists (
        select 1 from public.team_members tm
        where tm.team_id = tp.team_id
          and tm.user_id = auth.uid()
          and tm.left_at is null)));

  if not found then
    raise exception 'task_draft_denied' using errcode = '42501';
  end if;

  if v_status not in
    ('not_started', 'in_progress', 'rejected', 'revision_required') then
    raise exception 'task_draft_status_locked' using errcode = '42501';
  end if;

  if p_draft is null or jsonb_typeof(p_draft) <> 'object' then
    raise exception 'task_draft_invalid' using errcode = '22023';
  end if;

  insert into public.task_submission_drafts (progress_id, user_id, draft)
  values (p_progress_id, auth.uid(), p_draft - 'files')
  on conflict (progress_id) do update
    set draft = excluded.draft,
        user_id = excluded.user_id,
        updated_at = now()
  returning updated_at into v_updated_at;

  return jsonb_build_object(
    'progress_id', p_progress_id,
    'updated_at', v_updated_at
  );
end;
$function$;

-- 3. get: the draft for a row the caller can see, or null.
create or replace function public.get_task_submission_draft_v1(
  p_progress_id uuid
)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_result jsonb;
begin
  if not exists (
    select 1 from public.task_progress tp
    where tp.id = p_progress_id
      and ((tp.context = 'individual' and tp.user_id = auth.uid())
        or (tp.context = 'team' and exists (
          select 1 from public.team_members tm
          where tm.team_id = tp.team_id
            and tm.user_id = auth.uid()
            and tm.left_at is null)))
  ) then
    raise exception 'task_draft_denied' using errcode = '42501';
  end if;

  select jsonb_build_object('draft', d.draft, 'updated_at', d.updated_at)
    into v_result
  from public.task_submission_drafts d
  where d.progress_id = p_progress_id;

  return v_result;
end;
$function$;

-- 4. delete: drop the draft for a row the caller can see (any status).
create or replace function public.delete_task_submission_draft_v1(
  p_progress_id uuid
)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_count integer;
begin
  if not exists (
    select 1 from public.task_progress tp
    where tp.id = p_progress_id
      and ((tp.context = 'individual' and tp.user_id = auth.uid())
        or (tp.context = 'team' and exists (
          select 1 from public.team_members tm
          where tm.team_id = tp.team_id
            and tm.user_id = auth.uid()
            and tm.left_at is null)))
  ) then
    raise exception 'task_draft_denied' using errcode = '42501';
  end if;

  delete from public.task_submission_drafts
  where progress_id = p_progress_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

-- 5. Grants
revoke all on function public.save_task_submission_draft_v1(uuid, jsonb)
  from public, anon;
grant execute on function public.save_task_submission_draft_v1(uuid, jsonb)
  to authenticated, service_role;

revoke all on function public.get_task_submission_draft_v1(uuid)
  from public, anon;
grant execute on function public.get_task_submission_draft_v1(uuid)
  to authenticated, service_role;

revoke all on function public.delete_task_submission_draft_v1(uuid)
  from public, anon;
grant execute on function public.delete_task_submission_draft_v1(uuid)
  to authenticated, service_role;
