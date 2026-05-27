-- `create or replace function` with a new parameter (p_module_track default
-- null) created a SECOND overload rather than replacing the original. The
-- 8-arg signature is the only one the application calls; the 7-arg one was
-- left dangling. Drop it so PostgREST has one unambiguous resolution and
-- the generated TypeScript types collapse to a single Args shape.

drop function if exists scholarship_submit_form(
  scholarship_agreement_type, text, text, text,
  scholarship_agreement_language, text, timestamptz
);
