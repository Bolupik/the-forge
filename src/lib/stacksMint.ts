import { request } from '@stacks/connect';
import {
  Cl,
  makeUnsignedContractCall,
  makeContractCall,
  serializeTransaction,
  deserializeTransaction,
  PostConditionMode,
  fetchNonce,
  validateStacksAddress,
  type ClarityValue,
} from '@stacks/transactions';
import { readEdgeError } from '@/lib/edgeError';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
import { supabase } from '@/integrations/supabase/client';
import { getSigningKey, getVaultAddress, hasEmbeddedWallet } from '@/lib/walletVault';
import type { NFTCard } from '@/lib/cardforge';


export type StacksNetwork = 'mainnet' | 'testnet';

const NETWORK_LS_KEY = 'cf_stacks_network_v1';

const CONTRACT_LS_KEY = (n: StacksNetwork) => `cf_stacks_contract_${n}_v1`;
const CONTRACT_NAME_LS_KEY = 'cf_stacks_contract_name_v1';

/**
 * The runtime chain-config UI (network toggle + "Set contract") was removed, so
 * env is now the single source of truth. Older builds persisted overrides in
 * localStorage that can still be stale (e.g. a v1 contract name that lacks
 * mint-pack), which makes the wallet fail with "unable to find the function
 * metadata". Purge those legacy keys once on load so they can never win again.
 */
const purgeLegacyChainOverrides = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CONTRACT_NAME_LS_KEY);
    localStorage.removeItem(CONTRACT_LS_KEY('testnet'));
    localStorage.removeItem(CONTRACT_LS_KEY('mainnet'));
  } catch {
    /* ignore */
  }
};
purgeLegacyChainOverrides();

export const getSelectedNetwork = (): StacksNetwork => {
  if (typeof window === 'undefined') return 'testnet';
  const stored = localStorage.getItem(NETWORK_LS_KEY);
  if (stored === 'mainnet' || stored === 'testnet') return stored;
  const env = (import.meta.env.VITE_STACKS_NETWORK as string | undefined) ?? 'testnet';
  return env === 'mainnet' ? 'mainnet' : 'testnet';
};

export const setSelectedNetwork = (network: StacksNetwork) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NETWORK_LS_KEY, network);
};

export interface ContractConfig {
  address: string;
  name: string;
  network: StacksNetwork;
}

/**
 * Contract name comes from env only. `.contract-name` suffixes are stripped in
 * case someone set the env to a full principal by mistake.
 */
export const getContractName = (): string => {
  const raw = (import.meta.env.VITE_STACKS_CONTRACT_NAME as string | undefined)?.trim();
  const name = raw && raw.includes('.') ? raw.slice(raw.indexOf('.') + 1) : raw;
  return name || 'cardforge-nft-v2';
};

export const getContractConfig = (): ContractConfig | null => {
  const network = getSelectedNetwork();
  const name = getContractName();

  // Env is the source of truth (the runtime override UI was removed).
  // 1. Legacy single-address env override
  const legacyAddress = (import.meta.env.VITE_STACKS_CONTRACT_ADDRESS as string | undefined)?.trim();
  // 2. Per-network env address
  const networkAddress = (network === 'mainnet'
    ? (import.meta.env.VITE_STACKS_CONTRACT_ADDRESS_MAINNET as string | undefined)
    : (import.meta.env.VITE_STACKS_CONTRACT_ADDRESS_TESTNET as string | undefined)
  )?.trim();

  const defaultAddress = network === 'testnet'
    ? 'STFZPM830QBMN1P2QJ6WQXTM788Z5PV35TWA3JGB'
    : undefined;

  const rawAddress = legacyAddress || networkAddress || defaultAddress;
  if (!rawAddress) return null;

  // Tolerate a full contract principal in env (e.g. "ST….cardforge-nft-v2"):
  // strip any ".contract-name" suffix so the bare address is what gets
  // c32-decoded. The name still comes from getContractName().
  const dotIdx = rawAddress.indexOf('.');
  const address = dotIdx === -1 ? rawAddress : rawAddress.slice(0, dotIdx);

  return { address, name, network };
};

export const getTreasuryAddress = (): string | null => {
  const network = getSelectedNetwork();

  const legacy = (import.meta.env.VITE_STACKS_TREASURY_ADDRESS as string | undefined)?.trim();
  const perNetwork = (network === 'mainnet'
    ? (import.meta.env.VITE_STACKS_TREASURY_ADDRESS_MAINNET as string | undefined)
    : (import.meta.env.VITE_STACKS_TREASURY_ADDRESS_TESTNET as string | undefined)
  )?.trim();

  // Sensible default: user-provided testnet treasury address.
  const fallback = network === 'testnet' ? 'ST6E59CS9Z7J1G5SDTH65B526G7HM59RENBCJKE6' : undefined;
  return legacy || perNetwork || fallback || null;
};

export const getMintPriceDisplay = (network: StacksNetwork): string => {
  // Contract mint-price is currently u5000000 on both testnet and mainnet (5 STX).
  if (network === 'testnet') return '5 STX';
  return '5 STX';
};

export const explorerTxUrl = (txid: string, network: StacksNetwork) =>
  `https://explorer.hiro.so/txid/${txid}?chain=${network}`;

const nodeBaseUrl = (network: StacksNetwork) =>
  network === 'mainnet' ? 'https://api.hiro.so' : 'https://api.testnet.hiro.so';

const stacksNetworkObj = (network: StacksNetwork) =>
  network === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;

/** Map on-chain contract abort codes (from `(err uN)`) to human phrases. */
const CONTRACT_ERR_CODES: Record<string, string> = {
  u100: 'Owner-only action (err u100).',
  u101: 'Not the token owner (err u101).',
  u102: 'Token not found (err u102).',
  u103: 'Listing price must be greater than zero (err u103).',
  u104: 'Card is already listed (err u104).',
  u105: 'Card is not listed (err u105).',
  u106: 'You cannot buy your own listing (err u106).',
  u107: 'Max supply reached — no more cards can be minted (err u107).',
  u108: 'Minting is currently disabled on the contract (err u108).',
  u109: 'Invalid rarity value passed to the contract (err u109).',
  u110: 'Invalid supply configuration (err u110).',
  u111: 'Pack must contain at least one card (err u111).',
};

/** Map Stacks node reject-reason codes to friendlier explanations. */
const NODE_REASON_HINTS: Record<string, string> = {
  ConflictingNonceInMempool: 'Another transaction with the same nonce is already pending. Wait for it to confirm or bump the nonce.',
  BadNonce: 'Your wallet used a stale nonce. Refresh the wallet and try again.',
  NotEnoughFunds: 'Not enough STX in the wallet to cover mint price + fee. Fund the wallet from the testnet faucet.',
  FeeTooLow: 'The transaction fee is below the network minimum. Try again.',
  ContractAlreadyExists: 'A contract with this name is already deployed at this address.',
  NoSuchContract: 'The target contract does not exist on this network. Check the contract address / network.',
  NoSuchPublicFunction: 'The contract does not expose this function. It may be a different version than the app expects.',
  BadFunctionArgument: 'One of the arguments failed the contract\'s type or length check.',
  AbortByResponse: 'The contract aborted the call.',
  AbortByPostCondition: 'A post-condition rejected the transfer.',
  SignatureValidation: 'Signature validation failed. Reconnect the wallet and try again.',
};

const formatNodeReason = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return 'Empty response from node';

  // Try structured JSON first: { error, reason, reason_data: { message, ... } }
  try {
    const j = JSON.parse(trimmed);
    const reason: string = j.reason || j.error || '';
    const hint = reason && NODE_REASON_HINTS[reason];
    const data = j.reason_data ?? {};

    // Contract abort → extract the (err uN) code from repr like "(err u107)"
    if (reason === 'AbortByResponse' || reason === 'AbortByPostCondition') {
      const repr: string = data?.response?.repr ?? data?.repr ?? '';
      const m = repr.match(/\(err\s+(u\d+)\)/);
      if (m && CONTRACT_ERR_CODES[m[1]]) {
        return `Contract rejected the mint: ${CONTRACT_ERR_CODES[m[1]]}`;
      }
      if (repr) return `Contract aborted: ${repr}`;
    }

    const dataMsg = data?.message || data?.expected || '';
    const parts = [hint || reason || 'Unknown reason', dataMsg].filter(Boolean);
    return parts.join(' — ');
  } catch {
    /* not JSON */
  }
  // Non-JSON body (e.g. HTML 502): keep first line only
  return trimmed.split('\n')[0].slice(0, 240);
};

/**
 * Broadcast a signed transaction ourselves against a known-healthy Hiro node.
 * Parses the node's real reason on failure and maps common codes to plain English.
 */
const broadcastRawTx = async (rawTxHex: string, network: StacksNetwork): Promise<string> => {
  const clean = rawTxHex.startsWith('0x') ? rawTxHex.slice(2) : rawTxHex;
  const body = new Uint8Array(clean.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));

  let res: Response;
  try {
    res = await fetch(`${nodeBaseUrl(network)}/v2/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body,
    });
  } catch (e) {
    throw new Error(`Could not reach the Stacks ${network} node: ${e instanceof Error ? e.message : String(e)}`);
  }

  const text = await res.text();
  if (!res.ok) {
    const reason = formatNodeReason(text);
    console.error('[mint] node rejected tx', { status: res.status, body: text });
    throw new Error(`Stacks node ${res.status}: ${reason}`);
  }

  const txid = text.replace(/^"|"$/g, '').trim();
  return txid.startsWith('0x') ? txid : `0x${txid}`;
};

/**
 * Sign a contract call and broadcast it ourselves.
 *
 * Two signer paths:
 *  - embedded (passkey wallet): the 24-word vault on this device holds the key,
 *    so we sign locally. No Stacks Connect modal, so passkey-only users never
 *    see the "Connect a wallet / install Leather or Xverse" dialog.
 *  - connect (Xverse / Leather): build unsigned, ask the wallet to sign only,
 *    then broadcast to a Hiro node we trust.
 */
const signAndBroadcastCall = async (args: {
  cfg: ContractConfig;
  functionName: string;
  functionArgs: ClarityValue[];
  fee: bigint;
}): Promise<string> => {
  const { cfg, functionName, functionArgs, fee } = args;
  const network = stacksNetworkObj(cfg.network);

  // --- embedded passkey wallet: local signing -----------------------------
  if (hasEmbeddedWallet()) {
    const senderAddress = getVaultAddress(cfg.network);
    if (!senderAddress) {
      throw new Error('Your passkey wallet has no address for this network. Open the Wallet page and restore it.');
    }
    const senderKey = await getSigningKey(); // triggers the passkey unlock prompt
    const nonce = await fetchNonce({ address: senderAddress, network });
    const tx = await makeContractCall({
      contractAddress: cfg.address,
      contractName: cfg.name,
      functionName,
      functionArgs,
      senderKey,
      network,
      nonce,
      fee,
      postConditionMode: PostConditionMode.Allow,
      postConditions: [],
    });
    return broadcastRawTx(serializeTransaction(tx), cfg.network);
  }

  // --- external wallet: sign-only via Stacks Connect -----------------------
  const addrRes = (await request('stx_getAddresses')) as {
    addresses?: Array<{ address: string; publicKey: string }>;
  };
  const stxEntry = addrRes?.addresses?.find((a) => a.address?.startsWith('S'));
  const publicKey = stxEntry?.publicKey;
  const senderAddress = stxEntry?.address;
  if (!publicKey || !senderAddress) {
    throw new Error('Could not read your wallet public key. Reconnect the wallet and try again.');
  }
  if (!validateStacksAddress(senderAddress)) {
    throw new Error(`Your wallet returned an invalid Stacks address ("${senderAddress}"). Reconnect it on ${cfg.network}.`);
  }

  const nonce = await fetchNonce({ address: senderAddress, network });
  const unsigned = await makeUnsignedContractCall({
    contractAddress: cfg.address,
    contractName: cfg.name,
    functionName,
    functionArgs,
    publicKey,
    network,
    nonce,
    fee,
    postConditionMode: PostConditionMode.Allow,
    postConditions: [],
  });

  const signRes = (await request('stx_signTransaction', {
    transaction: serializeTransaction(unsigned),
    broadcast: false,
  })) as { transaction?: string };
  const signedHex = signRes?.transaction;
  if (!signedHex) throw new Error('Wallet did not return a signed transaction');

  const signedTx = deserializeTransaction(signedHex);
  return broadcastRawTx(serializeTransaction(signedTx), cfg.network);
};


interface MintArgs {
  card: NFTCard;
  recipient: string;       // signer's STX address (tx-sender)
}

interface MintResult {
  txid: string;
  metadataUrl: string;
  imageUrl: string;
}

/**
 * 1. Ensure card has a public-https metadata URL (uploads to Supabase Storage
 *    via the store-card-metadata edge function if missing).
 * 2. Prompts the user's wallet to call mint-card on the CardForge SIP-009
 *    contract. The signer (tx-sender) is the recipient.
 * 3. Persists the resulting txid + pending status on the card row.
 */
const assertValidContractAddress = (cfg: ContractConfig) => {
  if (!validateStacksAddress(cfg.address)) {
    throw new Error(
      `The configured contract address "${cfg.address}" is not a valid Stacks address. ` +
        `Open "Set contract" in the chain bar and paste the correct ${cfg.network} deployer address (starts with ${cfg.network === 'mainnet' ? 'SP' : 'ST'}).`
    );
  }
};

export const mintCardOnChain = async ({ card }: MintArgs): Promise<MintResult> => {
  const cfg = getContractConfig();
  if (!cfg) throw new Error('Contract not configured. Set the contract address for the selected network in env.');
  assertValidContractAddress(cfg);

  // Pin metadata to Supabase Storage (SIP-016 compatible)
  const { data: pinned, error: pinErr } = await supabase.functions.invoke('store-card-metadata', {
    body: {
      cardId: card.id,
      name: card.name,
      description: card.description,
      rarity: card.rarity,
      element: card.element,
      stats: card.stats,
      imageUrl: card.imageUrl,
      serial: card.serial,
    },
  });
  if (pinErr || !pinned?.metadataUrl) {
    throw new Error(pinErr?.message || 'Failed to pin metadata');
  }
  const metadataUrl: string = pinned.metadataUrl;
  const imageUrl: string = pinned.imageUrl;

  // Map NFTCard fields to the contract's mint-card arguments.
  // IMPORTANT: the contract types these as `string-ascii`, which only allows
  // bytes 0x00–0x7F. Card fields like `element` carry emoji (e.g. "⚡ ELECTRIC")
  // and names may contain accented/curly characters. `Cl.stringAscii` does NOT
  // reject these — it silently emits bytes > 127, producing an invalid
  // string-ascii that the Stacks node refuses to deserialize. The wallet then
  // surfaces the node's non-JSON error body as "unable to parse node response".
  // Strip everything outside printable ASCII before encoding, then truncate to
  // the Clarity length limits.
  const toAscii = (s: string, max: number) =>
    s.normalize('NFKD').replace(/[^\x20-\x7E]/g, '').trim().slice(0, max);

  const name = toAscii(card.name, 64) || 'CardForge Card';
  const rarity = toAscii(card.rarity, 16);
  const cardType = toAscii(card.element, 32) || 'UNKNOWN';
  const power = Math.max(0, Math.floor(card.stats.ATK));
  const defense = Math.max(0, Math.floor(card.stats.DEF));
  const imageUri = toAscii(imageUrl, 256);
  const tokenUri = toAscii(metadataUrl, 256);

  const functionArgs: ClarityValue[] = [
    Cl.stringAscii(name),
    Cl.stringAscii(rarity),
    Cl.stringAscii(cardType),
    Cl.uint(power),
    Cl.uint(defense),
    Cl.stringAscii(imageUri),
    Cl.stringAscii(tokenUri),
  ];

  // Sign (passkey vault locally, or external wallet sign-only) + self-broadcast.
  const txid = await signAndBroadcastCall({
    cfg,
    functionName: 'mint-card',
    functionArgs,
    fee: BigInt(200000),
  });


  await supabase
    .from('nft_cards')
    .update({ tx_id: txid, chain_status: 'pending', metadata_url: metadataUrl, image_url: imageUrl })
    .eq('id', card.id);

  return { txid, metadataUrl, imageUrl };
};

interface MintPackArgs {
  cards: NFTCard[];
}

interface MintPackResult {
  txid: string;
}

/**
 * Mint a whole pack in ONE transaction via the contract's `mint-pack` function:
 * a single wallet signature and a single `mint-price` (5 STX) payment for all
 * cards. Uses the same sign-only + self-broadcast flow as mintCardOnChain.
 */
export const mintPackOnChain = async ({ cards }: MintPackArgs): Promise<MintPackResult> => {
  const cfg = getContractConfig();
  if (!cfg) throw new Error('Contract not configured. Set the contract address for the selected network in env.');
  assertValidContractAddress(cfg);
  if (cards.length === 0 || cards.length > 10) {
    throw new Error('A pack must contain between 1 and 10 cards.');
  }

  const toAscii = (s: string, max: number) =>
    s.normalize('NFKD').replace(/[^\x20-\x7E]/g, '').trim().slice(0, max);

  // Pin metadata for every card first (parallel), so each has a public
  // SIP-016 metadata URL before anything touches the chain.
  const pins = await Promise.all(
    cards.map(async (card) => {
      const { data: pinned, error: pinErr } = await supabase.functions.invoke('store-card-metadata', {
        body: {
          cardId: card.id,
          name: card.name,
          description: card.description,
          rarity: card.rarity,
          element: card.element,
          stats: card.stats,
          imageUrl: card.imageUrl,
          serial: card.serial,
        },
      });
      if (pinErr || !pinned?.metadataUrl) {
        throw new Error(pinErr ? await readEdgeError(pinErr, `Failed to pin metadata for ${card.name}`) : `Failed to pin metadata for ${card.name}`);
      }
      return { card, metadataUrl: pinned.metadataUrl as string, imageUrl: pinned.imageUrl as string };
    })
  );

  // Build the (list 10 {…}) argument for mint-pack.
  const cardTuples = pins.map(({ card, metadataUrl, imageUrl }) =>
    Cl.tuple({
      name: Cl.stringAscii(toAscii(card.name, 64) || 'CardForge Card'),
      rarity: Cl.stringAscii(toAscii(card.rarity, 16)),
      'card-type': Cl.stringAscii(toAscii(card.element, 32) || 'UNKNOWN'),
      power: Cl.uint(Math.max(0, Math.floor(card.stats.ATK))),
      defense: Cl.uint(Math.max(0, Math.floor(card.stats.DEF))),
      'image-uri': Cl.stringAscii(toAscii(imageUrl, 256)),
      'token-uri': Cl.stringAscii(toAscii(metadataUrl, 256)),
    })
  );
  const functionArgs: ClarityValue[] = [Cl.list(cardTuples)];

  // A flat fee skips the pre-sign /v2/fees/transaction estimate, which hangs on
  // testnet for the larger mint-pack payload.
  const txid = await signAndBroadcastCall({
    cfg,
    functionName: 'mint-pack',
    functionArgs,
    fee: BigInt(300000),
  });


  // One tx covers the whole pack — persist the shared txid on every card row.
  await Promise.all(
    pins.map(({ card, metadataUrl, imageUrl }) =>
      supabase
        .from('nft_cards')
        .update({ tx_id: txid, chain_status: 'pending', metadata_url: metadataUrl, image_url: imageUrl })
        .eq('id', card.id)
    )
  );

  return { txid };
};

/** Poll Hiro API once and update card row when confirmed. */
export const pollTxStatus = async (cardId: string, txid: string, network: StacksNetwork): Promise<'pending' | 'confirmed' | 'failed'> => {
  const base = network === 'mainnet' ? 'https://api.hiro.so' : 'https://api.testnet.hiro.so';
  try {
    const res = await fetch(`${base}/extended/v1/tx/${txid}`);
    if (!res.ok) return 'pending';
    const data = await res.json();
    const status = data?.tx_status as string | undefined;
    if (status === 'success') {
      // Try to read on-chain token id from the print event
      let onChainId: number | null = null;
      const events = data?.events ?? [];
      for (const ev of events) {
        const val = ev?.contract_log?.value?.repr ?? '';
        const m = String(val).match(/id:\s*u(\d+)/);
        if (m) { onChainId = Number(m[1]); break; }
      }
      await supabase
        .from('nft_cards')
        .update({ chain_status: 'confirmed', on_chain_token_id: onChainId })
        .eq('id', cardId);
      return 'confirmed';
    }
    if (status === 'abort_by_response' || status === 'abort_by_post_condition') {
      await supabase.from('nft_cards').update({ chain_status: 'failed' }).eq('id', cardId);
      return 'failed';
    }
    return 'pending';
  } catch {
    return 'pending';
  }
};
