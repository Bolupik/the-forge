import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { generateAuthenticationOptions } from 'npm:@simplewebauthn/server@13';
import { json, putChallenge, rpFromRequest } from '../_shared/webauthn.ts';

/**
 * Discoverable-credential sign-in: no username, no allowCredentials list, so we
 * never reveal whether an account exists. The authenticator picks the passkey.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { rpID } = rpFromRequest(req);

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'required',
      allowCredentials: [],
    });

    const sessionKey = await putChallenge('authenticate', options.challenge, null);
    return json({ options, sessionKey }, 200, corsHeaders);
  } catch (e) {
    console.error('[passkey-auth-options]', e);
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 400, corsHeaders);
  }
});
