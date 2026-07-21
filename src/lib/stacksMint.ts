import { request } from '@stacks/connect';
import {
  Cl,
  makeUnsignedContractCall,
  serializeTransaction,
  deserializeTransaction,
  PostConditionMode,
  fetchNonce,
  type ClarityValue,
} from '@stacks/transactions';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
import { supabase } from '@/integrations/supabase/client';
import type { NFTCard } from '@/lib/cardforge';

export type StacksNetwork = 'mainnet' | 'testnet';

const NETWORK_LS_KEY = 'cf_stacks_network_v1';

const CONTRACT_LS_KEY = (n: StacksNetwork) => `cf_stacks_contract_${n}_v1`;
const CONTRACT_NAME_LS_KEY = 'cf_stacks_contract_name_v1';

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

export const getContractName = (): string => {
  if (typeof window !== 'undefined') {
    const ls = localStorage.getItem(CONTRACT_NAME_LS_KEY);
    if (ls && ls.trim()) return ls.trim();
  }
  return (import.meta.env.VITE_STACKS_CONTRACT_NAME as string | undefined) || 'cardforge-nft';
};

export const setContractName = (name: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONTRACT_NAME_LS_KEY, name.trim());
};

export const setContractAddress = (network: StacksNetwork, address: string) => {
  if (typeof window === 'undefined') return;
  const trimmed = address.trim();
  if (trimmed) localStorage.setItem(CONTRACT_LS_KEY(network), trimmed);
  else localStorage.removeItem(CONTRACT_LS_KEY(network));
};

export const getContractConfig = (): ContractConfig | null => {
  const network = getSelectedNetwork();
  const name = getContractName();

  // 1. LocalStorage override (runtime-editable in UI)
  const lsAddress = typeof window !== 'undefined'
    ? localStorage.getItem(CONTRACT_LS_KEY(network))?.trim()
    : undefined;
  // 2. Legacy single-address env override
  const legacyAddress = (import.meta.env.VITE_STACKS_CONTRACT_ADDRESS as string | undefined)?.trim();
  // 3. Per-network env address
  const networkAddress = (network === 'mainnet'
    ? (import.meta.env.VITE_STACKS_CONTRACT_ADDRESS_MAINNET as string | undefined)
    : (import.meta.env.VITE_STACKS_CONTRACT_ADDRESS_TESTNET as string | undefined)
  )?.trim();

  const defaultAddress = network === 'testnet'
    ? 'STFZPM830QBMN1P2QJ6WQXTM788Z5PV35TWA3JGB'
    : undefined;

  const address = lsAddress || legacyAddress || networkAddress || defaultAddress;
  if (!address) return null;
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

/**
 * Broadcast a signed transaction ourselves against a known-healthy Hiro node.
 *
 * We do NOT let the wallet broadcast (Xverse's Testnet4 broadcast returns a
 * non-JSON body that surfaces as "Failed to broadcast transaction — unable to
 * parse node response"). Instead we POST the raw serialized tx to
 * /v2/transactions and parse the node's real reason on failure.
 */
const broadcastRawTx = async (rawTxHex: string, network: StacksNetwork): Promise<string> => {
  const clean = rawTxHex.startsWith('0x') ? rawTxHex.slice(2) : rawTxHex;
  const body = new Uint8Array(clean.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));

  const res = await fetch(`${nodeBaseUrl(network)}/v2/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    // The node returns a JSON error like { error, reason, reason_data, txid }.
    let reason = text;
    try {
      const j = JSON.parse(text);
      reason = j.reason || j.error || text;
      if (j.reason_data) reason += ` — ${JSON.stringify(j.reason_data)}`;
    } catch {
      /* non-JSON body: keep raw text */
    }
    throw new Error(`Node rejected the transaction: ${reason}`);
  }

  // Success body is the txid as a JSON string ("abcd…") or bare hex.
  const txid = text.replace(/^"|"$/g, '').trim();
  return txid.startsWith('0x') ? txid : `0x${txid}`;
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
export const mintCardOnChain = async ({ card }: MintArgs): Promise<MintResult> => {
  const cfg = getContractConfig();
  if (!cfg) throw new Error('Contract not configured. Set the contract address for the selected network in env.');

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

  // --- Sign-only + self-broadcast --------------------------------------------
  // We do NOT use stx_callContract, because that makes the WALLET broadcast the
  // signed tx. Xverse's Testnet4 broadcast returns a non-JSON body that surfaces
  // as "Failed to broadcast transaction (unable to parse node response)".
  // Instead: fetch the signer's public key, build the unsigned tx ourselves,
  // ask the wallet to SIGN ONLY, then POST the signed tx to a healthy Hiro node.

  const network = stacksNetworkObj(cfg.network);

  // 1. Public key for the connected account (needed to build the unsigned tx).
  const addrRes = (await request('stx_getAddresses')) as {
    addresses?: Array<{ address: string; publicKey: string }>;
  };
  const stxEntry = addrRes?.addresses?.find((a) => a.address?.startsWith('S'));
  const publicKey = stxEntry?.publicKey;
  const senderAddress = stxEntry?.address;
  if (!publicKey || !senderAddress) {
    throw new Error('Could not read your wallet public key. Reconnect the wallet and try again.');
  }

  // 2. Current nonce for the signer.
  const nonce = await fetchNonce({ address: senderAddress, network });

  // 3. Build the unsigned contract-call tx. Allow-mode: the contract itself
  //    performs the STX transfer of mint-price to the treasury.
  const unsigned = await makeUnsignedContractCall({
    contractAddress: cfg.address,
    contractName: cfg.name,
    functionName: 'mint-card',
    functionArgs,
    publicKey,
    network,
    nonce,
    postConditionMode: PostConditionMode.Allow,
    postConditions: [],
  });

  // 4. Ask the wallet to sign (but not broadcast) the serialized tx.
  const signRes = (await request('stx_signTransaction', {
    transaction: serializeTransaction(unsigned),
    broadcast: false,
  })) as { transaction?: string };
  const signedHex = signRes?.transaction;
  if (!signedHex) throw new Error('Wallet did not return a signed transaction');

  // 5. Broadcast the signed tx ourselves to a node we trust.
  //    deserialize→reserialize normalizes whatever hex form the wallet returns.
  const signedTx = deserializeTransaction(signedHex);
  const txid = await broadcastRawTx(serializeTransaction(signedTx), cfg.network);

  await supabase
    .from('nft_cards')
    .update({ tx_id: txid, chain_status: 'pending', metadata_url: metadataUrl, image_url: imageUrl })
    .eq('id', card.id);

  return { txid, metadataUrl, imageUrl };
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
