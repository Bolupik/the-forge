import { useMemo, useState } from 'react';
import ForgeCard from '@/components/card/ForgeCard';
import { Rarity, NFTCard, generateStats, ELEMENTS } from '@/lib/cardforge';
import { Slider } from '@/components/ui/slider';

const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

const PRESETS: { label: string; value: number }[] = [
  { label: 'Subtle', value: 0.5 },
  { label: 'Default', value: 1 },
  { label: 'Vivid', value: 1.5 },
  { label: 'Cinematic', value: 2.2 },
];

const makeCard = (rarity: Rarity): NFTCard => ({
  id: `preview-${rarity}`,
  templateId: `tpl-${rarity}`,
  name: `${rarity[0].toUpperCase() + rarity.slice(1)} Relic`,
  description: 'Preview specimen',
  rarity,
  stats: generateStats(rarity),
  element: ELEMENTS[0],
  imageUrl: '',
  metadataUrl: '',
  serial: 1,
  createdAt: new Date().toISOString(),
});

const CardPreview = () => {
  const [rarity, setRarity] = useState<Rarity>('legendary');
  const [intensity, setIntensity] = useState(1);
  const [staticMode, setStaticMode] = useState(false);

  const card = useMemo(() => makeCard(rarity), [rarity]);

  return (
    <div className="min-h-screen p-6 sm:p-10 flex flex-col items-center gap-8" style={{ background: 'var(--cf-bg, #07070d)' }}>
      <h1 className="font-display text-2xl sm:text-3xl tracking-wider" style={{ color: 'var(--cf-gold, #c8a84b)' }}>
        ForgeCard FX Preview
      </h1>

      <div className="flex justify-center py-4">
        <ForgeCard card={card} frameIntensity={intensity} staticMode={staticMode} />
      </div>

      <div className="w-full max-w-md space-y-6 p-5 rounded-lg"
           style={{ background: 'rgba(13,13,26,0.7)', border: '1px solid rgba(200,168,75,0.25)' }}>
        {/* Rarity tabs */}
        <div>
          <p className="font-mono text-[0.6rem] tracking-[0.2em] uppercase mb-2" style={{ color: 'var(--cf-muted, #888)' }}>Rarity</p>
          <div className="grid grid-cols-4 gap-1.5">
            {RARITIES.map(r => (
              <button
                key={r}
                onClick={() => setRarity(r)}
                className="font-mono text-[0.6rem] tracking-wider uppercase py-2 rounded-sm transition-all"
                style={{
                  background: rarity === r ? 'rgba(200,168,75,0.18)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${rarity === r ? 'rgba(200,168,75,0.55)' : 'rgba(255,255,255,0.08)'}`,
                  color: rarity === r ? 'var(--cf-gold, #c8a84b)' : 'var(--cf-muted2, #aaa)',
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Intensity slider */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="font-mono text-[0.6rem] tracking-[0.2em] uppercase" style={{ color: 'var(--cf-muted, #888)' }}>Frame intensity</p>
            <span className="font-mono text-[0.65rem]" style={{ color: 'var(--cf-gold, #c8a84b)' }}>{intensity.toFixed(2)}×</span>
          </div>
          <Slider
            min={0}
            max={2.5}
            step={0.05}
            value={[intensity]}
            onValueChange={(v) => setIntensity(v[0])}
          />
          <div className="grid grid-cols-4 gap-1.5 mt-3">
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => setIntensity(p.value)}
                className="font-mono text-[0.55rem] tracking-wider uppercase py-1.5 rounded-sm transition-all"
                style={{
                  background: Math.abs(intensity - p.value) < 0.01 ? 'rgba(200,168,75,0.18)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${Math.abs(intensity - p.value) < 0.01 ? 'rgba(200,168,75,0.55)' : 'rgba(255,255,255,0.08)'}`,
                  color: 'var(--cf-text, #ddd)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Static toggle */}
        <label className="flex items-center justify-between cursor-pointer">
          <span className="font-mono text-[0.6rem] tracking-[0.2em] uppercase" style={{ color: 'var(--cf-muted, #888)' }}>
            Disable parallax tilt
          </span>
          <input
            type="checkbox"
            checked={staticMode}
            onChange={(e) => setStaticMode(e.target.checked)}
            className="accent-yellow-600"
          />
        </label>

        <p className="font-mono text-[0.55rem] leading-relaxed" style={{ color: 'var(--cf-muted, #888)' }}>
          Hover the card to see the intensity boost. Users with <code>prefers-reduced-motion</code> see a static frame automatically.
        </p>
      </div>
    </div>
  );
};

export default CardPreview;
