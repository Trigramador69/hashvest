# HashVest architecture: Protocol and Cloud

This document defines the boundary between the two product layers in this monorepo, the integration path between them, and the scope rules for the hackathon. Protocol revocation semantics are defined by HAS-25/HAS-26; this document records how that functionality crosses the boundary without moving authority into Cloud.

It exists because the repository holds two layers that are easy to confuse. Without an explicit boundary, later work can reimplement protocol behavior in the application, push product metadata onchain, or attempt a repository split under time pressure. Each of those is a demo-breaking mistake.

The single rule everything else follows:

> **HSK is authoritative for value and permission. Supabase is product context. Cloud may depend on Protocol; Protocol must never depend on Cloud.**

## HashVest Protocol

The Protocol is the trust boundary. It holds funds, enforces unlock math, and decides who may approve and who may claim. It runs entirely onchain and works without any part of the Cloud layer.

| Path                                                 | Role                                                                        |
| ---------------------------------------------------- | --------------------------------------------------------------------------- |
| `packages/contracts/src/HashVestFactory.sol`         | Creates vaults; keeps role discovery arrays                                 |
| `packages/contracts/src/GrantVault.sol`              | Immutable terms, milestone approval, claims, optional issuer revocation     |
| `packages/contracts/src/GrantTypes.sol`              | Shared strategy and schedule types                                          |
| `packages/contracts/src/IEligibilityProvider.sol`    | Optional eligibility adapter interface                                      |
| `packages/contracts/src/DemoToken.sol`               | Faucet-mintable demo ERC20 (`hvUSD`); demo only                             |
| `packages/contracts/src/DemoEligibilityProvider.sol` | Administrator-controlled demo allowlist; demo only                          |
| `packages/contracts/script/DeployHashVest.s.sol`     | Chain-guarded deployment (aborts unless `block.chainid == 133`)             |
| `packages/web3/src/protocol.ts`                      | The protocol-facing export surface (chains, ABIs, addresses, explorer URLs) |
| `packages/web3/scripts/`                             | Deployment, ABI/address synchronization, smoke, verification                |

`packages/web3` is the **integration layer**, not a second protocol. It carries no business logic: it re-exports generated ABIs, the chain definitions, the confirmed deployment addresses, and explorer URL helpers. Its exports are generated from Foundry artifacts by `pnpm contracts:sync` and held in step by `pnpm contracts:sync:check`.

`DemoToken` and `DemoEligibilityProvider` are demonstration assets. They are part of the deployed demo, not part of the protocol's trust model.

## HashVest Cloud

The Cloud is the product layer. It makes the Protocol usable — workspaces, named participants, review queues, and role-aware navigation — and it is **optional to every protocol operation**. A grant created through `/grants/new` with raw addresses never touches it. If Supabase is unavailable, `/grants/<address>` still renders from live chain reads; `app/api/grants/[address]/context/route.ts` deliberately returns a null context rather than an error.

| Path                                    | Role                                                                                                           |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `apps/web/app/**`                       | Next.js routes, pages, and Route Handlers                                                                      |
| `apps/web/lib/cloud/auth/**`            | SIWE challenge, one-time nonce, signed session cookie                                                          |
| `apps/web/lib/cloud/organizations/**`   | Validation, server authorization, template data access, browser API client, types                              |
| `apps/web/lib/cloud/supabase-server.ts` | The only service-role Supabase client; server-only                                                             |
| `apps/web/lib/shared/i18n/**`           | Locale selection and the typed translation boundary                                                            |
| `apps/web/lib/shared/grant-presets/**`  | Grant preset catalog, organization template rules, `template_key` linkage, wizard mapping, and field ownership |
| `supabase/migrations/**`                | Organizations, members, grant associations, organization templates, auth nonces                                |

### Dashboard presentation projection

The redesign in [`design.md`](../design.md) changes presentation structure,
not authority. `apps/web/hooks/use-dashboard-analytics.ts` discovers vaults
from the factory's issuer/beneficiary/reviewer arrays, reads each GrantVault's
current snapshot, and fetches the factory/vault lifecycle logs for the activity
timeline. `apps/web/lib/dashboard/analytics.ts` is a pure reducer that derives
roles, lifecycle counts, claimable/pending queues, strategy distribution, and
six monthly buckets from those reads.

The analytics object is intentionally ephemeral and read-only. It is not stored
in Supabase, does not aggregate token units into a currency, and never grants a
permission. If a log range or optional workspace enrichment fails, the UI marks
the timeline partial while retaining the live snapshot. The guarded
`/visual/dashboard` route supplies deterministic fixture data only to local
Playwright snapshots and returns 404 in production.

Cloud authority stops at workspace access. The SIWE statement in `apps/web/lib/cloud/auth/constants.ts` says so explicitly: the signature _"authenticates workspace access only; it does not authorize onchain actions."_

## Integration path

```text
HashVest Cloud
  apps/web          Next.js UI, SIWE sessions, organizations, members, metadata
  Supabase          product context only; RLS closed, service role server-side
        |
        |  one way: Cloud depends on Protocol, never the reverse
        v
@hashvest/web3      integration layer: chain config, generated ABIs, deployment addresses
        |
        v
HashVest Protocol
  HashVestFactory   role discovery arrays
  GrantVault        immutable terms, approvals, claims, optional revocation
  GrantTypes, IEligibilityProvider
        |
        v
HSK Testnet (chain 133)
```

Inside `apps/web/lib`, the same direction holds between three trees:

- `lib/protocol/**` — chain-facing helpers, wagmi config, onchain role resolution, vault verification. **Must not import `lib/cloud/**`.**
- `lib/cloud/**` — Supabase, sessions, organizations. May import `lib/protocol/**`.
- `lib/shared/**` — layer-neutral utilities, including the i18n boundary. Imported by both, imports neither.

Localization is presentation state, so it lives in `lib/shared/i18n/**` and imports neither layer. English is the source of truth: `dictionaries/en.ts` defines `TranslationKey`, and every other locale is typed as a subset of it, so a missing or blank string falls back to English instead of surfacing a raw key. The locale is a cookie, not a route segment — no URL carries a language, and `router.refresh()` applies a change without remounting the wallet providers. User-visible generic and HSK RPC errors use localized `errorMessage` options; already-translated validation and wallet-guard errors are preserved. Technical literals (addresses, hashes, token symbols, chain ids, explorer URLs) are never written into a message; they arrive through `{placeholder}` substitution so they stay identical in all three locales.

## Authority: which layer owns which field

| Owned by HSK (authoritative)                   | Owned by Supabase (product context)             |
| ---------------------------------------------- | ----------------------------------------------- |
| Issuer, beneficiary, reviewer                  | Organization name and description               |
| Token, allocation, strategy                    | Membership and workspace ownership (`is_owner`) |
| Vesting start, cliff, duration                 | Display names and presentation role labels      |
| Milestone titles, amounts, approval state      | Organization ↔ GrantVault associations          |
| Revocable mode, revoked state, revocation time | Grant descriptions, organization templates      |
| Vested, unlocked, claimable, claimed amounts   | —                                               |
| Eligibility, balances, funds                   | —                                               |

Two consequences that have already shaped the code:

- **Presentation labels are not permissions.** A member labeled `Treasury Reviewer` cannot approve anything. `resolveProtocolRoles` in `apps/web/lib/protocol/roles.ts` derives issuer/beneficiary/reviewer by comparing the connected wallet to onchain addresses only. The migration says the same at the column level: `role_label` is _"Presentation metadata only; it has no onchain authority."_
- **Templates are suggestions, not state.** An organization template stores milestone percentages rather than amounts and a reviewer default as a member reference rather than an address; applying one only fills editable wizard fields. See [`organization-templates.md`](organization-templates.md).
- **Workspace owner is not issuer.** The `Owner` badge in the members view means "owns this Supabase organization." Linking a vault requires both: `requireOrganizationOwner` gates who may attempt it, and an onchain `issuer()` read gates whether it is accepted.

Amounts are never cached in Supabase. Dashboard counts in `apps/web/hooks/use-organizations.ts` come from live vault reads.

## Public integration surface and extension points

The Protocol is usable without this application. Anyone integrating should depend on the contract ABIs and the factory's role discovery arrays, not on the Cloud API.

- **Alternative frontends** — consume `@hashvest/web3`'s protocol surface (or the raw ABIs) and read role discovery from `HashVestFactory`. No Supabase, no session, no Route Handler required.
- **Grant workflows** — build vaults through `HashVestFactory` directly. The shared five-step wizard at `/grants/new` is one client, not the interface; its template choice and localized suggestions are Cloud presentation metadata, while submitted terms remain onchain truth.
- **Eligibility and compliance adapters** — implement `IEligibilityProvider` and pass the address at creation. `DemoEligibilityProvider` is a reference implementation, not KYC.
- **Third-party integrations** — read-only indexing, reporting, and notification services can be built entirely from chain state and explorer data.

The Cloud's own HTTP surface (`apps/web/app/api/**`) is an application-private interface. It is session-bound and same-origin guarded; it is **not** a public API and carries no stability guarantee.

## Future extraction

The Protocol is intended to become a public, independently consumable package. **This does not happen during the hackathon** — see [HAS-38](https://linear.app/hashvest/issue/HAS-38) (P2, post-hackathon).

The extraction boundary is drawn now so it stays honest:

- `hashvest-protocol` — the public repository: `packages/contracts` in full (sources, Foundry tests, deployment script).
- `@hashvest/protocol` — the published integration package: the contents of `packages/web3/src/protocol.ts`, which is exactly the set of exports with no dependency on `apps/web` or Supabase.

`packages/web3/protocol-surface.json` records that surface. A drift check fails CI when the actual exports and the manifest disagree, so the extraction boundary cannot erode silently between now and HAS-38.

Nothing outside that list is extractable today. Anything added to `packages/web3` that needs Cloud state is a boundary violation, not an extraction candidate.

## Enforcement

The boundary was previously enforced by convention alone. It is now checked. `pnpm boundary:check` runs in CI and fails with a readable message and exit code 1:

| Check                  | Fails when                                                                                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secret containment     | `SUPABASE_SERVICE_ROLE_KEY` or `AUTH_SECRET` is referenced outside the server-only allowlist, is prefixed `NEXT_PUBLIC_`, or a module importing `createSupabaseAdmin` lacks `import "server-only"` |
| Layer import direction | `packages/web3` or `packages/contracts` references `apps/web`, Supabase, or Next; or `lib/protocol/**` imports `lib/cloud/**`                                                                      |
| Protocol export drift  | The real protocol export surface no longer matches `packages/web3/protocol-surface.json`                                                                                                           |
| Documentation links    | A relative link or in-repo file reference in `README.md` or `docs/*.md` is dead                                                                                                                    |

These complement guards that already existed: `import "server-only"` on every service-role path, Postgres RLS revoking all access from `public`/`anon`/`authenticated` with no policies granted, `chain_id = 133` check constraints and TypeScript literal types, and the onchain issuer verification before grant association.

## Hackathon critical path

P0 work only. Everything else is post-hackathon.

| Milestone                               | Issues                                       | Points |
| --------------------------------------- | -------------------------------------------- | ------ |
| M0 — Protocol/Cloud boundary & baseline | HAS-5                                        | 1      |
| M1 — Global grant templates             | HAS-8, HAS-11                                | 8      |
| M2 — Revocation & protocol safety       | HAS-25, HAS-26                               | 13     |
| M3 — Lifecycle & funding health         | HAS-6                                        | 3      |
| M4 — i18n, browser E2E & submission     | HAS-7, HAS-9, HAS-10, HAS-20, HAS-21, HAS-22 | 15     |
| **Total**                               |                                              | **40** |

**40 points of P0 against 30 hours is over-subscribed.** M2 carries the most risk: 13 points, and HAS-26 is blocked on the HAS-25 design. M4 contains every non-negotiable submission artifact — the browser rehearsal, the E2E run, the release gate, and the judge submission — so it must not be compressed.

### Stop-adding-features rule

In force from the moment this document merges until submission:

1. **Nothing enters hackathon scope without something leaving it.** Scope is a swap, never an addition.
2. **No new protocol functionality.** M2 is the only milestone permitted to change Solidity, and only through HAS-25 then HAS-26.
3. **No repository split.** Deferred to HAS-38.
4. **P1/P2/P3 stay in M5–M7.** A good idea during the hackathon is a Linear issue, not a commit.
5. **M4 is reserved.** Demo, regression, and submission work is not a source of slack for feature work.

## Roadmap ownership

| Milestone                                             | Owner                                                       | Status         |
| ----------------------------------------------------- | ----------------------------------------------------------- | -------------- |
| M0 — Protocol/Cloud boundary & baseline               | Cloud + Protocol                                            | Hackathon P0   |
| M1 — Global grant templates                           | Cloud                                                       | Hackathon P0   |
| M2 — Revocation & protocol safety                     | Protocol                                                    | Hackathon P0   |
| M3 — Lifecycle & funding health                       | Cloud                                                       | Hackathon P0   |
| M4 — i18n, browser E2E & submission                   | Cloud + Protocol                                            | Hackathon P0   |
| M5 — P1 Cloud additions after P0                      | Cloud (HAS-23, HAS-24, HAS-27, HAS-30 are Cloud + Protocol) | Post-hackathon |
| M6 — P2 intelligence, operations & protocol readiness | Mixed; includes HAS-38 extraction                           | Post-hackathon |
| M7 — P3 long-term protocol, Cloud & ecosystem         | Mixed                                                       | Post-hackathon |

## Security boundary

HashVest MVP is unaudited, targets HSK Testnet only, and uses a faucet-mintable demo token. It is not production custody software. Explicitly revocable new vaults permit only issuer-triggered, one-way recovery of unearned allocation; earned and claimed beneficiary value is preserved. Non-revocable and previously deployed vaults retain their permanent terms.

Compromising the Cloud layer must not put funds at risk. That property follows from this boundary: Supabase holds no key material, no signing authority, and no amount that any claim depends on.
