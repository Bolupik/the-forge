import { useEffect, useState } from 'react';
import { playPackRip, playReveal } from '@/lib/sounds';

interface PackOpenAnimationProps {
  packIndex: number;
  onComplete: () => void;
}

/**
 * Stage 2 — selected pack centers, shakes, glows, then "tears open"
 * with a particle burst. Completes after ~2.3s.
 */
const PackOpenAnimation = ({ packIndex, onComplete }: PackOpenAnimationProps) => {
  const [stage, setStage] = useState<'idle' | 'shake' | 'tear' | 'burst'>('idle');

  useEffect(() => {
    const t1 = window.setTimeout(() => setStage('shake'), 200);
    const t2 = window.setTimeout(() => {
      setStage('tear');
      playPackRip();
    }, 1100);
    const t3 = window.setTimeout(() => {
      setStage('burst');
      playReveal();
    }, 1700);
    const t4 = window.setTimeout(() => onComplete(), 2400);
    return () => {
      [t1, t2, t3, t4].forEach(clearTimeout);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none animate-card-enter"
      style={{ background: 'radial-gradient(ellipse at center, rgba(224,72,58,0.08), rgba(5,5,14,0.85) 60%)', backdropFilter: 'blur(8px)' }}>
      <div className="relative" style={{ perspective: '1000px' }}>
        {/* Pack body — splits into top + bottom halves on tear */}
        <div
          className="relative w-[200px] h-[280px] sm:w-[240px] sm:h-[336px]"
          style={{
            transformStyle: 'preserve-3d',
            transform: stage === 'shake' ? 'scale(1.15)' : 'scale(1)',
            animation: stage === 'shake' ? 'shake 0.18s ease-in-out infinite' : 'none',
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            filter: `drop-shadow(0 0 ${stage === 'shake' || stage === 'tear' ? '60px' : '20px'} rgba(224,72,58,${stage === 'shake' ? 0.7 : 0.3}))`,
          }}
        >
          {/* Top half */}
          <div
            className="absolute inset-x-0 top-0 h-1/2 overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #1a1530, #0d0a1f)',
              border: '2px solid var(--cf-gold)',
              borderBottom: 'none',
              borderRadius: '12px 12px 0 0',
              transform: stage === 'tear' || stage === 'burst' ? 'translateY(-180px) rotateZ(-12deg)' : 'translateY(0)',
              opacity: stage === 'burst' ? 0 : 1,
              transition: 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease 0.3s',
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(115deg, transparent 20%, rgba(224,72,58,0.3) 50%, transparent 80%)',
                backgroundSize: '200% 200%',
                animation: 'shimmer 1.5s linear infinite',
              }}
            />
            <div className="absolute inset-x-0 bottom-0 h-2"
              style={{ background: 'repeating-linear-gradient(90deg, transparent 0 8px, rgba(255,245,192,0.5) 8px 12px)' }} />
          </div>

          {/* Bottom half */}
          <div
            className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden flex items-center justify-center"
            style={{
              background: 'linear-gradient(160deg, #1a1530, #0d0a1f)',
              border: '2px solid var(--cf-gold)',
              borderTop: 'none',
              borderRadius: '0 0 12px 12px',
              transform: stage === 'tear' || stage === 'burst' ? 'translateY(180px) rotateZ(8deg)' : 'translateY(0)',
              opacity: stage === 'burst' ? 0 : 1,
              transition: 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease 0.3s',
            }}
          >
            <span
              className="font-ui text-[0.5rem] uppercase tracking-[0.3em] font-bold"
              style={{ color: 'var(--cf-gold)' }}
            >
              Pack #{String(packIndex + 1).padStart(2, '0')}
            </span>
          </div>

          {/* Inner glow + light beam (revealed on tear) */}
          {(stage === 'tear' || stage === 'burst') && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ animation: 'fade-slide-up 0.4s ease-out both' }}
            >
              <div
                className="w-32 h-32 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(255,245,192,0.9), rgba(224,72,58,0.4) 40%, transparent 70%)',
                  filter: 'blur(4px)',
                  animation: 'pulse-burst 1.2s ease-out infinite',
                }}
              />
            </div>
          )}

          {/* Particle burst */}
          {stage === 'burst' && (
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i / 24) * Math.PI * 2;
                const dist = 180 + Math.random() * 120;
                return (
                  <span
                    key={i}
                    className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full"
                    style={{
                      background: i % 3 === 0 ? '#fff5c0' : i % 3 === 1 ? '#e0483a' : '#e8c870',
                      boxShadow: '0 0 8px currentColor',
                      color: '#fff5c0',
                      transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) scale(0)`,
                      animation: `particle-fly 0.8s cubic-bezier(0.17, 0.67, 0.35, 1.1) ${i * 0.012}s both`,
                      ['--tx' as string]: `${Math.cos(angle) * dist}px`,
                      ['--ty' as string]: `${Math.sin(angle) * dist}px`,
                    } as React.CSSProperties}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse-burst {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.5); opacity: 1; }
        }
        @keyframes particle-fly {
          0% { transform: translate(0, 0) scale(0); opacity: 1; }
          50% { opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default PackOpenAnimation;
