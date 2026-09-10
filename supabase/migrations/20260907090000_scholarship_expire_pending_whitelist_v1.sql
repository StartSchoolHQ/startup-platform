-- 2026-09-07: scholarship_expire_pending() used a blacklist of terminal
-- statuses that was never extended when dropped_out / terminated_by_school
-- were added (2026-08-31). Signed agreements all carry a long-past
-- expires_at (the Dokobit signing deadline), so any archived row moved to an
-- outcome status was expired by the nightly cron (job 8, 02:00 UTC) the next
-- day. Fix: whitelist — only pre-signature rows can ever expire.
-- Pre-fix body kept as scholarship_expire_pending_backup_v1() (applied via
-- MCP migration `scholarship_expire_pending_backup_v1`).
create or replace function scholarship_expire_pending()
returns int
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_count int;
begin
  with expired as (
    update scholarship_agreements
    set status = 'expired'
    where (
      (status = 'draft' and created_at < now() - interval '1 day')
      or (
        expires_at < now()
        and status in (
          'draft',
          'identity_verified',
          'awaiting_student_signature',
          'student_signed',
          'awaiting_school_signature'
        )
      )
    )
    returning id
  ),
  inserted as (
    insert into scholarship_agreement_events (agreement_id, event_type)
    select id, 'expired'::scholarship_event_type from expired
    returning agreement_id
  )
  select count(*) into v_count from inserted;
  return v_count;
end;
$$;
