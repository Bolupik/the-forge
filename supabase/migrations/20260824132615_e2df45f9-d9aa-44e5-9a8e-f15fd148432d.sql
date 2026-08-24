REVOKE ALL ON FUNCTION public.purge_expired_webauthn_challenges() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_expired_webauthn_challenges() FROM anon;
REVOKE ALL ON FUNCTION public.purge_expired_webauthn_challenges() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_webauthn_challenges() TO service_role;