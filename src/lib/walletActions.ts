/**
 * Embedded-wallet on-chain actions: balances, STX transfers, SIP-10 transfers
 * and SIP-009 NFT transfers.
 *
 * Every signing call goes through walletVault.getSigningKey(), which requires an
 * unlocked (passkey-decrypted) seed. The private key stays in memory.
 */

import {
  Cl,
  Pc,
  PostConditionMode,
  broadcastTransaction,
  makeContractCall,
  makeSTXTokenTransfer,
  validateStacksAddress,
} from '@stacks/transactions';
import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';
import { getSigningKey } from '@/lib/walletVault';
import type { StacksNetwork } from '@/lib/stacksMint';

const apiBase = (network: StacksNetwork) =>
  network === 'mainnet' ? 'https://api.hiro.so' : 'https://api.testnet.hiro.so';

const netObj = (network: StacksNetwork) => (network === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET);

export const MICRO = 1_000_000;

export const toMicroStx = (stx: string | number): bigint => {
  const n = typeof stx === 'number' ? stx : Number(stx);
  if (!Number.isFinite(n) || n <= 0) throw new Error('Enter an amount greater than zero.');
  return BigInt(Math.round(n * MICRO));
};

export const formatStx = (micro: string | number | bigint, decimals = 6): string => {
  const v = Number(micro) / MICRO;
  return v.toLocaleString(undefined, { maximumFractionDigits: decimals });
};

export const assertRecipient = (address: string) => {
  const clean = address.trim();
  if (!clean || !validateStacksAddress(clean)) {
    throw new Error('That is not a valid Stacks address (it should start with SP or ST).');
  }
  return clean;
};

/* ------------------------------- balances ------------------------------- */

export interface TokenBalance {
  /** Fully-qualified asset identifier, e.g. SP…​.token::my-token */
  assetId: string;
  contractId: string;
  symbol: string;
  balance: string;
  decimals: number;
}

export interface WalletBalances {
  stxMicro: string;
  stxLockedMicro: string;
  tokens: TokenBalance[];
  nftCount: number;
}

interface HiroBalances {
  stx?: { balance?: string; locked?: string };
  fungible_tokens?: Record<string, { balance?: string }>;
  non_fungible_tokens?: Record<string, { count?: string }>;
}

/** SIP-10 metadata is optional on Hiro; fall back to the asset name. */
const decorateToken = (assetId: string, balance: string): TokenBalance => {
  const [contractId, assetName = ''] = assetId.split('::');
  return {
    assetId,
    contractId,
    symbol: (assetName || contractId.split('.')[1] || 'TOKEN').toUpperCase(),
    balance,
    decimals: 6,
  };
};

export const fetchWalletBalances = async (
  address: string,
  network: StacksNetwork,
): Promise<WalletBalances> => {
  const res = await fetch(`${apiBase(network)}/extended/v1/address/${address}/balances`);
  if (!res.ok) throw new Error(`Could not load balances (${res.status}).`);
  const data = (await res.json()) as HiroBalances;

  const tokens = Object.entries(data.fungible_tokens ?? {})
    .map(([assetId, v]) => decorateToken(assetId, v.balance ?? '0'))
    .filter((t) => BigInt(t.balance || '0') > 0n);

  const nftCount = Object.values(data.non_fungible_tokens ?? {}).reduce(
    (sum, v) => sum + Number(v.count ?? 0),
    0,
  );

  return {
    stxMicro: data.stx?.balance ?? '0',
    stxLockedMicro: data.stx?.locked ?? '0',
    tokens,
    nftCount,
  };
};

export interface OwnedNft {
  assetId: string;
  contractId: string;
  tokenId: string;
}

export const fetchOwnedNfts = async (
  address: string,
  network: StacksNetwork,
): Promise<OwnedNft[]> => {
  const res = await fetch(
    `${apiBase(network)}/extended/v1/tokens/nft/holdings?principal=${address}&limit=50`,
  );
  if (!res.ok) return [];
  const data = (await res.json()) as {
    results?: Array<{ asset_identifier?: string; value?: { repr?: string } }>;
  };
  return (data.results ?? [])
    .map((r) => {
      const assetId = r.asset_identifier ?? '';
      const repr = r.value?.repr ?? '';
      return {
        assetId,
        contractId: assetId.split('::')[0],
        tokenId: repr.replace(/^u/, ''),
      };
    })
    .filter((n) => n.contractId && n.tokenId);
};

/* ------------------------------- transfers ------------------------------- */

const broadcast = async (
  // deno-lint-ignore no-explicit-any
  transaction: Awaited<ReturnType<typeof makeSTXTokenTransfer>>,
  network: StacksNetwork,
): Promise<string> => {
  const result = await broadcastTransaction({ transaction, network: netObj(network) });
  const failed = result as unknown as { error?: string; reason?: string; txid?: string };
  if (failed.error || !failed.txid) {
    throw new Error(failed.reason ? `${failed.error ?? 'Rejected'} — ${failed.reason}` : failed.error ?? 'Broadcast failed');
  }
  return failed.txid.startsWith('0x') ? failed.txid : `0x${failed.txid}`;
};

export const sendStx = async (args: {
  recipient: string;
  amountStx: string;
  memo?: string;
  network: StacksNetwork;
}): Promise<string> => {
  const recipient = assertRecipient(args.recipient);
  const amount = toMicroStx(args.amountStx);
  const senderKey = await getSigningKey();

  const transaction = await makeSTXTokenTransfer({
    recipient,
    amount,
    senderKey,
    network: netObj(args.network),
    memo: (args.memo ?? '').slice(0, 34),
    fee: BigInt(3000),
  });
  return broadcast(transaction, args.network);
};

/** SIP-10 `transfer` (amount, sender, recipient, memo optional-buffer). */
export const sendSip10 = async (args: {
  assetId: string;
  recipient: string;
  amount: string;
  decimals?: number;
  senderAddress: string;
  network: StacksNetwork;
}): Promise<string> => {
  const recipient = assertRecipient(args.recipient);
  const [contractId, assetName] = args.assetId.split('::');
  const [contractAddress, contractName] = contractId.split('.');
  if (!contractAddress || !contractName || !assetName) {
    throw new Error('Malformed token identifier.');
  }

  const decimals = args.decimals ?? 6;
  const raw = Number(args.amount);
  if (!Number.isFinite(raw) || raw <= 0) throw new Error('Enter an amount greater than zero.');
  const base = BigInt(Math.round(raw * 10 ** decimals));

  const senderKey = await getSigningKey();
  const transaction = await makeContractCall({
    contractAddress,
    contractName,
    functionName: 'transfer',
    functionArgs: [
      Cl.uint(base),
      Cl.principal(args.senderAddress),
      Cl.principal(recipient),
      Cl.none(),
    ],
    senderKey,
    network: netObj(args.network),
    fee: BigInt(3000),
    postConditionMode: PostConditionMode.Deny,
    postConditions: [
      Pc.principal(args.senderAddress).willSendEq(base).ft(contractId as `${string}.${string}`, assetName),
    ],
  });
  return broadcast(transaction, args.network);
};

/** SIP-009 `transfer` (token-id, sender, recipient). */
export const sendNft = async (args: {
  contractId: string;
  assetName?: string;
  tokenId: string | number;
  recipient: string;
  senderAddress: string;
  network: StacksNetwork;
}): Promise<string> => {
  const recipient = assertRecipient(args.recipient);
  const [contractAddress, contractName] = args.contractId.split('.');
  if (!contractAddress || !contractName) throw new Error('Malformed NFT contract id.');

  const tokenId = BigInt(String(args.tokenId).replace(/^u/, ''));
  const senderKey = await getSigningKey();

  const transaction = await makeContractCall({
    contractAddress,
    contractName,
    functionName: 'transfer',
    functionArgs: [Cl.uint(tokenId), Cl.principal(args.senderAddress), Cl.principal(recipient)],
    senderKey,
    network: netObj(args.network),
    fee: BigInt(3000),
    // NFT contracts vary in how they emit the asset event; allow-mode keeps
    // transfers working across SIP-009 implementations.
    postConditionMode: PostConditionMode.Allow,
    postConditions: [],
  });
  return broadcast(transaction, args.network);
};

/**
 * Bitcoin note: a Stacks account cannot spend native BTC. Sending real BTC
 * needs a separate Bitcoin key path / signer, which this wallet does not hold.
 */
export const BTC_UNSUPPORTED_REASON =
  'Native BTC sending is not available: this wallet holds Stacks keys only. Use sBTC (a SIP-10 token) to move Bitcoin value on Stacks.';
