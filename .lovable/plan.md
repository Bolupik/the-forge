
# Stacks NFT + Image Transform Plan

Two parallel tracks. Both shippable in this loop.

## Track A — SIP-009 NFT Contract (testnet now, mainnet later)

### 1. Clarity contract — `contracts/cardforge-nft.clar`
Standard SIP-009 with full per-token metadata baked into the token URI:

- `define-non-fungible-token cardforge-nft uint`
- `get-last-token-id`, `get-token-uri`, `get-owner`, `transfer` (SIP-009 trait)
- `mint (recipient principal) (token-uri (string-ascii 256))` — public, anyone can call, pays mint fee in STX (0 for now)
- Per-token URI stored in `(define-map token-uris uint (string-ascii 256))` so each card points to its own IPFS metadata JSON
- Optional `set-token-uri` admin function gated by `contract-owner`
- Clarinet project scaffold + one happy-path test

Deploy guide (`contracts/DEPLOY.md`) with steps for Hiro Platform deploy on testnet, then mainnet.

### 2. Metadata pinning — edge function `pin-card-metadata`
- Triggered when admin uploads a card image OR when a card is minted
- Builds OpenSea-style JSON: `{ name, description, image, attributes: [{trait_type, value} for rarity/element/ATK/DEF/SPD/SPC/HP], properties: { rarity, element, stats, serial } }`
- Pins JSON + image to web3.storage via REST API using `WEB3_STORAGE_TOKEN` secret
- Returns `ipfs://<cid>` URI
- Stores resulting URI on `card_templates.metadata_url` (template-level) and per-mint `nft_cards.metadata_url`

### 3. Wallet contract-call wiring — `src/lib/stacksMint.ts`
- New hook `useContractMint()` using `@stacks/connect` `openContractCall`
- After `open-pack` returns 5 cards, UI iterates and prompts wallet to sign 5 `mint` transactions (one per card), each with that card's IPFS URI
- New columns on `nft_cards`: `tx_id text`, `on_chain_token_id integer`, `chain_status text` (pending/confirmed/failed)
- Tx status polled via Hiro API; `chain_status` updated when confirmed
- Account page shows on-chain badge + Explorer link per card

### 4. Config
- New secrets: `WEB3_STORAGE_TOKEN`, `STACKS_CONTRACT_ADDRESS`, `STACKS_CONTRACT_NAME`, `STACKS_NETWORK` (testnet/mainnet)
- Stored client-side via `VITE_` exposure for the contract address (publishable)

## Track B — Fighting-Pokemon Image Transform

### 1. Edge function `transform-character-image`
- Input: image URL or base64
- Calls Lovable AI Gateway with `google/gemini-2.5-flash-image` (Nano Banana edit mode)
- Prompt: "Reimagine this exact character in a dynamic fighting stance, Pokémon trading-card-game art style — bold cel-shaded lines, dramatic lighting, action pose, battle-ready. Preserve the character's face, hair, outfit, and identifying features exactly. Transparent or clean background."
- Returns base64 PNG

### 2. ForgePage upload UX
- After admin uploads a character image, automatically call the transform function
- Show a two-up picker: **Original** | **Fighting Pokémon** with radio selection
- Selected version is what gets pinned to IPFS and saved on the template
- "Regenerate" button to re-roll the transform

## Out of scope (won't do this loop)
- Mainnet deploy (you do that, then update secret)
- On-chain royalties / marketplace integration
- Reading existing wallet NFTs to seed gallery

## Technical notes
- web3.storage is now Storacha and requires a UCAN-signed token. The simpler legacy API token still works through their REST `/upload` endpoint — you'll generate one at https://web3.storage and paste it as `WEB3_STORAGE_TOKEN`. If you'd rather use Pinata, swap one secret and I'll change the upload helper.
- Mint signing uses `@stacks/connect` v7. Each card = one tx; 5 cards = 5 wallet popups. If that's bad UX, an alternative is a single `mint-many` Clarity function (let me know and I'll add it).
- Contract is non-custodial and free-to-mint — there's no allowlist or pack-id check on-chain. Pack rules stay enforced by the `open-pack` edge function.

## Files I'll create / change
- `contracts/cardforge-nft.clar`, `contracts/DEPLOY.md`, Clarinet config + 1 test
- `supabase/functions/pin-card-metadata/index.ts` (new)
- `supabase/functions/transform-character-image/index.ts` (new)
- `src/lib/stacksMint.ts` (new) + small additions to `MintPage.tsx`, `Account.tsx`, `ForgePage.tsx`
- Migration: add `tx_id`, `on_chain_token_id`, `chain_status` to `nft_cards`
- Secrets requested: `WEB3_STORAGE_TOKEN`, `STACKS_CONTRACT_ADDRESS`, `STACKS_CONTRACT_NAME`

Approve to start? I'll request the web3.storage token first, then build both tracks in parallel.
