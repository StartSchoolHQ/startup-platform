# Backup / rollback — pre `callback_ref` migration (2026-06-03)

Taken before adding the `callback_ref` correlation column + V2 RPCs that fix
the Dokobit create-token vs return-token mismatch in the identity callback.

**Context:** `scholarship_agreements` held only test data at this point
(all rows `eliass.baranovs@gmail.com` / "OK TEST" / mock tokens). The
migration is additive (new nullable column + index + new V2 RPCs); no
existing data is modified.

## Rollback

```sql
-- 1. New RPCs introduced by the change
drop function if exists public.scholarship_submit_form_v2(
  scholarship_agreement_type, text, text, text,
  scholarship_agreement_language, text, timestamptz, text);
drop function if exists public.scholarship_attach_return_token(uuid, text);

-- 2. New column + index
drop index if exists public.scholarship_agreements_callback_ref_idx;
alter table public.scholarship_agreements drop column if exists callback_ref;
```

`scholarship_submit_form` (v1) and `scholarship_record_identity` are NOT
modified by this change, so no function bodies need restoring. Revert the
application commit to restore the old code paths.

## Row snapshot (7 test rows)

Captured via `select json_agg(row_to_json(t)) from (select * from
scholarship_agreements order by created_at) t;` — all test data, retained
in the conversation transcript if a manual data restore is ever needed.
IDs: 6d72f952, 90ec695f, d8583adb, c524257e, 645c08e7, 5fc03f4d, efdf0af3.
