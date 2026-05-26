# CardForge Signature Card System

A complete redesign of the card object itself — frame, art treatment, rarity language, motion, and data layout — fused into one cohesive artifact that doesn't look like any other NFT card on the market.

## The concept: "Forged Relic"

Each card is presented as a **mined, etched, holographic shard** — part archaeological artifact, part futuristic data instrument. Four visual systems layered together:

1. **Liquid-chrome outer bezel** — sculpted metal frame whose material changes per rarity
2. **Etched sigil corners** — runic glyphs at all four corners, animated subtly
3. **Holographic inlay** — the art window has a refractive holo layer that tracks cursor
4. **Brutalist data strip** — bottom band with mono-spaced serial, stats ticker, rarity sigil

No purple gradients. No generic "trading card" frames. Every card looks like a museum-grade collectible that happens to live on-chain.

## Rarity language (multi-channel)

Rarity is communicated through **three reinforcing signals** so it reads at any zoom:

| Rarity     | Frame material        | Aura FX                  | Sigil glyph        |
|------------|-----------------------|--------------------------|--------------------|
| Common     | Brushed graphite      | None                     | Single dot         |
| Rare       | Brushed cobalt steel  | Soft cyan edge glow      | Triangle           |
| Epic       | Molten copper-gold    | Pulsing ember particles  | Hexagon            |
| Legendary  | Black opal + aurora   | Drifting aurora + ticker | Eye-of-forge mark  |

Legendary cards also get a **slightly taller silhouette** (asymmetric notched top corner) so they stand out instantly in a grid.

## Motion / interactivity

- **Idle (in a grid)**: very subtle rune breathing, scan-line drift on legendaries only — keeps gallery calm.
- **Hover**: card lifts, holo-shimmer activates and tracks cursor, scan-lines accelerate, edge glow brightens, ambient sound tick.
- **Tilt (on detail view)**: full gyro/mouse parallax — frame, art, holo, and data strip live on separate Z-layers.
- **Reveal (during mint)**: frame assembles in sequence — bezel materializes, sigils etch in, art window unfolds, data strip prints type-writer style, then rarity FX bloom.

## Card anatomy (top → bottom)

```text
┌─────────────────────────────────┐
│ ◈ sigil          element ◈      │  <- top corners: rarity glyphs + element icon
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │      ART WINDOW           │  │  <- holo inlay, refractive layer
│  │     (character)           │  │
│  │                           │  │
│  └───────────────────────────┘  │
│  NAME · LVL                     │  <- display font, single line
│  ─────────────────────────────  │
│  ATK 92  DEF 71  SPD 88  SPC 64 │  <- mono ticker, brutalist
│  HP ████████████░░  142         │
│  ─────────────────────────────  │
│ ◈ #0001 / 10000      RARITY ◈   │  <- bottom corners: serial + rarity word
└─────────────────────────────────┘
```

## Technical implementation

### Files to create
- `src/components/card/ForgeCard.tsx` — the new master card component (replaces inline JSX in `NFTCard.tsx`)
- `src/components/card/ForgeFrame.tsx` — SVG-based outer bezel with rarity-driven material
- `src/components/card/HoloLayer.tsx` — cursor-tracking holo + scan-line overlay
- `src/components/card/SigilGlyph.tsx` — animated corner runes (SVG, 4 variants)
- `src/components/card/DataStrip.tsx` — brutalist stats + serial band
- `src/components/card/cardTokens.ts` — per-rarity tokens (gradients, glow, particle config)
- `src/styles/forge-card.css` — keyframes for shimmer, scan, aurora, rune-breathe

### Files to update
- `src/components/NFTCard.tsx` — becomes a thin wrapper around `ForgeCard`
- `src/components/mint/CardRevealSequence.tsx` — use new staged reveal
- `src/index.css` — add rarity material gradients as semantic tokens (no raw colors in components)
- `tailwind.config.ts` — extend with `chrome`, `opal`, `ember`, `cobalt` token families

### Design tokens (added to `index.css`)
HSL semantic tokens for each rarity material (base, highlight, shadow, glow), plus holo iridescence stops. All animations driven by CSS variables so we can tune intensity without code edits.

### Performance
- Holo shimmer = single CSS conformal-gradient + `mix-blend-mode: color-dodge`, no JS per-frame.
- Cursor tracking = one `requestAnimationFrame` loop on the hovered card only.
- Legendary aurora = CSS-only conic gradient rotation.
- Grid view auto-disables tilt/holo tracking and uses static rarity glow to stay 60fps with 100+ cards.

## What I will NOT touch in this pass
- Mint flow logic, Stacks contract, IPFS metadata, templates schema, trading system — purely the visual presentation layer.
- The AI-generated card art itself — the new frame **enhances** it, doesn't replace it.

## Deliverable
After implementation you'll see the new card system everywhere cards currently render: Gallery, Mint reveal, Trading listings, Account, and the derivative Forge result panel.
