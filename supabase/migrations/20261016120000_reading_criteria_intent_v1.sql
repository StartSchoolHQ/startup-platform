-- Reading-task criterion 1 asked for a sentence the task never requested
-- ("The submitted text states the book was read in full, or names exactly
-- which chapters were read") and the AI reviewer rejected 24 otherwise-good
-- submissions (18 students) on that point alone. The task's own Evidence
-- Required is only the reflection. Rewrite the criterion to judge engagement
-- with the book instead of a magic phrase. Data only; the reviewer copies
-- criteria into each review at submission time, so past reviews are untouched.
--
-- Rollback:
--   update public.tasks t
--      set peer_review_criteria = b.peer_review_criteria, updated_at = b.updated_at
--     from public.reading_criteria_backup_20261016 b where b.id = t.id;
--   drop table public.reading_criteria_backup_20261016;

create table public.reading_criteria_backup_20261016 as
select id, template_code, peer_review_criteria, updated_at
from public.tasks
where template_code in (
  'MJ-P1-01', 'MJ-P1-03',
  'MJ-READ-01', 'MJ-READ-02', 'MJ-READ-03', 'MJ-READ-04',
  'MJ-READ-05', 'MJ-READ-06', 'MJ-READ-07'
);
alter table public.reading_criteria_backup_20261016 enable row level security;
revoke all on public.reading_criteria_backup_20261016 from anon, authenticated;

do $$
declare
  v_books int;
  v_essays int;
begin
  update public.tasks
  set peer_review_criteria = jsonb_set(
        peer_review_criteria,
        '{0,points,0}',
        to_jsonb('1. The student engaged with the book itself: a plain statement that they read it, or a reflection that clearly draws on its content, is enough. Chapters only need naming if they read part of it. A summary, review or video consumed instead of the book does not count.'::text)
      ),
      updated_at = now()
  where template_code in (
      'MJ-P1-01', 'MJ-P1-03',
      'MJ-READ-01', 'MJ-READ-02', 'MJ-READ-03',
      'MJ-READ-05', 'MJ-READ-06', 'MJ-READ-07')
    and peer_review_criteria->0->>'category' ilike 'what to evaluate%'
    and peer_review_criteria->0->'points'->>0
        = '1. The submitted text states the book was read in full, or names exactly which chapters were read.';
  get diagnostics v_books = row_count;

  update public.tasks
  set peer_review_criteria = jsonb_set(
        peer_review_criteria,
        '{0,points,0}',
        to_jsonb('1. The student engaged with both essays: a plain statement that they read them, or a reflection that clearly draws on each, is enough.'::text)
      ),
      updated_at = now()
  where template_code = 'MJ-READ-04'
    and peer_review_criteria->0->>'category' ilike 'what to evaluate%'
    and peer_review_criteria->0->'points'->>0 = '1. The text confirms both essays were read.';
  get diagnostics v_essays = row_count;

  if v_books <> 8 or v_essays <> 1 then
    raise exception 'reading_criteria_intent_v1: expected 8 book + 1 essay rows, updated % + %',
      v_books, v_essays;
  end if;
end $$;
