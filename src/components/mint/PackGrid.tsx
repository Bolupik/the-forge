import { useState } from 'react';
import { playClick, playHover } from '@/lib/sounds';

interface PackGridProps {
  onPackSelected: (packIndex: number) => void;
  packsRemaining: number;
  totalPacks: number;
  disabled?: boolean;
}

const PACK_COUNT = 10;

/**
 * Stage 1 — display 10 face-down mystery packs in a grid.
 * On click, the chosen pack zooms toward the camera while the others fade.
 */
const PackGrid = ({ onPackSelected, packsRemaining, totalPacks, disabled }: PackGridProps) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const handleSelect = (idx: number) => {
    if (selectedIdx !== null || disabled) return;
    playClick();
    setSelectedIdx(idx);
    // Wait for the zoom-out animation, then notify parent
    window.setTimeout(() => onPackSelected(idx), 700);
  };

  return (
    <div className="w-full max-w-[860px] mx-auto px-4 animate-card-enter">
      {/* Heading */}
      <div className="text-center mb-6">
        <div
          className="inline-flex items-center gap-2 font-ui text-[0.5rem] font-bold uppercase tracking-[0.4em] px-4 py-1.5 rounded-full mb-4"
          style={{ border: '1px solid rgba(224,72,58,0.2)', color: 'var(--cf-gold)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: '#4ade80' }} />
          Choose Your Pack
        </div>
        <h2
          className="font-display font-black mb-2"
          style={{
            fontSize: 'clamp(1.4rem, 4.5vw, 2.5rem)',
            background: 'linear-gradient(160deg, #e0483a, #fff5c0, #e8c870, #e0483a)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 30px rgba(224,72,58,0.25))',
          }}
        >
          Pick One Pack
        </h2>
        <p className="font-body text-xs sm:text-sm" style={{ color: 'var(--cf-muted2)' }}>
          Each pack contains <span style={{ color: 'var(--cf-gold)' }}>5 random cards</span>. Trust your instincts.
        </p>
        <div className="font-mono text-[0.55rem] mt-2" style={{ color: 'var(--cf-muted)' }}>
          {packsRemaining.toLocaleString()} / {totalPacks.toLocaleString()} packs remaining
        </div>
      </div>

      {/* Pack grid: 2 cols on mobile, 5 cols on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-5 perspective-1000">
        {Array.from({ length: PACK_COUNT }).map((_, idx) => {
          const isSelected = selectedIdx === idx;
          const isOther = selectedIdx !== null && !isSelected;
          const isHovered = hoveredIdx === idx && selectedIdx === null;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(idx)}
              onMouseEnter={() => {
                if (selectedIdx !== null) return;
                setHoveredIdx(idx);
                playHover();
              }}
              onMouseLeave={() => setHoveredIdx(null)}
              disabled={disabled || selectedIdx !== null}
              aria-label={`Mystery pack ${idx + 1}`}
              className="relative aspect-[3/4] rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-[var(--cf-gold)]"
              style={{
                background: 'linear-gradient(160deg, #1a1530, #0d0a1f 60%, #1a1530)',
                border: `2px solid ${isHovered ? 'var(--cf-gold)' : 'var(--cf-border2)'}`,
                boxShadow: isSelected
                  ? '0 0 80px rgba(224,72,58,0.7), 0 0 30px rgba(255,245,192,0.4)'
                  : isHovered
                    ? '0 18px 50px rgba(224,72,58,0.35), 0 0 24px rgba(224,72,58,0.25)'
                    : '0 6px 20px rgba(0,0,0,0.5)',
                transform: isSelected
                  ? 'translateZ(80px) scale(1.18) rotateY(0deg)'
                  : isOther
                    ? 'scale(0.85) translateY(20px)'
                    : isHovered
                      ? 'translateY(-10px) rotateX(6deg) scale(1.04)'
                      : 'rotateX(0) scale(1)',
                opacity: isOther ? 0.15 : 1,
                transition: 'transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s, box-shadow 0.4s, border-color 0.3s',
                transformStyle: 'preserve-3d',
                willChange: 'transform, opacity',
              }}
            >
              {/* Inner foil/holo overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(115deg, transparent 20%, rgba(224,72,58,0.18) 45%, rgba(255,245,192,0.25) 50%, rgba(224,72,58,0.18) 55%, transparent 80%)',
                  backgroundSize: '250% 250%',
                  animation: isHovered || isSelected ? 'shimmer 2.2s linear infinite' : 'shimmer 8s linear infinite',
                  opacity: isHovered || isSelected ? 0.9 : 0.35,
                  transition: 'opacity 0.4s',
                  mixBlendMode: 'overlay',
                }}
              />

              {/* Decorative frame */}
              <div className="absolute inset-2 rounded-lg pointer-events-none"
                style={{ border: '1px solid rgba(224,72,58,0.2)' }} />

              {/* Center seal */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center"
                  style={{
                    background: 'radial-gradient(circle, rgba(224,72,58,0.25), transparent 70%)',
                    border: '1.5px solid rgba(224,72,58,0.45)',
                  }}
                >
                  <span
                    className="font-display text-2xl sm:text-3xl"
                    style={{
                      color: 'var(--cf-gold-light)',
                      filter: `drop-shadow(0 0 10px rgba(224,72,58,${isHovered ? 0.9 : 0.5}))`,
                      animation: isHovered ? 'float-gentle 2s ease-in-out infinite' : 'none',
                    }}
                  >
                    ✦
                  </span>
                </div>
                <span
                  className="font-ui text-[0.45rem] sm:text-[0.55rem] uppercase tracking-[0.3em] font-bold"
                  style={{ color: 'var(--cf-gold)' }}
                >
                  CardForge
                </span>
                <span
                  className="font-display text-[0.55rem] sm:text-[0.65rem]"
                  style={{ color: 'var(--cf-muted2)' }}
                >
                  Pack #{String(idx + 1).padStart(2, '0')}
                </span>
              </div>

              {/* Vignette */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5))',
                }}
              />
            </button>
          );
        })}
      </div>

      <p className="text-center font-ui text-[0.55rem] uppercase tracking-[0.3em] mt-6" style={{ color: 'var(--cf-muted)' }}>
        — Tap a pack to begin —
      </p>
    </div>
  );
};

export default PackGrid;
