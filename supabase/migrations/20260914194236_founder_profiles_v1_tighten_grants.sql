-- Supabase's default privileges hand ALL on new public tables to
-- authenticated/anon. RLS does not cover TRUNCATE, so trim founder_profiles
-- to exactly what the app uses: authenticated SELECT/INSERT/UPDATE (RLS-scoped).
REVOKE ALL ON TABLE public.founder_profiles FROM anon;
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.founder_profiles FROM authenticated;
