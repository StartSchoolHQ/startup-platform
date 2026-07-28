-- Add 'laptop' and 'keycard' to scholarship_agreement_type. Must commit on
-- its own before any code or DDL can reference the new values (Postgres
-- limitation: "unsafe use of new value of enum type" within the same
-- transaction).
alter type scholarship_agreement_type add value if not exists 'laptop';
alter type scholarship_agreement_type add value if not exists 'keycard';
