import { RarityTokens } from './cardTokens';

interface Props {
  variant: RarityTokens['sigil'];
  size?: number;
  color: string;
  className?: string;
}

const SigilGlyph = ({ variant, size = 14, color, className = '' }: Props) => {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' };
  const stroke = { stroke: color, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  return (
    <svg {...common} className={`forge-rune ${className}`} style={{ color }}>
      {variant === 'dot' && (
        <>
          <circle cx="12" cy="12" r="2.5" fill={color} />
          <circle cx="12" cy="12" r="8" {...stroke} opacity="0.4" />
        </>
      )}
      {variant === 'triangle' && (
        <>
          <path d="M12 4 L20 18 L4 18 Z" {...stroke} />
          <circle cx="12" cy="14" r="1.5" fill={color} />
        </>
      )}
      {variant === 'hexagon' && (
        <>
          <path d="M12 3 L20 8 L20 16 L12 21 L4 16 L4 8 Z" {...stroke} />
          <path d="M12 8 L16 10.5 L16 13.5 L12 16 L8 13.5 L8 10.5 Z" fill={color} opacity="0.6" />
        </>
      )}
      {variant === 'eye' && (
        <>
          <path d="M2 12 Q12 4 22 12 Q12 20 2 12 Z" {...stroke} />
          <circle cx="12" cy="12" r="3.5" {...stroke} />
          <circle cx="12" cy="12" r="1.3" fill={color} />
          <path d="M12 2 L12 5 M12 19 L12 22 M2 12 L5 12 M19 12 L22 12" {...stroke} opacity="0.6" />
        </>
      )}
    </svg>
  );
};

export default SigilGlyph;
