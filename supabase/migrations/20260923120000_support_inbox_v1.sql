-- Support inbox: in-app support tickets + student task suggestions.
--
-- Replaces the Discord webhook. Purely additive: two tables, one RPC, one
-- private storage bucket. support_rate_limits and task_edit_suggestions
-- are untouched. Rollback (after reverting the app code):
--   drop function public.suggest_task_v1(uuid, text, text);
--   drop table public.task_suggestions;
--   drop table public.support_tickets;
--   delete from storage.objects where bucket_id = 'support-attachments';
--   delete from storage.buckets where id = 'support-attachments';
--   drop policy if exists support_attachments_owner_insert on storage.objects;
--   drop policy if exists support_attachments_owner_select on storage.objects;
--   drop policy if exists support_attachments_admin_select on storage.objects;

-- ---------------------------------------------------------------------------
-- support_tickets
-- ---------------------------------------------------------------------------
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  priority text not null check (priority in ('low', 'medium', 'high', 'critical')),
  category text not null check (length(category) between 1 and 50),
  title text not null check (length(title) between 1 and 100),
  description text not null check (length(description) between 10 and 2000),
  attachments jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open', 'resolved')),
  admin_note text,
  resolved_at timestamptz,
  resolved_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_tickets_status_created_idx
  on public.support_tickets (status, created_at desc);
create index support_tickets_user_idx on public.support_tickets (user_id);

comment on table public.support_tickets is
  'Student support tickets (replaced the Discord webhook 2026-09-23). Reviewed on /dashboard/admin/inbox.';

alter table public.support_tickets enable row level security;

create policy support_tickets_owner_insert on public.support_tickets
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy support_tickets_owner_select on public.support_tickets
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy support_tickets_admin_select on public.support_tickets
  for select to authenticated
  using (public.is_admin_v1());

create policy support_tickets_admin_update on public.support_tickets
  for update to authenticated
  using (public.is_admin_v1())
  with check (public.is_admin_v1());

-- ---------------------------------------------------------------------------
-- task_suggestions  (inserts only through suggest_task_v1 — no insert policy)
-- ---------------------------------------------------------------------------
create table public.task_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete restrict,
  title text not null check (length(title) between 5 and 80),
  description text not null check (length(description) between 10 and 300),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  admin_note text,
  reviewed_at timestamptz,
  reviewed_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index task_suggestions_status_created_idx
  on public.task_suggestions (status, created_at desc);
create index task_suggestions_user_created_idx
  on public.task_suggestions (user_id, created_at desc);

comment on table public.task_suggestions is
  'Student proposals for new My Journey tasks. Insert only via suggest_task_v1 (5 per user per 24h).';

alter table public.task_suggestions enable row level security;

create policy task_suggestions_owner_select on public.task_suggestions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy task_suggestions_admin_select on public.task_suggestions
  for select to authenticated
  using (public.is_admin_v1());

create policy task_suggestions_admin_update on public.task_suggestions
  for update to authenticated
  using (public.is_admin_v1())
  with check (public.is_admin_v1());

-- ---------------------------------------------------------------------------
-- suggest_task_v1
-- ---------------------------------------------------------------------------
create or replace function public.suggest_task_v1(
  p_achievement_id uuid,
  p_title text,
  p_description text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_title text := btrim(coalesce(p_title, ''));
  v_description text := btrim(coalesce(p_description, ''));
  v_limit constant int := 5;
  v_used int;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  if length(v_title) < 5 or length(v_title) > 80 then
    raise exception 'INVALID_TITLE' using errcode = '22023';
  end if;
  if length(v_description) < 10 or length(v_description) > 300 then
    raise exception 'INVALID_DESCRIPTION' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.achievements a
    where a.id = p_achievement_id
      and a.context = 'individual'
      and a.active = true
  ) then
    raise exception 'INVALID_PHASE' using errcode = '22023';
  end if;

  -- One student at a time, so two parallel requests cannot both pass the count.
  perform pg_advisory_xact_lock(hashtext('suggest_task:' || v_uid::text));

  select count(*) into v_used
  from public.task_suggestions s
  where s.user_id = v_uid
    and s.created_at > now() - interval '24 hours';

  if v_used >= v_limit then
    raise exception 'SUGGESTION_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  insert into public.task_suggestions (user_id, achievement_id, title, description)
  values (v_uid, p_achievement_id, v_title, v_description)
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'remaining_today', v_limit - v_used - 1
  );
end;
$$;

comment on function public.suggest_task_v1(uuid, text, text) is
  'Student proposes a new My Journey task. Validates, enforces 5 per rolling 24h, inserts into task_suggestions.';

revoke all on function public.suggest_task_v1(uuid, text, text) from public, anon;
grant execute on function public.suggest_task_v1(uuid, text, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Storage: private bucket for ticket attachments, path <user_id>/<ticket_id>/<file>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'support-attachments',
  'support-attachments',
  false,
  8388608,
  array[
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml',
    'text/plain', 'text/csv', 'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/x-log', 'application/octet-stream'
  ]
)
on conflict (id) do nothing;

create policy support_attachments_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'support-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy support_attachments_owner_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'support-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy support_attachments_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'support-attachments' and public.is_admin_v1());
