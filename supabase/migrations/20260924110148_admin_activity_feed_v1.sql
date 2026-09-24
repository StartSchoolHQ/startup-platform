-- Admin activity feed v1: one read RPC that unions curated events from the
-- tables where things actually happen (task_progress, ai_task_reviews,
-- transactions, team_strikes, client_meetings, weekly_reports,
-- user_achievements, support_tickets, task_suggestions, assistant_threads)
-- plus the few audit_log rows that matter (account + team membership).
-- Replaces the audit_log-only reader behind /dashboard/admin/audit-logs.
-- Additive. Also hides test accounts from get_users_for_filter.
-- Rollback recipe: CLAUDE.md → "2026-09-24 — Admin activity feed".

create or replace function public.get_admin_activity_v1(
  p_user_id uuid default null,
  p_kinds text[] default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit int default 50,
  p_offset int default 0)
returns table (
  id text,
  occurred_at timestamptz,
  kind text,
  subject_user_id uuid,
  subject_name text,
  actor_user_id uuid,
  actor_name text,
  team_name text,
  object_title text,
  amount_xp int,
  amount_points int,
  status text,
  detail text,
  ref_id uuid,
  extra jsonb)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin_v1() then
    raise exception 'Unauthorized: Admin access required' using errcode = '42501';
  end if;

  return query
  with ev (id, occurred_at, kind, subject_user_id, actor_user_id, team_id,
           object_title, amount_xp, amount_points, status, detail, ref_id, extra) as (
    -- tasks: started
    select 'tp_start:' || tp.id::text, tp.started_at, 'task_started',
           coalesce(tp.user_id, tp.assigned_to_user_id), null::uuid, tp.team_id,
           t.title, null::int, null::int, null::text, null::text, tp.task_id, '{}'::jsonb
    from public.task_progress tp join public.tasks t on t.id = tp.task_id
    where tp.started_at is not null
    union all
    -- tasks: submitted
    select 'tp_submit:' || tp.id::text, tp.submitted_at, 'task_submitted',
           coalesce(tp.user_id, tp.assigned_to_user_id), null, tp.team_id,
           t.title, null, null, null, null, tp.task_id, '{}'::jsonb
    from public.task_progress tp join public.tasks t on t.id = tp.task_id
    where tp.submitted_at is not null
    union all
    -- tasks: peer-review outcome (team tasks; solo outcomes come from ai_task_reviews)
    select 'tp_review:' || tp.id::text, coalesce(tp.completed_at, tp.updated_at),
           case when tp.status = 'approved' then 'task_approved' else 'task_rejected' end,
           coalesce(tp.user_id, tp.assigned_to_user_id), tp.reviewer_user_id, tp.team_id,
           t.title, case when tp.status = 'approved' then tp.points_awarded end, null,
           tp.status::text, tp.review_feedback, tp.task_id, '{}'::jsonb
    from public.task_progress tp join public.tasks t on t.id = tp.task_id
    where tp.status in ('approved', 'rejected') and tp.activity_type <> 'individual'
    union all
    -- tasks: AI review attempts (solo)
    select 'ai:' || r.id::text, coalesce(r.finished_at, r.updated_at),
           case when r.decision then 'task_approved' else 'task_rejected' end,
           r.user_id, null, null, t.title,
           case when r.decision then t.base_xp_reward end, null,
           r.decided_by, r.feedback, r.task_id,
           jsonb_build_object('attempt', r.attempt, 'decided_by', r.decided_by)
    from public.ai_task_reviews r join public.tasks t on t.id = r.task_id
    where r.decision is not null
    union all
    -- XP ledger
    select 'tx:' || x.id::text, x.created_at, 'xp', x.user_id, x.validated_by_user_id, x.team_id,
           coalesce(t.title, a.name), x.xp_change, x.points_change, x.type::text, x.description,
           coalesce(x.task_id, x.achievement_id),
           jsonb_build_object('economy', case when x.activity_type = 'individual' then 'my_journey' else 'team' end,
                              'type', x.type)
    from public.transactions x
    left join public.tasks t on t.id = x.task_id
    left join public.achievements a on a.id = x.achievement_id
    where x.user_id is not null
    union all
    -- strikes
    select 'strike:' || s.id::text, s.created_at, 'strike_issued', s.user_id, null, s.team_id,
           s.title, -s.xp_penalty, -s.points_penalty, s.status::text, s.description, s.id, '{}'::jsonb
    from public.team_strikes s
    union all
    select 'strike_expl:' || s.id::text, s.explained_at, 'strike_explained', s.user_id, s.explained_by_user_id, s.team_id,
           s.title, null, null, s.status::text, s.explanation, s.id, '{}'::jsonb
    from public.team_strikes s where s.explained_at is not null
    union all
    select 'strike_res:' || s.id::text, s.resolved_at, 'strike_resolved', s.user_id, s.resolved_by_user_id, s.team_id,
           s.title, null, null, s.status::text, null, s.id, '{}'::jsonb
    from public.team_strikes s where s.resolved_at is not null
    union all
    -- client meetings
    select 'meet:' || m.id::text, coalesce(m.completed_at, m.created_at), 'meeting_logged',
           m.responsible_user_id, null, m.team_id, m.client_name, null, null, m.status::text,
           m.how_it_went, m.id, jsonb_build_object('client_type', m.client_type, 'call_type', m.call_type)
    from public.client_meetings m where m.deleted_at is null and m.responsible_user_id is not null
    union all
    -- weekly reports
    select 'wr:' || w.id::text, coalesce(w.submitted_at, w.updated_at), 'weekly_report', w.user_id, null, w.team_id,
           null, null, null, w.context, null, w.id,
           jsonb_build_object('week_number', w.week_number, 'week_year', w.week_year)
    from public.weekly_reports w where w.status = 'submitted'
    union all
    -- phase achievements
    select 'ach:' || ua.id::text, coalesce(ua.completed_at, ua.created_at), 'achievement', ua.user_id, null, null,
           a.name, ua.xp_awarded, ua.points_awarded, null, null, ua.achievement_id, '{}'::jsonb
    from public.user_achievements ua join public.achievements a on a.id = ua.achievement_id
    union all
    -- support tickets
    select 'ticket:' || st.id::text, st.created_at, 'ticket', st.user_id, null, null, st.title, null, null,
           st.status, st.description, st.id, jsonb_build_object('priority', st.priority, 'category', st.category)
    from public.support_tickets st
    union all
    select 'ticket_res:' || st.id::text, st.resolved_at, 'ticket_resolved', st.user_id, st.resolved_by_user_id, null,
           st.title, null, null, st.status, st.admin_note, st.id, '{}'::jsonb
    from public.support_tickets st where st.resolved_at is not null
    union all
    -- task suggestions
    select 'sug:' || sg.id::text, sg.created_at, 'suggestion', sg.user_id, null, null, sg.title, null, null,
           sg.status, sg.description, sg.id, '{}'::jsonb
    from public.task_suggestions sg
    union all
    select 'sug_rev:' || sg.id::text, sg.reviewed_at, 'suggestion_reviewed', sg.user_id, sg.reviewed_by_user_id, null,
           sg.title, null, null, sg.status, sg.admin_note, sg.id, '{}'::jsonb
    from public.task_suggestions sg where sg.reviewed_at is not null
    union all
    -- Startie
    select 'chat:' || th.id::text, th.created_at, 'startie_chat', th.user_id, null, null, th.title, null, null,
           null, null, th.id, '{}'::jsonb
    from public.assistant_threads th
    union all
    -- accounts (audit_log, only the rows that mean something)
    select 'audit:' || al.id::text, al.created_at, 'account_joined', al.record_id, al.changed_by_user_id, null,
           null, null, null, null, null, al.record_id, '{}'::jsonb
    from public.audit_log al where al.table_name = 'users' and al.action = 'INSERT'
    union all
    select 'audit:' || al.id::text, al.created_at,
           case when 'status' = any(al.changed_fields) then 'account_status'
                when 'primary_role' = any(al.changed_fields) then 'account_role'
                when 'batch_id' = any(al.changed_fields) then 'account_batch'
                else 'account_name' end,
           al.record_id, al.changed_by_user_id, null,
           (select b.name from public.diploma_batches b where b.id = (al.new_data->>'batch_id')::uuid),
           null, null, coalesce(al.new_data->>'status', al.new_data->>'primary_role'), null, al.record_id,
           jsonb_build_object('old_name', al.old_data->>'name')
    from public.audit_log al
    where al.table_name = 'users' and al.action = 'UPDATE'
      and al.changed_fields && array['status', 'primary_role', 'batch_id', 'name']::text[]
    union all
    select 'audit:' || al.id::text, al.created_at, 'team_joined', (al.new_data->>'user_id')::uuid,
           al.changed_by_user_id, (al.new_data->>'team_id')::uuid, null, null, null, null, null,
           (al.new_data->>'team_id')::uuid, '{}'::jsonb
    from public.audit_log al where al.table_name = 'team_members' and al.action = 'INSERT'
    union all
    select 'audit:' || al.id::text, al.created_at, 'team_left', (al.new_data->>'user_id')::uuid,
           al.changed_by_user_id, (al.new_data->>'team_id')::uuid, null, null, null, null, null,
           (al.new_data->>'team_id')::uuid, '{}'::jsonb
    from public.audit_log al
    where al.table_name = 'team_members' and al.action = 'UPDATE'
      and al.new_data->>'left_at' is not null and al.old_data->>'left_at' is null
  )
  select e.id, e.occurred_at, e.kind, e.subject_user_id,
         coalesce(nullif(btrim(su.name), ''), split_part(su.email, '@', 1)),
         e.actor_user_id, coalesce(nullif(btrim(au.name), ''), split_part(au.email, '@', 1)),
         tm.name, e.object_title, e.amount_xp, e.amount_points, e.status, e.detail, e.ref_id, e.extra
  from ev e
  join public.users su on su.id = e.subject_user_id
  left join public.users au on au.id = e.actor_user_id
  left join public.teams tm on tm.id = e.team_id
  where e.occurred_at is not null
    and su.email not like 'test\_%@test.local'
    and (tm.id is null or tm.name not like '[TEST]%')
    and (p_user_id is null or e.subject_user_id = p_user_id)
    and (p_kinds is null or e.kind = any(p_kinds))
    and (p_from is null or e.occurred_at >= p_from)
    and (p_to is null or e.occurred_at <= p_to)
  order by e.occurred_at desc
  limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset);
end
$$;

revoke all on function public.get_admin_activity_v1(uuid, text[], timestamptz, timestamptz, int, int) from public, anon;
grant execute on function public.get_admin_activity_v1(uuid, text[], timestamptz, timestamptz, int, int) to authenticated, service_role;

-- Same signature and behaviour, minus Vitest's test_*@test.local accounts.
create or replace function public.get_users_for_filter(p_include_archived boolean default false)
returns table (id uuid, name text, email text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.users u where u.id = auth.uid() and u.primary_role = 'admin') then
    raise exception 'Unauthorized: Admin access required';
  end if;
  return query
    select u.id, u.name, u.email from public.users u
    where (p_include_archived or u.status = 'active')
      and u.email not like 'test\_%@test.local'
    order by u.name;
end
$$;
