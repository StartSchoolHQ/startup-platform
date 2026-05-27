-- Remove part-time support: drop the 8-arg submit_form first (depends on
-- scholarship_module_track), then the type + column, then restore the
-- original 7-arg submit_form signature.
--
-- The 'part_time' enum value on scholarship_agreement_type is left
-- dormant — Postgres can't remove enum values without recreating the
-- type, and no row uses it. Application code rejects it client-side.

drop function if exists scholarship_submit_form(
  scholarship_agreement_type, text, text, text,
  scholarship_agreement_language, text, timestamptz, scholarship_module_track
);

alter table scholarship_agreements
  drop constraint if exists scholarship_module_track_consistent;

alter table scholarship_agreements
  drop column if exists module_track;

drop type if exists scholarship_module_track;

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
