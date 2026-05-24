import { useState, useRef, useEffect } from 'react';
import { CardTemplate, Rarity, generateStats, CardStats, ELEMENTS, getTemplates, saveTemplates, getCollectionConfig, saveCollectionConfig } from '@/lib/cardforge';
import { supabase } from '@/integrations/supabase/client';

interface ForgePageProps {
  onDataChange: () => void;
}

const RARITY_OPTIONS: { key: Rarity; icon: string; label: string }[] = [
  { key: 'common', icon: '◆', label: 'Common' },
  { key: 'rare', icon: '💎', label: 'Rare' },
  { key: 'epic', icon: '🔮', label: 'Epic' },
  { key: 'legendary', icon: '⚡', label: 'Legend' },
];

const rarityColor = (r: Rarity) => {
  const m: Record<Rarity, string> = {
    common: '#b8cfe0', rare: '#88c4ff', epic: '#d870ff', legendary: '#ffe860',
  };
  return m[r];
};

const ForgePage = ({ onDataChange }: ForgePageProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rarity, setRarity] = useState<Rarity>('common');
  const [supply, setSupply] = useState(500);
  const [stats, setStats] = useState<CardStats>(() => generateStats('common'));
  const [imageUrl, setImageUrl] = useState('');
  const [originalImageUrl, setOriginalImageUrl] = useState('');
  const [transformedImageUrl, setTransformedImageUrl] = useState('');
  const [transformState, setTransformState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [transformError, setTransformError] = useState<string | null>(null);
  const [pickedVariant, setPickedVariant] = useState<'original' | 'transformed'>('original');
  const [dragOver, setDragOver] = useState(false);
  const [pinataJwt, setPinataJwt] = useState(() => localStorage.getItem('cf_pinata') || '');
  const [pinataStatus, setPinataStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [templates, setTemplates] = useState<CardTemplate[]>(() => getTemplates());
  const [config, setConfig] = useState(() => getCollectionConfig());
  const [editingId, setEditingId] = useState<string | null>(null);

  const startEdit = (t: CardTemplate) => {
    setEditingId(t.id);
    setName(t.name);
    setDescription(t.description);
    setRarity(t.rarity);
    setStats(t.stats);
    setImageUrl(t.imageUrl);
    setSupply(t.supply);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setRarity('common');
    setStats(generateStats('common'));
    setImageUrl('');
    setSupply(500);
  };

  const saveEdit = () => {
    if (!editingId || !name.trim()) return;
    const all = getTemplates();
    const idx = all.findIndex(t => t.id === editingId);
    if (idx === -1) return;
    const t = all[idx];
    const newSupply = Math.max(supply, t.minted); // can't go below already minted
    all[idx] = { ...t, name: name.trim(), description: description.trim(), rarity, stats, imageUrl, supply: newSupply };
    saveTemplates(all);
    setTemplates(all);
    cancelEdit();
    onDataChange();
  };

  useEffect(() => {
    if (pinataJwt) localStorage.setItem('cf_pinata', pinataJwt);
  }, [pinataJwt]);

  const runTransform = async (src: string) => {
    setTransformState('loading');
    setTransformError(null);
    setTransformedImageUrl('');
    try {
      const { data, error } = await supabase.functions.invoke('transform-character-image', {
        body: { imageUrl: src },
      });
      if (error) throw new Error(error.message);
      if (!data?.imageUrl) throw new Error('No image returned');
      setTransformedImageUrl(data.imageUrl);
      setTransformState('done');
    } catch (e: unknown) {
      setTransformError(e instanceof Error ? e.message : 'Transform failed');
      setTransformState('error');
    }
  };

  const handleImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setOriginalImageUrl(src);
      setImageUrl(src);
      setPickedVariant('original');
      setTransformedImageUrl('');
      runTransform(src);
    };
    reader.readAsDataURL(file);
  };

  const pickVariant = (v: 'original' | 'transformed') => {
    setPickedVariant(v);
    setImageUrl(v === 'original' ? originalImageUrl : transformedImageUrl);
  };

  const rerollStats = () => setStats(generateStats(rarity));

  const changeRarity = (r: Rarity) => {
    setRarity(r);
    setStats(generateStats(r));
  };

  const testPinata = async () => {
    try {
      const res = await fetch('https://api.pinata.cloud/data/testAuthentication', {
        headers: { Authorization: `Bearer ${pinataJwt}` },
      });
      setPinataStatus(res.ok ? 'ok' : 'err');
    } catch {
      setPinataStatus('err');
    }
  };

  const totalAllocated = templates.reduce((s, t) => s + t.supply, 0);
  const remainingSlots = config.totalSupply - totalAllocated;

  const updateTotalSupply = (val: number) => {
    const newConfig = { ...config, totalSupply: Math.max(val, totalAllocated) };
    setConfig(newConfig);
    saveCollectionConfig(newConfig);
  };

  const forgeTemplate = async () => {
    if (!name.trim() || !imageUrl) return;
    if (supply > remainingSlots) return;

    const element = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
    let finalImageUrl = imageUrl;
    let metadataUrl = '';

    if (pinataJwt && pinataStatus === 'ok') {
      try {
        setUploading(true);
        setUploadProgress(10);
        const blob = await fetch(imageUrl).then(r => r.blob());
        const formData = new FormData();
        formData.append('file', blob, `${name}.png`);
        const imgRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
          method: 'POST',
          headers: { Authorization: `Bearer ${pinataJwt}` },
          body: formData,
        });
        const imgData = await imgRes.json();
        finalImageUrl = `https://gateway.pinata.cloud/ipfs/${imgData.IpfsHash}`;
        setUploadProgress(60);

        const metaRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${pinataJwt}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pinataContent: { name, description, rarity, stats, element, image: finalImageUrl, supply, collection: 'CardForge Genesis' },
            pinataMetadata: { name },
          }),
        });
        const metaData = await metaRes.json();
        metadataUrl = `https://gateway.pinata.cloud/ipfs/${metaData.IpfsHash}`;
        setUploadProgress(100);
      } catch {
        setUploading(false);
        setUploadProgress(0);
        return;
      }
    }

    const template: CardTemplate = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      rarity,
      stats,
      element,
      imageUrl: finalImageUrl,
      metadataUrl,
      supply,
      minted: 0,
      createdAt: new Date().toISOString(),
    };

    const all = getTemplates();
    all.push(template);
    saveTemplates(all);
    setTemplates(all);

    // Reset form
    setName('');
    setDescription('');
    setImageUrl('');
    setRarity('common');
    setSupply(500);
    setStats(generateStats('common'));
    setUploading(false);
    setUploadProgress(0);
    onDataChange();
  };

  const deleteTemplate = (id: string) => {
    const updated = getTemplates().filter(t => t.id !== id);
    saveTemplates(updated);
    setTemplates(updated);
    onDataChange();
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)] overflow-x-hidden">
      {/* Sidebar */}
      <div
        className="w-full lg:w-[368px] lg:sticky lg:top-[64px] lg:h-[calc(100vh-64px)] overflow-y-auto p-4 sm:p-6 lg:p-6 shrink-0"
        style={{
          background: 'linear-gradient(180deg, var(--cf-surface), var(--cf-surface2))',
          borderRight: '1px solid var(--cf-border)',
        }}
      >
        {/* Collection Config */}
        <SectionLabel text="Collection Config" />
        <div className="flex items-center gap-3 mb-5">
          <label className="font-ui text-[0.55rem] uppercase tracking-wider shrink-0" style={{ color: 'var(--cf-muted2)' }}>
            Total Supply
          </label>
          <input
            type="number"
            min={totalAllocated}
            value={config.totalSupply}
            onChange={(e) => updateTotalSupply(Number(e.target.value))}
            className="flex-1 bg-transparent font-mono text-sm py-1.5 px-3 rounded-lg outline-none transition-colors duration-200"
            style={{ border: '1px solid var(--cf-border2)', color: 'var(--cf-gold)' }}
          />
        </div>
        <div className="flex items-center justify-between mb-5 px-3 py-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--cf-border)' }}>
          <span className="font-ui text-[0.5rem] uppercase" style={{ color: 'var(--cf-muted)' }}>Allocated</span>
          <span className="font-mono text-xs" style={{ color: totalAllocated >= config.totalSupply ? '#f87171' : 'var(--cf-text)' }}>
            {totalAllocated} / {config.totalSupply}
          </span>
        </div>

        {/* Card Art */}
        <SectionLabel text="Card Art" />
        <div
          className="relative rounded-xl mb-5 flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
          style={{
            border: `1.5px dashed ${dragOver ? 'var(--cf-gold)' : 'var(--cf-border2)'}`,
            background: dragOver ? 'rgba(200,168,75,0.04)' : 'transparent',
            minHeight: imageUrl ? 'auto' : '120px',
            boxShadow: dragOver ? 'inset 0 0 20px rgba(200,168,75,0.08)' : 'none',
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleImage(e.dataTransfer.files[0]); }}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])} />
          {imageUrl ? (
            <img src={imageUrl} alt="Preview" className="w-[100px] h-[100px] object-cover rounded-lg m-3" />
          ) : (
            <div className="flex flex-col items-center gap-1 py-6" style={{ color: 'var(--cf-muted)' }}>
              <span className="text-2xl opacity-60">🖼️</span>
              <span className="font-body text-[0.65rem]">Drop image here or click to browse</span>
            </div>
          )}
        </div>

        {/* Card Identity */}
        <SectionLabel text="Card Identity" />
        <input
          type="text"
          placeholder="Card Name"
          maxLength={24}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-transparent font-body text-sm py-2 px-3 rounded-lg mb-3 outline-none transition-colors duration-200"
          style={{ border: '1px solid var(--cf-border2)', color: 'var(--cf-text)' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--cf-gold)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--cf-border2)'; }}
        />
        <textarea
          placeholder="Description"
          maxLength={120}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-transparent font-body text-xs py-2 px-3 rounded-lg mb-5 outline-none resize-none transition-colors duration-200"
          style={{ border: '1px solid var(--cf-border2)', color: 'var(--cf-text)', minHeight: '64px' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--cf-gold)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--cf-border2)'; }}
        />

        {/* Supply Count */}
        <SectionLabel text="Supply Count" />
        <div className="flex items-center gap-3 mb-5">
          <input
            type="number"
            min={1}
            max={remainingSlots}
            value={supply}
            onChange={(e) => setSupply(Math.max(1, Number(e.target.value)))}
            className="flex-1 bg-transparent font-mono text-sm py-2 px-3 rounded-lg outline-none transition-colors duration-200"
            style={{ border: '1px solid var(--cf-border2)', color: 'var(--cf-text)' }}
          />
          <span className="font-ui text-[0.5rem] uppercase shrink-0" style={{ color: 'var(--cf-muted)' }}>
            copies
          </span>
        </div>
        <div className="flex gap-2 mb-5 flex-wrap">
          {[10, 50, 100, 250, 500].map(n => (
            <button
              key={n}
              onClick={() => setSupply(Math.min(n, remainingSlots))}
              className="font-ui text-[0.5rem] px-2.5 py-1 rounded-md transition-all duration-200"
              style={{
                border: `1px solid ${supply === n ? 'var(--cf-gold)' : 'var(--cf-border2)'}`,
                color: supply === n ? 'var(--cf-gold)' : 'var(--cf-muted2)',
                background: supply === n ? 'rgba(200,168,75,0.08)' : 'transparent',
              }}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Rarity Tier */}
        <SectionLabel text="Rarity Tier" />
        <div className="grid grid-cols-4 gap-2 mb-5">
          {RARITY_OPTIONS.map((r) => {
            const color = rarityColor(r.key);
            const active = rarity === r.key;
            return (
              <button
                key={r.key}
                onClick={() => changeRarity(r.key)}
                className="flex flex-col items-center gap-1 py-2 rounded-lg transition-all duration-200"
                style={{
                  border: `1px solid ${active ? color : 'var(--cf-border2)'}`,
                  background: active ? `${color}12` : 'transparent',
                  boxShadow: active ? `0 0 12px ${color}33` : 'none',
                }}
              >
                <span className="text-lg">{r.icon}</span>
                <span className="font-ui text-[0.56rem] uppercase font-semibold" style={{ color }}>{r.label}</span>
              </button>
            );
          })}
        </div>

        {/* Battle Stats */}
        <SectionLabel text="Battle Stats" />
        <div className="grid grid-cols-5 gap-1 mb-3 overflow-x-auto">
          {(Object.keys(stats) as (keyof CardStats)[]).map((key) => (
            <div
              key={key}
              className="flex flex-col items-center py-2 rounded-lg"
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--cf-border)' }}
            >
              <span className="font-ui text-[0.5rem] uppercase" style={{ color: 'var(--cf-muted)' }}>{key}</span>
              <span className="font-ui text-[0.95rem] font-bold" style={{ color: 'var(--cf-text)' }}>{stats[key]}</span>
            </div>
          ))}
        </div>
        <button
          onClick={rerollStats}
          className="w-full py-2 rounded-lg font-ui text-xs transition-all duration-200 mb-5 group"
          style={{ border: '1px solid var(--cf-border2)', color: 'var(--cf-muted2)' }}
        >
          <span className="inline-block transition-transform duration-300 group-hover:rotate-180">↻</span> Reroll Stats
        </button>

        {/* IPFS Storage */}
        <SectionLabel text="IPFS Storage" />
        <div className="rounded-lg p-3 mb-5" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--cf-border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-ui text-[0.6rem] uppercase" style={{ color: 'var(--cf-muted2)' }}>Pinata JWT</span>
            <span className="w-2 h-2 rounded-full" style={{
              background: pinataStatus === 'ok' ? '#4ade80' : pinataStatus === 'err' ? '#f87171' : 'var(--cf-muted)',
            }} />
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={pinataJwt}
              onChange={(e) => { setPinataJwt(e.target.value); setPinataStatus('idle'); }}
              placeholder="JWT Token"
              className="flex-1 bg-transparent font-mono text-[0.6rem] py-1.5 px-2 rounded outline-none"
              style={{ border: '1px solid var(--cf-border2)', color: 'var(--cf-text)' }}
            />
            <button
              onClick={testPinata}
              className="font-ui text-[0.6rem] px-3 rounded transition-colors"
              style={{ border: '1px solid var(--cf-border2)', color: 'var(--cf-muted2)' }}
            >
              Test
            </button>
          </div>
          {uploading && (
            <div className="mt-2 h-[3px] rounded-full overflow-hidden" style={{ background: 'var(--cf-border)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${uploadProgress}%`,
                background: 'linear-gradient(90deg, var(--cf-gold), #f0d060)',
              }} />
            </div>
          )}
          <p className="font-body text-[0.5rem] mt-2" style={{ color: 'var(--cf-muted)' }}>
            Get JWT at <span style={{ color: 'var(--cf-gold)' }}>app.pinata.cloud</span>
          </p>
        </div>

        {/* Forge / Save Edit Button */}
        {editingId ? (
          <div className="flex gap-2 w-full">
            <button
              onClick={saveEdit}
              disabled={!name.trim()}
              className="flex-1 py-3 font-display text-sm font-bold tracking-wider rounded-lg overflow-hidden transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, #a07828, #f0d060, #c8a84b)',
                color: 'var(--cf-bg)',
                boxShadow: '0 4px 20px rgba(200,168,75,0.3)',
              }}
            >
              ✓ Save Changes
            </button>
            <button
              onClick={cancelEdit}
              className="px-4 py-3 font-display text-sm rounded-lg transition-all duration-200"
              style={{ border: '1px solid var(--cf-border2)', color: 'var(--cf-muted2)' }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={forgeTemplate}
            disabled={!name.trim() || !imageUrl || supply > remainingSlots || supply < 1}
            className="relative w-full py-3 font-display text-sm font-bold tracking-wider rounded-lg overflow-hidden transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #a07828, #f0d060, #c8a84b, #fff0a0, #c8a84b)',
              backgroundSize: '300% 100%',
              color: 'var(--cf-bg)',
              boxShadow: '0 4px 20px rgba(200,168,75,0.3)',
            }}
          >
            ⚒ Forge Template ({supply} copies)
          </button>
        )}
      </div>

      {/* Right Panel — Template Library */}
      <div className="flex-1 min-w-0 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="font-display text-xl text-gold-gradient">Card Templates</h2>
          <span className="font-ui text-[0.6rem] px-2 py-0.5 rounded-full" style={{
            background: 'rgba(200,168,75,0.1)',
            border: '1px solid rgba(200,168,75,0.2)',
            color: 'var(--cf-gold)',
          }}>{templates.length}</span>
        </div>

        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 opacity-50">
            <span className="text-4xl mb-3 opacity-30">🃏</span>
            <p className="font-display text-sm" style={{ color: 'var(--cf-muted2)' }}>No templates yet</p>
            <p className="font-body text-xs" style={{ color: 'var(--cf-muted)' }}>Create card templates with supply counts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => {
              const color = rarityColor(t.rarity);
              const pct = t.supply > 0 ? (t.minted / t.supply) * 100 : 0;
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-4 p-4 rounded-xl transition-all duration-300 group"
                  style={{
                    background: 'var(--cf-surface)',
                    border: `1px solid ${color}30`,
                  }}
                >
                  {/* Image */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0" style={{ border: '1px solid var(--cf-border)' }}>
                    {t.imageUrl ? (
                      <img src={t.imageUrl} alt={t.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl" style={{ background: 'var(--cf-surface2)' }}>
                        {t.element.split(' ')[0]}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-display text-sm font-bold truncate" style={{ color }}>{t.name}</span>
                      <span className="font-ui text-[0.45rem] uppercase font-bold px-1.5 py-0.5 rounded-full" style={{ border: `1px solid ${color}40`, color }}>
                        {t.rarity}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="font-mono text-[0.55rem]" style={{ color: 'var(--cf-muted)' }}>
                        {t.minted}/{t.supply} minted
                      </span>
                      <span className="font-ui text-[0.45rem]" style={{ color: 'var(--cf-muted)' }}>
                        {t.element}
                      </span>
                    </div>
                    {/* Supply bar */}
                    <div className="h-[4px] rounded-full overflow-hidden" style={{ background: 'var(--cf-surface2)' }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${color}80, ${color})`,
                      }} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(t)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 font-ui text-xs px-2 py-1 rounded"
                      style={{ color: 'var(--cf-gold)' }}
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete template "${t.name}"?`)) deleteTemplate(t.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 font-ui text-xs px-2 py-1 rounded"
                      style={{ color: '#f87171' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const SectionLabel = ({ text }: { text: string }) => (
  <div className="flex items-center gap-3 mb-3">
    <span className="font-ui text-[0.6rem] font-semibold uppercase tracking-[0.2em] whitespace-nowrap" style={{ color: 'var(--cf-muted2)' }}>
      {text}
    </span>
    <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, var(--cf-border2), transparent)' }} />
  </div>
);

export default ForgePage;
