# Deploying `cardforge-nft` safely on devnet, testnet, and mainnet

## What was causing the failures

1. **Devnet config was incomplete**
   - `settings/Devnet.toml` was missing, which can break local devnet plan generation.

2. **Hiro/Xverse was misreading top-level trait code during deployment**
   - The earlier contract version used top-level trait declarations/imports.
   - Hiro Platform surfaced that as **"Asset Transfers Detected"** even though this is an NFT contract deploy.
   - Xverse/Hiro then failed with generic publish errors like:
     - `Request failed with status code 400`
     - `Something went wrong. 'undefined' was not deployed to mainnet.`

3. **Network mismatch can produce misleading wallet errors**
   - Your screenshots show Xverse on **Testnet4** while Hiro reported a deploy failure mentioning **mainnet**.
   - That usually means the selected deploy target and the wallet network were out of sync.

## What is fixed now

1. **`contracts/cardforge-nft.clar`**
   - Removed deploy-risky top-level trait declarations/imports.
   - Removed the admin-only `set-token-uri` function to keep publish flow minimal.
   - The contract now contains only the NFT definition, read-only getters, transfer, and mint logic.

2. **`Clarinet.toml`**
   - Kept the manifest minimal and Hiro-friendly.
   - Added a basic `[repl]` section for more stable local tooling behavior.

3. **`settings/Devnet.toml`**
   - Added the missing devnet network config so local plan generation has all three network configs present.

## Deployment checklist by network

### Devnet

Use this only for local Clarinet-style testing.

1. Keep `settings/Devnet.toml` in the repo.
2. Use the existing `deployments/default.devnet-plan.yaml`.
3. If you regenerate plans locally later, make sure devnet settings remain present.

### Testnet

1. Push the latest contract files to the repo Hiro Platform watches.
2. In Hiro Platform, refresh the project before deploying.
3. Select **Testnet** in Hiro Platform.
4. In Xverse, switch Stacks network to **Testnet4**.
5. Approve the deployment.
6. After confirmation, set:
   - `VITE_STACKS_CONTRACT_ADDRESS_TESTNET=<deployer-address>`
   - `VITE_STACKS_CONTRACT_NAME=cardforge-nft`
   - Optionally `VITE_STACKS_TREASURY_ADDRESS_TESTNET=<your-treasury-wallet>`
7. In the webapp, use the **testnet/mainnet** toggle on the Mint page to switch networks.

### Mainnet

1. In Hiro Platform, explicitly choose **Mainnet**.
2. In Xverse, switch off Testnet and use your **mainnet** account.
3. Deploy the exact same contract code.
4. After confirmation, update:
   - `VITE_STACKS_CONTRACT_ADDRESS_MAINNET=<mainnet-deployer-address>`
   - `VITE_STACKS_CONTRACT_NAME=cardforge-nft`
   - `VITE_STACKS_TREASURY_ADDRESS_MAINNET=<your-mainnet-treasury>`
5. Use the Mint page network toggle to switch to mainnet when you are ready.

## Rules that prevent future deploy errors

- **Do not re-add** top-level `define-trait`, `impl-trait`, or external trait imports to this deployable contract unless you have verified Hiro/Xverse handles them correctly.
- **Do not deploy testnet with a mainnet wallet** or mainnet with a testnet wallet.
- **Always refresh Hiro Platform after pushing contract changes** so it is not deploying cached code.
- If Hiro still shows **Asset Transfers Detected** for this contract, it is almost certainly using stale code — refresh or reconnect the repo state before signing anything.

## Quick interpretation of the errors you saw

- **`Asset Transfers Detected`**
  - Caused by Hiro/Xverse misclassifying the old contract code during publish analysis.

- **`Request failed with status code 400`**
  - Usually bad publish payload, stale contract analysis, or network mismatch.

- **`'undefined' was not deployed to mainnet`**
  - Usually a follow-on Hiro/Xverse UI error after the publish request already failed.
  - It does **not** mean your contract name is literally `undefined` in source.
