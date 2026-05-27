-- scholarship_record_identity now handles the "same person retries" case.
--
-- Before:
--   - The unique partial index on (signer_personal_code, agreement_type)
--     raised a Postgres-level unique violation on UPDATE.
--   - The TS caller surfaced this as "this link belongs to another person",
--     which is misleading when it's actually the SAME person.
--
-- After:
--   - Look up other in-flight rows for this (personal_code, agreement_type).
--   - If one is already signed (student_signed → archived), raise
--     'scholarship_already_signed' so the page can show
--     "You've already signed this agreement, check your inbox".
--   - If one is in a pre-signed state (draft / identity_verified /
--     awaiting_student_signature), cancel it as 'superseded_by_retry' so
--     the new attempt can take over the unique-index slot.
--   - The existing genuine cross-person collision (different personal code
--     on THIS row) still raises 'scholarship_identity_mismatch'.

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
  v_row   scholarship_agreements;
  v_other scholarship_agreements;
begin
  select * into v_row from scholarship_agreements
  where dokobit_auth_token = p_dokobit_auth_token;
  if not found then
    raise exception 'scholarship_not_found';
  end if;

  -- If identity is already locked on THIS row, reject mismatched person.
  -- This is the genuine "someone else's link" case.
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

  -- Same-person retry detection. Look for another active row with this
  -- (personal_code, agreement_type) that's NOT this one.
  select * into v_other from scholarship_agreements
  where signer_personal_code = p_personal_code
    and agreement_type = v_row.agreement_type
    and id <> v_row.id
    and status not in ('cancelled', 'expired', 'failed')
  limit 1;

  if found then
    if v_other.status in (
      'student_signed', 'awaiting_school_signature',
      'school_signed', 'archived'
    ) then
      -- Already signed (or in the middle of signing) — block the retry.
      insert into scholarship_agreement_events (agreement_id, event_type, payload)
      values (
        v_row.id, 'identity_mismatch',
        jsonb_build_object(
          'reason', 'already_signed_elsewhere',
          'other_row_id', v_other.id,
          'other_status', v_other.status
        )
      );
      raise exception 'scholarship_already_signed';
    end if;

    -- Pre-signed (draft / identity_verified / awaiting_student_signature)
    -- abandoned attempt. Cancel it so the unique partial index frees up.
    update scholarship_agreements
    set status        = 'cancelled',
        status_reason = 'superseded_by_retry'
    where id = v_other.id;

    insert into scholarship_agreement_events (agreement_id, event_type, payload)
    values (
      v_other.id, 'cancelled',
      jsonb_build_object(
        'reason', 'superseded_by_retry',
        'superseded_by', v_row.id
      )
    );
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
