# Deploying `cardforge-nft.clar`

This contract is SIP-009 compliant — once deployed, every minted card shows in
Xverse and Leather with full name, image, rarity, and stats (from the metadata
JSON the app pins automatically).

## 1. Pick a network

Start on **testnet** to verify end-to-end without spending real STX.

## 2. Deploy via Hiro Platform (easiest, no CLI)

1. Go to https://platform.hiro.so → sign in with your Stacks wallet.
2. New project → "Smart contract" → paste `contracts/cardforge-nft.clar`.
3. Hit **Deploy** and choose Testnet (or Mainnet). Approve the tx in your wallet.
4. After confirmation, copy:
   - **Contract address** (looks like `ST1ABC...XYZ` for testnet, `SP1ABC...XYZ` for mainnet)
   - **Contract name** (`cardforge-nft`)

## 3. Deploy via Clarinet CLI

```bash
brew install clarinet            # or: cargo install clarinet-cli
cd contracts
clarinet integrate               # local devnet sanity check
clarinet deployments generate --testnet --low-cost
clarinet deployments apply -p deployments/default.testnet-plan.yaml
```

## 4. Wire it into the app

Add three Vite env vars to your project's `.env` (Lovable manages this — set
them in **Project → Settings → Environment Variables**):

```
VITE_STACKS_CONTRACT_ADDRESS=ST1ABC...XYZ
VITE_STACKS_CONTRACT_NAME=cardforge-nft
VITE_STACKS_NETWORK=testnet   # or "mainnet"
```

Restart the preview. On the Mint page, after a pack opens, the app will ask
your wallet to sign one `mint` transaction per card.

## 5. Switching to mainnet

1. Redeploy the same contract on mainnet (real STX gas, ~1-2 STX).
2. Update `VITE_STACKS_CONTRACT_ADDRESS` and set `VITE_STACKS_NETWORK=mainnet`.
3. Nothing else changes.

## Trait reference

The SIP-009 trait this contract implements lives at
`SP3D6PV2ACBPEKYJTCMH7HEN02KP87QSP8KTEH335.sip-009-trait`. It is the canonical
Stacks NFT standard — any compliant wallet or marketplace (Gamma, Stacks Art,
Xverse, Leather) will recognise your tokens.
