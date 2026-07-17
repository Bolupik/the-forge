import { NFTCard, Trade } from '@/lib/cardforge';

interface PublicTradingPageProps {
  cards: NFTCard[];
  trades: Trade[];
}

const FEATURES = [
  { icon: '🤝', title: 'P2P Trade Proposals', desc: 'Card-for-card swaps with optional STX top-up.', pill: 'In Design' },
  { icon: '⛓', title: 'On-Chain Settlement', desc: 'Clarity contracts, no middlemen required.', pill: 'Planned' },
  { icon: '📊', title: 'Rarity-Based Pricing', desc: 'Algorithmic floor prices by rarity tier.', pill: 'Planned' },
  { icon: '🏆', title: 'Trade Provenance', desc: 'Permanent on-chain trade history.', pill: 'Planned' },
];

const dotColor: Record<string, string> = {
  common: '#b8cfe0', rare: '#88c4ff', epic: '#d870ff', legendary: '#ffe860',
};

const PublicTradingPage = ({ cards, trades }: PublicTradingPageProps) => {
  return (
    <div className="max-w-[1080px] mx-auto px-4 sm:px-6 md:px-10 py-8 md:py-[50px]">
      {/* Hero */}
      <div className="text-center mb-12">
        <span
          className="inline-block font-ui text-[0.58rem] uppercase tracking-[0.3em] px-4 py-1.5 rounded-full mb-5 animate-pulse"
          style={{ border: '1px solid rgba(224,72,58,0.25)', color: 'var(--cf-gold)', background: 'rgba(224,72,58,0.06)' }}
        >
          Coming Soon
        </span>
        <h1 className="font-display text-3xl md:text-4xl font-black text-gold-gradient mb-3" style={{ filter: 'drop-shadow(0 0 30px rgba(224,72,58,0.25))' }}>
          Card Trading Exchange
        </h1>
        <p className="font-body text-sm mx-auto max-w-[400px]" style={{ color: 'var(--cf-muted2)', lineHeight: 1.8 }}>
          Peer-to-peer trading secured on-chain via Stacks smart contracts. Connect your wallet to participate.
        </p>
        <div className="w-[80px] h-[2px] mx-auto mt-5" style={{ background: 'linear-gradient(90deg, transparent, var(--cf-gold), transparent)' }} />
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="relative rounded-xl p-5 transition-all duration-300 hover:-translate-y-1"
            style={{
              background: 'var(--cf-surface)',
              border: '1px solid var(--cf-border)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-[1.5px]" style={{ background: 'linear-gradient(90deg, transparent, var(--cf-gold), transparent)' }} />
            <span className="text-2xl mb-2 block">{f.icon}</span>
            <h3 className="font-display text-xs mb-1" style={{ color: 'var(--cf-text)' }}>{f.title}</h3>
            <p className="font-body text-[0.6rem] mb-3" style={{ color: 'var(--cf-muted)' }}>{f.desc}</p>
            <span className="font-ui text-[0.5rem] uppercase px-2 py-0.5 rounded-full" style={{
              border: '1px solid var(--cf-border2)',
              color: 'var(--cf-muted2)',
            }}>{f.pill}</span>
          </div>
        ))}
      </div>

      {/* Active Listings (read-only) */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--cf-surface)', border: '1px solid var(--cf-border2)' }}>
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--cf-border)' }}>
          <h3 className="font-display text-sm text-gold-gradient">Active Listings</h3>
          <span className="font-ui text-[0.55rem]" style={{ color: 'var(--cf-muted)' }}>{trades.filter(t => t.status === 'active').length} active</span>
        </div>

        {trades.filter(t => t.status === 'active').length === 0 ? (
          <div className="flex flex-col items-center py-14 opacity-50">
            <span className="text-3xl mb-2 opacity-30">📋</span>
            <p className="font-body text-xs" style={{ color: 'var(--cf-muted)' }}>No active listings yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Mobile card layout */}
            <div className="block md:hidden">
              {trades.filter(t => t.status === 'active').map((t) => (
                <div key={t.id} className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--cf-border)' }}>
                  {t.imageUrl && <img src={t.imageUrl} alt="" className="w-[40px] h-[56px] object-cover rounded shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <span className="font-body text-xs block truncate" style={{ color: 'var(--cf-text)' }}>{t.cardName}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor[t.rarity] || 'var(--cf-muted)' }} />
                      <span className="font-ui text-[0.55rem] capitalize" style={{ color: 'var(--cf-muted2)' }}>{t.rarity}</span>
                    </div>
                    <p className="font-body text-[0.6rem] mt-1 truncate" style={{ color: 'var(--cf-muted2)' }}>Wants: {t.asking}</p>
                  </div>
                  <button
                    className="font-ui text-[0.6rem] px-3 py-1.5 rounded-lg shrink-0 transition-colors"
                    style={{
                      border: '1px solid rgba(224,72,58,0.3)',
                      color: 'var(--cf-gold)',
                      background: 'rgba(224,72,58,0.06)',
                    }}
                    onClick={() => alert('Connect your wallet to make offers!')}
                  >
                    Make Offer
                  </button>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <table className="w-full hidden md:table">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cf-border)' }}>
                  {['Card', 'Rarity', 'Asking For', 'Listed', ''].map(h => (
                    <th key={h} className="font-ui text-[0.5rem] uppercase tracking-wider text-left py-3 px-4" style={{ color: 'var(--cf-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.filter(t => t.status === 'active').map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-[rgba(224,72,58,0.02)]" style={{ borderBottom: '1px solid var(--cf-border)' }}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {t.imageUrl && <img src={t.imageUrl} alt="" className="w-[30px] h-[42px] object-cover rounded" />}
                        <span className="font-body text-xs" style={{ color: 'var(--cf-text)' }}>{t.cardName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: dotColor[t.rarity] || 'var(--cf-muted)' }} />
                        <span className="font-ui text-[0.6rem] capitalize" style={{ color: 'var(--cf-muted2)' }}>{t.rarity}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-body text-xs" style={{ color: 'var(--cf-text)' }}>{t.asking}</td>
                    <td className="py-3 px-4 font-mono text-[0.5rem]" style={{ color: 'var(--cf-muted)' }}>
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        className="font-ui text-[0.55rem] px-3 py-1 rounded transition-colors"
                        style={{ border: '1px solid rgba(224,72,58,0.3)', color: 'var(--cf-gold)' }}
                        onClick={() => alert('Connect your wallet to make offers!')}
                      >
                        Offer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicTradingPage;
