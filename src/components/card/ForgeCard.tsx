import { useRef, useState, useCallback, useMemo } from 'react';
import { NFTCard, Trade } from '@/lib/cardforge';
import { RARITY_TOKENS } from './cardTokens';
import SigilGlyph from './SigilGlyph';
import '@/styles/forge-card.css';

interface Props {
  card: NFTCard;
  index?: number;
  showDelete?: boolean;
  onDelete?: (id: string) => void;
  trades?: Trade[];
  /** Disable parallax tilt + holo cursor tracking (use in dense grids) */
  staticMode?: boolean;
  /** Override the continuous frame FX intensity (default 1, hover scales to 1.7). */
  frameIntensity?: number;
}

const STAT_KEYS = ['ATK', 'DEF', 'SPD', 'SPC'] as const;

const ForgeCard = ({ card, index = 0, showDelete, onDelete, trades = [], staticMode = false, frameIntensity }: Props) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [hovered, setHovered] = useState(false);

  const tok = RARITY_TOKENS[card.rarity];
  const isLegendary = card.rarity === 'legendary';
  const isEpic = card.rarity === 'epic';
  const hasTrade = trades.some(t => t.cardId === card.id);
  const maxStat = Math.max(card.stats.ATK, card.stats.DEF, card.stats.SPD, card.stats.SPC, 1);
  const hpPct = Math.min(100, (card.stats.HP / 200) * 100);

  // Legendary cards get a slightly notched top-right corner via clip-path
  const clipPath = isLegendary
    ? 'polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)'
    : undefined;

  const onMove = useCallback((e: React.MouseEvent) => {
    if (staticMode || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = rootRef.current;
      if (!el) return;
      el.style.setProperty('--forge-tilt-x', `${(x - 0.5) * 14}deg`);
      el.style.setProperty('--forge-tilt-y', `${(0.5 - y) * 10}deg`);
      el.style.setProperty('--forge-holo-x', `${x * 100}%`);
      el.style.setProperty('--forge-holo-y', `${y * 100}%`);
      el.style.setProperty('--forge-lift', '12');
    });
  }, [staticMode]);

  const onLeave = useCallback(() => {
    setHovered(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const el = rootRef.current;
    if (!el) return;
    el.style.setProperty('--forge-tilt-x', '0deg');
    el.style.setProperty('--forge-tilt-y', '0deg');
    el.style.setProperty('--forge-lift', '0');
  }, []);

  const embers = useMemo(() => {
    if (!isEpic) return [];
    return Array.from({ length: 6 }).map((_, i) => ({
      left: 10 + Math.random() * 80,
      delay: Math.random() * 2.8,
      duration: 2.2 + Math.random() * 1.6,
      key: i,
    }));
  }, [isEpic]);

  return (
    <div
      ref={rootRef}
      className="forge-card-root group w-[260px] h-[378px] sm:w-[285px] sm:h-[410px] relative"
      style={{ animationDelay: `${index * 0.06}s` }}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onLeave}
    >
      {/* Outer aura / glow */}
      <div
        className="absolute -inset-3 rounded-[26px] pointer-events-none transition-opacity duration-500"
        style={{
          background: `radial-gradient(ellipse at center, ${tok.glow}, transparent 70%)`,
          opacity: hovered ? 1 : 0.55,
          filter: 'blur(14px)',
        }}
      />

      {/* Legendary aurora ring */}
      {tok.aurora && (
        <div
          className="forge-aurora absolute -inset-2 rounded-[24px] pointer-events-none"
          style={{ opacity: hovered ? 0.85 : 0.6 }}
        />
      )}

      <div
        className="forge-card-inner relative w-full h-full"
        style={{ clipPath }}
      >
        {/* Continuous rarity-specific frame FX */}
        <div className={`forge-frame-fx rarity-${card.rarity}`} aria-hidden />
        {/* ============ SVG BEZEL ============ */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 285 410"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id={tok.bezel.id} x1="0%" y1="0%" x2="100%" y2="100%">
              {tok.bezel.stops.map(s => (
                <stop key={s.offset} offset={s.offset} stopColor={s.color} />
              ))}
            </linearGradient>
            <linearGradient id={`${tok.bezel.id}-bevel`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={tok.bevel} stopOpacity="0.9" />
              <stop offset="50%" stopColor={tok.bevel} stopOpacity="0.2" />
              <stop offset="100%" stopColor={tok.bevel} stopOpacity="0.9" />
            </linearGradient>
            <radialGradient id={`${tok.bezel.id}-core`} cx="50%" cy="0%" r="100%">
              <stop offset="0%" stopColor="#13131e" />
              <stop offset="100%" stopColor="#05050c" />
            </radialGradient>
          </defs>
          {/* Outer chrome frame */}
          <rect x="0" y="0" width="285" height="410" rx="18" fill={`url(#${tok.bezel.id})`} />
          {/* Bevel highlight */}
          <rect x="2" y="2" width="281" height="406" rx="16" fill="none"
                stroke={`url(#${tok.bezel.id}-bevel)`} strokeWidth="1.2" />
          {/* Inner core (where content lives) */}
          <rect x="10" y="10" width="265" height="390" rx="10" fill={`url(#${tok.bezel.id}-core)`} />
          {/* Inner edge line */}
          <rect x="10.5" y="10.5" width="264" height="389" rx="9.5" fill="none"
                stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
        </svg>

        {/* ============ CONTENT LAYER ============ */}
        <div className="relative w-full h-full p-[14px] flex flex-col" style={{ paddingTop: 14, paddingBottom: 14 }}>

          {/* Top sigil row */}
          <div className="flex justify-between items-center px-[2px] pb-[8px]">
            <div className="flex items-center gap-1.5">
              <SigilGlyph variant={tok.sigil} color={tok.accent} size={13} />
              <span
                className="font-mono text-[0.5rem] tracking-[0.18em] uppercase"
                style={{ color: tok.accent, opacity: 0.7 }}
              >
                {tok.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-ui text-[0.6rem] tracking-wider" style={{ color: 'var(--cf-gold)' }}>
                {card.element}
              </span>
              <SigilGlyph variant={tok.sigil} color={tok.accent} size={13} />
            </div>
          </div>

          {/* Art window */}
          <div
            className="relative flex-1 min-h-[145px] rounded-[6px] overflow-hidden"
            style={{
              background: 'radial-gradient(ellipse at center, #1a1a2e, #0a0a14)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: 'inset 0 0 18px rgba(0,0,0,0.55)',
            }}
          >
            {card.imageUrl ? (
              <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--cf-muted)' }}>
                <span className="text-2xl opacity-30">◇</span>
              </div>
            )}

            {/* Holo overlay (always present, opacity managed by hover via CSS) */}
            {!staticMode && <div className="forge-holo absolute inset-0" />}

            {/* Scanlines (legendary idle, all on hover) */}
            <div
              className="forge-scanlines absolute inset-0"
              style={{ opacity: tok.idleScan ? 0.5 : (hovered ? 0.6 : 0) , transition: 'opacity 0.3s' }}
            />

            {/* Embers (epic) */}
            {isEpic && embers.map(e => (
              <span
                key={e.key}
                className="forge-ember"
                style={{
                  left: `${e.left}%`,
                  bottom: '4px',
                  animationDelay: `${e.delay}s`,
                  animationDuration: `${e.duration}s`,
                }}
              />
            ))}

            {/* Corner brackets — etched feel */}
            <span className="absolute top-1 left-1 w-3 h-3 border-l border-t" style={{ borderColor: tok.accent, opacity: 0.6 }} />
            <span className="absolute top-1 right-1 w-3 h-3 border-r border-t" style={{ borderColor: tok.accent, opacity: 0.6 }} />
            <span className="absolute bottom-1 left-1 w-3 h-3 border-l border-b" style={{ borderColor: tok.accent, opacity: 0.6 }} />
            <span className="absolute bottom-1 right-1 w-3 h-3 border-r border-b" style={{ borderColor: tok.accent, opacity: 0.6 }} />

            {/* Trade badge */}
            {hasTrade && (
              <span
                className="absolute top-2 right-2 font-ui text-[0.45rem] font-bold tracking-wider px-1.5 py-0.5 rounded-sm"
                style={{
                  background: 'rgba(5,5,14,0.78)',
                  border: '1px solid rgba(200,168,75,0.5)',
                  color: 'var(--cf-gold)',
                  backdropFilter: 'blur(6px)',
                }}
              >
                ⇄ TRADE
              </span>
            )}
          </div>

          {/* Name strip */}
          <div className="pt-[10px] pb-[6px] flex items-baseline justify-between gap-2">
            <span
              className="font-display text-[0.82rem] truncate"
              style={{ color: 'var(--cf-text)', textShadow: `0 0 8px ${tok.glow}` }}
            >
              {card.name || 'Unnamed Relic'}
            </span>
            <span className="font-mono text-[0.5rem] tracking-wider shrink-0" style={{ color: 'var(--cf-muted2)' }}>
              LVL {Math.max(1, Math.floor((card.stats.ATK + card.stats.DEF) / 30))}
            </span>
          </div>

          {/* Divider */}
          <div
            className="h-px w-full mb-[8px]"
            style={{ background: `linear-gradient(90deg, transparent, ${tok.accent}55, transparent)` }}
          />

          {/* Brutalist data strip */}
          <div className="flex justify-between font-mono text-[0.55rem] tracking-wider mb-[6px]" style={{ color: 'var(--cf-text)' }}>
            {STAT_KEYS.map(k => (
              <span key={k} className="flex flex-col items-center">
                <span style={{ color: 'var(--cf-muted)', fontSize: '0.42rem' }}>{k}</span>
                <span style={{ color: tok.accent }}>{String(card.stats[k]).padStart(3, '0')}</span>
              </span>
            ))}
          </div>

          {/* HP bar */}
          <div className="flex items-center gap-2 mb-[8px]">
            <span className="font-mono text-[0.5rem]" style={{ color: 'var(--cf-muted)' }}>HP</span>
            <div className="flex-1 h-[6px] relative" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div
                className="h-full"
                style={{
                  width: `${hpPct}%`,
                  background: `linear-gradient(90deg, ${tok.accent}, var(--cf-gold-light))`,
                  boxShadow: `0 0 8px ${tok.glow}`,
                  transition: 'width 0.8s cubic-bezier(0.17, 0.67, 0.35, 1.1)',
                }}
              />
              {/* segment ticks */}
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} className="absolute top-0 bottom-0" style={{ left: `${(i + 1) * 10}%`, width: 1, background: 'rgba(0,0,0,0.45)' }} />
              ))}
            </div>
            <span className="font-mono text-[0.55rem]" style={{ color: 'var(--cf-text)' }}>
              {String(card.stats.HP).padStart(3, '0')}
            </span>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-[6px]" style={{ borderTop: `1px solid ${tok.accent}22` }}>
            <span className="font-mono text-[0.48rem] tracking-wider" style={{ color: 'var(--cf-muted)' }}>
              #{String(card.serial).padStart(4, '0')} · CARDFORGE
            </span>
            {card.metadataUrl ? (
              <a
                href={card.metadataUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[0.45rem] tracking-wider transition-colors"
                style={{ color: tok.accent, opacity: 0.7 }}
                onClick={e => e.stopPropagation()}
              >
                IPFS↗
              </a>
            ) : (
              <span className="font-mono text-[0.45rem] tracking-wider" style={{ color: 'var(--cf-muted)' }}>
                GENESIS
              </span>
            )}
          </div>
        </div>

        {/* Delete button */}
        {showDelete && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete "${card.name}"?`)) onDelete(card.id);
            }}
            className="absolute top-2 left-2 z-30 w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-125"
            style={{
              background: 'rgba(13,13,26,0.9)',
              border: '1px solid rgba(255,80,80,0.5)',
              color: '#ff6b6b',
            }}
            aria-label={`Delete ${card.name}`}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default ForgeCard;
