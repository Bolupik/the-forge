import { useCallback, useEffect, useState } from 'react';
import { Copy, Check, Lock, RefreshCw, Send, Image as ImageIcon, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { useStacksAuth } from '@/contexts/StacksAuthContext';
import {
  BTC_UNSUPPORTED_REASON,
  fetchOwnedNfts,
  fetchWalletBalances,
  formatStx,
  sendNft,
  sendSip10,
  sendStx,
  type OwnedNft,
  type WalletBalances,
} from '@/lib/walletActions';
import { getSelectedNetwork } from '@/lib/stacksMint';
import { unlockWallet } from '@/lib/walletVault';

const shorten = (a: string) => (a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);

const fieldStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.35)',
  border: '1px solid var(--cf-border2)',
  color: 'var(--cf-fg)',
};

const primaryBtn: React.CSSProperties = {
  background: 'linear-gradient(135deg, #a02d22, #e0483a)',
  color: 'var(--cf-bg)',
  boxShadow: '0 4px 20px rgba(224,72,58,0.3)',
};

type Tab = 'send' | 'tokens' | 'nfts';

/**
 * Embedded wallet dashboard: deposit address + QR, STX balance, send STX,
 * send SIP-10 tokens, and transfer NFTs. Only rendered for passkey wallets.
 */
const WalletPanel = () => {
  const { userData } = useStacksAuth();
  const network = getSelectedNetwork();
  const address = userData?.address ?? '';

  const [tab, setTab] = useState<Tab>('send');
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [nfts, setNfts] = useState<OwnedNft[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [unlockMsg, setUnlockMsg] = useState<string | null>(null);

  // send STX form
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');

  // send token form
  const [tokenId, setTokenId] = useState('');
  const [tokenTo, setTokenTo] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');

  // send NFT form
  const [nftContract, setNftContract] = useState('');
  const [nftToken, setNftToken] = useState('');
  const [nftTo, setNftTo] = useState('');

  const refresh = useCallback(async () => {
    if (!address) return;
    try {
      const [b, n] = await Promise.all([fetchWalletBalances(address, network), fetchOwnedNfts(address, network)]);
      setBalances(b);
      setNfts(n);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load wallet balances');
    }
  }, [address, network]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  /** Unlock the seed (Face ID prompt) before signing anything. */
  const requireUnlock = async () => {
    setUnlockMsg(null);
    try {
      await unlockWallet();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unlock failed';
      setUnlockMsg(msg);
      throw e;
    }
  };

  const act = async (fn: () => Promise<string>, what: string) => {
    setBusy(true);
    try {
      const txid = await fn();
      toast.success(`${what} broadcast`, {
        description: txid,
        action: {
          label: 'Explorer',
          onClick: () => window.open(`https://explorer.hiro.so/txid/${txid}?chain=${network}`, '_blank'),
        },
      });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `${what} failed`);
    } finally {
      setBusy(false);
    }
  };

  if (!address) return null;

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=e0483a&bgcolor=0d0d1a&qzone=2&data=${encodeURIComponent(address)}`;

  return (
    <div
      className="w-full max-w-[520px] rounded-[20px] p-6 md:p-8 mx-auto"
      style={{
        background: 'linear-gradient(145deg, rgba(20,20,40,0.9), rgba(13,13,26,0.95))',
        border: '1px solid var(--cf-border2)',
      }}
    >
      {/* balance header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="font-ui text-[0.65rem] uppercase tracking-[0.3em]" style={{ color: 'var(--cf-muted)' }}>
            CardForge Wallet · {network}
          </div>
          <div className="font-display text-3xl font-black text-gold-gradient mt-1">
            {balances ? formatStx(balances.stxMicro) : '—'} STX
          </div>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={busy}
          className="p-2 rounded-lg disabled:opacity-40"
          style={{ border: '1px solid var(--cf-border2)', color: 'var(--cf-muted2)' }}
          aria-label="Refresh balances"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* receive / deposit */}
      <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid var(--cf-border2)' }}>
        <div className="font-ui text-[0.6rem] uppercase tracking-[0.25em] mb-2" style={{ color: 'var(--cf-muted)' }}>
          Deposit address — send STX here to mint
        </div>
        <div className="flex items-center gap-3">
          <img src={qrSrc} alt={`QR code for Stacks address ${address}`} width={96} height={96} className="rounded-lg" loading="lazy" />
          <button
            type="button"
            onClick={copyAddress}
            className="flex-1 text-left text-xs font-mono break-all rounded-lg p-3 transition-colors hover:opacity-80"
            style={{ color: 'var(--cf-fg)', border: '1px dashed var(--cf-border2)' }}
          >
            {address}
            <span className="mt-2 flex items-center gap-1 text-[0.65rem]" style={{ color: 'var(--cf-gold)' }}>
              {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Tap to copy'}
            </span>
          </button>
        </div>
      </div>

      {/* tabs */}
      <div className="flex gap-2 mb-4">
        {(
          [
            ['send', Send, 'Send STX'],
            ['tokens', Coins, `Tokens (${balances?.tokens.length ?? 0})`],
            ['nfts', ImageIcon, `NFTs (${nfts.length})`],
          ] as const
        ).map(([key, Icon, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[0.68rem] font-ui uppercase tracking-wider transition-colors"
            style={{
              border: '1px solid var(--cf-border2)',
              color: tab === key ? 'var(--cf-gold)' : 'var(--cf-muted)',
              background: tab === key ? 'rgba(224,72,58,0.08)' : 'transparent',
            }}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {unlockMsg && (
        <p className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--cf-gold)' }}>
          <Lock size={13} /> {unlockMsg}
        </p>
      )}

      {tab === 'send' && (
        <div className="flex flex-col gap-3">
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Recipient address (ST…)" className="rounded-lg px-3 py-2.5 text-sm font-mono" style={fieldStyle} />
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (STX)" inputMode="decimal" className="rounded-lg px-3 py-2.5 text-sm" style={fieldStyle} />
          <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Memo (optional)" maxLength={34} className="rounded-lg px-3 py-2.5 text-sm" style={fieldStyle} />
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              act(
                async () => {
                  await requireUnlock();
                  return sendStx({ recipient: to, amountStx: amount, memo, network });
                },
                'STX transfer',
              )
            }
            className="py-3 rounded-lg font-display text-sm font-bold tracking-wider disabled:opacity-40"
            style={primaryBtn}
          >
            {busy ? 'Signing…' : 'Send STX'}
          </button>
          <p className="text-[0.62rem] leading-relaxed" style={{ color: 'var(--cf-muted)' }}>
            {BTC_UNSUPPORTED_REASON}
          </p>
        </div>
      )}

      {tab === 'tokens' && (
        <div className="flex flex-col gap-3">
          {(balances?.tokens.length ?? 0) === 0 && (
            <p className="text-xs" style={{ color: 'var(--cf-muted)' }}>No SIP-10 tokens in this wallet yet.</p>
          )}
          {balances?.tokens.map((t) => (
            <button
              key={t.assetId}
              type="button"
              onClick={() => setTokenId(t.assetId)}
              className="flex justify-between items-center rounded-lg px-3 py-2.5 text-xs text-left"
              style={{ ...fieldStyle, border: tokenId === t.assetId ? '1px solid var(--cf-gold)' : fieldStyle.border }}
            >
              <span className="font-semibold">{t.symbol}</span>
              <span className="font-mono">{Number(t.balance) / 10 ** t.decimals}</span>
            </button>
          ))}
          {tokenId && (
            <>
              <input value={tokenTo} onChange={(e) => setTokenTo(e.target.value)} placeholder="Recipient address (ST…)" className="rounded-lg px-3 py-2.5 text-sm font-mono" style={fieldStyle} />
              <input value={tokenAmount} onChange={(e) => setTokenAmount(e.target.value)} placeholder="Amount" inputMode="decimal" className="rounded-lg px-3 py-2.5 text-sm" style={fieldStyle} />
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  act(
                    async () => {
                      await requireUnlock();
                      const tok = balances?.tokens.find((t) => t.assetId === tokenId);
                      return sendSip10({
                        assetId: tokenId,
                        recipient: tokenTo,
                        amount: tokenAmount,
                        decimals: tok?.decimals,
                        senderAddress: address,
                        network,
                      });
                    },
                    'Token transfer',
                  )
                }
                className="py-3 rounded-lg font-display text-sm font-bold tracking-wider disabled:opacity-40"
                style={primaryBtn}
              >
                {busy ? 'Signing…' : 'Send token'}
              </button>
            </>
          )}
        </div>
      )}

      {tab === 'nfts' && (
        <div className="flex flex-col gap-3">
          {nfts.length === 0 && (
            <p className="text-xs" style={{ color: 'var(--cf-muted)' }}>No NFTs in this wallet yet. Mint some cards first.</p>
          )}
          {nfts.map((n) => (
            <button
              key={`${n.assetId}-${n.tokenId}`}
              type="button"
              onClick={() => {
                setNftContract(n.contractId);
                setNftToken(n.tokenId);
              }}
              className="flex justify-between items-center rounded-lg px-3 py-2.5 text-xs text-left"
              style={{ ...fieldStyle, border: nftContract === n.contractId && nftToken === n.tokenId ? '1px solid var(--cf-gold)' : fieldStyle.border }}
            >
              <span className="font-semibold">{n.contractId.split('.')[1]}</span>
              <span className="font-mono">#{n.tokenId} · {shorten(n.contractId.split('.')[0])}</span>
            </button>
          ))}
          {nftContract && (
            <>
              <input value={nftTo} onChange={(e) => setNftTo(e.target.value)} placeholder="Recipient address (ST…)" className="rounded-lg px-3 py-2.5 text-sm font-mono" style={fieldStyle} />
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  act(
                    async () => {
                      await requireUnlock();
                      return sendNft({
                        contractId: nftContract,
                        tokenId: nftToken,
                        recipient: nftTo,
                        senderAddress: address,
                        network,
                      });
                    },
                    'NFT transfer',
                  )
                }
                className="py-3 rounded-lg font-display text-sm font-bold tracking-wider disabled:opacity-40"
                style={primaryBtn}
              >
                {busy ? 'Signing…' : `Transfer NFT #${nftToken}`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default WalletPanel;
