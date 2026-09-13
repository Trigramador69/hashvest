# Demo Day script

The Demo Day slot is **5 minutes: a 3-minute showcase followed by 2 minutes of Q&A**. This script fits the showcase into that box and prepares the Q&A.

It shows only what is real. Every number quoted below was read from HSK Chain Testnet; see [`submission.md`](submission.md) for the evidence and [`testnet-demo.json`](testnet-demo.json) for the full transaction record.

> **Status:** this script has not been timed end to end yet. It depends on the three-wallet browser flow rehearsed in HAS-20. Do one timed dry run from the exact build and wallets used on stage before Demo Day, and cut beats that run long rather than speaking faster.

## Principle: stage everything slow, show everything that proves something

A live grant needs several wallet signatures, three account switches, and a workspace sign-in per account. That does not fit in three minutes. So the slow setup happens before the slot, and the showcase spends its time on the moments a judge cannot take on trust: a reviewer approving, a beneficiary claiming, and the explorer confirming both.

## Before the slot

### Wallets and network

- [ ] Three team-controlled testnet accounts in the browser wallet: **issuer**, **reviewer**, **beneficiary**. Follow the safety rules in [`browser-rehearsal.md`](browser-rehearsal.md); no seed phrase or private key goes anywhere near a screen.
- [ ] All three on HSK Chain Testnet (chain ID 133) with the canonical RPC `https://testnet.hsk.xyz`.
- [ ] Testnet HSK for gas in all three. Issuer holds hvUSD from the in-app faucet.
- [ ] Each account already signed in to the workspace once, so a stale session does not surprise you on stage.

### Pre-staged state

- [ ] An organization, for example `HashKey LATAM Ecosystem`, with the reviewer and beneficiary added as named members (`Treasury Reviewer`, `Builder`).
- [ ] One **HYBRID** grant created from that organization using the **Ecosystem Grant** preset, with:
  - a **start date in the past**, so the time condition is already fully vested and the claim is limited only by milestone approval;
  - **two milestones**, both still pending.
- [ ] Note the vault address. Open its page in a tab.

### Tabs, in order

1. The organization overview in the app (issuer signed in).
2. The staged grant's detail page.
3. The revoked vault on the explorer: [`0x8eC3…F37F`](https://testnet-explorer.hskchain.net/address/0x8eC3Fd370de53EA50C23c9Ea33d58355f344F37F).
4. The recorded fallback video, ready to play offline.

## The showcase — 3:00

| Time      | Beat              | Do                                                                                                      | Say                                                                                                                                                                                                               |
| --------- | ----------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:25 | **Problem**       | Landing page.                                                                                           | "Ecosystems and DAOs pay contributors through grants. Today that is a treasury transfer and a promise. The beneficiary can't see that the money exists, and the treasury has no enforced record of what it owes." |
| 0:25–0:50 | **Protocol**      | Scroll the three strategies on the landing page.                                                        | "HashVest puts each grant in its own vault on HSK Chain, fully funded the moment it's created. Tokens unlock by time, by milestones a reviewer approves, or by both — the smaller of the two."                    |
| 0:50–1:20 | **Organization**  | Tab 1: organization overview, then Members.                                                             | "Grants teams don't think in addresses. In HashVest Cloud you pick the beneficiary and reviewer by name. Those labels are only presentation — permissions still come from the chain."                             |
| 1:20–1:50 | **Review**        | Tab 2. Switch to the **reviewer** account. **Approve milestone** on milestone 1. Confirm in the wallet. | "This grant is time-vested already, so the only thing holding funds is the reviewer. Watch the unlocked amount move as soon as the approval confirms."                                                            |
| 1:50–2:15 | **Claim + proof** | Switch to the **beneficiary**. **Claim**. Confirm. Click the explorer link on the transaction.          | "Only the beneficiary can claim, and only what's unlocked. And here it is on the HSK explorer — nothing on this screen is a mock."                                                                                |
| 2:15–2:40 | **Revocation**    | Tab 3: the revoked vault.                                                                               | "Grants get cancelled. When this 100 hvUSD grant was revoked, the beneficiary had earned 16.94. They kept all of it. Only the unearned 83.06 went back. The contract makes clawing back earned value impossible." |
| 2:40–3:00 | **Close**         | Switch the language selector to 简体中文 and back.                                                      | "It works in English, Chinese, and Spanish. It's live on HSK testnet today, and the roadmap goes to remaining Cloud additions and an audit before mainnet. Thank you."                                            |

### If something breaks

| Failure                                            | Recovery, in under 10 seconds                                                                                        |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Wallet reports chain 133 but the transaction fails | Use **Use canonical HSK RPC** in the app's network notice, then retry once.                                          |
| A transaction is slow to confirm                   | Keep talking through the next beat; come back to the explorer link when it lands.                                    |
| Workspace asks to sign in after a switch           | Sign in; it is one signature. If it blocks, open the grant detail page directly — it is public and needs no session. |
| Anything else fails twice                          | Stop. Say "let me show you the recording of this exact flow" and play the fallback from the same beat.               |

Never retry a failed transaction more than once on stage.

## The Q&A — 2:00

Short, true answers. If you don't know, say so and offer the doc.

**Why testnet and not mainnet?**
The track allows testnet when time is limited, and we'd make that choice anyway. The contracts aren't audited, and a grants protocol holds other people's money. An audit is our precondition for mainnet.

**What stops an issuer from taking the money back?**
The full allocation is locked in the vault at creation. A non-revocable grant can never be withdrawn by the issuer. A revocable one can only recover what hasn't been earned — the revoked vault on screen shows exactly that.

**What if the reviewer disappears?**
Today a grant has one reviewer, and that's a known limitation. For a revocable grant, the issuer can revoke and recover the unearned part without touching what was earned. Multi-reviewer quorum is on the roadmap.

**Isn't Supabase a centralization risk?**
Supabase only holds product context: organization names, member labels, descriptions. Amounts, roles, approvals, and balances are always read from the chain. If the Cloud layer were compromised, it still couldn't move funds — it holds no keys and no amount a claim depends on.

**How would another app use HashVest?**
Without our frontend at all. The factory exposes role-discovery reads, so any app can list a wallet's grants with no indexer. Grants are created through `createGrant`, and the ABIs and chain config are exported from our integration package.

**What's the business model?**
Not built yet, and we won't pretend otherwise. The direction is a free, open protocol with a paid Cloud workspace for organizations. An optional, transparent protocol fee is specified as a create-time issuer surplus that never reduces beneficiary allocation; it is not implemented or deployed. See [`protocol-fee-spec.md`](protocol-fee-spec.md).

**How is it tested?**
Foundry unit, fuzz, and adversarial tests on the contracts, web unit tests, and a CI check that fails if the protocol layer ever depends on the Cloud layer or a server secret reaches the browser. The four lifecycles in our evidence ran as real testnet transactions.

**Does the beneficiary need gas to claim?**
Yes, today. Organization-sponsored first claims are on the roadmap so a new contributor can receive tokens without holding gas first.

## Recorded fallback

Record the showcase once, in full, from the pre-staged state above and the same build used on stage.

- Keep it to 3:00, matching the beats above, so it can take over mid-demo from any beat.
- Show the wallet confirmation and the explorer page for each transaction; that is the proof.
- Store it locally on the presenting laptop. Do not depend on venue Wi-Fi to play it.
- It is a safety net, not a submission requirement.
