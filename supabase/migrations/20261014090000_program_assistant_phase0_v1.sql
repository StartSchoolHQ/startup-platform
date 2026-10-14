-- Program assistant, phase 0 remainder (2026-10-14). Spec:
-- docs/internal/superpowers/specs/2026-10-13-program-assistant-design.md §4
-- Purely additive: one new table, one new defaulted column, one settings row,
-- one private bucket. No existing function, policy or row touched.
-- Rollback: drop table program.timeline_week;
--           alter table qwasar.progress_snapshot drop column kind;
--           delete from platform_settings where key = 'program_assistant';
--           delete from storage.buckets where id = 'program-imports'
--             (empty it through the Storage API first).

-- 1. The Notion "Qwasar Timeline" as data (source: qwasar-timeline.md, Notion
--    last updated 2026-10-12). Week 0 = Wed 2 – Sun 6 Sep 2026, week N starts
--    Monday 7 Sep + 7*(N-1). Thresholds seeded only where qwasar.student_status
--    v1.5 already hard-codes a bar (FS wk3–4 Preseason Web 79, wk5+ 98;
--    ML wk3–4 and wk6+ Preseason Data 93); everything else NULL until an admin
--    sets it. 31 FS + 31 ML + 39 PT rows.
create table program.timeline_week (
  id                bigint generated always as identity primary key,
  track             text        not null check (track in ('FS', 'ML', 'PT')),
  week              integer     not null check (week >= 0),
  starts            date        not null,
  ends              date        not null,
  phase             text        not null,
  requirement       text        not null,
  flag              text        not null default 'normal'
                    check (flag in ('normal', 'hackathon', 'catchup', 'break', 'review')),
  threshold_module  text,
  threshold_percent smallint    check (threshold_percent between 0 and 100),
  threshold_set_by  uuid        references public.users (id) on delete set null,
  threshold_set_at  timestamptz,
  source            text        not null default 'notion:qwasar-timeline 2026-10-12',
  unique (track, week),
  check (ends >= starts),
  check ((threshold_module is null) = (threshold_percent is null))
);
create index timeline_week_dates_idx on program.timeline_week (track, starts, ends);

alter table program.timeline_week enable row level security;
create policy timeline_week_admin_select
  on program.timeline_week for select to authenticated
  using (public.is_admin_v1());
grant select on program.timeline_week to authenticated;
grant select, insert, update, delete on program.timeline_week to service_role;

insert into program.timeline_week
  (track, week, starts, ends, phase, requirement, flag, threshold_module, threshold_percent)
values
  ('FS', 0, date '2026-09-02', date '2026-09-06', 'Onboarding', 'Onboarding · Quest00', 'normal', null, null),
  ('FS', 1, date '2026-09-07', date '2026-09-13', 'Preseason', 'Bootcamp JS: Quest01 – Quest07', 'normal', null, null),
  ('FS', 2, date '2026-09-14', date '2026-09-20', 'Preseason', 'my moving box · my levenshtein · my spaceship · start my css is easy', 'normal', null, null),
  ('FS', 3, date '2026-09-21', date '2026-09-27', 'Preseason', 'Hackathon 1 – no mandatory coding', 'hackathon', 'Preseason Web', 79),
  ('FS', 4, date '2026-09-28', date '2026-10-04', 'Preseason', 'finish my css is easy · my bouncing box · my first backend', 'normal', 'Preseason Web', 79),
  ('FS', 5, date '2026-10-05', date '2026-10-11', 'Preseason', 'Catch-up week: finish Preseason', 'catchup', 'Preseason Web', 98),
  ('FS', 6, date '2026-10-12', date '2026-10-18', 'S01 Arc 01', 'Season 01 Arc 01 starts: Bootcamp C Quest00 – Quest05 · my square', 'normal', 'Preseason Web', 98),
  ('FS', 7, date '2026-10-19', date '2026-10-25', 'S01 Arc 01', 'my cat · my ngram', 'normal', 'Preseason Web', 98),
  ('FS', 8, date '2026-10-26', date '2026-11-01', 'S01 Arc 01', 'Hackathon 2 – no mandatory coding', 'hackathon', 'Preseason Web', 98),
  ('FS', 9, date '2026-11-02', date '2026-11-08', 'S01 Arc 01', 'my printf', 'normal', 'Preseason Web', 98),
  ('FS', 10, date '2026-11-09', date '2026-11-15', 'S01 Arc 01', 'my printf (continued)', 'normal', 'Preseason Web', 98),
  ('FS', 11, date '2026-11-16', date '2026-11-22', 'S01 Arc 01', 'my mastermind · Wed 18 Nov public holiday', 'normal', 'Preseason Web', 98),
  ('FS', 12, date '2026-11-23', date '2026-11-29', 'S01 Arc 01', 'Hackathon 3 – no mandatory coding', 'hackathon', 'Preseason Web', 98),
  ('FS', 13, date '2026-11-30', date '2026-12-06', 'S01 Arc 01', 'finish my mastermind', 'normal', 'Preseason Web', 98),
  ('FS', 14, date '2026-12-07', date '2026-12-13', 'S02 Fullstack', 'Season 02 Fullstack starts: my css is easy ii · my green wordpress · start my tetris', 'normal', 'Preseason Web', 98),
  ('FS', 15, date '2026-12-14', date '2026-12-20', 'S02 Fullstack', 'my tetris · Performance review · Git 0 to 60 done', 'review', 'Preseason Web', 98),
  ('FS', 16, date '2026-12-21', date '2026-12-27', 'S02 Fullstack', 'Christmas break', 'break', 'Preseason Web', 98),
  ('FS', 17, date '2026-12-28', date '2027-01-03', 'S02 Fullstack', 'Christmas break', 'break', 'Preseason Web', 98),
  ('FS', 18, date '2027-01-04', date '2027-01-10', 'S02 Fullstack', 'my tetris (continued)', 'normal', 'Preseason Web', 98),
  ('FS', 19, date '2027-01-11', date '2027-01-17', 'S02 Fullstack', 'Bootcamp Ruby (Quests)', 'normal', 'Preseason Web', 98),
  ('FS', 20, date '2027-01-18', date '2027-01-24', 'S02 Fullstack', 'Bootcamp Ruby (Quests) · my roman numerals · start my select query', 'normal', 'Preseason Web', 98),
  ('FS', 21, date '2027-01-25', date '2027-01-31', 'S02 Fullstack', 'my select query · my allocine · my users app', 'normal', 'Preseason Web', 98),
  ('FS', 22, date '2027-02-01', date '2027-02-07', 'S02 Fullstack', 'my sqlite', 'normal', 'Preseason Web', 98),
  ('FS', 23, date '2027-02-08', date '2027-02-14', 'S02 Fullstack', 'my sqlite (continued)', 'normal', 'Preseason Web', 98),
  ('FS', 24, date '2027-02-15', date '2027-02-21', 'S02 Fullstack', 'my basecamp', 'normal', 'Preseason Web', 98),
  ('FS', 25, date '2027-02-22', date '2027-02-28', 'S02 Fullstack', 'my basecamp (continued)', 'normal', 'Preseason Web', 98),
  ('FS', 26, date '2027-03-01', date '2027-03-07', 'S02 Fullstack', 'my basecamp (continued)', 'normal', 'Preseason Web', 98),
  ('FS', 27, date '2027-03-08', date '2027-03-14', 'Season 03', 'Season 03 starts: Season 03 minimal requirements (chosen season) · Startup module', 'normal', 'Preseason Web', 98),
  ('FS', 28, date '2027-03-15', date '2027-03-21', 'Season 03', 'Season 03 minimal requirements · Startup module', 'normal', 'Preseason Web', 98),
  ('FS', 29, date '2027-03-22', date '2027-03-28', 'Season 03', 'Startup module · Fri 26 Mar Good Friday', 'normal', 'Preseason Web', 98),
  ('FS', 30, date '2027-03-29', date '2027-04-04', 'Season 03', 'Startup module: final demos Tue 30 – Wed 31 Mar · Mon 29 Mar Easter Monday', 'normal', 'Preseason Web', 98),
  ('ML', 0, date '2026-09-02', date '2026-09-06', 'Onboarding', 'Onboarding', 'normal', null, null),
  ('ML', 1, date '2026-09-07', date '2026-09-13', 'Preseason', 'Python Quest 01 – 06 · my roman numerals converter · my cat · find a team for my first scraper', 'normal', null, null),
  ('ML', 2, date '2026-09-14', date '2026-09-20', 'Preseason', 'my first scraper · My Imdb Api', 'normal', null, null),
  ('ML', 3, date '2026-09-21', date '2026-09-27', 'Preseason', 'Hackathon week (in person, RTU) – no mandatory coding', 'hackathon', 'Preseason Data', 93),
  ('ML', 4, date '2026-09-28', date '2026-10-04', 'S01 Arc 01', 'Season 01 Arc 01 starts: Bootcamp C Quest00 – Quest05', 'normal', 'Preseason Data', 93),
  ('ML', 5, date '2026-10-05', date '2026-10-11', 'S01 Arc 01', 'my ngram · my square · my cat · my printf', 'normal', null, null),
  ('ML', 6, date '2026-10-12', date '2026-10-18', 'S01 Arc 01', 'my mastermind', 'normal', 'Preseason Data', 93),
  ('ML', 7, date '2026-10-19', date '2026-10-25', 'S01 Arc 01', 'my mastermind (continued)', 'normal', 'Preseason Data', 93),
  ('ML', 8, date '2026-10-26', date '2026-11-01', 'S01 Arc 01', 'Hackathon – no mandatory coding', 'hackathon', 'Preseason Data', 93),
  ('ML', 9, date '2026-11-02', date '2026-11-08', 'S02 Data Science', 'Season 02 Data Science starts: my levenshtein · My Allocine · My Select Query · My Ds Babel', 'normal', 'Preseason Data', 93),
  ('ML', 10, date '2026-11-09', date '2026-11-15', 'S02 Data Science', 'My Nba Game Analysis · My Mr Clean', 'normal', 'Preseason Data', 93),
  ('ML', 11, date '2026-11-16', date '2026-11-22', 'S02 Data Science', 'My Mr Clean (continued) · DS Quest00 – Quest04 · Wed 18 Nov public holiday', 'normal', 'Preseason Data', 93),
  ('ML', 12, date '2026-11-23', date '2026-11-29', 'S02 Data Science', 'Hackathon prep – no mandatory coding', 'hackathon', 'Preseason Data', 93),
  ('ML', 13, date '2026-11-30', date '2026-12-06', 'S02 Data Science', 'My First Scraper Ds · from here students pick their own project order', 'normal', 'Preseason Data', 93),
  ('ML', 14, date '2026-12-07', date '2026-12-13', 'S02 Data Science', 'My Linear Regression · My Convex Optimization', 'normal', 'Preseason Data', 93),
  ('ML', 15, date '2026-12-14', date '2026-12-20', 'S02 Data Science', 'My Tu Verras · Performance review · Git 0 to 60 done', 'review', 'Preseason Data', 93),
  ('ML', 16, date '2026-12-21', date '2026-12-27', 'S02 Data Science', 'Christmas break', 'break', 'Preseason Data', 93),
  ('ML', 17, date '2026-12-28', date '2027-01-03', 'S02 Data Science', 'Christmas break', 'break', 'Preseason Data', 93),
  ('ML', 18, date '2027-01-04', date '2027-01-10', 'S02 Data Science', 'My M and A · hackathon prep events Mon + Fri', 'normal', 'Preseason Data', 93),
  ('ML', 19, date '2027-01-11', date '2027-01-17', 'S02 Data Science', 'Hackathon week (in person) – no mandatory coding', 'hackathon', 'Preseason Data', 93),
  ('ML', 20, date '2027-01-18', date '2027-01-24', 'S02 Data Science', 'My Open The Iris', 'normal', 'Preseason Data', 93),
  ('ML', 21, date '2027-01-25', date '2027-01-31', 'S02 Data Science', 'My Open The Iris (continued) · My Mobapp Studio', 'normal', 'Preseason Data', 93),
  ('ML', 22, date '2027-02-01', date '2027-02-07', 'S02 Data Science', 'My Mobapp Studio (continued) · My Vivino', 'normal', 'Preseason Data', 93),
  ('ML', 23, date '2027-02-08', date '2027-02-14', 'S02 Data Science', 'My Vivino (continued)', 'normal', 'Preseason Data', 93),
  ('ML', 24, date '2027-02-15', date '2027-02-21', 'Season 03', 'Season 03 starts: Season 03 minimal requirements (chosen season)', 'normal', 'Preseason Data', 93),
  ('ML', 25, date '2027-02-22', date '2027-02-28', 'Season 03', 'Season 03 minimal requirements', 'normal', 'Preseason Data', 93),
  ('ML', 26, date '2027-03-01', date '2027-03-07', 'Season 03', 'Season 03 minimal requirements · Startup module', 'normal', 'Preseason Data', 93),
  ('ML', 27, date '2027-03-08', date '2027-03-14', 'Season 03', 'Spring break', 'break', 'Preseason Data', 93),
  ('ML', 28, date '2027-03-15', date '2027-03-21', 'Season 03', 'Season 03 minimal requirements · Startup module · Tech Chill 17–19 Mar (in person)', 'normal', 'Preseason Data', 93),
  ('ML', 29, date '2027-03-22', date '2027-03-28', 'Season 03', 'Startup module · Sprint week 22–25 Mar (in person) · Fri 26 Mar Good Friday', 'normal', 'Preseason Data', 93),
  ('ML', 30, date '2027-03-29', date '2027-04-04', 'Season 03', 'Startup module · Tech Module deadline Wed 31 Mar · Mon 29 Mar Easter Monday', 'normal', 'Preseason Data', 93),
  ('PT', 0, date '2026-09-02', date '2026-09-06', 'Onboarding', 'Onboarding: Qwasar Articles · our infrastructure', 'normal', null, null),
  ('PT', 1, date '2026-09-07', date '2026-09-13', 'Preseason', 'Preseason starts: Quest00', 'normal', null, null),
  ('PT', 2, date '2026-09-14', date '2026-09-20', 'Preseason', 'Preseason Web starts: JS Quest01 · JS Quest02', 'normal', null, null),
  ('PT', 3, date '2026-09-21', date '2026-09-27', 'Preseason', 'JS Quest03 · JS Quest04', 'normal', null, null),
  ('PT', 4, date '2026-09-28', date '2026-10-04', 'Preseason', 'JS Quest05 · JS Quest06', 'normal', null, null),
  ('PT', 5, date '2026-10-05', date '2026-10-11', 'Preseason', 'JS Quest07 · my css is easy', 'normal', null, null),
  ('PT', 6, date '2026-10-12', date '2026-10-18', 'Preseason', 'my spaceship · my levenshtein', 'normal', null, null),
  ('PT', 7, date '2026-10-19', date '2026-10-25', 'Preseason', 'my moving box realtime · my bouncing box', 'normal', null, null),
  ('PT', 8, date '2026-10-26', date '2026-11-01', 'Preseason', 'my first backend', 'normal', null, null),
  ('PT', 9, date '2026-11-02', date '2026-11-08', 'Git 0 to 60', 'Git 0 to 60 starts', 'normal', null, null),
  ('PT', 10, date '2026-11-09', date '2026-11-15', 'Git 0 to 60', 'Git 0 to 60 (continued)', 'normal', null, null),
  ('PT', 11, date '2026-11-16', date '2026-11-22', 'S01 Arc 01', 'Season 01 Arc 01 starts: Bootcamp C Quest01 · Wed 18 Nov public holiday', 'normal', null, null),
  ('PT', 12, date '2026-11-23', date '2026-11-29', 'S01 Arc 01', 'Bootcamp C Quest02 · start Quest03', 'normal', null, null),
  ('PT', 13, date '2026-11-30', date '2026-12-06', 'S01 Arc 01', 'Bootcamp C Quest03 · Quest04', 'normal', null, null),
  ('PT', 14, date '2026-12-07', date '2026-12-13', 'S01 Arc 01', 'Bootcamp C Quest05 · my square', 'normal', null, null),
  ('PT', 15, date '2026-12-14', date '2026-12-20', 'S01 Arc 01', 'my cat · my ngram', 'normal', null, null),
  ('PT', 16, date '2026-12-21', date '2026-12-27', 'Break', 'Christmas break', 'break', null, null),
  ('PT', 17, date '2026-12-28', date '2027-01-03', 'Break', 'Christmas break', 'break', null, null),
  ('PT', 18, date '2027-01-04', date '2027-01-10', 'S01 Arc 01', 'my printf or my mastermind (pick one)', 'normal', null, null),
  ('PT', 19, date '2027-01-11', date '2027-01-17', 'S01 Arc 01', 'Catch-up week · The Big Hackathon (for participants)', 'hackathon', null, null),
  ('PT', 20, date '2027-01-18', date '2027-01-24', 'S01 Arc 01', 'my printf or my mastermind (continued)', 'normal', null, null),
  ('PT', 21, date '2027-01-25', date '2027-01-31', 'S01 Arc 01', 'my printf or my mastermind (continued)', 'normal', null, null),
  ('PT', 22, date '2027-02-01', date '2027-02-07', 'S02 Fullstack', 'Season 02 Fullstack starts: my css is easy ii · my green wordpress', 'normal', null, null),
  ('PT', 23, date '2027-02-08', date '2027-02-14', 'S02 Fullstack', 'start my tetris', 'normal', null, null),
  ('PT', 24, date '2027-02-15', date '2027-02-21', 'S02 Fullstack', 'my tetris', 'normal', null, null),
  ('PT', 25, date '2027-02-22', date '2027-02-28', 'S02 Fullstack', 'my tetris (continued)', 'normal', null, null),
  ('PT', 26, date '2027-03-01', date '2027-03-07', 'S02 Fullstack', 'Ruby quests · my roman numerals · start my select query', 'normal', null, null),
  ('PT', 27, date '2027-03-08', date '2027-03-14', 'Break', 'Spring break', 'break', null, null),
  ('PT', 28, date '2027-03-15', date '2027-03-21', 'S02 Fullstack', 'my select query · my allocine', 'normal', null, null),
  ('PT', 29, date '2027-03-22', date '2027-03-28', 'S02 Fullstack', 'my users app · Fri 26 Mar Good Friday', 'normal', null, null),
  ('PT', 30, date '2027-03-29', date '2027-04-04', 'S02 Fullstack', 'Catch-up week · Mon 29 Mar Easter Monday', 'catchup', null, null),
  ('PT', 31, date '2027-04-05', date '2027-04-11', 'S02 Fullstack', 'my sqlite or my basecamp (pick one)', 'normal', null, null),
  ('PT', 32, date '2027-04-12', date '2027-04-18', 'S02 Fullstack', 'my sqlite or my basecamp (continued)', 'normal', null, null),
  ('PT', 33, date '2027-04-19', date '2027-04-25', 'S02 Fullstack', 'my sqlite or my basecamp (continued)', 'normal', null, null),
  ('PT', 34, date '2027-04-26', date '2027-05-02', 'S02 Fullstack', 'my sqlite or my basecamp (continued)', 'normal', null, null),
  ('PT', 35, date '2027-05-03', date '2027-05-09', 'Season 03', 'Season 03 starts: Season 03 minimal requirements (chosen season) · Tue 4 May public holiday', 'normal', null, null),
  ('PT', 36, date '2027-05-10', date '2027-05-16', 'Season 03', 'Season 03 minimal requirements', 'normal', null, null),
  ('PT', 37, date '2027-05-17', date '2027-05-23', 'Season 03', 'Season 03 minimal requirements', 'normal', null, null),
  ('PT', 38, date '2027-05-24', date '2027-05-30', 'Season 03', 'Season 03 minimal requirements · Qwasar ends Fri 28 May', 'normal', null, null);

-- 2. Snapshot kind. Scheduled runs (daily 08:00 Riga, per Elias 2026-10-14)
--    write 'scheduled'; "Run now" writes 'adhoc' so the trend baseline can
--    always pick the scheduled snapshot closest to 7 days earlier. The six
--    existing manual imports count as scheduled.
alter table qwasar.progress_snapshot
  add column kind text not null default 'scheduled'
  check (kind in ('scheduled', 'adhoc'));

-- 3. Settings row. Read by the run route; edited from the admin page later.
insert into public.platform_settings (key, value)
values ('program_assistant', jsonb_build_object(
  'enabled', true,
  'cadence', 'daily',
  'run_time_riga', '08:00',
  'slack_enabled', false,
  'slack_channel', '#ops',
  'model', 'claude-sonnet-5-5',
  'cohort', 'Triffid Nebula - Andromeda',
  'expected_cohort_rows', jsonb_build_array(85, 95),
  'attendance_rule_pct', 75,
  'attendance_min_sessions', 8,
  'unmapped_fail_pct', 10
))
on conflict (key) do nothing;

-- 4. Private bucket for the raw CSV of every run (qwasar/<date>-<run_id>.csv).
--    Service role only: no storage.objects policies, so no signed-in user can
--    list or read it until an admin download path is added deliberately.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('program-imports', 'program-imports', false, 10485760,
        array['text/csv', 'text/plain', 'application/json'])
on conflict (id) do nothing;
