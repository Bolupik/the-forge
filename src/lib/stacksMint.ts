import { request } from '@stacks/connect';
import { Cl } from '@stacks/transactions';
import { supabase } from '@/integrations/supabase/client';
import type { NFTCard } from '@/lib/cardforge';

export type StacksNetwork = 'mainnet' | 'testnet';

export interface ContractConfig {
  address: string;
  name: string;
  network: StacksNetwork;
}

export const getContractConfig = (): ContractConfig | null => {
  const address = import.meta.env.VITE_STACKS_CONTRACT_ADDRESS as string | undefined;
  const name = (import.meta.env.VITE_STACKS_CONTRACT_NAME as string | undefined) || 'cardforge-nft';
  // Hard-locked to testnet for now. Ignore VITE_STACKS_NETWORK until mainnet launch.
  const network: StacksNetwork = 'testnet';
  if (!address) return null;
  return { address, name, network };
};

export const explorerTxUrl = (txid: string, network: StacksNetwork) =>
  `https://explorer.hiro.so/txid/${txid}?chain=${network}`;

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
  if (!cfg) throw new Error('Contract not configured. Set VITE_STACKS_CONTRACT_ADDRESS in env.');

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
  // Truncate to Clarity string-ascii limits.
  const name = card.name.trim().slice(0, 64);
  const rarity = card.rarity.trim().slice(0, 16);
  const cardType = card.element.trim().slice(0, 32);
  const power = Math.max(0, Math.floor(card.stats.ATK));
  const defense = Math.max(0, Math.floor(card.stats.DEF));
  const imageUri = imageUrl.trim().slice(0, 256);
  const tokenUri = metadataUrl.trim().slice(0, 256);

  const result = await request('stx_callContract', {
    contract: `${cfg.address}.${cfg.name}` as `${string}.${string}`,
    functionName: 'mint-card',
    functionArgs: [
      Cl.stringAscii(name),
      Cl.stringAscii(rarity),
      Cl.stringAscii(cardType),
      Cl.uint(power),
      Cl.uint(defense),
      Cl.stringAscii(imageUri),
      Cl.stringAscii(tokenUri),
    ],
    network: cfg.network,
  });

  const txid = (result as { txid?: string })?.txid;
  if (!txid) throw new Error('Wallet did not return a tx id');

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
