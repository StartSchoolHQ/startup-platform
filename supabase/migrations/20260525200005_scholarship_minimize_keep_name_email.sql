-- Relax post-archive minimization: keep signer_name, signer_surname, and
-- recipient_email so the admin queue can list / search / filter archived
-- contracts by the human-identifying fields. Everything else (phone,
-- address, personal code, country code, every Dokobit token, the unsigned
-- PDF path) is still nulled.
--
-- The privacy notice and `docs/documentation/scholarship-agreements.md`
-- retention sections are updated in the same change to reflect this.

create or replace function scholarship_minimize_archived(p_id uuid)
returns scholarship_agreements
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
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

  -- Detect rerun: if the deeper PII (phone, address, personal_code) is
  -- already null, we've been here. signer_name / recipient_email are now
  -- retained so they can't be used as the "already minimized" signal.
  v_already_minimized :=
    v_row.recipient_phone is null
    and v_row.recipient_address is null
    and v_row.signer_personal_code is null;

  update scholarship_agreements
  set recipient_phone             = null,
      recipient_address           = null,
      signer_personal_code        = null,
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
$$;

revoke execute on function scholarship_minimize_archived(uuid)
  from public, anon, authenticated;
grant execute on function scholarship_minimize_archived(uuid) to service_role;
