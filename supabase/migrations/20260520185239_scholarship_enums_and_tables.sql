-- ============================================================
-- Scholarship agreements — enums
-- ============================================================
create type scholarship_agreement_type as enum ('full', 'partial');
create type scholarship_agreement_language as enum ('lv', 'en');
create type scholarship_agreement_status as enum (
  'draft','identity_verified',
  'awaiting_student_signature','student_signed',
  'awaiting_school_signature','school_signed',
  'archived','cancelled','expired','failed'
);
create type scholarship_event_type as enum (
  'form_submitted','identity_started','identity_verified','identity_mismatch',
  'signing_created','signer_signed','school_signer_added','signing_completed',
  'archived','email_completed_sent','cancelled','expired','error'
);

-- ============================================================
-- Scholarship agreements — main table
-- Cohort-scoped agreement row. Created in 'draft' after the student
-- submits the form AND a Dokobit auth session token has been minted —
-- that session_token is stored in dokobit_auth_token and is the row's
-- correlation key through the eID callback.
-- ============================================================
create table scholarship_agreements (
  id                          uuid primary key default gen_random_uuid(),
  agreement_type              scholarship_agreement_type not null,

  -- Form-collected (student types these into the public form)
  recipient_email             text not null,
  recipient_phone             text not null,
  recipient_address           text not null,

  -- eID-collected (filled by scholarship_record_identity after Dokobit)
  signer_personal_code        text,
  signer_country_code         text,
  signer_name                 text,
  signer_surname              text,
  identity_verified_at        timestamptz,

  language                    scholarship_agreement_language not null default 'en',

  -- Dokobit tokens (filled progressively through the flow)
  dokobit_auth_token          text,
  dokobit_signing_token       text,
  dokobit_signer_token        text,
  dokobit_school_signer_token text,
  dokobit_batch_token         text,

  -- Supabase storage paths
  unsigned_pdf_path           text,
  signed_doc_path             text,

  status                      scholarship_agreement_status not null default 'draft',
  status_reason               text,

  student_signed_at           timestamptz,
  school_signed_at            timestamptz,
  archived_at                 timestamptz,
  expires_at                  timestamptz not null,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  constraint scholarship_agreements_email_len
    check (length(recipient_email) between 3 and 320),
  constraint scholarship_agreements_phone_len
    check (length(recipient_phone) between 4 and 32),
  constraint scholarship_agreements_address_len
    check (length(recipient_address) between 4 and 500)
);

create index scholarship_agreements_status_expires_idx
  on scholarship_agreements (status, expires_at);
create index scholarship_agreements_email_idx
  on scholarship_agreements (recipient_email);
create index scholarship_agreements_auth_token_idx
  on scholarship_agreements (dokobit_auth_token)
  where dokobit_auth_token is not null;
create index scholarship_agreements_signing_token_idx
  on scholarship_agreements (dokobit_signing_token)
  where dokobit_signing_token is not null;
create index scholarship_agreements_batch_token_idx
  on scholarship_agreements (dokobit_batch_token)
  where dokobit_batch_token is not null;

-- Anti-cheat: one non-terminal signed contract per real person per type.
-- A partial-scholarship student cannot also create a full-scholarship row
-- once their personal_code is locked in.
create unique index scholarship_agreements_signer_type_unique
  on scholarship_agreements (signer_personal_code, agreement_type)
  where signer_personal_code is not null
    and status not in ('cancelled','expired','failed');

-- updated_at trigger
create or replace function scholarship_agreements_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_scholarship_agreements_updated_at
  before update on scholarship_agreements
  for each row execute function scholarship_agreements_set_updated_at();

-- ============================================================
-- Scholarship agreement events — append-only audit log
-- ============================================================
create table scholarship_agreement_events (
  id              uuid primary key default gen_random_uuid(),
  agreement_id    uuid not null references scholarship_agreements(id) on delete cascade,
  event_type      scholarship_event_type not null,
  payload         jsonb,
  occurred_at     timestamptz not null default now()
);

create index scholarship_agreement_events_agreement_idx
  on scholarship_agreement_events (agreement_id, occurred_at desc);
create index scholarship_agreement_events_type_idx
  on scholarship_agreement_events (event_type, occurred_at desc);

-- Append-only enforcement: block UPDATE and DELETE at the trigger level
create or replace function scholarship_events_block_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'scholarship_agreement_events is append-only';
end;
$$;

create trigger trg_scholarship_events_no_update
  before update on scholarship_agreement_events
  for each row execute function scholarship_events_block_mutation();

create trigger trg_scholarship_events_no_delete
  before delete on scholarship_agreement_events
  for each row execute function scholarship_events_block_mutation();
