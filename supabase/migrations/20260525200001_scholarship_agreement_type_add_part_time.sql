-- Add 'part_time' to scholarship_agreement_type. Must commit on its own
-- before any code or DDL can reference the new value (Postgres limitation:
-- "unsafe use of new value of enum type" within the same transaction).
alter type scholarship_agreement_type add value if not exists 'part_time';
