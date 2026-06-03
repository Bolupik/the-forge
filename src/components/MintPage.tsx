import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NFTCard } from '@/lib/cardforge';
import { dbCardToNft, DbNftCard } from '@/lib/dbCards';
import { supabase } from '@/integrations/supabase/client';
import PackGrid from './mint/PackGrid';
import PackOpenAnimation from './mint/PackOpenAnimation';
import CardRevealSequence from './mint/CardRevealSequence';

type Phase = 'pick' | 'opening' | 'revealing';

interface Stats {
  cardsPerPack: number;
  totalPacks: number;
  openedPacks: number;
  totalMinted: number;
}

const DEFAULT_STATS: Stats = {
  cardsPerPack: 5,
  totalPacks: 0,
  openedPacks: 0,
  totalMinted: 0,
};

/**
 * Orchestrates the 3-stage Pokémon-style pack mint flow against the backend:
 *   pick → opening (animation) → revealing (one-by-one card flips)
 *
 * Cards are minted server-side via the `open-pack` edge function and persisted
 * in the `nft_cards` table.
 */
const MintPage = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('pick');
  const [pickedPackIdx, setPickedPackIdx] = useState<number | null>(null);
  const [drawnCards, setDrawnCards] = useState<NFTCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);

  const loadStats = async () => {
    try {
      const [{ data: cfg }, { count: openedCount }, { count: totalPacksCount }, { count: cardsCount }] =
        await Promise.all([
          supabase.from('collection_config').select('cards_per_pack').eq('id', 1).maybeSingle(),
          supabase.from('mint_packs').select('*', { count: 'exact', head: true }).not('opened_by', 'is', null),
          supabase.from('mint_packs').select('*', { count: 'exact', head: true }),
          supabase.from('nft_cards').select('*', { count: 'exact', head: true }),
        ]);

      setStats({
        cardsPerPack: cfg?.cards_per_pack ?? 5,
        totalPacks: totalPacksCount ?? 0,
        openedPacks: openedCount ?? 0,
        totalMinted: cardsCount ?? 0,
      });
    } catch (e) {
      console.error('failed to load mint stats', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const packsRemaining = stats.totalPacks - stats.openedPacks;
  const canMint = !loading && packsRemaining > 0 && !minting;

  const handlePackSelected = async (idx: number) => {
    if (minting) return;
    setError(null);
    setMinting(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('open-pack', {
        body: {},
      });

      if (invokeError) {
        console.error('open-pack invoke error', invokeError);
        setError(invokeError.message || 'Failed to open pack. Please try again.');
        setMinting(false);
        return;
      }

      const payload = data as { cards?: DbNftCard[]; error?: string } | null;
      if (!payload || payload.error || !payload.cards?.length) {
        setError(payload?.error ?? 'No cards returned. Please try again.');
        setMinting(false);
        return;
      }

      const cards = payload.cards.map(dbCardToNft);
      setPickedPackIdx(idx);
      setDrawnCards(cards);
      setPhase('opening');
      // Refresh stats in the background
      loadStats();
    } catch (e: unknown) {
      console.error('open-pack failed', e);
      setError(e instanceof Error ? e.message : 'Unexpected error opening pack');
    } finally {
      setMinting(false);
    }
  };

  const reset = () => {
    setPhase('pick');
    setPickedPackIdx(null);
    setDrawnCards([]);
  };

  return (
    <div className="relative min-h-screen flex flex-col px-4 py-8 sm:py-12">
      {/* Stats bar */}
      <div className="w-full max-w-[860px] mx-auto mb-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: 'Packs Left', value: `${packsRemaining.toLocaleString()} / ${stats.totalPacks.toLocaleString()}` },
          { label: 'Cards / Pack', value: stats.cardsPerPack.toString() },
          { label: 'Total Minted', value: stats.totalMinted.toLocaleString() },
          { label: 'Price', value: 'Free' },
        ].map((row) => (
          <div
            key={row.label}
            className="flex flex-col items-center justify-center py-2 px-3 rounded-lg"
            style={{ background: 'var(--cf-surface)', border: '1px solid var(--cf-border)' }}
          >
            <span
              className="font-ui text-[0.5rem] uppercase tracking-wider"
              style={{ color: 'var(--cf-muted)' }}
            >
              {row.label}
            </span>
            <span
              className="font-display text-xs sm:text-sm font-bold mt-0.5"
              style={{ color: 'var(--cf-text)' }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="w-full max-w-[420px] mx-auto mb-4 p-3 rounded-lg text-center animate-card-enter"
          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}
        >
          <span className="font-body text-xs" style={{ color: '#f87171' }}>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="w-full max-w-[420px] mx-auto mb-6 p-4 rounded-xl text-center"
             style={{ background: 'var(--cf-surface)', border: '1px solid var(--cf-border)' }}>
          <p className="font-body text-xs" style={{ color: 'var(--cf-muted2)' }}>
            Loading collection…
          </p>
        </div>
      )}

      {/* Sold out */}
      {!loading && packsRemaining <= 0 && (
        <div
          className="w-full max-w-[420px] mx-auto mb-6 p-4 rounded-xl text-center animate-card-enter"
          style={{ background: 'var(--cf-surface)', border: '1px solid var(--cf-border)' }}
        >
          <p className="font-display text-sm mb-2" style={{ color: 'var(--cf-gold)' }}>
            Mint Unavailable
          </p>
          <p className="font-body text-xs" style={{ color: 'var(--cf-muted2)' }}>
            {stats.totalPacks === 0
              ? 'No packs have been seeded yet. Check back soon.'
              : 'All packs have been opened!'}
          </p>
        </div>
      )}

      {/* Stage 1: Pack picker */}
      {canMint && phase === 'pick' && (
        <PackGrid
          onPackSelected={handlePackSelected}
          packsRemaining={packsRemaining}
          totalPacks={stats.totalPacks}
          disabled={minting}
        />
      )}

      {/* Stage 2: Pack opening animation overlay */}
      {phase === 'opening' && pickedPackIdx !== null && (
        <PackOpenAnimation
          packIndex={pickedPackIdx}
          onComplete={() => setPhase('revealing')}
        />
      )}

      {/* Stage 3: Card reveal sequence overlay */}
      {phase === 'revealing' && drawnCards.length > 0 && (
        <CardRevealSequence
          cards={drawnCards}
          onMintAgain={reset}
          onDone={() => navigate('/gallery')}
        />
      )}
    </div>
  );
};

export default MintPage;
