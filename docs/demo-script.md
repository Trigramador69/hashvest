# Demo Day script

The Demo Day slot is **5 minutes: a 3-minute showcase followed by 2 minutes of Q&A**. This script fits the showcase into that box and prepares the Q&A.

It shows only what is real. Every number quoted below was read from HSK Chain Testnet; see [`submission.md`](submission.md) for the evidence and [`testnet-demo.json`](testnet-demo.json) for the full transaction record.

> **Status:** this script has not been timed end to end yet. Do one timed dry run from the exact build and wallets used on stage before Demo Day, and **cut beats that run long rather than speaking faster**. The cut order is given below.

## The story the three minutes tell

One sentence, and every beat serves it:

> **AI drafts, a human signs, the chain enforces — and the money was already there.**

That line covers both tracks entered. _AI x Ethereum & Agent Economy_ hears a spending policy an agent structurally cannot violate. _Real-World Ethereum Applications_ hears a grants team paying contributors. Do not pick one; the demo is strongest when it is visibly the same system.

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
- [ ] **Private evidence attached to milestone 1** — a real URL, a type, and a short note. The AI evidence review has nothing to read without it, and that beat is the centre of the demo.
- [ ] **Sponsorship enabled** on the organization with budget remaining, and the relayer configured. Confirm the overview shows the relayer as **Configured**; if it does not, the review beat falls back to a wallet-paid approval and you must say so rather than claim gasless.
- [ ] Note the vault address. Open its page in a tab.

### Warm up the AI

- [ ] Run one grant draft and one evidence review **before** the slot, from the same build. Both have a deterministic offline fallback, so neither can block the demo — but you want to know which path you are on before you are on stage, not during.

### Tabs, in order

1. The organization overview in the app (issuer signed in).
2. The staged grant's detail page.
3. The organization **Reports** tab.
4. The revoked vault on the explorer: [`0x8eC3…F37F`](https://testnet-explorer.hskchain.net/address/0x8eC3Fd370de53EA50C23c9Ea33d58355f344F37F).
5. The recorded fallback video, ready to play offline.

## The showcase — 3:00

| Time      | Beat              | Do                                                                                                                   | Say                                                                                                                                                                                                                                |
| --------- | ----------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:20 | **Problem**       | Landing page.                                                                                                        | "Ecosystems and DAOs pay contributors through grants. Today that's a treasury transfer and a promise. The beneficiary can't see the money exists, and the treasury has no enforced record of what it owes."                        |
| 0:20–0:45 | **Protocol**      | Scroll the three strategies.                                                                                         | "HashVest puts each grant in its own vault on HSK Chain, **fully funded the moment it's created**. Tokens unlock by time, by milestones a reviewer approves, or by both — the smaller of the two."                                 |
| 0:45–1:10 | **AI drafts**     | Open the grant builder. Type one sentence. Show the editable draft.                                                  | "I describe the grant in a sentence. The model drafts it — and it **cannot pick a wallet, sign, fund, approve or claim**. Its schema has no field for a beneficiary. That's a spending policy enforced by types, not by a prompt." |
| 1:10–1:45 | **Review** ⭐     | Tab 2, **reviewer** account. Open the AI evidence review, then approve milestone 1 by **signature** — no gas prompt. | "The reviewer sees the private evidence, and an assistant that read only what the server already authorised. It suggests; the reviewer decides. They sign an intent — **the organization's relayer pays the gas**."                |
| 1:45–2:10 | **Claim + proof** | Switch to the **beneficiary**. **Claim**. Confirm. Click the explorer link.                                          | "Watch the unlocked amount move. Only the beneficiary can claim, and only what's unlocked. And here it is on the HSK explorer — nothing on this screen is a mock."                                                                 |
| 2:10–2:30 | **Revocation**    | Tab 4: the revoked vault.                                                                                            | "Grants get cancelled. When this 100 hvUSD grant was revoked, the beneficiary had earned 16.94. They kept **all** of it. Only the unearned 83.06 went back. Clawing back earned value is impossible."                              |
| 2:30–2:45 | **Report**        | Tab 3. Generate the AI summary.                                                                                      | "Every figure is read live and labelled with the contract field it came from, grouped by token — **no invented USD**, because the protocol has no prices. The summary never sees a vault address."                                 |
| 2:45–3:00 | **Close**         | Switch the language to 简体中文 and back.                                                                            | "English, Chinese, Spanish. Live on HSK testnet today. An audit is our precondition for mainnet. Thank you."                                                                                                                       |

### Cut order if you are running long

Cut whole beats, in this order. Never compress the review or claim beats — they are the proof.

1. **Report (0:30–2:45).** Move it to Q&A; it answers the "how does this scale" question anyway.
2. **Revocation (2:10–2:30).** Becomes a one-line claim over the claim beat: "and a revoked grant can never take back earned value."
3. **Protocol (0:20–0:45)** down to 15 seconds — name the three strategies without scrolling.

### If something breaks

| Failure                                            | Recovery, in under 10 seconds                                                                                                          |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Wallet reports chain 133 but the transaction fails | Use **Use canonical HSK RPC** in the app's network notice, then retry once.                                                            |
| The AI provider is slow or unavailable             | Say "it falls back to a deterministic drafter so it never blocks the wizard" and keep going. This is a designed behaviour, not a save. |
| Sponsorship is unavailable or over budget          | The wallet-paid action is still there. Say "sponsorship is a policy, not a dependency" and approve with the wallet.                    |
| A transaction is slow to confirm                   | Keep talking through the next beat; come back to the explorer link when it lands.                                                      |
| Workspace asks to sign in after a switch           | Sign in; it is one signature. If it blocks, open the grant detail page directly — it is public and needs no session.                   |
| Anything else fails twice                          | Stop. Say "let me show you the recording of this exact flow" and play the fallback from the same beat.                                 |

Never retry a failed transaction more than once on stage.

## The Q&A — 2:00

Short, true answers. If you don't know, say so and offer the doc.

**Why testnet and not mainnet?**
The track allows testnet when time is limited, and we'd make that choice anyway. The contracts aren't audited, and a grants protocol holds other people's money. An audit is our precondition for mainnet.

**What stops an issuer from taking the money back?**
The full allocation is locked in the vault at creation. A non-revocable grant can never be withdrawn by the issuer. A revocable one can only recover what hasn't been earned — the revoked vault on screen shows exactly that.

**So the AI can spend money?**
No, and not because we told it not to. Every AI surface returns a draft that goes through the same validation a hand-written one does, and the draft types have no field for a beneficiary, a reviewer, a token, or a wallet. The provider key is server-only in one allowlisted module, prompts are redacted before they leave and never retained. A model in this product cannot express a transaction.

**What does the AI actually see?**
Only what the server already authorised for that member. The report summary gets amounts as decimal strings paired with their symbol, never crossing token groups, with vault addresses stripped entirely — and the count of vaults it could not see travels with the facts, so it cannot quietly describe an unread vault as an empty one. The evidence review fetches no URLs and has no tool calling.

**Who pays gas?**
For organization grants, the organization can. The beneficiary or reviewer signs an EIP-712 intent naming the exact vault, action and deadline, and a server-only relayer submits it. The Cloud never chooses the beneficiary, the amount or the nonce — it only pays. Whenever sponsorship is disabled, expired, unsupported or over budget, the wallet-paid path is still there.

**How do you track 50 grants without an indexer?**
The Reports tab reads every associated vault at a single block and groups by token. Notifications are derived from current state, and each one is identified by **the state fact it reports** — a milestone index, a date that has passed, a revocation timestamp — never by the clock. Reading the same vault again reproduces the same key, so deduplication is a property of the identity rather than a stored log, and the stream is bounded by construction.

**What if a vault can't be read?**
It's shown as unread, never as zero. The report renders a partial banner naming the vault, and notifications raise an explicitly unverified item. We'd rather show a gap than a confident wrong number.

**What if the reviewer disappears?**
Today a grant has one reviewer, and that's a known limitation. For a revocable grant, the issuer can revoke and recover the unearned part without touching what was earned. Multi-reviewer quorum is on the roadmap.

**Isn't Supabase a centralization risk?**
Supabase only holds product context: organization names, member labels, descriptions, private evidence, and whether you've seen a notification. Amounts, roles, approvals and balances are always read from the chain. If the Cloud layer were compromised it still couldn't move funds — it holds no key and no amount a claim depends on.

**How would another app use HashVest?**
Without our frontend at all. The factory exposes role-discovery reads, so any app can list a wallet's grants with no indexer. Grants are created through `createGrant`, and the ABIs and chain config are exported from our integration package.

**What's the business model?**
Not built yet, and we won't pretend otherwise. The direction is a free, open protocol with a paid Cloud workspace for organizations. An optional, transparent protocol fee is specified as a create-time issuer surplus that never reduces beneficiary allocation; it is not implemented or deployed. See [`protocol-fee-spec.md`](protocol-fee-spec.md).

**How is it tested?**
Foundry unit, fuzz and adversarial tests on the contracts, web unit tests, and a CI check that fails if the protocol layer ever depends on the Cloud layer or a server secret reaches the browser. The lifecycles in our evidence ran as real testnet transactions.

## Recorded fallback

Record the showcase once, in full, from the pre-staged state above and the same build used on stage.

- Keep it to 3:00, matching the beats above, so it can take over mid-demo from any beat.
- Show the wallet confirmation and the explorer page for each transaction; that is the proof.
- Store it locally on the presenting laptop. Do not depend on venue Wi-Fi to play it.
- It is a safety net, not a submission requirement.
