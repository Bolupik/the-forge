import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppPage } from '@/lib/cardforge';
import { useStacksAuth } from '@/contexts/StacksAuthContext';

interface PublicNavBarProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  tradeCount: number;
}

const PublicNavBar = ({ activePage, onNavigate, tradeCount }: PublicNavBarProps) => {
  const { isAuthenticated, userData, isLoading, signIn, signOut, truncateAddress } = useStacksAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const walletLabel = userData?.bnsName ?? (userData?.address ? truncateAddress(userData.address) : '');
  const tabs: { page: AppPage; label: string; icon?: string; mobileLabel?: string }[] = [
    { page: 'gallery', label: 'Gallery', icon: '🎴', mobileLabel: '🎴' },
    { page: 'mint', label: 'Mint', icon: '⚡', mobileLabel: '⚡' },
    { page: 'trading', label: 'Trading', icon: '⇄', mobileLabel: '⇄' },
  ];

  return (
    <nav
      className="sticky top-0 z-50 h-14 sm:h-16 flex items-center px-3 sm:px-4 md:px-6"
      style={{
        background: 'rgba(5,5,14,0.92)',
        backdropFilter: 'blur(20px) saturate(1.5)',
        borderBottom: '1px solid var(--cf-border)',
      }}
    >
      <div
        className="absolute bottom-0 left-0 w-full h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(200,168,75,0.18), transparent)' }}
      />

      {/* Logo */}
      <button
        onClick={() => onNavigate('gallery')}
        className="font-display text-base sm:text-lg font-bold text-gold-gradient transition-all duration-300 hover:drop-shadow-[0_0_16px_rgba(200,168,75,0.5)] shrink-0"
      >
        <span className="hidden sm:inline">CardForge</span>
        <span className="sm:hidden">CF</span>
      </button>

      {/* Center Tabs */}
      <div className="flex-1 flex justify-center gap-0.5 sm:gap-1">
        {tabs.map(({ page, label, icon, mobileLabel }) => {
          const active = activePage === page;
          return (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className="relative font-ui text-xs sm:text-sm font-semibold px-2.5 sm:px-4 md:px-5 py-1.5 sm:py-2 rounded-md transition-all duration-300"
              style={{
                color: active ? 'var(--cf-gold)' : 'var(--cf-muted2)',
                background: active ? 'rgba(200,168,75,0.07)' : 'transparent',
                border: active ? '1px solid rgba(200,168,75,0.22)' : '1px solid transparent',
                transform: active ? 'scale(1.05)' : 'scale(1)',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--cf-text)'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = active ? 'var(--cf-gold)' : 'var(--cf-muted2)'; }}
            >
              {icon && <span className="mr-0 sm:mr-1">{icon}</span>}
              <span className="hidden sm:inline">{label}</span>
              {active && (
                <div
                  className="absolute -bottom-[1px] left-[20%] right-[20%] h-[2px]"
                  style={{ background: 'linear-gradient(90deg, transparent, var(--cf-gold), transparent)' }}
                />
              )}
              {page === 'trading' && tradeCount > 0 && (
                <span
                  className="absolute top-[3px] right-[5px] sm:top-[5px] sm:right-[7px] w-1.5 h-1.5 rounded-full animate-pulse-dot"
                  style={{ background: 'var(--cf-gold)', boxShadow: '0 0 6px rgba(200,168,75,0.6)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Wallet Connect / User Menu */}
      {isAuthenticated && userData ? (
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="font-ui text-[0.6rem] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border transition-all duration-300 hover:-translate-y-0.5 active:scale-95 flex items-center gap-1.5"
            style={{
              color: 'var(--cf-gold)',
              borderColor: 'rgba(200,168,75,0.3)',
              background: 'rgba(200,168,75,0.06)',
              boxShadow: '0 2px 10px rgba(200,168,75,0.1)',
            }}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#4ade80', boxShadow: '0 0 6px rgba(74,222,128,0.7)' }}
            />
            <span className="font-mono">{walletLabel}</span>
            <span className="opacity-60">▾</span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 rounded-lg overflow-hidden animate-card-enter"
              style={{
                background: 'rgba(10,10,20,0.98)',
                border: '1px solid var(--cf-border)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              }}
            >
              <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--cf-border)' }}>
                <div
                  className="font-ui text-[0.55rem] uppercase tracking-wider mb-0.5"
                  style={{ color: 'var(--cf-muted)' }}
                >
                  Connected Wallet
                </div>
                <div
                  className="font-mono text-xs break-all"
                  style={{ color: 'var(--cf-text)' }}
                  title={userData.address}
                >
                  {userData.bnsName ?? truncateAddress(userData.address)}
                </div>
                {userData.bnsName && (
                  <div
                    className="font-mono text-[0.6rem] mt-0.5"
                    style={{ color: 'var(--cf-muted2)' }}
                  >
                    {truncateAddress(userData.address)}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/account');
                }}
                className="w-full text-left px-3 py-2.5 font-ui text-xs transition-colors hover:bg-white/5"
                style={{ color: 'var(--cf-text)', borderBottom: '1px solid var(--cf-border)' }}
                role="menuitem"
              >
                👤 My Account
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                }}
                className="w-full text-left px-3 py-2.5 font-ui text-xs transition-colors hover:bg-white/5"
                style={{ color: 'var(--cf-text)' }}
                role="menuitem"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          disabled={isLoading}
          className="font-ui text-[0.6rem] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border transition-all duration-300 shrink-0 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
          style={{
            color: 'var(--cf-gold)',
            borderColor: 'rgba(200,168,75,0.3)',
            background: 'rgba(200,168,75,0.06)',
            boxShadow: '0 2px 10px rgba(200,168,75,0.1)',
          }}
          onClick={signIn}
        >
          <span className="hidden sm:inline">🔗 Connect Wallet</span>
          <span className="sm:hidden">🔗 Connect</span>
        </button>
      )}
    </nav>
  );
};

export default PublicNavBar;
