import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  compact?: boolean;
  className?: string;
}

const ThemeToggle = ({ compact = false, className = '' }: Props) => {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`relative inline-flex items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-95 ${className}`}
      style={{
        width: compact ? 32 : 36,
        height: compact ? 32 : 36,
        background: 'rgba(255,106,42,0.06)',
        border: '1px solid rgba(255,106,42,0.35)',
        color: 'var(--cf-gold)',
        boxShadow: '0 0 12px rgba(255,106,42,0.15)',
      }}
    >
      <span className="text-[14px] leading-none" style={{ filter: 'drop-shadow(0 0 4px rgba(255,106,42,0.6))' }}>
        {isDark ? '☀' : '☾'}
      </span>
    </button>
  );
};

export default ThemeToggle;
