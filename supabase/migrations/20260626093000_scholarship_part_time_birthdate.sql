-- Part-time studies agreement support.
--
-- The 'part_time' enum value already exists (20260525200001). This migration
-- adds the one new piece of data the part-time contract needs — the student's
-- birthdate ("born on {{Birthdate}}") — which Dokobit eID does not return and
-- the form did not previously collect.
--
-- Fully additive and SAFE for the live full/partial flow:
--   * recipient_birthdate is nullable (full/partial rows leave it null).
--   * submit_form_v2 is left completely UNTOUCHED — students currently using
--     the full/partial links keep hitting it unchanged. We add a NEW
--     submit_form_v3 that also persists birthdate (matches the existing
--     "keep the prior version for rollback" pattern).
--   * minimize change is internal (runs only on the archive webhook).

alter table public.scholarship_agreements
  add column if not exists recipient_birthdate date;

-- V3 of submit_form: same as v2 plus the optional birthdate. New function, so
-- v2 (live) is unaffected. p_birthdate defaults null for full/partial.
create or replace function public.scholarship_submit_form_v3(
  p_type scholarship_agreement_type,
  p_email text,
  p_phone text,
  p_address text,
  p_language scholarship_agreement_language,
  p_callback_ref text,
  p_expires_at timestamptz,
  p_birthdate date default null
)
returns scholarship_agreements
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_row scholarship_agreements;
begin
  insert into scholarship_agreements (
    agreement_type, recipient_email, recipient_phone, recipient_address,
    recipient_birthdate, language, callback_ref, expires_at, status
  ) values (
    p_type, p_email, p_phone, p_address,
    p_birthdate, p_language, p_callback_ref, p_expires_at, 'draft'
  )
  returning * into v_row;

  insert into scholarship_agreement_events (agreement_id, event_type, payload)
  values (v_row.id, 'form_submitted', jsonb_build_object('email', p_email));
  insert into scholarship_agreement_events (agreement_id, event_type)
  values (v_row.id, 'identity_started');

  return v_row;
end;
$function$;

revoke execute on function public.scholarship_submit_form_v3(
  scholarship_agreement_type, text, text, text,
  scholarship_agreement_language, text, timestamptz, date
) from public, anon, authenticated;
grant execute on function public.scholarship_submit_form_v3(
  scholarship_agreement_type, text, text, text,
  scholarship_agreement_language, text, timestamptz, date
) to service_role;

-- Birthdate is PII — null it on post-archive minimization, alongside the
-- personal code and tokens. (Phone/address are intentionally retained per
-- 20260527083000.) Same signature as before — safe CREATE OR REPLACE.
create or replace function public.scholarship_minimize_archived(p_id uuid)
returns scholarship_agreements
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
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

  v_already_minimized := v_row.signer_personal_code is null;

  update scholarship_agreements
  set signer_personal_code        = null,
      signer_country_code         = null,
      recipient_birthdate         = null,
      dokobit_auth_token          = null,
      dokobit_signing_token       = null,
      dokobit_signer_token        = null,
      dokobit_school_signer_token = null,
      dokobit_batch_token         = null,
      unsigned_pdf_path           = null
  where id = p_id
  returning * into v_row;

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
