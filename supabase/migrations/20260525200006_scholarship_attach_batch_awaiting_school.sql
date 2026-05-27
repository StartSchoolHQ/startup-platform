-- scholarship_attach_batch was gated on status = 'student_signed', but the
-- webhook eagerly promotes rows to 'awaiting_school_signature' as soon as
-- it adds the school signer via addSigner. After this alignment, attach
-- runs on rows already in 'awaiting_school_signature' and just records
-- the batch_token — the state transition is a no-op.

create or replace function scholarship_attach_batch(
  p_ids         uuid[],
  p_batch_token text
)
returns int
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_count int;
begin
  update scholarship_agreements
  set dokobit_batch_token = p_batch_token
  where id = any (p_ids)
    and status = 'awaiting_school_signature';
  get diagnostics v_count = row_count;

  insert into scholarship_agreement_events (agreement_id, event_type, payload)
  select id, 'school_signer_added',
         jsonb_build_object('batch_token', p_batch_token)
  from scholarship_agreements
  where dokobit_batch_token = p_batch_token;

  return v_count;
end;
$$;

revoke execute on function scholarship_attach_batch(uuid[], text)
  from public, anon, authenticated;
grant execute on function scholarship_attach_batch(uuid[], text) to service_role;
