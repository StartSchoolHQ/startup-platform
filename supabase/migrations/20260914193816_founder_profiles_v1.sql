-- Founder card collected on /profile/setup (step 2) after the first Google
-- sign-in. Replaces the two deleted My Journey tasks MJ-P0-01 (background
-- lean) and MJ-P0-02 (founder bio). One row per user; readable by every
-- signed-in user so public profile cards can be built on it later.
-- Purely additive. Rollback: DROP TABLE public.founder_profiles;
-- (backup of the two deleted tasks: public.deleted_mj_p0_tasks_backup_20260914)

CREATE TABLE public.founder_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  background_lean text NOT NULL
    CHECK (background_lean IN ('tech', 'business', 'both')),
  background_reason text NOT NULL
    CHECK (char_length(background_reason) BETWEEN 20 AND 600),
  bio_energizes text NOT NULL
    CHECK (char_length(bio_energizes) BETWEEN 20 AND 800),
  bio_skills text NOT NULL
    CHECK (char_length(bio_skills) BETWEEN 20 AND 800),
  bio_gaps text NOT NULL
    CHECK (char_length(bio_gaps) BETWEEN 20 AND 800),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.founder_profiles IS
  'Founder card: background lean + short bio, collected at profile setup. Source for future public profile cards.';

CREATE OR REPLACE FUNCTION public.founder_profiles_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.created_at := OLD.created_at;
  NEW.user_id := OLD.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_founder_profiles_updated_at
  BEFORE UPDATE ON public.founder_profiles
  FOR EACH ROW EXECUTE FUNCTION public.founder_profiles_set_updated_at();

ALTER TABLE public.founder_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_founder_profiles_select_authenticated
  ON public.founder_profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY p_founder_profiles_insert_own
  ON public.founder_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY p_founder_profiles_update_own
  ON public.founder_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.founder_profiles TO authenticated;
GRANT ALL ON public.founder_profiles TO service_role;
REVOKE ALL ON FUNCTION public.founder_profiles_set_updated_at() FROM PUBLIC, anon, authenticated;
