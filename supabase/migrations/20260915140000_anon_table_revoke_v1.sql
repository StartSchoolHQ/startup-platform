-- Anon table privileges revoked (2026-09-15)
--
-- Supabase's defaults grant anon SELECT/INSERT/UPDATE/DELETE on every table
-- in public and rely on RLS alone. A scan found three tables whose policies
-- let anon (anyone holding the public key from the page source) read every
-- row: task_progress (student submissions), leaderboard_snapshots, tasks.
-- No public page reads tables with the anon key — the login page only uses
-- auth, the scholarship agreement pages go through the service role on the
-- server — so anon needs nothing here. Authenticated / service_role grants
-- are untouched; RLS stays as the second fence for logged-in users.
--
-- Rollback: grant select, insert, update, delete on all tables in schema
-- public to anon; alter default privileges in schema public grant ... to anon.

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
