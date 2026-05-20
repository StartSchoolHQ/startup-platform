-- Pin search_path on both trigger functions to satisfy the
-- function_search_path_mutable advisor and to harden against any future
-- schema-shadowing attack.
alter function scholarship_agreements_set_updated_at()
  set search_path = public, pg_catalog;

alter function scholarship_events_block_mutation()
  set search_path = public, pg_catalog;
