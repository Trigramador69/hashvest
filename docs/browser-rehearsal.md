# Controlled-wallet browser rehearsal

This is the preparation runbook for the HAS-20 browser execution. It uses the
existing HSK Testnet deployment and the existing organization/grant workflow.
It does not create wallets, send transactions, or claim that a browser
extension interaction has been executed.

## Safety contract

- Use three team-controlled, testnet-only browser-wallet accounts: issuer /
  workspace owner, reviewer, and beneficiary.
- Keep seed phrases and private keys inside the wallet or an approved password
  manager. Never put them in this repository, a shell command, terminal output,
  Linear, Supabase, screenshots, browser bundles, or logs.
- The tracked fixture contains only public addresses and rehearsal settings.
  The filled local copy is ignored by Git.
- `pnpm rehearsal:check` is read-only. It does not load a private key, submit a
  transaction, or mutate Supabase.
- Presentation labels such as `Treasury Reviewer` and `Builder` are only
  workspace metadata. GrantVault addresses determine the actual reviewer and
  beneficiary permissions.

## Public network and demo asset

| Item             | Value                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Network          | HSK Testnet                                                                                                                                         |
| Chain ID         | `133`                                                                                                                                               |
| Canonical RPC    | `https://testnet.hsk.xyz`                                                                                                                           |
| Native gas token | HSK                                                                                                                                                 |
| Explorer         | [HSK Testnet Explorer](https://testnet-explorer.hskchain.net)                                                                                       |
| HashVestFactory  | [`0x6fE671195Ac025220B074439362214c10821F93d`](https://testnet-explorer.hskchain.net/address/0x6fE671195Ac025220B074439362214c10821F93d)            |
| Demo token       | [`hvUSD` at `0x66bc0047085a716987FDfCad12a0caC78f67f713`](https://testnet-explorer.hskchain.net/address/0x66bc0047085a716987FDfCad12a0caC78f67f713) |
| Faucet           | **Get demo hvUSD** in the app; it calls `DemoToken.faucet()` and mints 1,000 hvUSD to the connected wallet                                          |

Every transaction writer pays its own HSK gas: the issuer pays the token
approval and grant creation, the reviewer pays milestone approvals, and the
beneficiary pays claims. Reading the dashboard does not spend onchain gas.

## Address-only fixture

Create the local fixture without placing keys in the command line:

```bash
cp docs/testnet-rehearsal.example.json docs/testnet-rehearsal.local.json
```

Edit only the three `address` values in
`docs/testnet-rehearsal.local.json`. The roles must be three distinct,
nonzero EVM addresses. The grant settings are intentionally fixed for the
judge path:

- `100 hvUSD` total allocation;
- `HYBRID` strategy;
- `0` second cliff and `300` second (`5` minute) duration;
- `Prototype accepted` for `40 hvUSD`;
- `Delivery accepted` for `60 hvUSD`;
- no eligibility provider.

Run the read-only readiness check before opening the browser:

```bash
pnpm rehearsal:check
```

The check confirms chain 133, bytecode at the existing factory and token,
`hvUSD` metadata, gas reserves for the planned writes (three for the issuer to
cover an allowance reset, approval, and creation; two each for reviewer and
beneficiary), and at least 100 hvUSD in the issuer wallet. It prints public
addresses and balances only. If the CLI read is rate-limited, retry the
canonical endpoint or set `HSK_TESTNET_RPC_URL` for this read-only command. If
the browser wallet cannot read blocks, repair that wallet's RPC separately; do
not redeploy contracts or resend funds because a block read failed.

## Browser checklist

Mark wallet-dependent steps as manual unless the exact browser-wallet action
was actually automated and observed.

### Preflight

- [ ] The local fixture passes `pnpm rehearsal:check`.
- [ ] All three browser accounts are on HSK Testnet chain 133.
- [ ] The issuer has at least 100 hvUSD and enough HSK for an allowance reset,
      approval, and grant creation if all three are required.
- [ ] The reviewer and beneficiary each have HSK for their own transactions.
- [ ] The app is running from the same build and environment that will be used
      for the rehearsal.

### Issuer and workspace

- [ ] Connect the issuer wallet and verify the displayed address matches the
      fixture.
- [ ] Click **Sign in to workspace** and approve one SIWE message on chain 133.
- [ ] Open **Settings**, create the organization `HAS-9 Controlled Wallet
Rehearsal`; set the
      issuer display name to `Issuer / workspace owner` and role/title to
      `Workspace Owner`. The issuer is its sole owner/member.
- [ ] Add the reviewer address with the display name `Treasury Reviewer`.
- [ ] Add the beneficiary address with the display name `Builder`.
- [ ] Confirm that the member directory shows addresses, not private key
      material.

### Create the HYBRID grant

- [ ] Open **Create grant** from the organization workspace under **Settings**.
- [ ] Enter the title `HAS-9 controlled-wallet HYBRID rehearsal YYYY-MM-DD-NN`,
      replacing the suffix with the UTC date and run number.
- [ ] Select the named beneficiary member and the demo `hvUSD` token.
- [ ] Enter `100` as the total allocation.
- [ ] Select **Hybrid**.
- [ ] Leave **Start date** empty so the app uses the creation transaction
      timestamp; set cliff to `0`, duration to `5` minutes, and add milestones
      of `40` and `60` hvUSD.
- [ ] Leave eligibility disabled.
- [ ] Select the organization member `Treasury Reviewer` in **Reviewer**; do
      not replace it with an external address. Leave **Revocable grant**
      unchecked and confirm the terms are permanent before submitting.
- [ ] Approve token spending if prompted, then submit **Approve & create
      grant** from the issuer wallet.
- [ ] Wait for the receipt. Record the GrantVault address and the public
      approval/creation explorer links.
- [ ] Confirm funding health shows the full 100 hvUSD in the new vault.

The full allocation moves into the new vault atomically. The browser should
not treat a confirmed creation as failed merely because the optional workspace
metadata request is still pending.

### Reviewer and beneficiary lifecycle

- [ ] Switch to the reviewer account in the browser wallet.
- [ ] Reconnect if necessary and click **Sign in to workspace** again; a SIWE
      session belongs to one wallet and is not silently transferred.
- [ ] Open the organization review queue under **Settings** and open the
      existing grant.
- [ ] Verify the reviewer role comes from the GrantVault reviewer address, then
      approve `Prototype accepted`. Record its explorer link.
- [ ] Switch to the beneficiary account, reconnect, and explicitly sign in.
- [ ] After roughly two minutes of the five-minute schedule, verify the live
      claimable amount is available and claim from the beneficiary wallet.
      Record the claim link and the beneficiary hvUSD balance change.
- [ ] After the five-minute duration has elapsed, switch back to the reviewer,
      sign in, and approve `Delivery accepted`. Record its explorer link.
- [ ] Switch to the beneficiary, sign in, and claim the remaining unlocked
      amount. Record the final claim link and live claimed/vault balances.
- [ ] Open the public `/grants/<GrantVault address>` route without workspace
      authentication and verify the live onchain terms remain readable.

### Session, network, and error checks

- [ ] Change wallets without signing in again. The app shows **Wallet changed**
      and disables organization reads/mutations until explicit re-authentication.
- [ ] Start a new sign-in after a consumed or expired challenge. The app must
      request a fresh nonce; a previously used SIWE challenge is not reusable.
- [ ] If the browser wallet reports chain 133 but block reads fail, use **Use
      canonical HSK RPC** or set that wallet's RPC to
      `https://testnet.hsk.xyz` manually.
      A block-read failure without a transaction hash means no transaction was
      sent and no gas was charged.
- [ ] During loading, pending, rejected, reverted, and RPC-unavailable states,
      record the visible status and do not click the write action repeatedly.

## Metadata failure and restart recovery

A confirmed GrantVault is the source of truth. Workspace metadata is optional
context and is keyed by `(chain_id, vault_address)`.

If creation is confirmed but metadata persistence fails:

1. Record the displayed vault address and creation transaction link.
2. Do **not** submit **Approve & create grant** again.
3. Keep the issuer wallet connected and the issuer SIWE session active, then
   click **Retry workspace sync**.
4. If the page was reloaded, sign in again with the issuer and use **Link an
   existing GrantVault** from the organization overview with the same address.
5. Verify the workspace has one association for that `(133, vault)` and that
   the public grant page and live vault state still work.

The server updates an existing association rather than inserting a duplicate;
the same vault address is the retry identity. If another request won the
association race, retry the sync and keep the original vault. Never create a
second grant to repair an offchain metadata failure.

## Reset and retry rules

- There is no destructive chain reset for a deployed immutable GrantVault. A
  failed wallet prompt or pre-transaction form can be retried safely.
- For an intentional fresh rehearsal, keep the same three wallet roles, use a
  new unique grant title, and leave the earlier public vault/evidence intact.
- For a metadata-only failure, reuse the confirmed vault address as described
  above; do not use a new title or create another vault.
- To reset browser access, sign out of the workspace, reconnect the intended
  wallet, switch to chain 133, and sign in again. Do not clear shared Supabase
  data or run a database reset as part of the rehearsal.

## Evidence to retain

Retain only public evidence:

- the three role addresses;
- chain ID 133, factory/token/vault addresses;
- faucet, approval, creation, milestone-approval, and claim transaction links;
- screenshots or recordings of the visible role, funding, lifecycle, retry,
  and network states.

Do not retain seed phrases, private keys, wallet-export files, session cookies,
SIWE signatures, RPC credentials, or command output containing secrets. This
runbook is preparation evidence; the live completion matrix belongs to HAS-20.
