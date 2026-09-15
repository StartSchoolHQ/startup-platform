-- Security hardening v1 (2026-09-15) — from the Supabase security advisor.
--
-- 1. anon_security_definer_function_executable (134 findings): Supabase's
--    default privileges hand EXECUTE on every new function to anon,
--    authenticated and service_role. Nothing public calls RPCs with the anon
--    key (scholarship pages go through the service role server-side), so
--    anon/PUBLIC lose EXECUTE on every SECURITY DEFINER function in public.
--    authenticated / service_role keep exactly the access they had (re-granted
--    explicitly where it came from PUBLIC). Default privileges are changed so
--    future functions never get anon/PUBLIC EXECUTE.
-- 2. function_search_path_mutable (19 findings): pin search_path on every
--    public function that has none. Pure hardening, no behaviour change.
--
-- Rollback: `grant execute on function public.<fn>(args) to anon` per
-- function (list them from the advisor findings in git history of this file),
-- `alter default privileges in schema public grant execute on functions to
-- anon`; search_path pins can stay.

-- ---------------------------------------------------------- 1. anon revoke
do $$
declare r record;
begin
  for r in
    select p.oid, p.proname,
           pg_get_function_identity_arguments(p.oid) as args,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_ok,
           has_function_privilege('service_role', p.oid, 'EXECUTE') as svc_ok
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prokind = 'f'
      and p.prosecdef
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  loop
    execute format('revoke execute on function public.%I(%s) from public, anon', r.proname, r.args);
    if r.auth_ok then
      execute format('grant execute on function public.%I(%s) to authenticated', r.proname, r.args);
    end if;
    if r.svc_ok then
      execute format('grant execute on function public.%I(%s) to service_role', r.proname, r.args);
    end if;
  end loop;
end $$;

alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon;

-- ------------------------------------------------------ 2. search_path pin
do $$
declare r record;
begin
  for r in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prokind = 'f'
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c
        where c like 'search_path=%'
      )
  loop
    execute format('alter function public.%I(%s) set search_path = public, pg_temp', r.proname, r.args);
  end loop;
end $$;

-- ------------------------------- 3. functions evaluated inside RLS policies
-- A policy body runs as the querying role, so a helper it calls must stay
-- executable by anon or the whole SELECT errors ("permission denied for
-- function …") instead of returning zero rows. Re-grant anon on exactly those.
-- Today that is one function: user_can_see_confidential_tasks, used by the
-- task_progress policy "Users can view team tasks (respecting confidential)".
do $$
declare r record;
begin
  for r in
    select distinct p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_policies pol
    join pg_proc p on p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
    where pol.schemaname = 'public'
      and pol.roles::text[] && array['public','anon']
      and (coalesce(pol.qual,'') ~ ('\m' || p.proname || '\s*\(')
           or coalesce(pol.with_check,'') ~ ('\m' || p.proname || '\s*\('))
  loop
    execute format('grant execute on function public.%I(%s) to anon', r.proname, r.args);
  end loop;
end $$;
