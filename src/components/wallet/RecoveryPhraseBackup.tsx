import { useState } from 'react';
import { Check, Copy, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { markBackedUp } from '@/lib/walletVault';

interface Props {
  phrase: string;
  onDone: () => void;
}

/**
 * One-time recovery phrase backup screen, shown immediately after a passkey
 * signup creates the embedded wallet. The phrase is rendered once from the
 * in-memory creation result — it is never stored unencrypted.
 */
const RecoveryPhraseBackup = ({ phrase, onDone }: Props) => {
  const words = phrase.split(' ');
  const [revealed, setRevealed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(phrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the words are still visible */
    }
  };

  return (
    <div
      className="w-full max-w-[480px] rounded-[20px] p-6 md:p-8"
      style={{
        background: 'linear-gradient(145deg, rgba(20,20,40,0.9), rgba(13,13,26,0.95))',
        border: '1px solid var(--cf-border2)',
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <ShieldAlert size={22} style={{ color: 'var(--cf-gold)' }} />
        <h2 className="font-display text-xl font-bold text-gold-gradient">Back up your recovery phrase</h2>
      </div>

      <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--cf-muted2)' }}>
        These {words.length} words are the only way to recover your wallet if you lose this device or its passkey.
        Write them down and keep them somewhere safe. Anyone with this phrase controls your funds.
        CardForge never stores it unencrypted.
      </p>

      <div className="relative">
        <div
          className="grid grid-cols-3 gap-2 rounded-xl p-4 select-none"
          style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid var(--cf-border2)' }}
        >
          {words.map((w, i) => (
            <div
              key={i}
              className="text-xs font-mono px-2 py-1.5 rounded-md text-center transition-all"
              style={{
                background: 'rgba(224,72,58,0.06)',
                border: '1px solid var(--cf-border2)',
                color: revealed ? 'var(--cf-fg)' : 'transparent',
                textShadow: revealed ? 'none' : '0 0 10px rgba(224,72,58,0.6)',
              }}
            >
              {revealed ? `${i + 1}. ${w}` : '••••'}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-ui uppercase tracking-wider transition-colors"
          style={{ border: '1px solid var(--cf-border2)', color: 'var(--cf-muted2)' }}
        >
          {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          {revealed ? 'Hide' : 'Reveal'}
        </button>
        <button
          type="button"
          onClick={copy}
          disabled={!revealed}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-ui uppercase tracking-wider disabled:opacity-40"
          style={{ border: '1px solid var(--cf-border2)', color: 'var(--cf-muted2)' }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <label className="flex items-start gap-3 mt-5 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1 accent-[#e0483a]"
        />
        <span className="text-xs leading-relaxed" style={{ color: 'var(--cf-muted2)' }}>
          I wrote down my recovery phrase and understand that losing it means losing access to my wallet and NFTs.
        </span>
      </label>

      <button
        type="button"
        disabled={!confirmed}
        onClick={() => {
          markBackedUp();
          onDone();
        }}
        className="w-full mt-5 py-3.5 rounded-lg font-display text-sm font-bold tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        style={{
          background: 'linear-gradient(135deg, #a02d22, #e0483a)',
          color: 'var(--cf-bg)',
          boxShadow: '0 4px 20px rgba(224,72,58,0.3)',
        }}
      >
        I've saved it — continue
      </button>
    </div>
  );
};

export default RecoveryPhraseBackup;
