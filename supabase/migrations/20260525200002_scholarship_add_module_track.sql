-- Part-time agreement track (Tech Module Only vs Tech + Startup Module).
-- Only populated when agreement_type = 'part_time'; enforced via a CHECK
-- constraint so the app and DB agree on the invariant.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'scholarship_module_track') then
    create type scholarship_module_track as enum ('tech_only', 'tech_startup');
  end if;
end $$;

alter table scholarship_agreements
  add column if not exists module_track scholarship_module_track;

alter table scholarship_agreements
  drop constraint if exists scholarship_module_track_consistent;
alter table scholarship_agreements
  add constraint scholarship_module_track_consistent
  check (
    (agreement_type = 'part_time' and module_track is not null)
    or
    (agreement_type <> 'part_time' and module_track is null)
  );
