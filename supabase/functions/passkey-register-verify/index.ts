import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyRegistrationResponse } from 'npm:@simplewebauthn/server@13';
import { z } from 'npm:zod@3';
import {
  admin,
  json,
  mintSessionToken,
  passkeyEmail,
  rpFromRequest,
  takeChallenge,
} from '../_shared/webauthn.ts';

const BodySchema = z.object({
  sessionKey: z.string().min(10).max(200),
  response: z.record(z.unknown()),
  label: z.string().trim().max(80).optional(),
  displayName: z.string().trim().max(60).optional(),
});

const toB64 = (bytes: Uint8Array) => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { rpID, origin } = rpFromRequest(req);
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400, corsHeaders);
    }
    const { sessionKey, response, label, displayName } = parsed.data;

    const { challenge, userId: challengeUserId } = await takeChallenge(sessionKey, 'register');

    const verification = await verifyRegistrationResponse({
      // deno-lint-ignore no-explicit-any
      response: response as any,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return json({ error: 'Passkey could not be verified' }, 400, corsHeaders);
    }

    const { credential } = verification.registrationInfo;
    const credentialId = credential.id;
    const publicKey = toB64(credential.publicKey);
    const counter = credential.counter ?? 0;
    const transports = credential.transports ?? [];

    const db = admin();
    let userId = challengeUserId;
    let sessionTokenHash: string | null = null;

    if (!userId) {
      // --- passkey-first signup: create the auth user now ---
      const email = passkeyEmail();
      const { data: created, error: createErr } = await db.auth.admin.createUser({
        email,
        email_confirm: true,
        // Long random password: unused, but the account must not be passwordless-guessable.
        password: crypto.randomUUID() + crypto.randomUUID(),
        user_metadata: { display_name: displayName || 'Forger', auth_method: 'passkey' },
      });
      if (createErr || !created.user) {
        return json({ error: createErr?.message ?? 'Could not create the account' }, 400, corsHeaders);
      }
      userId = created.user.id;

      await db
        .from('profiles')
        .upsert(
          {
            user_id: userId,
            display_name: displayName || 'Forger',
            auth_method: 'passkey',
          },
          { onConflict: 'user_id' },
        );

      sessionTokenHash = await mintSessionToken(email);
    } else {
      // --- adding another passkey to an existing account ---
      const scoped = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
      );
      const {
        data: { user },
      } = await scoped.auth.getUser();
      if (!user || user.id !== userId) {
        return json({ error: 'Session does not match this registration' }, 401, corsHeaders);
      }
    }

    const { error: insertErr } = await db.from('passkey_credentials').insert({
      user_id: userId,
      credential_id: credentialId,
      public_key: publicKey,
      counter,
      transports,
      label: label || 'This device',
      last_used_at: new Date().toISOString(),
    });
    if (insertErr) {
      return json({ error: `Could not save the passkey: ${insertErr.message}` }, 400, corsHeaders);
    }

    return json({ verified: true, credentialId, userId, sessionTokenHash }, 200, corsHeaders);
  } catch (e) {
    console.error('[passkey-register-verify]', e);
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 400, corsHeaders);
  }
});
