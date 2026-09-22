-- Google SSO signup gate + handle_new_auth_user v2.
-- Spec: docs/internal/GoogleSSO/2026-08-27-google-sso-invite-gate-design.md
-- Rollback: Dashboard → Auth → Hooks → disable "Before User Created";
--           restore the trigger from handle_new_auth_user_backup_v1
--           (pg_get_functiondef + rename), then DROP FUNCTION
--           public.hook_restrict_signup(jsonb).
--
-- Purely additive apart from CREATE OR REPLACE on handle_new_auth_user;
-- the pre-change body is preserved verbatim in the _backup_v1 copy below.

-- 1. Backup of the current trigger function (verbatim copy, never attached).
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_backup_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Only create the public.users record from auth.users
  -- Do NOT auto-assign tasks - they are created on-demand when user starts them
  INSERT INTO public.users (
    id,
    email,
    name,
    invited_by,
    avatar_url
  ) VALUES (
    NEW.id,
    NEW.email,
    -- Construct name from metadata if available (for invited users)
    CASE
      WHEN NEW.raw_user_meta_data->>'first_name' IS NOT NULL
      THEN CONCAT(
        NEW.raw_user_meta_data->>'first_name',
        ' ',
        NEW.raw_user_meta_data->>'last_name'
      )
      ELSE NULL
    END,
    -- Extract invited_by from metadata if exists
    (NEW.raw_user_meta_data->>'invited_by')::uuid,
    NULL -- avatar_url will be set during profile setup
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate inserts

  RETURN NEW;
END;
$function$;

-- 2. v2: understands Google metadata (full_name / name) and auto-assigns
--    the single open batch (exactly one open → assign; 0 or >1 → NULL).
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_name text;
  v_invited_by uuid;
  v_batch_id uuid;
BEGIN
  -- Legacy invite metadata (first_name + last_name) wins; Google sends
  -- full_name (and name); anything else leaves the name NULL for setup.
  v_name := COALESCE(
    NULLIF(TRIM(CONCAT_WS(' ', v_meta->>'first_name', v_meta->>'last_name')), ''),
    NULLIF(TRIM(v_meta->>'full_name'), ''),
    NULLIF(TRIM(v_meta->>'name'), '')
  );

  BEGIN
    v_invited_by := NULLIF(v_meta->>'invited_by', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    v_invited_by := NULL;
  END;

  SELECT CASE WHEN COUNT(*) = 1 THEN (ARRAY_AGG(id))[1] END
    INTO v_batch_id
  FROM public.diploma_batches
  WHERE closed_at IS NULL;

  INSERT INTO public.users (id, email, name, invited_by, avatar_url, batch_id)
  VALUES (NEW.id, NEW.email, v_name, v_invited_by, NULL, v_batch_id)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 3. Before-user-created hook: only Google + @startschool.org may create
--    an account. Existing accounts are untouched — the hook fires only on
--    user creation, and Google sign-in on an existing confirmed email links
--    the identity instead of creating a user.
CREATE OR REPLACE FUNCTION public.hook_restrict_signup(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_email text := LOWER(TRIM(COALESCE(event->'user'->>'email', '')));
  v_provider text := COALESCE(event->'user'->'app_metadata'->>'provider', '');
BEGIN
  IF v_provider <> 'google' THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Sign in with your @startschool.org Google account to use StartSchool.',
        'http_code', 403
      )
    );
  END IF;

  IF SPLIT_PART(v_email, '@', 2) <> 'startschool.org' THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Only @startschool.org Google accounts can sign in to StartSchool.',
        'http_code', 403
      )
    );
  END IF;

  RETURN '{}'::jsonb;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.hook_restrict_signup(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hook_restrict_signup(jsonb) TO supabase_auth_admin, service_role;
