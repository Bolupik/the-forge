import { useEffect, useState } from 'react';
import { NFTCard, Rarity } from '@/lib/cardforge';
import { playCardFlip, playRareReveal, playSuccess, playClick } from '@/lib/sounds';
import NFTCardComponent from '@/components/NFTCard';
import { useStacksAuth } from '@/contexts/StacksAuthContext';
import { mintCardOnChain, getContractConfig, explorerTxUrl } from '@/lib/stacksMint';

interface CardRevealSequenceProps {
  cards: NFTCard[];
  onDone: () => void;
  onMintAgain: () => void;
}

const RARITY_GLOW: Record<Rarity, string> = {
  common: 'rgba(160,190,215,0.3)',
  rare: 'rgba(60,140,255,0.5)',
  epic: 'rgba(160,60,240,0.55)',
  legendary: 'rgba(240,180,20,0.7)',
};

/**
 * Stage 3 — show 5 card backs fanned out, auto-flip them one-by-one
 * with suspense; rare/epic/legendary cards trigger extra effects.
 * After all are revealed, show a summary with "Mint Again".
 */
const CardRevealSequence = ({ cards, onDone, onMintAgain }: CardRevealSequenceProps) => {
  const [revealedCount, setRevealedCount] = useState(0);
  const [showcaseIdx, setShowcaseIdx] = useState<number | null>(null);
  const [shake, setShake] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Auto-reveal sequence
  useEffect(() => {
    if (revealedCount >= cards.length) {
      const t = window.setTimeout(() => {
        playSuccess();
        setShowSummary(true);
      }, 800);
      return () => clearTimeout(t);
    }

    const card = cards[revealedCount];
    const isRare = card.rarity !== 'common';
    const delay = revealedCount === 0 ? 600 : isRare ? 1100 : 850;

    const t = window.setTimeout(() => {
      playCardFlip();
      if (isRare) {
        playRareReveal(card.rarity as 'rare' | 'epic' | 'legendary');
        if (card.rarity === 'legendary' || card.rarity === 'epic') {
          setShake(true);
          window.setTimeout(() => setShake(false), 400);
        }
        setShowcaseIdx(revealedCount);
        window.setTimeout(() => setShowcaseIdx(null), 900);
      }
      setRevealedCount((n) => n + 1);
    }, delay);

    return () => clearTimeout(t);
  }, [revealedCount, cards]);

  const handleSkip = () => {
    if (revealedCount >= cards.length) return;
    playClick();
    setRevealedCount(cards.length);
  };

  return (
    <div
      className={`fixed inset-0 z-[70] flex flex-col items-center justify-center p-4 ${shake ? 'animate-shake' : ''}`}
      style={{
        background: 'radial-gradient(ellipse at center, rgba(20,15,40,0.95), rgba(5,5,14,0.98))',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Header */}
      <div className="text-center mb-5">
        <h2
          className="font-display text-lg sm:text-2xl font-black"
          style={{
            background: 'linear-gradient(160deg, #c8a84b, #fff5c0, #e8c870)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {showSummary ? '✦ Pack Opened!' : 'Revealing your cards…'}
        </h2>
        <p className="font-ui text-[0.6rem] sm:text-xs uppercase tracking-[0.3em] mt-1" style={{ color: 'var(--cf-muted2)' }}>
          {showSummary ? `${cards.length} new cards added` : `${revealedCount} / ${cards.length} revealed`}
        </p>
      </div>

      {/* Cards row */}
      <div
        className="flex items-center justify-center flex-wrap gap-3 sm:gap-4 max-w-full"
        style={{ perspective: '1500px' }}
      >
        {cards.map((card, idx) => {
          const isRevealed = idx < revealedCount;
          const isShowcase = showcaseIdx === idx;
          // Compact display when summary is shown so all 5 fit
          const scale = showSummary ? (cards.length > 4 ? 0.55 : 0.7) : isShowcase ? 1.15 : 0.7;

          return (
            <div
              key={card.id}
              className="relative"
              style={{
                width: 'clamp(120px, 22vw, 200px)',
                height: 'clamp(170px, 31vw, 280px)',
                transformStyle: 'preserve-3d',
                transform: `scale(${scale}) ${isShowcase ? 'translateY(-8px)' : ''}`,
                transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.4s',
                filter: isShowcase
                  ? `drop-shadow(0 0 40px ${RARITY_GLOW[card.rarity]})`
                  : isRevealed
                    ? `drop-shadow(0 8px 24px ${RARITY_GLOW[card.rarity]})`
                    : 'drop-shadow(0 6px 18px rgba(0,0,0,0.5))',
                zIndex: isShowcase ? 10 : 1,
              }}
            >
              {/* Flip container */}
              <div
                className="absolute inset-0 rounded-xl"
                style={{
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.7s cubic-bezier(0.34, 1.2, 0.64, 1)',
                  transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* Card back */}
                <div
                  className="absolute inset-0 rounded-xl overflow-hidden flex flex-col items-center justify-center"
                  style={{
                    backfaceVisibility: 'hidden',
                    background: 'linear-gradient(160deg, #1a1530, #0d0a1f 60%, #1a1530)',
                    border: '2px solid var(--cf-gold)',
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(115deg, transparent 20%, rgba(200,168,75,0.25) 50%, transparent 80%)',
                      backgroundSize: '200% 200%',
                      animation: 'shimmer 3s linear infinite',
                    }}
                  />
                  <div className="absolute inset-2 rounded-lg pointer-events-none"
                    style={{ border: '1px solid rgba(200,168,75,0.2)' }} />
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-2 relative z-10"
                    style={{
                      background: 'radial-gradient(circle, rgba(200,168,75,0.25), transparent 70%)',
                      border: '1.5px solid rgba(200,168,75,0.45)',
                    }}
                  >
                    <span className="font-display text-xl" style={{ color: 'var(--cf-gold-light)' }}>✦</span>
                  </div>
                  <span className="font-ui text-[0.45rem] uppercase tracking-[0.3em] font-bold relative z-10"
                    style={{ color: 'var(--cf-gold)' }}>
                    CardForge
                  </span>
                </div>

                {/* Card front */}
                <div
                  className="absolute inset-0 rounded-xl overflow-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <div className="origin-top-left" style={{ transform: 'scale(0.7)', width: '142%', height: '142%' }}>
                    <NFTCardComponent card={card} index={0} trades={[]} />
                  </div>
                  {/* Rare halo */}
                  {isShowcase && (
                    <div
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{
                        background: `radial-gradient(circle, transparent 40%, ${RARITY_GLOW[card.rarity]} 90%)`,
                        animation: 'pulse-burst 1.2s ease-in-out infinite',
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mt-8 items-center">
        {!showSummary && revealedCount < cards.length && (
          <button
            type="button"
            onClick={handleSkip}
            className="font-ui text-[0.6rem] uppercase tracking-[0.3em] px-4 py-2 rounded-lg transition-all hover:-translate-y-0.5"
            style={{
              border: '1px solid var(--cf-border2)',
              color: 'var(--cf-muted2)',
              background: 'rgba(200,168,75,0.03)',
            }}
          >
            Skip animation
          </button>
        )}

        {showSummary && (
          <>
            <button
              type="button"
              onClick={() => { playClick(); onMintAgain(); }}
              className="font-display text-sm font-bold py-3 px-6 rounded-xl transition-all hover:-translate-y-0.5 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #a07828, #f0d060, #c8a84b)',
                color: 'var(--cf-bg)',
                boxShadow: '0 4px 30px rgba(200,168,75,0.35)',
              }}
            >
              ⚡ Open Another Pack
            </button>
            <button
              type="button"
              onClick={() => { playClick(); onDone(); }}
              className="font-ui text-[0.6rem] uppercase tracking-[0.3em] px-5 py-3 rounded-xl transition-all hover:-translate-y-0.5"
              style={{
                border: '1px solid rgba(200,168,75,0.25)',
                color: 'var(--cf-gold)',
                background: 'rgba(200,168,75,0.05)',
              }}
            >
              View Collection
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse-burst {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
};

export default CardRevealSequence;
