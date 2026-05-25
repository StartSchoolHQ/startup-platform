-- ============================================================
-- Scholarship agreements -- data minimization on archive (part 2/2)
--
-- 1. Relax the events-table mutation trigger:
--    - DELETE: still fully blocked.
--    - UPDATE: allowed ONLY to redact payload (set to NULL). Type,
--      agreement_id and timestamp stay immutable. This preserves
--      the integrity of the audit chain while permitting PII
--      removal.
-- 2. The SECURITY DEFINER `scholarship_minimize_archived(uuid)` RPC.
--    Called once per archived row from `lib/scholarship/data.ts`
--    after `scholarship_record_archived` + email send. Email send
--    needs the unredacted recipient_email / signer_name, which is
--    why this is not chained inside `scholarship_record_archived`.
--    Idempotent -- rerunning on an already-minimized row is a no-op.
-- ============================================================

create or replace function scholarship_events_block_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'scholarship_agreement_events is append-only';
  end if;

  -- UPDATE: allow only payload->NULL redaction.
  if tg_op = 'UPDATE' then
    if new.id <> old.id
       or new.agreement_id <> old.agreement_id
       or new.event_type <> old.event_type
       or new.occurred_at <> old.occurred_at then
      raise exception 'scholarship_agreement_events: only payload may be redacted to NULL';
    end if;
    if new.payload is not null then
      raise exception 'scholarship_agreement_events: redaction must set payload to NULL';
    end if;
    return new;
  end if;

  return new;
end;
$$;

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

  -- Detect rerun: if PII fields are already null, we've been here.
  v_already_minimized :=
    v_row.recipient_email is null
    and v_row.signer_personal_code is null
    and v_row.signer_name is null;

  update scholarship_agreements
  set recipient_email             = null,
      recipient_phone             = null,
      recipient_address           = null,
      signer_personal_code        = null,
      signer_country_code         = null,
      signer_name                 = null,
      signer_surname              = null,
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

-- NOTE on CHECK constraints (recipient_email_len, phone, address length):
-- after minimization the columns are NULL, and CHECK constraints treat
-- NULL as "unknown", not as a violation. No constraint changes needed.

-- NOTE on the partial unique index
-- `scholarship_agreements_signer_type_unique`: it is defined
-- `WHERE signer_personal_code IS NOT NULL`, so once we null out
-- signer_personal_code on archive, the row drops out of the index
-- automatically -- no separate cleanup needed.
