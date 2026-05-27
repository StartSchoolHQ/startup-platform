-- Add p_module_track to scholarship_submit_form. The CHECK constraint on
-- scholarship_agreements guarantees consistency between agreement_type and
-- module_track; the RPC just forwards the value through.

create or replace function scholarship_submit_form(
  p_type               scholarship_agreement_type,
  p_email              text,
  p_phone              text,
  p_address            text,
  p_language           scholarship_agreement_language,
  p_dokobit_auth_token text,
  p_expires_at         timestamptz,
  p_module_track       scholarship_module_track default null
)
returns scholarship_agreements
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_row scholarship_agreements;
begin
  insert into scholarship_agreements (
    agreement_type, recipient_email, recipient_phone, recipient_address,
    language, dokobit_auth_token, expires_at, status, module_track
  ) values (
    p_type, p_email, p_phone, p_address,
    p_language, p_dokobit_auth_token, p_expires_at, 'draft', p_module_track
  )
  returning * into v_row;

  insert into scholarship_agreement_events (agreement_id, event_type, payload)
  values (v_row.id, 'form_submitted', jsonb_build_object('email', p_email));
  insert into scholarship_agreement_events (agreement_id, event_type)
  values (v_row.id, 'identity_started');

  return v_row;
end;
$$;

revoke execute on function scholarship_submit_form(
  scholarship_agreement_type, text, text, text,
  scholarship_agreement_language, text, timestamptz, scholarship_module_track
) from public, anon, authenticated;
grant execute on function scholarship_submit_form(
  scholarship_agreement_type, text, text, text,
  scholarship_agreement_language, text, timestamptz, scholarship_module_track
) to service_role;
