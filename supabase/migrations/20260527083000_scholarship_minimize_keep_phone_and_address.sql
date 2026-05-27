-- Update post-archive data minimization to KEEP recipient_phone and
-- recipient_address. Personal code, country code, Dokobit tokens, and
-- the unsigned PDF path are still NULL'd. Phone + address retained for
-- operational reasons (post-signing communication, address records).
--
-- The `v_already_minimized` detection signal is updated to use only
-- `signer_personal_code is null` since phone/address are no longer NULL'd
-- by this function.
--
-- Rollback: re-apply the prior body which also sets
--   recipient_phone = null, recipient_address = null
-- inside the UPDATE, and adds them back to the v_already_minimized check.

CREATE OR REPLACE FUNCTION public.scholarship_minimize_archived(p_id uuid)
RETURNS scholarship_agreements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_row scholarship_agreements;
  v_already_minimized boolean;
begin
  select * into v_row from scholarship_agreements where id = p_id;
  if not found then
    raise exception 'scholarship_not_found';
  end if;
  if v_row.status <> 'archived' then
    raise exception 'scholarship_minimize_requires_archived_status';
  end if;

  -- Detect rerun: signer_personal_code is the only field that's both
  -- always-populated pre-minimization and always-NULL'd by this function,
  -- so it's the most reliable rerun signal now that phone/address are
  -- retained.
  v_already_minimized := v_row.signer_personal_code is null;

  update scholarship_agreements
  set signer_personal_code        = null,
      signer_country_code         = null,
      dokobit_auth_token          = null,
      dokobit_signing_token       = null,
      dokobit_signer_token        = null,
      dokobit_school_signer_token = null,
      dokobit_batch_token         = null,
      unsigned_pdf_path           = null
  where id = p_id
  returning * into v_row;

  -- Redact every existing event payload for this agreement.
  update scholarship_agreement_events
  set payload = null
  where agreement_id = p_id
    and payload is not null;

  if not v_already_minimized then
    insert into scholarship_agreement_events (agreement_id, event_type)
    values (p_id, 'data_minimized');
  end if;

  return v_row;
end;
$function$;
