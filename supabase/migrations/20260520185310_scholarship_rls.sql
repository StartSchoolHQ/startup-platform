-- Enable + FORCE RLS on both tables. No INSERT/UPDATE/DELETE policies —
-- all writes go through the SECURITY DEFINER RPCs in scholarship_rpcs_*.
-- The service_role bypasses RLS by design; the data facade uses it.

alter table scholarship_agreements enable row level security;
alter table scholarship_agreements force row level security;

alter table scholarship_agreement_events enable row level security;
alter table scholarship_agreement_events force row level security;

-- Admin SELECT policies are required for the admin page's Realtime channel
-- (postgres_changes events filter via RLS in the client). Service-role
-- bypass doesn't extend to the client-side realtime listener.
create policy "admin_select_agreements"
  on scholarship_agreements
  for select
  to authenticated
  using (
    exists (
      select 1
      from users u
      where u.id = auth.uid()
        and u.primary_role = 'admin'
    )
  );

create policy "admin_select_events"
  on scholarship_agreement_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from users u
      where u.id = auth.uid()
        and u.primary_role = 'admin'
    )
  );

-- Add to the Realtime publication so admin clients can subscribe to row
-- changes for the live-updating detail modal.
alter publication supabase_realtime add table scholarship_agreements;
alter publication supabase_realtime add table scholarship_agreement_events;
