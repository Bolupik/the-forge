import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { generateRegistrationOptions } from 'npm:@simplewebauthn/server@13';
import { z } from 'npm:zod@3';
import { admin, json, putChallenge, RP_NAME, rpFromRequest } from '../_shared/webauthn.ts';

const BodySchema = z.object({
  mode: z.enum(['signup', 'add']).default('signup'),
});

/**
 * Build WebAuthn creation options.
 * - No Authorization header  -> new passkey-first signup (fresh auth user).
 * - Authorization header     -> add an extra passkey to the signed-in user.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { rpID } = rpFromRequest(req);
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400, corsHeaders);
    }

    const authHeader = req.headers.get('Authorization');
    const shouldAttachToExistingUser = parsed.data.mode === 'add';

    let userId: string | null = null;
    let userName = 'CardForge player';
    let excludeCredentials: { id: string; transports?: AuthenticatorTransport[] }[] = [];

    if (shouldAttachToExistingUser) {
      if (!authHeader) return json({ error: 'Sign in required' }, 401, corsHeaders);

      const scoped = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const {
        data: { user },
      } = await scoped.auth.getUser();
      if (!user) return json({ error: 'Sign in required' }, 401, corsHeaders);
      userId = user.id;
      userName = user.email ?? `player-${user.id.slice(0, 8)}`;

      // Never let the same authenticator register twice for one account.
      const { data: existing } = await admin()
        .from('passkey_credentials')
        .select('credential_id, transports')
        .eq('user_id', user.id);
      excludeCredentials = (existing ?? []).map((c) => ({
        id: c.credential_id as string,
        transports: (c.transports ?? []) as AuthenticatorTransport[],
      }));
    }

    // For signup the handle is random: it becomes the auth user id on verify.
    const webauthnUserId = userId ?? crypto.randomUUID();

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID,
      userID: new TextEncoder().encode(webauthnUserId),
      userName,
      userDisplayName: userName,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        // Discoverable credential => sign-in needs no username at all.
        residentKey: 'required',
        requireResidentKey: true,
        userVerification: 'required',
      },
    });

    const sessionKey = await putChallenge('register', options.challenge, userId);
    return json({ options, sessionKey, mode: shouldAttachToExistingUser ? 'add' : 'signup' }, 200, corsHeaders);
  } catch (e) {
    console.error('[passkey-register-options]', e);
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 400, corsHeaders);
  }
});
