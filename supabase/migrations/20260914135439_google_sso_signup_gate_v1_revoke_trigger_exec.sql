-- Follow-up to google_sso_signup_gate_v1: trigger functions are invoked by
-- the on_auth_user_created trigger only, never via PostgREST. Revoke the
-- default PUBLIC EXECUTE so the database linter stops flagging them as
-- anon/authenticated-callable SECURITY DEFINER functions.
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user_backup_v1() FROM PUBLIC, anon, authenticated;
