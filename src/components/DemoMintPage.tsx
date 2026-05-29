import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { NFTCard, Rarity, CardStats, getCards, saveCards } from '@/lib/cardforge';
import CardRevealSequence from './mint/CardRevealSequence';

interface DbTemplate {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  element: string;
  stats: CardStats;
  image_url: string;
  metadata_url: string;
  supply: number;
  minted: number;
  created_at: string;
}

const RARITY_ORDER: Rarity[] = ['legendary', 'epic', 'rare', 'common'];

const rarityChip = (r: Rarity) => {
  const map: Record<Rarity, { label: string; color: string }> = {
    common: { label: 'COMMON', color: 'var(--r-common-text)' },
    rare: { label: 'RARE', color: 'var(--r-rare-text)' },
    epic: { label: 'EPIC', color: 'var(--r-epic-text)' },
    legendary: { label: 'LEGENDARY', color: 'var(--r-leg-text)' },
  };
  return map[r];
};

/**
 * Public demo mint page — no wallet, no auth required.
 * Lists every template uploaded in the admin Forge and lets anyone
 * mint a copy locally. Each mint runs the full reveal animation
 * and persists to localStorage so the gallery picks it up.
 */
const DemoMintPage = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<DbTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealCards, setRevealCards] = useState<NFTCard[] | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error: e } = await supabase
      .from('card_templates')
      .select('*')
      .order('created_at', { ascending: false });
    if (e) setError(e.message);
    else setTemplates((data ?? []) as unknown as DbTemplate[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const mintTemplate = (t: DbTemplate) => {
    const existing = getCards();
    const card: NFTCard = {
      id: crypto.randomUUID(),
      templateId: t.id,
      name: t.name,
      description: t.description ?? '',
      rarity: t.rarity,
      stats: t.stats,
      element: t.element,
      imageUrl: t.image_url,
      metadataUrl: t.metadata_url ?? '',
      serial: existing.length + 1,
      createdAt: new Date().toISOString(),
    };
    saveCards([...existing, card]);
    setRevealCards([card]);
  };

  const sorted = [...templates].sort(
    (a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity),
  );

  return (
    <div className="relative min-h-screen flex flex-col px-4 py-8 sm:py-12 animate-page-transition">
      {/* Header */}
      <header className="w-full max-w-[1200px] mx-auto mb-8 text-center">
        <div
          className="inline-block font-ui text-[0.6rem] uppercase tracking-[0.4em] px-3 py-1 rounded-full mb-3"
          style={{
            color: 'var(--cf-gold)',
            background: 'rgba(255,106,42,0.08)',
            border: '1px solid rgba(255,106,42,0.25)',
          }}
        >
          ⚡ Demo Mint · No Wallet Required
        </div>
        <h1 className="font-display text-2xl sm:text-4xl font-bold text-gold-gradient mb-2">
          The Forge Pool
        </h1>
        <p
          className="font-body text-xs sm:text-sm max-w-[520px] mx-auto"
          style={{ color: 'var(--cf-muted2)' }}
        >
          Every card uploaded from the admin forge lands here. Pick one and mint
          it instantly — your card lands in your local gallery.
        </p>
      </header>

      {/* States */}
      {loading && (
        <div className="flex-1 flex items-center justify-center py-20">
          <span
            className="font-ui text-xs uppercase tracking-[0.3em] animate-pulse"
            style={{ color: 'var(--cf-muted)' }}
          >
            Loading the forge pool…
          </span>
        </div>
      )}

      {error && !loading && (
        <div
          className="w-full max-w-[420px] mx-auto mb-4 p-3 rounded-lg text-center"
          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}
        >
          <span className="font-body text-xs" style={{ color: '#f87171' }}>{error}</span>
        </div>
      )}

      {!loading && !error && sorted.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20 gap-3">
          <span className="text-5xl opacity-40">🜂</span>
          <h2 className="font-display text-lg" style={{ color: 'var(--cf-text)' }}>
            The forge pool is empty
          </h2>
          <p className="font-body text-xs max-w-[320px]" style={{ color: 'var(--cf-muted2)' }}>
            Head to the admin forge and upload a card — it will appear here
            instantly, mintable by anyone.
          </p>
        </div>
      )}

      {/* Template grid */}
      {!loading && sorted.length > 0 && (
        <div className="w-full max-w-[1200px] mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
          {sorted.map((t, idx) => {
            const chip = rarityChip(t.rarity);
            const remaining = Math.max(0, t.supply - t.minted);
            return (
              <article
                key={t.id}
                className="group relative rounded-2xl overflow-hidden flex flex-col animate-card-enter"
                style={{
                  background: 'var(--cf-surface)',
                  border: '1px solid var(--cf-border)',
                  animationDelay: `${Math.min(idx, 12) * 40}ms`,
                  transition: 'transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = 'var(--cf-gold)';
                  e.currentTarget.style.boxShadow = '0 12px 36px rgba(255,106,42,0.18)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--cf-border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Image */}
                <div className="relative aspect-[3/4] overflow-hidden" style={{ background: 'var(--cf-surface2)' }}>
                  {t.image_url ? (
                    <img
                      src={t.image_url}
                      alt={t.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl opacity-40">🜂</div>
                  )}
                  <div
                    className="absolute top-2 left-2 font-ui text-[0.5rem] uppercase tracking-[0.2em] px-1.5 py-0.5 rounded"
                    style={{
                      color: chip.color,
                      background: 'rgba(5,5,14,0.7)',
                      border: `1px solid ${chip.color}`,
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    {chip.label}
                  </div>
                </div>

                {/* Meta */}
                <div className="flex flex-col gap-2 p-3">
                  <h3
                    className="font-display text-sm font-bold truncate"
                    style={{ color: 'var(--cf-text)' }}
                    title={t.name}
                  >
                    {t.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="font-ui text-[0.5rem] uppercase tracking-wider" style={{ color: 'var(--cf-muted)' }}>
                      Remaining
                    </span>
                    <span className="font-mono text-[0.65rem]" style={{ color: 'var(--cf-text)' }}>
                      {remaining.toLocaleString()} / {t.supply.toLocaleString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => mintTemplate(t)}
                    disabled={remaining === 0}
                    className="mt-1 w-full font-ui text-[0.65rem] uppercase tracking-[0.2em] font-bold py-2 rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: remaining === 0
                        ? 'transparent'
                        : 'linear-gradient(135deg, #c44512, #ff6a2a, #ff8a4c)',
                      color: remaining === 0 ? 'var(--cf-muted)' : '#fff',
                      border: remaining === 0 ? '1px solid var(--cf-border)' : 'none',
                      boxShadow: remaining === 0 ? 'none' : '0 4px 18px rgba(255,106,42,0.3)',
                    }}
                  >
                    {remaining === 0 ? 'Sold Out' : '⚡ Mint Demo'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Reveal overlay */}
      {revealCards && (
        <CardRevealSequence
          cards={revealCards}
          onMintAgain={() => setRevealCards(null)}
          onDone={() => navigate('/gallery')}
        />
      )}
    </div>
  );
};

export default DemoMintPage;
