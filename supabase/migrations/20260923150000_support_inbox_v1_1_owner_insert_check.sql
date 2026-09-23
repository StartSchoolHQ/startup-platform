-- Tighten the student insert on support_tickets: a ticket always starts
-- open, with no admin fields set. Rollback: recreate the policy with only
--   with check ((select auth.uid()) = user_id)
drop policy support_tickets_owner_insert on public.support_tickets;
create policy support_tickets_owner_insert on public.support_tickets
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'open'
    and admin_note is null
    and resolved_at is null
    and resolved_by_user_id is null
  );
