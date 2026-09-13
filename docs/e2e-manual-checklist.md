# E2E manual checklist

The Playwright suite (`pnpm --filter @hashvest/web visual`) covers what a
deterministic fixture can assert. This file covers what it cannot: wallet and
chain behaviour, and human judgement about language and visual intent.

Two servers, two purposes:

| Server   | Command                                                                                | URL                   | What it is for                                                          |
| -------- | -------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------- |
| Fixtures | `VISUAL_TEST_MODE=1 HASHVEST_VISUAL_PORT=3100 node apps/web/scripts/visual-server.mjs` | http://127.0.0.1:3100 | Deterministic data, no wallet, no HSK. Same surface Playwright asserts. |
| App      | `pnpm --filter @hashvest/web dev`                                                      | http://localhost:3000 | Real `.env.local`. Wallet, SIWE, chain guard.                           |

Only one `next dev` per directory may run at a time per server, and the
Playwright run starts its own on 3100 — stop the fixture server before running
the suite, and start it again afterwards.

Record every deviation as `screen → what you expected → what you saw`.

## On :3100 — language and visual intent

- [ ] **1. `/plans` in en, es and zh-CN.** No price, no checkout, no claim that a
      plan limit is enforced. Anything unavailable is labelled roadmap.
- [ ] **2. Shell destinations.** Overview, Grants, Organizations, Settings, and
      nothing that leads nowhere. `/app/settings/organizations/...` only
      redirects.
- [ ] **3. Grant wizard in a non-English locale.** The five steps (Template,
      Grant, Strategy, Conditions, Review) are translated, while template keys
      and onchain values stay technical and untranslated.
- [ ] **4. AI panels.** A model-written panel reads as model-written, each
      section collapses independently, and when the provider fails the manual
      path is still usable.
- [ ] **5. Organization report.** A vault that could not be read is visibly
      declared and distinct from a confirmed one — never counted as zero. No
      cross-token total, price, conversion, TVL or yield anywhere.
- [ ] **6. A real phone**, not devtools emulation, on the landing, `/plans` and
      `/app`.

## On :3000 — wallet and chain

- [ ] **7. Connect and sign.** Wallet connects, SIWE signature succeeds, and the
      session shows up in Settings.
- [ ] **8. Chain guard.** Switch the wallet to another network and confirm the
      app blocks the write and says which chain it needs.
- [ ] **9. Disconnect mid-flow.** The resulting error is localized, not a raw
      `unknown`.
- [ ] **10. Notifications.** Read/unread survives a reload and is scoped to the
      session wallet.

## What happens to a finding

Reproducible without a wallet → it becomes a Playwright case. Wallet- or
chain-dependent → it stays here as a permanent manual step.
