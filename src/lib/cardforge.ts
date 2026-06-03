export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CardStats {
  ATK: number;
  DEF: number;
  SPD: number;
  SPC: number;
  HP: number;
}

export interface CardTemplate {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  stats: CardStats;
  element: string;
  imageUrl: string;
  metadataUrl: string;
  supply: number;      // total copies available
  minted: number;      // how many have been minted
  createdAt: string;
}

export interface NFTCard {
  id: string;
  templateId: string;  // links back to the template
  name: string;
  description: string;
  rarity: Rarity;
  stats: CardStats;
  element: string;
  imageUrl: string;
  metadataUrl: string;
  serial: number;
  createdAt: string;
}

export interface Trade {
  id: string;
  cardId: string;
  cardName: string;
  rarity: string;
  imageUrl: string;
  asking: string;
  status: 'hold' | 'active' | 'pending';
  createdAt: string;
}

export interface CollectionConfig {
  totalSupply: number;
  cardsPerPack: number;
}

export type AppPage = 'gallery' | 'trading' | 'mint';
export type AdminPage = 'forge' | 'trading' | 'gallery' | 'whitelist';

export const ELEMENTS = [
  '⚡ ELECTRIC', '🔥 FIRE', '🌊 WATER', '🌿 NATURE',
  '🌑 DARK', '✨ PSYCHIC', '🏔️ EARTH', '💀 SHADOW',
];

export const STAT_RANGES: Record<Rarity, { hp: [number, number]; other: [number, number] }> = {
  common: { hp: [60, 100], other: [30, 70] },
  rare: { hp: [80, 130], other: [50, 90] },
  epic: { hp: [100, 160], other: [70, 110] },
  legendary: { hp: [140, 200], other: [90, 150] },
};

export const randomInRange = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const generateStats = (rarity: Rarity): CardStats => {
  const r = STAT_RANGES[rarity];
  return {
    ATK: randomInRange(...r.other),
    DEF: randomInRange(...r.other),
    SPD: randomInRange(...r.other),
    SPC: randomInRange(...r.other),
    HP: randomInRange(...r.hp),
  };
};

// Templates (admin-created card blueprints)
export const getTemplates = (): CardTemplate[] => {
  try { return JSON.parse(localStorage.getItem('cf_templates_v1') || '[]'); }
  catch { return []; }
};

export const saveTemplates = (templates: CardTemplate[]) =>
  localStorage.setItem('cf_templates_v1', JSON.stringify(templates));

// Minted cards
export const getCards = (): NFTCard[] => {
  try { return JSON.parse(localStorage.getItem('cardforge_v2') || '[]'); }
  catch { return []; }
};

export const saveCards = (cards: NFTCard[]) =>
  localStorage.setItem('cardforge_v2', JSON.stringify(cards));

// Trades
export const getTrades = (): Trade[] => {
  try { return JSON.parse(localStorage.getItem('cf_trades_v1') || '[]'); }
  catch { return []; }
};

export const saveTrades = (trades: Trade[]) =>
  localStorage.setItem('cf_trades_v1', JSON.stringify(trades));

// Collection config
export const getCollectionConfig = (): CollectionConfig => {
  try {
    const raw = localStorage.getItem('cf_config_v1');
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      totalSupply: parsed.totalSupply ?? 10000,
      cardsPerPack: parsed.cardsPerPack ?? 5,
    };
  } catch { return { totalSupply: 10000, cardsPerPack: 5 }; }
};

export const saveCollectionConfig = (config: CollectionConfig) =>
  localStorage.setItem('cf_config_v1', JSON.stringify(config));

// Total number of mystery packs available, derived from collection config
export const getTotalPackCount = (): number => {
  const cfg = getCollectionConfig();
  return Math.floor(cfg.totalSupply / cfg.cardsPerPack);
};

// How many packs have been opened (one pack = cardsPerPack cards minted)
export const getOpenedPackCount = (): number => {
  const cfg = getCollectionConfig();
  const minted = getCards().length;
  return Math.floor(minted / cfg.cardsPerPack);
};

// Mint a random card from available templates
export const mintFromPool = (): { card: NFTCard; template: CardTemplate } | null => {
  const templates = getTemplates();
  const available = templates.filter(t => t.minted < t.supply);
  if (available.length === 0) return null;

  // Weighted by remaining supply
  const totalRemaining = available.reduce((s, t) => s + (t.supply - t.minted), 0);
  let roll = Math.random() * totalRemaining;
  let chosen = available[0];
  for (const t of available) {
    roll -= (t.supply - t.minted);
    if (roll <= 0) { chosen = t; break; }
  }

  const cards = getCards();
  const card: NFTCard = {
    id: crypto.randomUUID(),
    templateId: chosen.id,
    name: chosen.name,
    description: chosen.description,
    rarity: chosen.rarity,
    stats: chosen.stats,
    element: chosen.element,
    imageUrl: chosen.imageUrl,
    metadataUrl: chosen.metadataUrl,
    serial: cards.length + 1,
    createdAt: new Date().toISOString(),
  };

  // Update template minted count
  chosen.minted += 1;
  saveTemplates(templates);

  // Save minted card
  cards.push(card);
  saveCards(cards);

  return { card, template: chosen };
};

/**
 * Open a mystery pack: draws `cardsPerPack` cards weighted by remaining supply.
 * Returns null if not enough cards are available.
 */
export const mintPack = (): NFTCard[] | null => {
  const cfg = getCollectionConfig();
  const templates = getTemplates();
  // Build mutable pool with remaining counts
  const pool = templates
    .map(t => ({ tmpl: t, remaining: t.supply - t.minted }))
    .filter(p => p.remaining > 0);

  if (pool.length === 0) return null;

  const totalRemaining = pool.reduce((s, p) => s + p.remaining, 0);
  if (totalRemaining < cfg.cardsPerPack) return null;

  const cards = getCards();
  const drawn: NFTCard[] = [];

  for (let i = 0; i < cfg.cardsPerPack; i++) {
    const total = pool.reduce((s, p) => s + p.remaining, 0);
    if (total <= 0) break;
    let roll = Math.random() * total;
    let chosenIdx = 0;
    for (let j = 0; j < pool.length; j++) {
      roll -= pool[j].remaining;
      if (roll <= 0) { chosenIdx = j; break; }
    }
    const chosen = pool[chosenIdx].tmpl;
    drawn.push({
      id: crypto.randomUUID(),
      templateId: chosen.id,
      name: chosen.name,
      description: chosen.description,
      rarity: chosen.rarity,
      stats: { ...chosen.stats }, // snapshot
      element: chosen.element,
      imageUrl: chosen.imageUrl,
      metadataUrl: chosen.metadataUrl,
      serial: cards.length + drawn.length + 1,
      createdAt: new Date().toISOString(),
    });
    pool[chosenIdx].remaining -= 1;
  }

  if (drawn.length === 0) return null;

  // Persist: increment template minted, append cards
  const counts = new Map<string, number>();
  for (const c of drawn) counts.set(c.templateId, (counts.get(c.templateId) ?? 0) + 1);
  for (const t of templates) {
    const n = counts.get(t.id);
    if (n) t.minted += n;
  }
  saveTemplates(templates);
  saveCards([...cards, ...drawn]);

  return drawn;
};
