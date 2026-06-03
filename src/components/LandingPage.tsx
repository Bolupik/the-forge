import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStacksAuth } from '@/contexts/StacksAuthContext';
import PublicNavBar from './PublicNavBar';
import { AppPage } from '@/lib/cardforge';
import Reveal from './motion/Reveal';
import MagneticButton from './motion/MagneticButton';
import PageTransition from './motion/PageTransition';
import { fadeUp, stagger } from '@/lib/motion';

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, signIn, isLoading } = useStacksAuth();

  const handleNavigate = (page: AppPage) => {
    if (page === 'gallery') navigate('/gallery');
    else if (page === 'mint') navigate('/mint');
    else if (page === 'trading') navigate('/trading');
  };

  const handlePrimary = () => {
    if (isAuthenticated) navigate('/mint');
    else signIn();
  };

  return (
    <PageTransition>
      <PublicNavBar activePage={'gallery' as AppPage} onNavigate={handleNavigate} tradeCount={0} />

      {/* HERO */}
      <section className="relative px-4 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-24 overflow-hidden">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(200,168,75,0.18), transparent 60%)',
          }}
        />

        <motion.div
          className="max-w-5xl mx-auto text-center"
          variants={stagger(0.08, 0.05)}
          initial="hidden"
          animate="show"
        >
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6 sm:mb-8"
            style={{
              background: 'rgba(200,168,75,0.07)',
              border: '1px solid rgba(200,168,75,0.25)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
              style={{ background: 'var(--cf-gold)', boxShadow: '0 0 6px rgba(200,168,75,0.7)' }}
            />
            <span
              className="font-ui text-[0.6rem] sm:text-xs uppercase tracking-[0.2em]"
              style={{ color: 'var(--cf-gold)' }}
            >
              Live · Free Mint
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="font-display font-bold leading-[1.05] text-4xl sm:text-6xl md:text-7xl lg:text-8xl mb-5 sm:mb-7 text-gold-gradient"
            style={{ textShadow: '0 0 40px rgba(200,168,75,0.25)' }}
          >
            Forge Legendary
            <br />
            NFT Cards
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="font-body max-w-2xl mx-auto text-sm sm:text-base md:text-lg leading-relaxed mb-8 sm:mb-10"
            style={{ color: 'var(--cf-muted2)' }}
          >
            A collectible card universe on Stacks. Open mystery packs, build your collection,
            and trade peer-to-peer — fully on-chain, completely free to mint.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          >
            <MagneticButton
              onClick={handlePrimary}
              disabled={isLoading}
              className="group font-ui font-semibold text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg disabled:opacity-50 w-full sm:w-auto"
              style={{
                color: '#0a0a14',
                background: 'linear-gradient(135deg, #e8c66a, #c8a84b)',
                boxShadow: '0 8px 28px rgba(200,168,75,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}
            >
              {isAuthenticated ? '⚡ Open a Pack' : '🔗 Connect Wallet'}
            </MagneticButton>
            <MagneticButton
              onClick={() => navigate('/gallery')}
              strength={8}
              className="font-ui font-semibold text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg border w-full sm:w-auto"
              style={{
                color: 'var(--cf-text)',
                borderColor: 'var(--cf-border)',
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              View Gallery →
            </MagneticButton>
          </motion.div>
        </motion.div>
      </section>

      {/* STATS / FEATURE GRID */}
      <section className="px-4 sm:px-6 pb-16 sm:pb-24">
        <motion.div
          className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4"
          variants={stagger(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {[
            { icon: '🎴', title: 'Mystery Packs', body: 'Each pack reveals 5 cards across Common, Rare, Epic and Legendary tiers.' },
            { icon: '⚔️', title: 'Battle Stats', body: 'Every card has ATK, DEF, SPD, SPC and HP — built for future on-chain duels.' },
            { icon: '⇄', title: 'P2P Trading', body: 'List, swap and collect rare cards directly with other players.' },
          ].map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
              className="p-5 sm:p-6 rounded-xl text-left"
              style={{
                background: 'var(--cf-surface)',
                border: '1px solid var(--cf-border)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              }}
            >
              <div className="text-2xl sm:text-3xl mb-3">{f.icon}</div>
              <h3 className="font-display font-bold text-base sm:text-lg mb-1.5" style={{ color: 'var(--cf-gold)' }}>
                {f.title}
              </h3>
              <p className="font-body text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--cf-muted2)' }}>
                {f.body}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* RARITY STRIP */}
      <section className="px-4 sm:px-6 pb-20 sm:pb-28">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-8 sm:mb-10">
            <div className="font-ui text-[0.55rem] sm:text-[0.65rem] uppercase tracking-[0.3em] mb-2" style={{ color: 'var(--cf-muted)' }}>
              Four Tiers
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl text-gold-gradient">
              Every Card a Treasure
            </h2>
          </Reveal>

          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3"
            variants={stagger(0.07)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            {[
              { name: 'Common', color: '#9ca3af', glow: 'rgba(156,163,175,0.25)' },
              { name: 'Rare', color: '#60a5fa', glow: 'rgba(96,165,250,0.3)' },
              { name: 'Epic', color: '#c084fc', glow: 'rgba(192,132,252,0.35)' },
              { name: 'Legendary', color: '#fbbf24', glow: 'rgba(251,191,36,0.45)' },
            ].map((r) => (
              <motion.div
                key={r.name}
                variants={fadeUp}
                whileHover={{ scale: 1.03, transition: { duration: 0.25 } }}
                className="aspect-[3/4] rounded-lg p-3 flex items-end"
                style={{
                  background: `linear-gradient(160deg, ${r.color}22, transparent 70%), var(--cf-surface)`,
                  border: `1px solid ${r.color}55`,
                  boxShadow: `0 0 24px ${r.glow}`,
                }}
              >
                <div className="font-display font-bold text-sm sm:text-base" style={{ color: r.color, textShadow: `0 0 12px ${r.glow}` }}>
                  {r.name}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-4 sm:px-6 pb-20 sm:pb-28">
        <Reveal>
          <div
            className="max-w-3xl mx-auto text-center p-8 sm:p-12 rounded-2xl"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(200,168,75,0.08), transparent 70%), var(--cf-surface)',
              border: '1px solid rgba(200,168,75,0.3)',
              boxShadow: '0 12px 40px rgba(200,168,75,0.12)',
            }}
          >
            <h2 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl mb-3 sm:mb-4 text-gold-gradient">
              Your collection awaits
            </h2>
            <p className="font-body text-xs sm:text-sm md:text-base mb-6 sm:mb-8 max-w-md mx-auto" style={{ color: 'var(--cf-muted2)' }}>
              Connect a Stacks wallet to claim your first pack. No fees. No catch.
            </p>
            <MagneticButton
              onClick={handlePrimary}
              disabled={isLoading}
              className="font-ui font-semibold text-sm sm:text-base px-8 py-3 sm:py-3.5 rounded-lg disabled:opacity-50"
              style={{
                color: '#0a0a14',
                background: 'linear-gradient(135deg, #e8c66a, #c8a84b)',
                boxShadow: '0 8px 28px rgba(200,168,75,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}
            >
              {isAuthenticated ? '⚡ Open Your First Pack' : '🔗 Get Started'}
            </MagneticButton>
          </div>
        </Reveal>
      </section>
    </PageTransition>
  );
};

export default LandingPage;
