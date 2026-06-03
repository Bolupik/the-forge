import { useState, useMemo } from 'react';
import { AnimatePresence, motion, LayoutGroup } from 'framer-motion';
import { NFTCard, Rarity, Trade } from '@/lib/cardforge';
import NFTCardComponent from '@/components/NFTCard';
import PageTransition from '@/components/motion/PageTransition';
import { fadeUp, stagger } from '@/lib/motion';

interface GalleryPageProps {
  cards: NFTCard[];
  trades: Trade[];
}

const FILTERS: { label: string; value: Rarity | 'all'; icon?: string }[] = [
  { label: 'All Cards', value: 'all' },
  { label: 'Legendary', value: 'legendary', icon: '⚡' },
  { label: 'Epic', value: 'epic', icon: '🔮' },
  { label: 'Rare', value: 'rare', icon: '💎' },
  { label: 'Common', value: 'common', icon: '◆' },
];

const FILTER_ACTIVE_STYLES: Record<string, { bg: string; text: string; shadow: string }> = {
  legendary: { bg: 'rgba(230,160,20,0.09)', text: '#ffe860', shadow: '0 0 12px rgba(240,180,20,0.2)' },
  epic: { bg: 'rgba(160,60,220,0.09)', text: '#d870ff', shadow: '0 0 12px rgba(160,60,240,0.2)' },
  rare: { bg: 'rgba(60,130,220,0.09)', text: '#88c4ff', shadow: '0 0 12px rgba(60,140,255,0.2)' },
  all: { bg: 'rgba(200,168,75,0.09)', text: 'var(--cf-gold)', shadow: '0 0 12px rgba(200,168,75,0.2)' },
  common: { bg: 'rgba(200,168,75,0.09)', text: 'var(--cf-gold)', shadow: '0 0 12px rgba(200,168,75,0.2)' },
};

const EMPTY_MESSAGES: Record<string, { emoji: string; title: string; sub: string }> = {
  all: { emoji: '🔥', title: 'No Cards Forged Yet', sub: 'Head to the Forge to create your first card' },
  legendary: { emoji: '⚡', title: 'No Legendaries', sub: 'Forge a legendary-tier card to see it here' },
  epic: { emoji: '🔮', title: 'No Epics', sub: 'Forge an epic-tier card to see it here' },
  rare: { emoji: '💎', title: 'No Rares', sub: 'Forge a rare-tier card to see it here' },
  common: { emoji: '◆', title: 'No Commons', sub: 'Forge a common-tier card to see it here' },
};

const GalleryPage = ({ cards, trades }: GalleryPageProps) => {
  const [filter, setFilter] = useState<Rarity | 'all'>('all');

  const filtered = useMemo(() =>
    filter === 'all' ? cards : cards.filter(c => c.rarity === filter),
    [cards, filter]
  );

  const stats = useMemo(() => ({
    total: cards.length,
    legendary: cards.filter(c => c.rarity === 'legendary').length,
    epic: cards.filter(c => c.rarity === 'epic').length,
    trading: trades.length,
  }), [cards, trades]);

  const empty = EMPTY_MESSAGES[filter] || EMPTY_MESSAGES.all;

  return (
    <PageTransition>
      <div className="relative">
        {/* Hero */}
        <section className="relative overflow-hidden text-center px-4" style={{ padding: 'clamp(40px, 10vw, 88px) 16px clamp(30px, 8vw, 68px)' }}>
          <span
            className="absolute pointer-events-none font-display font-black select-none"
            style={{
              top: '50%', left: '50%', transform: 'translate(-50%, -58%)',
              fontSize: 'clamp(4rem, 13vw, 13rem)',
              color: 'transparent',
              WebkitTextStroke: '1px rgba(200,168,75,0.055)',
            }}
          >
            FORGE
          </span>

          <motion.div
            variants={stagger(0.08, 0.05)}
            initial="hidden"
            animate="show"
          >
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 font-ui text-[0.6rem] font-semibold uppercase tracking-[0.45em] px-5 py-1.5 rounded-[20px] mb-6"
              style={{ border: '1px solid rgba(200,168,75,0.2)', color: 'var(--cf-gold)' }}
            >
              <span>◆</span>
              Bitcoin-Secured · Stacks Network
              <span>◆</span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-display font-black mb-6"
              style={{
                fontSize: 'clamp(2.4rem, 5vw, 5rem)',
                background: 'linear-gradient(160deg, #c8a84b, #fff5c0, #e8c870, #c8a84b)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 30px rgba(200,168,75,0.3))',
              }}
            >
              Genesis Collection
            </motion.h1>

            <motion.div
              variants={fadeUp}
              className="mx-auto mb-6"
              style={{ width: 110, height: 2, background: 'linear-gradient(90deg, transparent, var(--cf-gold), transparent)' }}
            />

            <motion.p
              variants={fadeUp}
              className="font-body text-[0.97rem] mx-auto leading-[1.8] max-w-[460px]"
              style={{ color: 'var(--cf-muted2)' }}
            >
              Unique digital collectibles forged on-chain, secured by Bitcoin through the Stacks network.
            </motion.p>
          </motion.div>
        </section>

        {/* Stats Ribbon */}
        <div
          className="flex justify-center"
          style={{
            borderTop: '1px solid var(--cf-border)',
            borderBottom: '1px solid var(--cf-border)',
            background: 'linear-gradient(90deg, transparent, rgba(200,168,75,0.025), transparent)',
          }}
        >
          {[
            { value: stats.total, label: 'Cards Forged' },
            { value: stats.legendary, label: 'Legendaries' },
            { value: stats.epic, label: 'Epics' },
            { value: stats.trading, label: 'In Trading' },
          ].map((s, i) => (
            <div key={s.label} className="flex items-center">
              {i > 0 && (
                <div className="w-px self-stretch my-[22%]" style={{ background: 'linear-gradient(transparent, var(--cf-border), transparent)' }} />
              )}
              <div className="flex flex-col items-center px-3 sm:px-4 py-3 sm:py-[22px] max-w-[160px]">
                <span className="font-display text-lg md:text-[1.75rem] font-bold text-gold-gradient">
                  {s.value}
                </span>
                <span className="font-ui text-[0.58rem] uppercase tracking-[0.3em]" style={{ color: 'var(--cf-muted)' }}>
                  {s.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Filters with shared layout active pill */}
        <LayoutGroup id="gallery-filters">
          <div className="flex justify-center flex-wrap gap-1.5 pt-8 px-4">
            {FILTERS.map(f => {
              const active = filter === f.value;
              const style = FILTER_ACTIVE_STYLES[f.value];
              return (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className="relative font-ui text-[0.65rem] font-semibold px-3 py-1.5 rounded-full"
                  style={{
                    color: active ? style.text : 'var(--cf-muted2)',
                    transition: 'color 0.25s ease',
                  }}
                >
                  {active && (
                    <motion.span
                      layoutId="gallery-filter-pill"
                      className="absolute inset-0 rounded-full -z-0"
                      style={{
                        background: style.bg,
                        border: `1px solid ${style.text}33`,
                        boxShadow: style.shadow,
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">
                    {f.icon && <span className="mr-1">{f.icon}</span>}
                    {f.label}
                  </span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>

        {/* Card Grid */}
        <motion.div
          layout
          className="flex flex-wrap justify-center gap-4 sm:gap-8 max-w-[1300px] mx-auto card-grid-responsive"
          style={{ padding: '44px 24px 100px' }}
        >
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col items-center py-20"
              >
                <span className="text-6xl opacity-[0.22] mb-4">{empty.emoji}</span>
                <h3 className="font-display text-lg mb-2" style={{ color: 'var(--cf-muted2)' }}>{empty.title}</h3>
                <p className="font-body text-sm" style={{ color: 'var(--cf-muted)' }}>{empty.sub}</p>
              </motion.div>
            ) : (
              filtered.map((card, i) => (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.45, delay: Math.min(i * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}
                >
                  <NFTCardComponent card={card} index={i} trades={trades} />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default GalleryPage;
