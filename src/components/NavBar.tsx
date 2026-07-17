import { AdminPage } from '@/lib/cardforge';

interface NavBarProps {
  activePage: AdminPage;
  onNavigate: (page: AdminPage) => void;
  onLogout: () => void;
  tradeCount: number;
}

const NavBar = ({ activePage, onNavigate, onLogout, tradeCount }: NavBarProps) => {
  const tabs: { page: AdminPage; label: string; icon?: string }[] = [
    { page: 'gallery', label: 'Gallery' },
    { page: 'forge', label: 'Forge', icon: '⚒' },
    { page: 'trading', label: 'Trading', icon: '⇄' },
    { page: 'whitelist', label: 'Whitelist', icon: '📋' },
  ];

  return (
    <nav
      className="sticky top-0 z-50 h-16 flex items-center px-4 md:px-6"
      style={{
        background: 'rgba(5,5,14,0.88)',
        backdropFilter: 'blur(20px) saturate(1.5)',
        borderBottom: '1px solid var(--cf-border)',
      }}
    >
      <div
        className="absolute bottom-0 left-0 w-full h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(224,72,58,0.18), transparent)' }}
      />

      <button
        onClick={() => onNavigate('gallery')}
        className="font-display text-lg font-bold text-gold-gradient transition-all duration-300 hover:drop-shadow-[0_0_16px_rgba(224,72,58,0.5)] shrink-0"
      >
        CardForge
        <span className="font-ui text-[0.5rem] ml-1.5 px-1.5 py-0.5 rounded text-red-400 border border-red-400/30 align-middle">ADMIN</span>
      </button>

      <div className="flex-1 flex justify-center gap-1">
        {tabs.map(({ page, label, icon }) => {
          const active = activePage === page;
          return (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className="relative font-ui text-xs md:text-sm font-semibold px-3 md:px-5 py-2 rounded-md transition-all duration-200"
              style={{
                color: active ? 'var(--cf-gold)' : 'var(--cf-muted2)',
                background: active ? 'rgba(224,72,58,0.07)' : 'transparent',
                border: active ? '1px solid rgba(224,72,58,0.22)' : '1px solid transparent',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--cf-text)'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'var(--cf-muted2)'; }}
            >
              {icon && <span className="mr-1">{icon}</span>}
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{icon || label.charAt(0)}</span>
              {active && (
                <div
                  className="absolute -bottom-[1px] left-[20%] right-[20%] h-[2px]"
                  style={{ background: 'linear-gradient(90deg, transparent, var(--cf-gold), transparent)' }}
                />
              )}
              {page === 'trading' && tradeCount > 0 && (
                <span
                  className="absolute top-[5px] right-[7px] w-1.5 h-1.5 rounded-full animate-pulse-dot"
                  style={{ background: 'var(--cf-gold)', boxShadow: '0 0 6px rgba(224,72,58,0.6)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={onLogout}
        className="font-ui text-xs px-3 py-1.5 rounded-md border transition-all duration-200 shrink-0"
        style={{ color: 'var(--cf-muted2)', borderColor: 'var(--cf-border2)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.borderColor = 'rgba(255,107,107,0.4)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cf-muted2)'; e.currentTarget.style.borderColor = 'var(--cf-border2)'; }}
      >
        Logout
      </button>
    </nav>
  );
};

export default NavBar;
