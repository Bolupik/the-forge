/**
 * Passkey (WebAuthn) authentication client.
 *
 * Flow for signup / add-passkey:
 *   options -> navigator.credentials.create -> verify -> (signup) session token
 * Flow for sign-in:
 *   options -> navigator.credentials.get -> verify -> session token
 *
 * The session token is a single-use Supabase magiclink hash minted server-side,
 * exchanged here for a real session. No password ever exists client-side.
 */

import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
import { supabase } from '@/integrations/supabase/client';
import { readEdgeError } from '@/lib/edgeError';

export const passkeysSupported = () =>
  typeof window !== 'undefined' &&
  typeof window.PublicKeyCredential !== 'undefined' &&
  typeof navigator?.credentials?.create === 'function';

export const platformAuthenticatorAvailable = async (): Promise<boolean> => {
  if (!passkeysSupported()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

const invoke = async <T>(fn: string, body?: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke(fn, body ? { body } : undefined);
  if (error) throw new Error(await readEdgeError(error, `${fn} failed`));
  if ((data as { error?: unknown })?.error) {
    const err = (data as { error: unknown }).error;
    throw new Error(typeof err === 'string' ? err : JSON.stringify(err));
  }
  return data as T;
};

const exchangeSession = async (tokenHash: string) => {
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
  if (error) throw new Error(`Could not start your session: ${error.message}`);
};

/** Friendly message for the common WebAuthn DOMExceptions. */
export const describePasskeyError = (e: unknown): string => {
  const name = (e as { name?: string })?.name;
  const msg = e instanceof Error ? e.message : String(e);
  if (name === 'NotAllowedError') return 'Passkey prompt was dismissed or timed out. Try again.';
  if (name === 'InvalidStateError') return 'This device already has a passkey for your account.';
  if (name === 'SecurityError') return 'Passkeys need a secure https origin on this domain.';
  if (name === 'AbortError') return 'Passkey request was cancelled.';
  return msg || 'Passkey failed.';
};

export interface PasskeySignupResult {
  credentialId: string;
  userId: string;
}

/** Create a brand-new account backed by a passkey, and sign in. */
export const signUpWithPasskey = async (displayName?: string): Promise<PasskeySignupResult> => {
  const { options, sessionKey } = await invoke<{
    options: PublicKeyCredentialCreationOptionsJSON;
    sessionKey: string;
  }>('passkey-register-options');

  const attestation = await startRegistration({ optionsJSON: options });

  const verified = await invoke<{
    credentialId: string;
    userId: string;
    sessionTokenHash: string | null;
  }>('passkey-register-verify', {
    sessionKey,
    response: attestation,
    displayName,
    label: navigator.platform || 'This device',
  });

  if (!verified.sessionTokenHash) throw new Error('Signup did not return a session');
  await exchangeSession(verified.sessionTokenHash);

  return { credentialId: verified.credentialId, userId: verified.userId };
};

/** Sign in with any passkey already registered for this app. */
export const signInWithPasskey = async (): Promise<{ userId: string }> => {
  const { options, sessionKey } = await invoke<{
    options: PublicKeyCredentialRequestOptionsJSON;
    sessionKey: string;
  }>('passkey-auth-options');

  const assertion = await startAuthentication({ optionsJSON: options });

  const verified = await invoke<{ userId: string; sessionTokenHash: string }>('passkey-auth-verify', {
    sessionKey,
    response: assertion,
  });

  await exchangeSession(verified.sessionTokenHash);
  return { userId: verified.userId };
};

/** Add an extra passkey to the currently signed-in account. */
export const addPasskeyToAccount = async (label?: string): Promise<{ credentialId: string }> => {
  const { options, sessionKey } = await invoke<{
    options: PublicKeyCredentialCreationOptionsJSON;
    sessionKey: string;
  }>('passkey-register-options');

  const attestation = await startRegistration({ optionsJSON: options });

  const verified = await invoke<{ credentialId: string }>('passkey-register-verify', {
    sessionKey,
    response: attestation,
    label: label || navigator.platform || 'New device',
  });
  return { credentialId: verified.credentialId };
};

export interface StoredPasskey {
  id: string;
  credential_id: string;
  label: string | null;
  last_used_at: string | null;
  created_at: string;
}

export const listPasskeys = async (): Promise<StoredPasskey[]> => {
  const { data, error } = await supabase
    .from('passkey_credentials')
    .select('id, credential_id, label, last_used_at, created_at')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as StoredPasskey[];
};

export const removePasskey = async (id: string): Promise<void> => {
  const { error } = await supabase.from('passkey_credentials').delete().eq('id', id);
  if (error) throw new Error(error.message);
};
