-- ============================================================
-- scholarship_submit_form
-- Creates the draft row from student form data + the Dokobit session
-- token returned from createAuthSession (called server-side first).
-- The Dokobit session token IS the row's correlation key through the
-- identity callback — no separate access_token in the URL.
-- ============================================================
create or replace function scholarship_submit_form(
  p_type               scholarship_agreement_type,
  p_email              text,
  p_phone              text,
  p_address            text,
  p_language           scholarship_agreement_language,
  p_dokobit_auth_token text,
  p_expires_at         timestamptz
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
    language, dokobit_auth_token, expires_at, status
  ) values (
    p_type, p_email, p_phone, p_address,
    p_language, p_dokobit_auth_token, p_expires_at, 'draft'
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
  scholarship_agreement_language, text, timestamptz
) from public, anon, authenticated;
grant execute on function scholarship_submit_form(
  scholarship_agreement_type, text, text, text,
  scholarship_agreement_language, text, timestamptz
) to service_role;

-- ============================================================
-- scholarship_record_identity
-- Locks identity after Dokobit eID. Rejects mismatched personal codes
-- on retry attempts. The unique partial index on (signer_personal_code,
-- agreement_type) WHERE NOT NULL also prevents cross-program cheating
-- by raising a unique-violation on the INSERT attempt from a second
-- agreement_type for the same person.
-- ============================================================
create or replace function scholarship_record_identity(
  p_dokobit_auth_token text,
  p_personal_code      text,
  p_country_code       text,
  p_name               text,
  p_surname            text
)
returns scholarship_agreements
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_row scholarship_agreements;
begin
  select * into v_row from scholarship_agreements
  where dokobit_auth_token = p_dokobit_auth_token;
  if not found then
    raise exception 'scholarship_not_found';
  end if;

  -- If identity is already locked on THIS row, reject mismatched person.
  if v_row.signer_personal_code is not null
     and v_row.signer_personal_code <> p_personal_code then
    insert into scholarship_agreement_events (agreement_id, event_type, payload)
    values (
      v_row.id, 'identity_mismatch',
      jsonb_build_object(
        'attempted_personal_code', p_personal_code,
        'locked_personal_code', v_row.signer_personal_code
      )
    );
    raise exception 'scholarship_identity_mismatch';
  end if;

  update scholarship_agreements
  set signer_personal_code = p_personal_code,
      signer_country_code  = p_country_code,
      signer_name          = p_name,
      signer_surname       = p_surname,
      identity_verified_at = coalesce(identity_verified_at, now()),
      status               = case
        when status = 'draft' then 'identity_verified'
        else status
      end
  where id = v_row.id
  returning * into v_row;

  insert into scholarship_agreement_events (agreement_id, event_type, payload)
  values (
    v_row.id, 'identity_verified',
    jsonb_build_object('personal_code', p_personal_code, 'country_code', p_country_code)
  );

  return v_row;
end;
$$;

revoke execute on function scholarship_record_identity(text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function scholarship_record_identity(text, text, text, text, text)
  to service_role;
