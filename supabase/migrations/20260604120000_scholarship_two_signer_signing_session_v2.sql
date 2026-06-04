-- Two-signer signing flow — V2 of scholarship_record_signing_session.
--
-- Root cause this fixes: the signing session was created with ONLY the
-- student as a signer. A single-signer Dokobit signing completes the instant
-- that signer signs, so the contract sealed as "all parties signed" with just
-- the student's signature; the school was bolted on afterwards via addSigner
-- (a race). We now place the school on the document AT CREATION as a
-- co-signer, which requires persisting its access token at session-create
-- time instead of after the student signs.
--
-- This V2 mirrors scholarship_record_signing_session exactly, plus it writes
-- dokobit_school_signer_token. The original function is left untouched for
-- rollback (revert the code to call it and the old addSigner webhook path).
create or replace function public.scholarship_record_signing_session_v2(
  p_id uuid,
  p_signing_token text,
  p_signer_token text,
  p_school_signer_token text,
  p_unsigned_pdf_path text
)
returns scholarship_agreements
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_row scholarship_agreements;
begin
  update scholarship_agreements
  set dokobit_signing_token       = p_signing_token,
      dokobit_signer_token        = p_signer_token,
      dokobit_school_signer_token = p_school_signer_token,
      unsigned_pdf_path           = p_unsigned_pdf_path,
      status                      = 'awaiting_student_signature'
  where id = p_id and status = 'identity_verified'
  returning * into v_row;

  if not found then
    raise exception 'scholarship_state_transition_denied'
      using detail = format('cannot record signing session on agreement %s', p_id);
  end if;

  insert into scholarship_agreement_events (agreement_id, event_type, payload)
  values (v_row.id, 'signing_created',
          jsonb_build_object('signing_token', p_signing_token));

  return v_row;
end;
$function$;
