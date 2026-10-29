-- task_progress.submitted_at was only ever set by the solo AI path
-- (submit_individual_task_v1). Team submissions (a direct client update in
-- completeTask, and resubmit_task_for_review) never set it: 1,078 team rows
-- in pending_review/approved/rejected had it NULL on 2026-10-29, which makes
-- the form-autosave precedence rule (draft newer than submitted_at) a no-op
-- for team tasks.
--
-- 1. Trigger: whenever a row enters pending_review and the statement did not
--    set submitted_at itself, stamp now(). Purely additive; no existing
--    function edited. Resubmissions get a fresh stamp (OLD.status is
--    rejected/revision_required/in_progress at that point).
-- 2. Backfill: team rows with NULL submitted_at and a completed_at (the
--    submit time on the client path) get submitted_at = completed_at.
--    updated_at is left untouched (the bump trigger is disabled for the
--    statement). Ids in public.submitted_at_backfill_20261029.
--
-- Rollback:
--   drop trigger trg_task_progress_submitted_at on public.task_progress;
--   drop function public.task_progress_stamp_submitted_at_v1();
--   update public.task_progress tp set submitted_at = null
--     from public.submitted_at_backfill_20261029 b where b.id = tp.id;
--   drop table public.submitted_at_backfill_20261029;

-- 1. Trigger -----------------------------------------------------------------
create or replace function public.task_progress_stamp_submitted_at_v1()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status = 'pending_review'
     and old.status is distinct from 'pending_review'
     and new.submitted_at is not distinct from old.submitted_at then
    new.submitted_at := now();
  end if;
  return new;
end;
$$;

revoke execute on function public.task_progress_stamp_submitted_at_v1()
  from public, anon, authenticated;

create trigger trg_task_progress_submitted_at
  before update of status on public.task_progress
  for each row
  execute function public.task_progress_stamp_submitted_at_v1();

-- 2. Backfill ----------------------------------------------------------------
create table public.submitted_at_backfill_20261029 (
  id uuid primary key references public.task_progress (id) on delete cascade
);
alter table public.submitted_at_backfill_20261029 enable row level security;
revoke all on table public.submitted_at_backfill_20261029
  from anon, authenticated;

insert into public.submitted_at_backfill_20261029 (id)
select id
from public.task_progress
where context = 'team'
  and submitted_at is null
  and completed_at is not null
  and status in ('pending_review', 'approved', 'rejected', 'revision_required');

alter table public.task_progress disable trigger update_task_progress_updated_at;

update public.task_progress tp
set submitted_at = tp.completed_at
from public.submitted_at_backfill_20261029 b
where b.id = tp.id;

alter table public.task_progress enable trigger update_task_progress_updated_at;
