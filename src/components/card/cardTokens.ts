import { Rarity } from '@/lib/cardforge';

export interface RarityTokens {
  /** SVG gradient stops for the bezel material */
  bezel: { id: string; stops: { offset: string; color: string }[] };
  /** Inner bevel highlight */
  bevel: string;
  /** Edge glow color (rgba) */
  glow: string;
  /** Aura intensity 0..1 */
  auraIntensity: number;
  /** Accent text color */
  accent: string;
  /** Rarity word */
  label: string;
  /** Corner sigil variant */
  sigil: 'dot' | 'triangle' | 'hexagon' | 'eye';
  /** Whether legendary aurora is on */
  aurora: boolean;
  /** Whether scanlines are on at idle */
  idleScan: boolean;
}

export const RARITY_TOKENS: Record<Rarity, RarityTokens> = {
  common: {
    bezel: {
      id: 'bezel-common',
      stops: [
        { offset: '0%', color: '#2a2d33' },
        { offset: '35%', color: '#4a4e57' },
        { offset: '50%', color: '#5d626c' },
        { offset: '65%', color: '#3a3e46' },
        { offset: '100%', color: '#1c1e22' },
      ],
    },
    bevel: 'rgba(180,190,210,0.35)',
    glow: 'rgba(170,185,210,0.25)',
    auraIntensity: 0,
    accent: '#b8c6da',
    label: 'COMMON',
    sigil: 'dot',
    aurora: false,
    idleScan: false,
  },
  rare: {
    bezel: {
      id: 'bezel-rare',
      stops: [
        { offset: '0%', color: '#1a2a4a' },
        { offset: '35%', color: '#2f5891' },
        { offset: '50%', color: '#4a82c4' },
        { offset: '65%', color: '#27497a' },
        { offset: '100%', color: '#0e1830' },
      ],
    },
    bevel: 'rgba(140,200,255,0.45)',
    glow: 'rgba(70,150,255,0.45)',
    auraIntensity: 0.35,
    accent: '#8fc4ff',
    label: 'RARE',
    sigil: 'triangle',
    aurora: false,
    idleScan: false,
  },
  epic: {
    bezel: {
      id: 'bezel-epic',
      stops: [
        { offset: '0%', color: '#1a0d06' },
        { offset: '30%', color: '#3a1a08' },
        { offset: '50%', color: '#ff6a2a' },
        { offset: '55%', color: '#ffd4b0' },
        { offset: '65%', color: '#c44512' },
        { offset: '100%', color: '#0e0a08' },
      ],
    },
    bevel: 'rgba(255,212,176,0.55)',
    glow: 'rgba(255,106,42,0.55)',
    auraIntensity: 0.6,
    accent: '#ffb088',
    label: 'EPIC',
    sigil: 'hexagon',
    aurora: false,
    idleScan: false,
  },
  legendary: {
    bezel: {
      id: 'bezel-legendary',
      stops: [
        { offset: '0%', color: '#050308' },
        { offset: '20%', color: '#15100c' },
        { offset: '40%', color: '#3a1d10' },
        { offset: '50%', color: '#ff7a36' },
        { offset: '55%', color: '#ffffff' },
        { offset: '60%', color: '#ff6a2a' },
        { offset: '80%', color: '#1a100a' },
        { offset: '100%', color: '#050308' },
      ],
    },
    bevel: 'rgba(255,255,255,0.7)',
    glow: 'rgba(255,106,42,0.7)',
    auraIntensity: 1,
    accent: '#ffd4b0',
    label: 'LEGENDARY',
    sigil: 'eye',
    aurora: true,
    idleScan: true,
  },
};

