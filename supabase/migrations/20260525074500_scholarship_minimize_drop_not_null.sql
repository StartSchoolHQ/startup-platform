-- ============================================================
-- Scholarship agreements -- allow PII columns to be NULL after
-- minimization.
--
-- The existing CHECK length constraints (recipient_email_len etc.)
-- still hold on INSERT because CHECK treats NULL as "unknown", not
-- as a violation. Non-null on INSERT is enforced one layer up by:
--   1. The Zod schema in `lib/validation-schemas.ts`.
--   2. The `scholarship_submit_form` RPC, which is the only caller
--      that inserts rows into this table.
-- ============================================================

alter table scholarship_agreements
  alter column recipient_email drop not null,
  alter column recipient_phone drop not null,
  alter column recipient_address drop not null;
