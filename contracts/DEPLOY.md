# Deploying `cardforge-nft` via Hiro Platform

## What I just fixed

1. **`Clarinet.toml`** — simplified to the minimal valid schema (`epoch` as string `"2.4"`, removed the `[repl.analysis]` block that Hiro Platform's validator rejects). This clears the *"Error updating devnet deployment plan"* and *"Error generating Devnet config"* errors.

2. **`contracts/cardforge-nft.clar`** — the SIP-009 `nft-trait` is now **defined inline inside the contract** instead of being imported from an external trait contract. The previous `(impl-trait 'ST1NXBK3...nft-trait.nft-trait)` reference was failing because:
   - On **devnet**, that trait contract doesn't exist → devnet-plan generation fails.
   - On **testnet** via Xverse, the node couldn't resolve it → "unable to parse node response".

   Defining the trait inline keeps the contract SIP-009 compliant (same function signatures, same NFT semantics) and makes it deployable to any network with zero external dependencies.

## Deploy steps

1. Push these files to the GitHub repo Hiro Platform is watching.
2. In Hiro Platform → your project → **Contracts**, refresh — the red errors should be gone and `cardforge-nft` should show as deployable.
3. Click `cardforge-nft` → **Deploy** → **Testnet**.
4. Approve the transaction in Xverse.
5. Once confirmed, copy the `<deployer-address>.cardforge-nft` identifier and set:
   - `VITE_STACKS_CONTRACT_ADDRESS=<deployer-address>`
   - `VITE_STACKS_CONTRACT_NAME=cardforge-nft`
   - `VITE_STACKS_NETWORK=testnet`

## Notes

- The contract is fully SIP-009 compatible — wallets and explorers will recognize the inline trait by structural match.
- For mainnet, no contract change is needed; just redeploy from Hiro Platform with the Mainnet network selected and update `VITE_STACKS_NETWORK=mainnet`.
