/**
 * Device-only Stacks wallet vault.
 *
 * Holds the AES-GCM-encrypted 24-word recovery phrase in localStorage, keyed to
 * the user's passkey (see passkeyCrypto.ts). The decrypted seed and derived
 * private key live in memory only, and are wiped on lock / sign-out / reload.
 *
 * Nothing in this file ever transmits the seed, the private key, or the AES key.
 */

import { generateSecretKey, generateWallet, getStxAddress } from '@stacks/wallet-sdk';
import {
  b64,
  b64url,
  deriveAesKey,
  openSeed,
  PRF_SALT,
  randomSalt,
  sealSeed,
  type KdfKind,
  type SealedSeed,
} from '@/lib/passkeyCrypto';
import type { StacksNetwork } from '@/lib/stacksMint';

const VAULT_KEY = 'cf_wallet_vault_v1';

interface VaultRecord extends SealedSeed {
  version: 1;
  credentialId: string;
  address: { testnet: string; mainnet: string };
  kdf: KdfKind;
  /** Only present for the `device` fallback KDF. */
  deviceSecret?: string;
  backedUp: boolean;
  createdAt: string;
}

/* --------------------------- persistence --------------------------- */

export const readVault = (): VaultRecord | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VaultRecord;
    return parsed?.version === 1 && parsed.ciphertext ? parsed : null;
  } catch {
    return null;
  }
};

const writeVault = (record: VaultRecord) => {
  localStorage.setItem(VAULT_KEY, JSON.stringify(record));
};

export const hasEmbeddedWallet = () => readVault() !== null;

export const clearVault = () => {
  try {
    localStorage.removeItem(VAULT_KEY);
  } catch {
    /* ignore */
  }
  lockWallet();
};

export const markBackedUp = () => {
  const v = readVault();
  if (!v) return;
  writeVault({ ...v, backedUp: true });
};

export const isBackedUp = () => readVault()?.backedUp ?? false;

export const getVaultAddress = (network: StacksNetwork): string | null =>
  readVault()?.address?.[network] ?? null;

export const getVaultCredentialId = (): string | null => readVault()?.credentialId ?? null;

/* --------------------------- key material --------------------------- */

/**
 * Ask the authenticator for PRF output for a specific credential. Returns null
 * when the authenticator or browser does not support the PRF extension.
 */
const tryGetPrfMaterial = async (credentialId: string): Promise<Uint8Array | null> => {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: challenge as unknown as BufferSource,
        allowCredentials: [
          {
            id: b64url.decode(credentialId) as unknown as BufferSource,
            type: 'public-key',
          },
        ],
        userVerification: 'required',
        timeout: 60_000,
        extensions: {
          // `prf` is not in the DOM lib typings yet.
          prf: { eval: { first: PRF_SALT } },
        } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null;
    if (!assertion) return null;
    const results = assertion.getClientExtensionResults() as {
      prf?: { results?: { first?: ArrayBuffer } };
    };
    const first = results?.prf?.results?.first;
    return first ? new Uint8Array(first) : null;
  } catch {
    return null;
  }
};

/** Material for the fallback KDF: random device secret + credential id. */
const deviceMaterial = (deviceSecret: string, credentialId: string): Uint8Array => {
  const a = b64.decode(deviceSecret);
  const b = new TextEncoder().encode(credentialId);
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
};

/* --------------------------- in-memory unlock --------------------------- */

interface Unlocked {
  seedPhrase: string;
  privateKey: string;
  address: { testnet: string; mainnet: string };
}

let unlocked: Unlocked | null = null;

export const isUnlocked = () => unlocked !== null;

export const lockWallet = () => {
  unlocked = null;
};

const deriveFromSeed = async (seedPhrase: string) => {
  const wallet = await generateWallet({ secretKey: seedPhrase, password: '' });
  const account = wallet.accounts[0];
  return {
    seedPhrase,
    privateKey: account.stxPrivateKey,
    address: {
      testnet: getStxAddress({ account, network: 'testnet' }),
      mainnet: getStxAddress({ account, network: 'mainnet' }),
    },
  } satisfies Unlocked;
};

/* --------------------------- create / unlock --------------------------- */

export interface CreatedWallet {
  seedPhrase: string;
  address: { testnet: string; mainnet: string };
  kdf: KdfKind;
}

/**
 * Generate a brand-new 24-word wallet and seal it under the given passkey.
 * Returns the phrase once, so the UI can show the backup screen. After the user
 * confirms the backup, call markBackedUp().
 */
export const createWalletForPasskey = async (credentialId: string): Promise<CreatedWallet> => {
  const seedPhrase = generateSecretKey(256);
  const derived = await deriveFromSeed(seedPhrase);

  const prf = await tryGetPrfMaterial(credentialId);
  const salt = randomSalt();
  let kdf: KdfKind;
  let material: Uint8Array;
  let deviceSecret: string | undefined;

  if (prf) {
    kdf = 'prf';
    material = prf;
  } else {
    kdf = 'device';
    deviceSecret = b64.encode(crypto.getRandomValues(new Uint8Array(32)));
    material = deviceMaterial(deviceSecret, credentialId);
  }

  const key = await deriveAesKey(material, salt);
  const sealed = await sealSeed(key, seedPhrase, salt);

  writeVault({
    version: 1,
    credentialId,
    address: derived.address,
    kdf,
    deviceSecret,
    backedUp: false,
    createdAt: new Date().toISOString(),
    ...sealed,
  });

  unlocked = derived;
  return { seedPhrase, address: derived.address, kdf };
};

/** Restore an existing 24-word phrase onto this device under a passkey. */
export const importWalletForPasskey = async (
  credentialId: string,
  seedPhrase: string,
): Promise<CreatedWallet> => {
  const words = seedPhrase.trim().toLowerCase().split(/\s+/);
  if (words.length !== 12 && words.length !== 24) {
    throw new Error('A recovery phrase must be 12 or 24 words.');
  }
  const normalized = words.join(' ');
  const derived = await deriveFromSeed(normalized);

  const prf = await tryGetPrfMaterial(credentialId);
  const salt = randomSalt();
  const kdf: KdfKind = prf ? 'prf' : 'device';
  const deviceSecret = prf ? undefined : b64.encode(crypto.getRandomValues(new Uint8Array(32)));
  const material = prf ?? deviceMaterial(deviceSecret!, credentialId);

  const key = await deriveAesKey(material, salt);
  const sealed = await sealSeed(key, normalized, salt);

  writeVault({
    version: 1,
    credentialId,
    address: derived.address,
    kdf,
    deviceSecret,
    backedUp: true,
    createdAt: new Date().toISOString(),
    ...sealed,
  });

  unlocked = derived;
  return { seedPhrase: normalized, address: derived.address, kdf };
};

/**
 * Unlock the vault. For `prf` vaults this triggers a Face ID / Touch ID prompt
 * and cannot succeed without the authenticator. For `device` vaults the caller
 * must have already verified a passkey assertion.
 */
export const unlockWallet = async (): Promise<Unlocked> => {
  if (unlocked) return unlocked;
  const vault = readVault();
  if (!vault) throw new Error('No wallet on this device. Sign in with your passkey or restore your recovery phrase.');

  let material: Uint8Array | null = null;
  if (vault.kdf === 'prf') {
    material = await tryGetPrfMaterial(vault.credentialId);
    if (!material) {
      throw new Error('Could not unlock the wallet with your passkey. Try again on the device where it was created.');
    }
  } else {
    if (!vault.deviceSecret) throw new Error('Wallet vault is corrupt. Restore from your recovery phrase.');
    material = deviceMaterial(vault.deviceSecret, vault.credentialId);
  }

  const key = await deriveAesKey(material, b64.decode(vault.salt));
  let seedPhrase: string;
  try {
    seedPhrase = await openSeed(key, vault);
  } catch {
    throw new Error('Wallet decryption failed. Restore from your 24-word recovery phrase.');
  }

  unlocked = await deriveFromSeed(seedPhrase);
  return unlocked;
};

/** Reveal the phrase for the backup screen. Requires an unlock. */
export const revealSeedPhrase = async (): Promise<string> => (await unlockWallet()).seedPhrase;

/** Private key for local transaction signing. Requires an unlock. */
export const getSigningKey = async (): Promise<string> => (await unlockWallet()).privateKey;
