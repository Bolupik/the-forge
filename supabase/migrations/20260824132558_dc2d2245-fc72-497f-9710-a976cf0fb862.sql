-- 1. Passkey credentials
CREATE TABLE public.passkey_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  transports text[] NOT NULL DEFAULT '{}',
  label text,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.passkey_credentials TO authenticated;
GRANT ALL ON public.passkey_credentials TO service_role;

ALTER TABLE public.passkey_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own passkeys read" ON public.passkey_credentials
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own passkeys insert" ON public.passkey_credentials
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own passkeys delete" ON public.passkey_credentials
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX passkey_credentials_user_id_idx ON public.passkey_credentials (user_id);

-- 2. WebAuthn challenges (server-only)
CREATE TABLE public.webauthn_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_key text NOT NULL UNIQUE,
  challenge text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('register','authenticate')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.webauthn_challenges TO service_role;

ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (which bypasses RLS) may touch this table.

CREATE INDEX webauthn_challenges_expires_at_idx ON public.webauthn_challenges (expires_at);

-- Opportunistic cleanup of expired challenges on every insert.
CREATE OR REPLACE FUNCTION public.purge_expired_webauthn_challenges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.webauthn_challenges WHERE expires_at < now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_webauthn_challenges() FROM PUBLIC;

CREATE TRIGGER webauthn_challenges_purge_expired
  AFTER INSERT ON public.webauthn_challenges
  FOR EACH STATEMENT EXECUTE FUNCTION public.purge_expired_webauthn_challenges();

-- 3. Profile flags for the passkey wallet flow
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auth_method text NOT NULL DEFAULT 'wallet',
  ADD COLUMN IF NOT EXISTS recovery_phrase_backed_up boolean NOT NULL DEFAULT false;