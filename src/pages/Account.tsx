import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ParticleField from '@/components/ParticleField';
import PublicNavBar from '@/components/PublicNavBar';
import { useStacksAuth } from '@/contexts/StacksAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppPage } from '@/lib/cardforge';

const Account = () => {
  const navigate = useNavigate();
  const { userData, signOut, truncateAddress } = useStacksAuth();
  const [cardCount, setCardCount] = useState<number | null>(null);
  const [rarityCounts, setRarityCounts] = useState<Record<string, number>>({});
  const [tradeCount, setTradeCount] = useState(0);
  const [onChainCount, setOnChainCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id;
        if (!userId) {
          if (!cancelled) {
            setCardCount(0);
            setLoading(false);
          }
          return;
        }

        const [{ data: cards }, { count: trades }] = await Promise.all([
          supabase.from('nft_cards').select('rarity').eq('owner_id', userId),
          supabase
            .from('trades')
            .select('*', { count: 'exact', head: true })
            .eq('seller_id', userId)
            .eq('status', 'active'),
        ]);

        if (cancelled) return;

        const rows = (cards as { rarity: string }[] | null) ?? [];
        setCardCount(rows.length);
        const buckets: Record<string, number> = {};
        for (const r of rows) {
          buckets[r.rarity] = (buckets[r.rarity] ?? 0) + 1;
        }
        setRarityCounts(buckets);
        setTradeCount(trades ?? 0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleNavigate = (page: AppPage) => {
    if (page === 'gallery') navigate('/gallery');
    else if (page === 'mint') navigate('/mint');
    else if (page === 'trading') navigate('/trading');
  };

  const copyAddress = async () => {
    if (!userData?.address) return;
    try {
      await navigator.clipboard.writeText(userData.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const RARITY_META: { key: string; label: string; color: string }[] = [
    { key: 'common', label: 'Common', color: '#9ca3af' },
    { key: 'rare', label: 'Rare', color: '#60a5fa' },
    { key: 'epic', label: 'Epic', color: '#c084fc' },
    { key: 'legendary', label: 'Legendary', color: '#fbbf24' },
  ];

  return (
    <div className="min-h-screen">
      <ParticleField />
      <div className="relative z-10">
        <PublicNavBar activePage={'gallery' as AppPage} onNavigate={handleNavigate} tradeCount={tradeCount} />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div
              className="font-ui text-[0.55rem] sm:text-[0.65rem] uppercase tracking-[0.3em] mb-1.5"
              style={{ color: 'var(--cf-muted)' }}
            >
              Your Account
            </div>
            <h1 className="font-display font-bold text-3xl sm:text-4xl text-gold-gradient">
              {userData?.bnsName ?? 'Card Collector'}
            </h1>
          </div>

          {/* Wallet card */}
          <div
            className="p-5 sm:p-7 rounded-xl mb-4 sm:mb-5"
            style={{
              background: 'var(--cf-surface)',
              border: '1px solid var(--cf-border)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#4ade80', boxShadow: '0 0 6px rgba(74,222,128,0.7)' }}
              />
              <span
                className="font-ui text-[0.55rem] sm:text-[0.65rem] uppercase tracking-[0.25em]"
                style={{ color: 'var(--cf-muted)' }}
              >
                Connected Wallet
              </span>
            </div>

            {userData?.bnsName && (
              <div className="mb-3">
                <div
                  className="font-ui text-[0.55rem] uppercase tracking-wider mb-0.5"
                  style={{ color: 'var(--cf-muted)' }}
                >
                  BNS Name
                </div>
                <div className="font-display text-lg sm:text-xl" style={{ color: 'var(--cf-gold)' }}>
                  {userData.bnsName}
                </div>
              </div>
            )}

            <div className="mb-4">
              <div
                className="font-ui text-[0.55rem] uppercase tracking-wider mb-0.5"
                style={{ color: 'var(--cf-muted)' }}
              >
                Stacks Address
              </div>
              <div
                className="font-mono text-xs sm:text-sm break-all"
                style={{ color: 'var(--cf-text)' }}
              >
                {userData?.address ?? '—'}
              </div>
              <div
                className="font-mono text-[0.65rem] mt-1"
                style={{ color: 'var(--cf-muted2)' }}
              >
                {userData?.address ? truncateAddress(userData.address) : ''}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={copyAddress}
                disabled={!userData?.address}
                className="font-ui text-xs px-3 py-2 rounded-lg border transition-all duration-300 hover:-translate-y-0.5 active:scale-95 disabled:opacity-40"
                style={{
                  color: copied ? '#4ade80' : 'var(--cf-gold)',
                  borderColor: copied ? 'rgba(74,222,128,0.4)' : 'rgba(200,168,75,0.3)',
                  background: copied ? 'rgba(74,222,128,0.08)' : 'rgba(200,168,75,0.06)',
                }}
              >
                {copied ? '✓ Copied' : '📋 Copy Address'}
              </button>
              <button
                onClick={signOut}
                className="font-ui text-xs px-3 py-2 rounded-lg border transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
                style={{
                  color: 'var(--cf-text)',
                  borderColor: 'var(--cf-border)',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-5">
            <div
              className="p-4 sm:p-5 rounded-xl"
              style={{
                background: 'var(--cf-surface)',
                border: '1px solid var(--cf-border)',
              }}
            >
              <div
                className="font-ui text-[0.55rem] uppercase tracking-wider mb-1"
                style={{ color: 'var(--cf-muted)' }}
              >
                Total Cards
              </div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-gold-gradient">
                {loading ? '…' : cardCount?.toLocaleString() ?? '0'}
              </div>
            </div>
            <div
              className="p-4 sm:p-5 rounded-xl"
              style={{
                background: 'var(--cf-surface)',
                border: '1px solid var(--cf-border)',
              }}
            >
              <div
                className="font-ui text-[0.55rem] uppercase tracking-wider mb-1"
                style={{ color: 'var(--cf-muted)' }}
              >
                Active Listings
              </div>
              <div className="font-display text-2xl sm:text-3xl font-bold" style={{ color: 'var(--cf-text)' }}>
                {loading ? '…' : tradeCount.toLocaleString()}
              </div>
            </div>
            <div
              className="p-4 sm:p-5 rounded-xl col-span-2 sm:col-span-1"
              style={{
                background: 'var(--cf-surface)',
                border: '1px solid var(--cf-border)',
              }}
            >
              <div
                className="font-ui text-[0.55rem] uppercase tracking-wider mb-1"
                style={{ color: 'var(--cf-muted)' }}
              >
                Network
              </div>
              <div className="font-display text-base sm:text-lg" style={{ color: 'var(--cf-text)' }}>
                Stacks Mainnet
              </div>
            </div>
          </div>

          {/* Rarity breakdown */}
          <div
            className="p-5 sm:p-6 rounded-xl mb-6"
            style={{
              background: 'var(--cf-surface)',
              border: '1px solid var(--cf-border)',
            }}
          >
            <div
              className="font-ui text-[0.55rem] sm:text-[0.65rem] uppercase tracking-[0.25em] mb-4"
              style={{ color: 'var(--cf-muted)' }}
            >
              Collection Breakdown
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {RARITY_META.map((r) => (
                <div
                  key={r.key}
                  className="p-3 rounded-lg text-center"
                  style={{
                    background: `linear-gradient(160deg, ${r.color}15, transparent 70%)`,
                    border: `1px solid ${r.color}40`,
                  }}
                >
                  <div
                    className="font-ui text-[0.55rem] uppercase tracking-wider mb-1"
                    style={{ color: r.color }}
                  >
                    {r.label}
                  </div>
                  <div className="font-display text-xl font-bold" style={{ color: 'var(--cf-text)' }}>
                    {loading ? '…' : rarityCounts[r.key] ?? 0}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/mint')}
              className="font-ui font-semibold text-sm px-5 py-2.5 rounded-lg transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
              style={{
                color: '#0a0a14',
                background: 'linear-gradient(135deg, #e8c66a, #c8a84b)',
                boxShadow: '0 6px 20px rgba(200,168,75,0.3)',
              }}
            >
              ⚡ Open a Pack
            </button>
            <button
              onClick={() => navigate('/gallery')}
              className="font-ui font-semibold text-sm px-5 py-2.5 rounded-lg border transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
              style={{
                color: 'var(--cf-text)',
                borderColor: 'var(--cf-border)',
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              🎴 View Collection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;
