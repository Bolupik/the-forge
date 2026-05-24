# Deploying `cardforge-nft` via Hiro Platform

The Hiro Platform error **"Error updating devnet deployment plan. Please verify that your project's Clarinet.toml file is valid and references your contracts"** means the repo Hiro pulled from GitHub did not have a `Clarinet.toml` at the root. This is now fixed — `Clarinet.toml` and `settings/Testnet.toml` / `settings/Mainnet.toml` live at the repo root and reference `contracts/cardforge-nft.clar`.

The Xverse error **"Failed to broadcast transaction (unable to parse node response)"** is what you get when the contract references a SIP-009 trait that doesn't exist on the network you're deploying to. The contract now uses the canonical testnet trait (`ST1NXBK3K5YYMD6FD41MVNP3JS1GABZ8TRVX023PT.nft-trait`). When you go to mainnet, switch line 9 to the mainnet trait (`SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.nft-trait`).

## Steps

1. Push these files to the GitHub repo Hiro Platform is watching (`Bolupik/bitcoin-...`).
2. In Hiro Platform → your project → **Contracts**, click `cardforge-nft` → **Deploy** → **Testnet**.
3. Approve the transaction in Xverse.
4. Once confirmed, copy the `<deployer-address>.cardforge-nft` identifier and set:
   - `VITE_STACKS_CONTRACT_ADDRESS=<deployer-address>`
   - `VITE_STACKS_CONTRACT_NAME=cardforge-nft`
   - `VITE_STACKS_NETWORK=testnet`
5. For mainnet: change the trait import on line 9 of `cardforge-nft.clar` to the mainnet `nft-trait`, push, and redeploy from Hiro Platform with the Mainnet network selected.
