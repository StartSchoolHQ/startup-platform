-- Startie student assistant v1: threads, messages, settings row, RPCs.
-- Additive only. Spec: docs/internal/superpowers/specs/2026-09-24-startie-assistant-design.md
-- Rollback recipe: CLAUDE.md → "2026-09-24 — Startie student assistant".

create table public.assistant_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  page_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assistant_threads_user_updated_idx
  on public.assistant_threads (user_id, updated_at desc);

create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.assistant_threads(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system_note')),
  content text not null,
  model text,
  input_tokens integer,
  cached_tokens integer,
  output_tokens integer,
  cost_usd numeric(10, 5),
  prompt_version text,
  flagged_message_id uuid references public.assistant_messages(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index assistant_messages_user_day_idx
  on public.assistant_messages (user_id, created_at desc) where role = 'user';
create index assistant_messages_thread_idx
  on public.assistant_messages (thread_id, created_at);
create unique index assistant_messages_flag_once_idx
  on public.assistant_messages (flagged_message_id) where role = 'system_note';

alter table public.assistant_threads enable row level security;
alter table public.assistant_messages enable row level security;

create policy assistant_threads_owner_select on public.assistant_threads
  for select to authenticated using (user_id = auth.uid());
create policy assistant_threads_admin_select on public.assistant_threads
  for select to authenticated using (public.is_admin_v1());
create policy assistant_messages_owner_select on public.assistant_messages
  for select to authenticated using (user_id = auth.uid());
create policy assistant_messages_admin_select on public.assistant_messages
  for select to authenticated using (public.is_admin_v1());
-- No insert/update/delete policies on purpose: writes go through the RPCs
-- below (SECURITY DEFINER) and the service role only.

grant select on public.assistant_threads, public.assistant_messages to authenticated;
grant all on public.assistant_threads, public.assistant_messages to service_role;

insert into public.platform_settings (key, value)
values ('assistant', jsonb_build_object(
  'enabled', false,
  'model', 'gpt-5.4-mini',
  'daily_limit', 25,
  'history_turns', 10,
  'reasoning_effort', 'low'))
on conflict (key) do nothing;

-- Inserts the student's message under a per-user advisory lock and enforces
-- the daily limit (calendar day, UTC). Admins are exempt. Does NOT check
-- `enabled` — the API route does, so tests never need to flip the live switch.
create or replace function public.assistant_send_message_v1(
  p_thread_id uuid, p_content text, p_page_context jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_content text := btrim(coalesce(p_content, ''));
  v_limit int;
  v_used int := 0;
  v_is_admin boolean;
  v_thread uuid := p_thread_id;
  v_msg uuid;
  v_day_start timestamptz :=
    (date_trunc('day', now() at time zone 'utc')) at time zone 'utc';
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  if length(v_content) < 1 or length(v_content) > 2000 then
    raise exception 'INVALID_CONTENT' using errcode = '22023';
  end if;

  select coalesce((value->>'daily_limit')::int, 25) into v_limit
  from public.platform_settings where key = 'assistant';
  v_limit := coalesce(v_limit, 25);
  v_is_admin := public.is_admin_v1();

  perform pg_advisory_xact_lock(hashtext('assistant:' || v_uid::text));

  if not v_is_admin then
    select count(*) into v_used
    from public.assistant_messages m
    where m.user_id = v_uid
      and m.role = 'user'
      and m.created_at >= v_day_start;
    if v_used >= v_limit then
      raise exception 'ASSISTANT_LIMIT_REACHED' using errcode = 'P0001';
    end if;
  end if;

  if v_thread is null then
    insert into public.assistant_threads (user_id, title, page_context)
    values (v_uid, left(v_content, 80), coalesce(p_page_context, '{}'::jsonb))
    returning id into v_thread;
  elsif not exists (
    select 1 from public.assistant_threads t
    where t.id = v_thread and t.user_id = v_uid
  ) then
    raise exception 'THREAD_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.assistant_messages (thread_id, user_id, role, content)
  values (v_thread, v_uid, 'user', v_content)
  returning id into v_msg;

  update public.assistant_threads set updated_at = now() where id = v_thread;

  return jsonb_build_object(
    'thread_id', v_thread,
    'message_id', v_msg,
    'remaining_today',
      case when v_is_admin then null else v_limit - v_used - 1 end
  );
end
$$;

-- Thumbs-down on one of Startie's replies. One system_note per reply.
create or replace function public.assistant_flag_message_v1(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_thread uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  select m.thread_id into v_thread
  from public.assistant_messages m
  join public.assistant_threads t on t.id = m.thread_id
  where m.id = p_message_id and m.role = 'assistant' and t.user_id = v_uid;
  if v_thread is null then
    raise exception 'MESSAGE_NOT_FOUND' using errcode = 'P0002';
  end if;
  insert into public.assistant_messages
    (thread_id, user_id, role, content, flagged_message_id)
  values (v_thread, v_uid, 'system_note', 'flagged', p_message_id)
  on conflict do nothing;
end
$$;

-- Admin stats strip. NULL for non-admins.
create or replace function public.get_assistant_admin_stats_v1()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case when not public.is_admin_v1() then null else jsonb_build_object(
    'messages_today', (
      select count(*) from public.assistant_messages
      where role = 'user'
        and created_at >= (date_trunc('day', now() at time zone 'utc')) at time zone 'utc'),
    'cost_month_usd', (
      select coalesce(sum(cost_usd), 0) from public.assistant_messages
      where role = 'assistant' and created_at >= date_trunc('month', now())),
    'cache_hit_rate', (
      select case when coalesce(sum(input_tokens), 0) = 0 then null
        else round(sum(cached_tokens)::numeric / sum(input_tokens), 3) end
      from public.assistant_messages where role = 'assistant'),
    'avg_output_tokens', (
      select round(avg(output_tokens)) from public.assistant_messages
      where role = 'assistant'),
    'threads_total', (select count(*) from public.assistant_threads),
    'flagged_total', (
      select count(*) from public.assistant_messages where role = 'system_note')
  ) end;
$$;

-- Admin thread list with per-thread aggregates. Empty for non-admins.
create or replace function public.get_assistant_admin_threads_v1(
  p_flagged_only boolean default false,
  p_user_id uuid default null,
  p_limit int default 50,
  p_offset int default 0)
returns table (
  id uuid,
  user_id uuid,
  student_name text,
  student_avatar text,
  title text,
  message_count bigint,
  flagged_count bigint,
  cost_usd numeric,
  created_at timestamptz,
  updated_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select t.id, t.user_id, u.name, u.avatar_url, t.title,
    count(m.id) filter (where m.role in ('user', 'assistant')),
    count(m.id) filter (where m.role = 'system_note'),
    coalesce(sum(m.cost_usd), 0),
    t.created_at, t.updated_at
  from public.assistant_threads t
  join public.users u on u.id = t.user_id
  left join public.assistant_messages m on m.thread_id = t.id
  where public.is_admin_v1()
    and (p_user_id is null or t.user_id = p_user_id)
  group by t.id, u.name, u.avatar_url
  having (not p_flagged_only
          or count(m.id) filter (where m.role = 'system_note') > 0)
  order by t.updated_at desc
  limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset);
$$;

revoke all on function public.assistant_send_message_v1(uuid, text, jsonb) from public, anon;
revoke all on function public.assistant_flag_message_v1(uuid) from public, anon;
revoke all on function public.get_assistant_admin_stats_v1() from public, anon;
revoke all on function public.get_assistant_admin_threads_v1(boolean, uuid, int, int) from public, anon;
grant execute on function public.assistant_send_message_v1(uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.assistant_flag_message_v1(uuid) to authenticated, service_role;
grant execute on function public.get_assistant_admin_stats_v1() to authenticated, service_role;
grant execute on function public.get_assistant_admin_threads_v1(boolean, uuid, int, int) to authenticated, service_role;
