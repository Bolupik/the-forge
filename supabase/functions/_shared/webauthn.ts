import { createClient } from 'npm:@supabase/supabase-js@2';

export const admin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

export const RP_NAME = 'CardForge';

/**
 * Derive the WebAuthn relying-party id and expected origin from the caller's
 * Origin header. WebAuthn requires the rpID to be the effective domain of the
 * page, so it must follow the deploy target (preview, published, localhost).
 */
export const rpFromRequest = (req: Request): { rpID: string; origin: string } => {
  const origin = req.headers.get('origin') ?? '';
  if (!origin) throw new Error('Missing Origin header');
  const url = new URL(origin);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
    throw new Error('Passkeys require a secure (https) origin');
  }
  return { rpID: url.hostname, origin };
};

export const json = (body: unknown, status = 200, extra: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...(extra as Record<string, string>) },
  });

export const randomKey = () => crypto.randomUUID() + crypto.randomUUID().replaceAll('-', '');

/** Store a one-time challenge; the client echoes back sessionKey on verify. */
export const putChallenge = async (
  kind: 'register' | 'authenticate',
  challenge: string,
  userId: string | null,
): Promise<string> => {
  const sessionKey = randomKey();
  const { error } = await admin()
    .from('webauthn_challenges')
    .insert({ session_key: sessionKey, challenge, kind, user_id: userId });
  if (error) throw new Error(`Could not store challenge: ${error.message}`);
  return sessionKey;
};

/** Consume a one-time challenge. Throws when missing, expired, or wrong kind. */
export const takeChallenge = async (
  sessionKey: string,
  kind: 'register' | 'authenticate',
): Promise<{ challenge: string; userId: string | null }> => {
  const db = admin();
  const { data, error } = await db
    .from('webauthn_challenges')
    .select('id, challenge, kind, user_id, expires_at')
    .eq('session_key', sessionKey)
    .maybeSingle();

  if (error) throw new Error(`Challenge lookup failed: ${error.message}`);
  if (!data) throw new Error('Challenge not found. Start over.');

  // Single use, whatever the outcome.
  await db.from('webauthn_challenges').delete().eq('id', data.id);

  if (data.kind !== kind) throw new Error('Challenge kind mismatch');
  if (new Date(data.expires_at).getTime() < Date.now()) throw new Error('Challenge expired. Try again.');

  return { challenge: data.challenge, userId: data.user_id };
};

/**
 * Mint a real Supabase session for a user without any password or email round
 * trip: generate a magiclink server-side and hand the client only the
 * single-use token hash, which it exchanges via auth.verifyOtp().
 */
export const mintSessionToken = async (email: string): Promise<string> => {
  const { data, error } = await admin().auth.admin.generateLink({ type: 'magiclink', email });
  if (error || !data?.properties?.hashed_token) {
    throw new Error(`Could not create a session: ${error?.message ?? 'no token returned'}`);
  }
  return data.properties.hashed_token;
};

/** Synthetic, non-deliverable email for passkey-only accounts. */
export const passkeyEmail = () => `pk_${crypto.randomUUID().replaceAll('-', '')}@passkey.cardforge.app`;
