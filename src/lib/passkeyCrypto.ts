/**
 * Passkey-gated encryption for the device-only Stacks seed phrase.
 *
 * The 24-word recovery phrase NEVER leaves the device and is never sent to the
 * backend. It lives in localStorage as AES-GCM ciphertext.
 *
 * Key derivation, in order of preference:
 *   1. WebAuthn PRF extension — the AES key is derived from a secret that only
 *      the authenticator can produce, so the ciphertext is genuinely bound to
 *      the passkey. Nothing usable is left on disk.
 *   2. Device-secret fallback — for authenticators without PRF, a random
 *      32-byte device secret is generated and stored alongside the ciphertext.
 *      A successful passkey assertion is still required by the app before the
 *      seed is decrypted, but the binding is enforced by the app rather than
 *      the authenticator.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

export const b64 = {
  encode(bytes: Uint8Array | ArrayBuffer): string {
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let s = '';
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s);
  },
  decode(value: string): Uint8Array {
    const s = atob(value);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  },
};

export const b64url = {
  encode(bytes: Uint8Array | ArrayBuffer): string {
    return b64.encode(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  decode(value: string): Uint8Array {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/');
    return b64.decode(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
  },
};

export type KdfKind = 'prf' | 'device';

/** Stable PRF input so the same passkey always yields the same AES key. */
export const PRF_SALT = enc.encode('cardforge:wallet:v1');

const importHkdf = (raw: Uint8Array) =>
  crypto.subtle.importKey('raw', raw as unknown as BufferSource, 'HKDF', false, ['deriveKey']);

/** HKDF-SHA256 the raw key material into an AES-GCM key. */
export const deriveAesKey = async (rawMaterial: Uint8Array, salt: Uint8Array): Promise<CryptoKey> => {
  const base = await importHkdf(rawMaterial);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt as unknown as BufferSource,
      info: enc.encode('cardforge-stacks-seed'),
    },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

export interface SealedSeed {
  iv: string;
  ciphertext: string;
  salt: string;
}

export const sealSeed = async (key: CryptoKey, plaintext: string, salt: Uint8Array): Promise<SealedSeed> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    enc.encode(plaintext) as unknown as BufferSource,
  );
  return { iv: b64.encode(iv), ciphertext: b64.encode(ct), salt: b64.encode(salt) };
};

export const openSeed = async (key: CryptoKey, sealed: SealedSeed): Promise<string> => {
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64.decode(sealed.iv) as unknown as BufferSource },
    key,
    b64.decode(sealed.ciphertext) as unknown as BufferSource,
  );
  return dec.decode(pt);
};

export const randomSalt = () => crypto.getRandomValues(new Uint8Array(32));
