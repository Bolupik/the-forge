import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { verifyAuthenticationResponse } from 'npm:@simplewebauthn/server@13';
import { z } from 'npm:zod@3';
import { admin, json, mintSessionToken, rpFromRequest, takeChallenge } from '../_shared/webauthn.ts';

const BodySchema = z.object({
  sessionKey: z.string().min(10).max(200),
  response: z.record(z.unknown()),
});

const fromB64 = (value: string) => {
  const s = atob(value);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { rpID, origin } = rpFromRequest(req);
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400, corsHeaders);
    }
    const { sessionKey, response } = parsed.data;

    const credentialId = (response as { id?: string }).id;
    if (!credentialId) return json({ error: 'Malformed passkey response' }, 400, corsHeaders);

    const { challenge } = await takeChallenge(sessionKey, 'authenticate');

    const db = admin();
    const { data: stored, error: lookupErr } = await db
      .from('passkey_credentials')
      .select('id, user_id, credential_id, public_key, counter, transports')
      .eq('credential_id', credentialId)
      .maybeSingle();

    if (lookupErr) return json({ error: 'Passkey lookup failed' }, 400, corsHeaders);
    if (!stored) return json({ error: 'This passkey is not registered. Create an account first.' }, 404, corsHeaders);

    const verification = await verifyAuthenticationResponse({
      // deno-lint-ignore no-explicit-any
      response: response as any,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: stored.credential_id as string,
        publicKey: fromB64(stored.public_key as string),
        counter: Number(stored.counter ?? 0),
        transports: (stored.transports ?? []) as ('usb' | 'nfc' | 'ble' | 'internal' | 'hybrid')[],
      },
    });

    if (!verification.verified) {
      return json({ error: 'Passkey verification failed' }, 401, corsHeaders);
    }

    // Replay protection: persist the authenticator's signature counter.
    await db
      .from('passkey_credentials')
      .update({
        counter: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', stored.id);

    const { data: userRes, error: userErr } = await db.auth.admin.getUserById(stored.user_id as string);
    if (userErr || !userRes.user?.email) {
      return json({ error: 'Account for this passkey is unavailable' }, 400, corsHeaders);
    }

    const sessionTokenHash = await mintSessionToken(userRes.user.email);
    return json({ verified: true, userId: stored.user_id, sessionTokenHash }, 200, corsHeaders);
  } catch (e) {
    console.error('[passkey-auth-verify]', e);
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 400, corsHeaders);
  }
});
