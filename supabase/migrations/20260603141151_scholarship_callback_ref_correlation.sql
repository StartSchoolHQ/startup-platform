-- Fix: Dokobit's create-session token != the return token it appends to the
-- callback URL. We must correlate the row by our OWN key (callback_ref)
-- embedded in return_url, and use Dokobit's RETURN_TOKEN for status.
-- Additive + V2 RPCs; v1 functions left intact for rollback.

alter table public.scholarship_agreements
  add column if not exists callback_ref text;

create unique index if not exists scholarship_agreements_callback_ref_idx
  on public.scholarship_agreements (callback_ref)
  where callback_ref is not null;

-- V2 of submit_form: keyed by our generated callback_ref instead of a
-- Dokobit token (dokobit_auth_token stays null until the callback persists
-- the RETURN_TOKEN). v1 retained.
create or replace function public.scholarship_submit_form_v2(
  p_type scholarship_agreement_type,
  p_email text,
  p_phone text,
  p_address text,
  p_language scholarship_agreement_language,
  p_callback_ref text,
  p_expires_at timestamptz
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
    language, callback_ref, expires_at, status
  ) values (
    p_type, p_email, p_phone, p_address,
    p_language, p_callback_ref, p_expires_at, 'draft'
  )
  returning * into v_row;

  insert into scholarship_agreement_events (agreement_id, event_type, payload)
  values (v_row.id, 'form_submitted', jsonb_build_object('email', p_email));
  insert into scholarship_agreement_events (agreement_id, event_type)
  values (v_row.id, 'identity_started');

  return v_row;
end;
$function$;

-- Persists Dokobit's RETURN_TOKEN on the row so the existing
-- scholarship_record_identity (which looks the row up by dokobit_auth_token)
-- works unchanged, and admin Retry has a real Dokobit token. Idempotent.
create or replace function public.scholarship_attach_return_token(
  p_id uuid,
  p_return_token text
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
  set dokobit_auth_token = p_return_token
  where id = p_id
  returning * into v_row;

  if not found then
    raise exception 'scholarship_not_found';
  end if;

  return v_row;
end;
$function$;
