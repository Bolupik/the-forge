import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStacksAuth } from '@/contexts/StacksAuthContext';
import PublicNavBar from './PublicNavBar';
import { AppPage } from '@/lib/cardforge';
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

  const features = [
    {
      title: 'Mystery Packs',
      body: 'Uncover hidden rarities with weekly drop events. Free-to-mint limited supply.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      title: 'Battle Stats',
      body: 'Every card carries ATK, DEF, SPD, SPC and HP — built for on-chain duels.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      title: 'P2P Trading',
      body: 'Trustless swaps powered by Stacks smart contracts — zero middleman fees.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
  ];

  const rarities = [
    { name: 'Common', color: '#7a7a82', border: 'rgba(85,85,95,0.6)', glow: 'inset 0 0 0 rgba(0,0,0,0)' },
    { name: 'Rare', color: '#88c4ff', border: 'rgba(60,140,255,0.35)', glow: 'inset 0 0 10px rgba(60,140,255,0.12)' },
    { name: 'Epic', color: '#d870ff', border: 'rgba(160,60,240,0.35)', glow: 'inset 0 0 15px rgba(160,60,240,0.14)' },
    { name: 'Legendary', color: '#ff8a7a', border: 'rgba(224,72,58,0.55)', glow: '0 0 24px rgba(224,72,58,0.18)' },
  ];

  return (
    <PageTransition>
      <PublicNavBar activePage={'gallery' as AppPage} onNavigate={handleNavigate} tradeCount={0} />

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 md:px-8 pt-6 sm:pt-10 pb-16">
        <motion.div
          className="grid grid-cols-12 gap-3 sm:gap-4 auto-rows-min"
          variants={stagger(0.07, 0.04)}
          initial="hidden"
          animate="show"
        >
          {/* HERO TILE */}
          <motion.section
            variants={fadeUp}
            className="col-span-12 md:col-span-8 md:row-span-2 relative overflow-hidden rounded-2xl p-6 sm:p-10 md:p-12 flex flex-col justify-between min-h-[420px] sm:min-h-[520px] group"
            style={{ background: 'var(--cf-surface)', border: '1px solid var(--cf-border)' }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full transition-opacity duration-700 group-hover:opacity-30"
              style={{ background: 'var(--cf-ember)', opacity: 0.12, filter: 'blur(100px)' }}
            />
            <div className="relative z-10">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6"
                style={{ background: 'rgba(224,72,58,0.08)', border: '1px solid rgba(224,72,58,0.3)' }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse-dot"
                  style={{ background: 'var(--cf-ember-hi)', boxShadow: '0 0 8px rgba(255,106,90,0.7)' }}
                />
                <span className="font-ui text-[0.6rem] sm:text-xs font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--cf-ember-hi)' }}>
                  Live · Free Mint
                </span>
              </div>
              <h1 className="font-display uppercase leading-[0.85] tracking-tight text-white text-5xl sm:text-7xl md:text-8xl mb-6">
                Forge <br />
                <span style={{ color: 'var(--cf-ember)' }}>Legendary</span> <br />
                NFT Cards
              </h1>
              <p className="font-body max-w-md text-sm sm:text-base leading-relaxed" style={{ color: 'var(--cf-muted2)' }}>
                A collectible card universe on Stacks. Open mystery packs, build your collection,
                and trade peer-to-peer — fully on-chain, completely free to mint.
              </p>
            </div>

            <div className="relative z-10 flex flex-wrap gap-3 mt-8">
              <button
                onClick={handlePrimary}
                disabled={isLoading}
                className="font-ui font-bold uppercase tracking-wider text-xs sm:text-sm px-7 py-3 rounded-md transition-colors disabled:opacity-50"
                style={{ background: 'var(--cf-ember)', color: '#fff' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--cf-ember-hi)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--cf-ember)')}
              >
                {isAuthenticated ? '⚡ Open a Pack' : '🔗 Connect Wallet'}
              </button>
              <button
                onClick={() => navigate('/gallery')}
                className="font-ui font-bold uppercase tracking-wider text-xs sm:text-sm px-7 py-3 rounded-md border transition-colors"
                style={{ borderColor: 'var(--cf-border)', color: 'var(--cf-text)', background: 'transparent' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--cf-surface3)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                View Gallery →
              </button>
            </div>
          </motion.section>

          {/* FEATURE TILES */}
          {features.slice(0, 2).map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              whileHover={{ y: -3, transition: { duration: 0.25 } }}
              className="col-span-12 sm:col-span-6 md:col-span-4 rounded-2xl p-5 sm:p-6 flex flex-col justify-between min-h-[190px] group"
              style={{ background: 'var(--cf-surface)', border: '1px solid var(--cf-border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(224,72,58,0.5)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--cf-border)')}
            >
              <div
                className="w-11 h-11 rounded-lg flex items-center justify-center mb-6"
                style={{ background: 'var(--cf-surface3)', border: '1px solid var(--cf-border)', color: 'var(--cf-ember)' }}
              >
                {f.icon}
              </div>
              <div>
                <h3 className="font-display uppercase text-2xl sm:text-3xl leading-none mb-2 text-white">{f.title}</h3>
                <p className="font-body text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--cf-muted2)' }}>{f.body}</p>
              </div>
            </motion.div>
          ))}

          {/* THIRD FEATURE — P2P TRADING */}
          <motion.div
            variants={fadeUp}
            whileHover={{ y: -3, transition: { duration: 0.25 } }}
            className="col-span-12 sm:col-span-6 md:col-span-4 rounded-2xl p-5 sm:p-6 flex flex-col justify-between min-h-[190px]"
            style={{ background: 'var(--cf-surface)', border: '1px solid var(--cf-border)' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(224,72,58,0.5)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--cf-border)')}
          >
            <div
              className="w-11 h-11 rounded-lg flex items-center justify-center mb-6"
              style={{ background: 'var(--cf-surface3)', border: '1px solid var(--cf-border)', color: 'var(--cf-ember)' }}
            >
              {features[2].icon}
            </div>
            <div>
              <h3 className="font-display uppercase text-2xl sm:text-3xl leading-none mb-2 text-white">{features[2].title}</h3>
              <p className="font-body text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--cf-muted2)' }}>{features[2].body}</p>
            </div>
          </motion.div>

          {/* RARITY SHOWCASE TILE */}
          <motion.section
            variants={fadeUp}
            className="col-span-12 md:col-span-8 rounded-2xl p-5 sm:p-6"
            style={{ background: 'var(--cf-surface)', border: '1px solid var(--cf-border)' }}
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-display uppercase text-2xl sm:text-3xl leading-none text-white">Rarity Tiers</h3>
              <span className="font-ui text-[10px] uppercase tracking-[0.25em]" style={{ color: 'var(--cf-ember)' }}>
                Collection Alpha v.1
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {rarities.map((r) => (
                <div
                  key={r.name}
                  className="rounded-lg p-2 sm:p-3 flex flex-col items-center transition-colors"
                  style={{ background: 'var(--cf-surface3)', border: `1px solid ${r.border}` }}
                >
                  <div
                    className="w-full aspect-[3/4] rounded mb-2 sm:mb-3"
                    style={{ background: 'var(--cf-bg)', boxShadow: r.glow }}
                  />
                  <span
                    className="font-ui text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em]"
                    style={{ color: r.color }}
                  >
                    {r.name}
                  </span>
                </div>
              ))}
            </div>
          </motion.section>

          {/* CLOSING CTA */}
          <motion.section
            variants={fadeUp}
            className="col-span-12 rounded-2xl p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden"
            style={{ background: 'var(--cf-ember)' }}
          >
            <div
              aria-hidden
              className="absolute -right-24 -bottom-24 w-80 h-80 rounded-full pointer-events-none"
              style={{ background: 'rgba(0,0,0,0.15)' }}
            />
            <div className="relative z-10 text-center md:text-left">
              <h2 className="font-display uppercase text-4xl sm:text-5xl leading-none mb-2 text-white">Ready to Forge?</h2>
              <p className="font-body text-white/85 text-sm sm:text-base">
                Connect a Stacks wallet to claim your first pack. No fees. No catch.
              </p>
            </div>
            <button
              onClick={handlePrimary}
              disabled={isLoading}
              className="relative z-10 font-ui font-bold uppercase tracking-widest text-xs sm:text-sm px-8 py-3.5 rounded-md transition-colors disabled:opacity-50"
              style={{ background: '#fff', color: 'var(--cf-ember)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f3f3')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
            >
              {isAuthenticated ? '⚡ Open Your First Pack' : 'Start Forging Now'}
            </button>
          </motion.section>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default LandingPage;
