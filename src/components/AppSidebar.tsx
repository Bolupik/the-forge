import { useState } from 'react';
import { AppPage } from '@/lib/cardforge';

interface AppSidebarProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  tradeCount: number;
}

const NAV_ITEMS: { page: AppPage; label: string; icon: string }[] = [
  { page: 'gallery', label: 'Gallery', icon: '🎴' },
  { page: 'mint', label: 'Mint', icon: '⚡' },
  { page: 'trading', label: 'Trading', icon: '⇄' },
];

const AppSidebar = ({ activePage, onNavigate, tradeCount }: AppSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredPage, setHoveredPage] = useState<AppPage | null>(null);

  return (
    <>
      {/* Mobile bottom bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex sm:hidden items-stretch justify-around"
        style={{
          background: 'rgba(5,5,14,0.97)',
          backdropFilter: 'blur(24px) saturate(1.8)',
          borderTop: '1px solid var(--cf-border)',
          height: 62,
        }}
      >
        {NAV_ITEMS.map(({ page, label, icon }) => {
          const active = activePage === page;
          return (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 transition-all duration-300"
              style={{ transform: active ? 'translateY(-2px)' : 'translateY(0)' }}
            >
              {/* Active glow */}
              {active && (
                <div
                  className="absolute -top-px left-[20%] right-[20%] h-[2px] rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, transparent, var(--cf-gold), transparent)',
                    boxShadow: '0 0 12px rgba(200,168,75,0.5)',
                  }}
                />
              )}
              <span
                className="text-xl transition-all duration-300"
                style={{
                  transform: active ? 'scale(1.25)' : 'scale(1)',
                  filter: active ? 'drop-shadow(0 0 8px rgba(200,168,75,0.5))' : 'none',
                }}
              >
                {icon}
              </span>
              <span
                className="font-ui text-[0.5rem] font-bold uppercase tracking-wider transition-colors duration-300"
                style={{ color: active ? 'var(--cf-gold)' : 'var(--cf-muted)' }}
              >
                {label}
              </span>
              {/* Active dot */}
              {active && (
                <div
                  className="absolute bottom-1 w-1 h-1 rounded-full"
                  style={{ background: 'var(--cf-gold)', boxShadow: '0 0 6px rgba(200,168,75,0.8)' }}
                />
              )}
              {page === 'trading' && tradeCount > 0 && (
                <span
                  className="absolute top-2 right-[28%] w-2 h-2 rounded-full animate-pulse-dot"
                  style={{ background: 'var(--cf-gold)', boxShadow: '0 0 8px rgba(200,168,75,0.6)' }}
                />
              )}
            </button>
          );
        })}
        <button
          className="relative flex flex-col items-center justify-center gap-0.5 flex-1 transition-all duration-300 active:scale-90"
          onClick={() => alert('Wallet connect coming soon!')}
        >
          <span className="text-xl">🔗</span>
          <span className="font-ui text-[0.5rem] font-bold uppercase tracking-wider" style={{ color: 'var(--cf-muted)' }}>
            Wallet
          </span>
        </button>
      </nav>

      {/* Desktop sidebar */}
      <aside
        className="hidden sm:flex fixed left-0 top-0 bottom-0 z-50 flex-col transition-all duration-500 ease-[cubic-bezier(0.17,0.67,0.35,1.1)]"
        style={{
          width: collapsed ? 64 : 220,
          background: 'rgba(5,5,14,0.97)',
          backdropFilter: 'blur(24px) saturate(1.8)',
          borderRight: '1px solid var(--cf-border)',
        }}
      >
        {/* Gold accent line */}
        <div
          className="absolute top-0 right-0 w-px h-full pointer-events-none"
          style={{ background: 'linear-gradient(180deg, transparent 10%, rgba(200,168,75,0.15) 50%, transparent 90%)' }}
        />

        {/* Logo */}
        <div
          className="flex items-center h-16 px-4 shrink-0 overflow-hidden"
          style={{ borderBottom: '1px solid var(--cf-border)' }}
        >
          <button
            onClick={() => onNavigate('gallery')}
            className="font-display font-bold text-gold-gradient transition-all duration-500 hover:drop-shadow-[0_0_20px_rgba(200,168,75,0.5)] active:scale-95 truncate"
            style={{ fontSize: collapsed ? '1rem' : '1.15rem' }}
          >
            {collapsed ? 'CF' : 'CardForge'}
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 flex flex-col gap-1.5 px-2 py-5">
          {NAV_ITEMS.map(({ page, label, icon }) => {
            const active = activePage === page;
            const hovered = hoveredPage === page;
            return (
              <button
                key={page}
                onClick={() => onNavigate(page)}
                onMouseEnter={() => setHoveredPage(page)}
                onMouseLeave={() => setHoveredPage(null)}
                className="relative flex items-center gap-3 rounded-xl transition-all duration-300"
                style={{
                  padding: collapsed ? '12px 0' : '12px 14px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  color: active ? 'var(--cf-gold)' : hovered ? 'var(--cf-text)' : 'var(--cf-muted2)',
                  background: active ? 'rgba(200,168,75,0.08)' : hovered ? 'rgba(255,255,255,0.02)' : 'transparent',
                  border: active ? '1px solid rgba(200,168,75,0.15)' : '1px solid transparent',
                  transform: hovered && !active ? 'translateX(4px)' : 'translateX(0)',
                }}
                title={collapsed ? label : undefined}
              >
                {/* Active indicator */}
                {active && (
                  <div
                    className="absolute left-0 top-[15%] bottom-[15%] w-[2.5px] rounded-full"
                    style={{
                      background: 'linear-gradient(180deg, var(--cf-gold), var(--cf-gold2))',
                      boxShadow: '0 0 8px rgba(200,168,75,0.5)',
                    }}
                  />
                )}
                <span
                  className="text-lg transition-all duration-300"
                  style={{
                    transform: active ? 'scale(1.2)' : hovered ? 'scale(1.1)' : 'scale(1)',
                    filter: active ? 'drop-shadow(0 0 6px rgba(200,168,75,0.4))' : 'none',
                  }}
                >
                  {icon}
                </span>
                {!collapsed && (
                  <span className="font-ui text-sm font-semibold truncate transition-all duration-300">{label}</span>
                )}
                {page === 'trading' && tradeCount > 0 && (
                  <span
                    className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse-dot"
                    style={{ background: 'var(--cf-gold)', boxShadow: '0 0 8px rgba(200,168,75,0.6)' }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Wallet button */}
        <div className="px-2 pb-3">
          <button
            className="w-full flex items-center gap-2 rounded-xl font-ui text-xs font-semibold transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(200,168,75,0.15)] active:scale-95 overflow-hidden"
            style={{
              padding: collapsed ? '12px 0' : '12px 14px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              color: 'var(--cf-gold)',
              border: '1px solid rgba(200,168,75,0.2)',
              background: 'linear-gradient(135deg, rgba(200,168,75,0.04), rgba(200,168,75,0.08))',
            }}
            onClick={() => alert('Wallet connect coming soon!')}
          >
            <span className="animate-float">🔗</span>
            {!collapsed && <span>Connect Wallet</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-10 shrink-0 transition-all duration-300 hover:bg-[rgba(255,255,255,0.02)]"
          style={{
            borderTop: '1px solid var(--cf-border)',
            color: 'var(--cf-muted2)',
          }}
        >
          <span
            className="text-sm transition-transform duration-500"
            style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}
          >
            »
          </span>
        </button>
      </aside>

      {/* Spacer */}
      <div
        className="hidden sm:block shrink-0 transition-all duration-500 ease-[cubic-bezier(0.17,0.67,0.35,1.1)]"
        style={{ width: collapsed ? 64 : 220 }}
      />
    </>
  );
};

export default AppSidebar;
