-- ============================================================
-- scholarship_record_signing_session
-- After PDF render + Dokobit signing/create, store the signing tokens
-- and transition draft → awaiting_student_signature.
-- ============================================================
create or replace function scholarship_record_signing_session(
  p_id                uuid,
  p_signing_token     text,
  p_signer_token      text,
  p_unsigned_pdf_path text
)
returns scholarship_agreements
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_row scholarship_agreements;
begin
  update scholarship_agreements
  set dokobit_signing_token = p_signing_token,
      dokobit_signer_token  = p_signer_token,
      unsigned_pdf_path     = p_unsigned_pdf_path,
      status                = 'awaiting_student_signature'
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
$$;
revoke execute on function scholarship_record_signing_session(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function scholarship_record_signing_session(uuid, text, text, text)
  to service_role;

-- ============================================================
-- scholarship_record_signer_signed (student PIN2 webhook)
-- ============================================================
create or replace function scholarship_record_signer_signed(p_signing_token text)
returns scholarship_agreements
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_row scholarship_agreements;
begin
  update scholarship_agreements
  set status            = 'student_signed',
      student_signed_at = now()
  where dokobit_signing_token = p_signing_token
    and status = 'awaiting_student_signature'
  returning * into v_row;

  if not found then
    raise exception 'scholarship_state_transition_denied';
  end if;

  insert into scholarship_agreement_events (agreement_id, event_type)
  values (v_row.id, 'signer_signed');

  return v_row;
end;
$$;
revoke execute on function scholarship_record_signer_signed(text)
  from public, anon, authenticated;
grant execute on function scholarship_record_signer_signed(text) to service_role;

-- ============================================================
-- scholarship_record_school_signer
-- Records the school's signer_access_token after addSigner — used by
-- the single-doc Smart-ID admin path.
-- ============================================================
create or replace function scholarship_record_school_signer(
  p_id                  uuid,
  p_school_signer_token text
)
returns scholarship_agreements
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_row scholarship_agreements;
begin
  update scholarship_agreements
  set dokobit_school_signer_token = p_school_signer_token,
      status                      = 'awaiting_school_signature'
  where id = p_id and status = 'student_signed'
  returning * into v_row;

  if not found then
    raise exception 'scholarship_state_transition_denied';
  end if;

  insert into scholarship_agreement_events (agreement_id, event_type)
  values (v_row.id, 'school_signer_added');

  return v_row;
end;
$$;
revoke execute on function scholarship_record_school_signer(uuid, text)
  from public, anon, authenticated;
grant execute on function scholarship_record_school_signer(uuid, text) to service_role;

-- ============================================================
-- scholarship_attach_batch
-- Bulk attach a Dokobit batch_token to N student-signed agreements.
-- Transitions student_signed → awaiting_school_signature for all rows.
-- Used by the eParaksts/ID-card batch admin path.
-- ============================================================
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
  set dokobit_batch_token = p_batch_token,
      status              = 'awaiting_school_signature'
  where id = any (p_ids)
    and status = 'student_signed';
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

-- ============================================================
-- scholarship_record_school_signed (school PIN2 webhook)
-- ============================================================
create or replace function scholarship_record_school_signed(p_signing_token text)
returns scholarship_agreements
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_row scholarship_agreements;
begin
  update scholarship_agreements
  set status           = 'school_signed',
      school_signed_at = now()
  where dokobit_signing_token = p_signing_token
    and status = 'awaiting_school_signature'
  returning * into v_row;

  if not found then
    raise exception 'scholarship_state_transition_denied';
  end if;

  insert into scholarship_agreement_events (agreement_id, event_type)
  values (v_row.id, 'signing_completed');

  return v_row;
end;
$$;
revoke execute on function scholarship_record_school_signed(text)
  from public, anon, authenticated;
grant execute on function scholarship_record_school_signed(text) to service_role;

-- ============================================================
-- scholarship_record_archived
-- ============================================================
create or replace function scholarship_record_archived(
  p_id              uuid,
  p_signed_doc_path text
)
returns scholarship_agreements
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_row scholarship_agreements;
begin
  update scholarship_agreements
  set status          = 'archived',
      signed_doc_path = p_signed_doc_path,
      archived_at     = now()
  where id = p_id and status = 'school_signed'
  returning * into v_row;

  if not found then
    raise exception 'scholarship_state_transition_denied';
  end if;

  insert into scholarship_agreement_events (agreement_id, event_type)
  values (v_row.id, 'archived');

  return v_row;
end;
$$;
revoke execute on function scholarship_record_archived(uuid, text)
  from public, anon, authenticated;
grant execute on function scholarship_record_archived(uuid, text) to service_role;

-- ============================================================
-- scholarship_record_event (generic event log entry)
-- ============================================================
create or replace function scholarship_record_event(
  p_id         uuid,
  p_event_type scholarship_event_type,
  p_payload    jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into scholarship_agreement_events (agreement_id, event_type, payload)
  values (p_id, p_event_type, p_payload);
end;
$$;
revoke execute on function scholarship_record_event(uuid, scholarship_event_type, jsonb)
  from public, anon, authenticated;
grant execute on function scholarship_record_event(uuid, scholarship_event_type, jsonb)
  to service_role;

-- ============================================================
-- scholarship_cancel
-- ============================================================
create or replace function scholarship_cancel(p_id uuid, p_reason text)
returns scholarship_agreements
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_row scholarship_agreements;
begin
  update scholarship_agreements
  set status        = 'cancelled',
      status_reason = p_reason
  where id = p_id and status <> 'archived'
  returning * into v_row;

  if not found then
    raise exception 'scholarship_state_transition_denied';
  end if;

  insert into scholarship_agreement_events (agreement_id, event_type, payload)
  values (v_row.id, 'cancelled', jsonb_build_object('reason', p_reason));

  return v_row;
end;
$$;
revoke execute on function scholarship_cancel(uuid, text)
  from public, anon, authenticated;
grant execute on function scholarship_cancel(uuid, text) to service_role;

-- ============================================================
-- scholarship_reset_for_retry
-- Admin recovery from stuck identity_verified / failed states. Clears
-- partial Dokobit signing state and returns to identity_verified so the
-- retry endpoint can re-run the PDF + signing/create flow.
-- ============================================================
create or replace function scholarship_reset_for_retry(p_id uuid)
returns scholarship_agreements
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_row scholarship_agreements;
begin
  update scholarship_agreements
  set status                      = 'identity_verified',
      dokobit_signing_token       = null,
      dokobit_signer_token        = null,
      dokobit_school_signer_token = null,
      dokobit_batch_token         = null,
      unsigned_pdf_path           = null,
      status_reason               = null
  where id = p_id
    and status in ('identity_verified','failed')
    and identity_verified_at is not null
  returning * into v_row;

  if not found then
    raise exception 'scholarship_state_transition_denied'
      using detail = format('cannot reset agreement %s for retry', p_id);
  end if;

  insert into scholarship_agreement_events (agreement_id, event_type, payload)
  values (v_row.id, 'error', jsonb_build_object('action', 'reset_for_retry'));

  return v_row;
end;
$$;
revoke execute on function scholarship_reset_for_retry(uuid)
  from public, anon, authenticated;
grant execute on function scholarship_reset_for_retry(uuid) to service_role;

-- ============================================================
-- scholarship_expire_pending — daily cron
-- Expires:
--  - drafts older than 1 day (abandoned form submissions, no identity)
--  - rows past expires_at that aren't already terminal
-- ============================================================
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
      or (expires_at < now() and status not in ('school_signed','archived','cancelled','expired'))
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
revoke execute on function scholarship_expire_pending()
  from public, anon, authenticated;
grant execute on function scholarship_expire_pending() to service_role;

-- Daily cron at 02:00 UTC
select cron.schedule(
  'scholarship_expire_pending_daily',
  '0 2 * * *',
  $$ select scholarship_expire_pending() $$
);
