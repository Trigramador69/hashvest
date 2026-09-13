# Organization AI tools — HAS-19 and HAS-17

Four independent, collapsible sections share one visual vocabulary: the Grant
Builder in the wizard's Template step, template generation in the organization's
new-template editor, evidence analysis beside GrantDetail's private evidence, and
a reading of the organization report at
`/app/organizations/<uuid>/reports`. The review queue links directly to analysis.
Navigation is unchanged — Overview, Grants, Organizations and Settings — and no
tool adds a destination of its own. Every result is advisory; HSK owns all value
and permission.

A reviewer can copy any analysis as plain text, citations included, to paste into
a decision of their own. The copy is user-initiated and goes to the clipboard;
nothing is filed away, because an advisory reading the product stored would start
to read like a record.

## Template generation

`POST /api/organizations/[organizationId]/ai/template-draft` accepts `prompt` and
`locale`. Same-origin, session and owner checks precede provider access. It returns
a nullable `draft` and `unavailable` flag. A draft contains ordinary template
content, assumptions, unsupported requests and a redaction flag. Its parser
reconstructs allowed fields and runs `assertValidOrganizationTemplate`; invalid
percentages or schedules are rejected, never repaired silently. The model cannot
name identities or transactions. The server sets `defaultReviewerMemberId` to null.

The owner applies the suggestion, confirms replacement of edits, edits the result
and explicitly saves through existing template CRUD. Saved templates use the
ordinary wizard application path. Missing configuration, provider errors and
malformed output leave the manual editor available. Changed locale requires a new
template suggestion before application.

## Evidence review

`POST /api/organizations/[organizationId]/grants/[vaultAddress]/ai/review` uses only
`locale` from the body. The server checks membership and canonical `(133, vault)`
organization association before RPC or model access. Browser-provided evidence
and financial values are ignored. A failed HSK read returns no private evidence.

HSK reads are block-consistent: milestones, approvals, strategy, allocation,
claimed/unlocked/claimable amounts and revocation. Supabase supplies authorized
notes, types, URLs and dates. The model receives redacted notes and chain data with
source IDs, never evidence URLs, signed query parameters or submitter wallets.
External links are not downloaded or verified. Notes are submitter claims; age
does not imply expiry because no freshness policy or deadline is defined.

The result contains cited summary, findings, questions, uncertainty and a textual
recommendation: approve, request information or insufficient information. Every
statement references known IDs, resolved to safe links by the server. Unknown
citations reject the response. Approval suggestions are rejected for revoked
grants, no pending milestones, or pending milestones without usable notes. A valid
citation identifies a supplied source; it does not prove the model interpreted it
correctly. Humans still check the sources and use the existing approveMilestone
action. The section has no wallet API or approval callback.

The UI shows consultation date/block, source dates, unread-link limitation and a
permanent advisory disclaimer. Recommendations disappear when evidence, relevant
chain state or locale changes, or the analysis is older than five minutes.
Session, organization and grant changes discard private results and abort requests.
Provider failure retains source context and leaves manual review available.

## Report summary

`POST /api/organizations/[organizationId]/ai/report` uses only `locale` from the
body. Membership is checked first; Supabase then supplies the discovery set — which
vaults this organization is associated with — and nothing else.

**The server does its own reads.** `readOrganizationGrantSnapshots` in
`lib/protocol/verify.ts` reads each vault at a single block, plus its ERC20 symbol
and decimals, and `buildOrganizationReport` derives the same report the page shows.
Figures the browser sends are ignored. That duplication is deliberate: a summary
quoting numbers the caller supplied would be summarizing the caller, not the chain.

`ORGANIZATION_REPORT_VAULT_LIMIT` bounds one call at 12 vaults, because each vault
costs roughly twenty reads. Vaults past the limit are reported as omitted and mark
the result partial; they are never treated as empty.

Amounts reach the model as decimal strings beside their token symbol, grouped by
ERC20 contract. Vault addresses, wallets and links never do; grant titles are
member-authored text and are redacted like any note.

The parser enforces what the prompt asks for. A statement is rejected outright if
it names a fiat amount, a currency symbol, a conversion, an exchange rate, a
valuation, TVL, APR, APY or yield, or if it totals across token groups — HashVest
has no price feed, so such a sentence is an invented fact about value, not a
rounding error. A cited id must be one the server supplied. When the result is
partial, at least one statement must cite `unreadable`, so a reader is never shown
a confident summary of vaults nobody could read.

Citations resolve to sections of the Reports page itself (`lifecycle`, `viewer`,
`token-N`, `unlocks`, `unreadable`), so checking a claim is a scroll. The summary
goes stale when the lifecycle counts, per-token amounts, viewer counts or locale
change, or after five minutes; re-reading identical state does not age it.

## Provider and privacy

All tools share `apps/web/lib/cloud/ai/config.ts`: server-only `AI_API_KEY`, optional
`AI_BASE_URL`, `AI_MODEL` and `AI_MAX_TOKENS`. Defaults remain Groq,
`openai/gpt-oss-20b` and 2500 output tokens; 120b is an optional existing model
override. No deployer or relayer key is needed.

Limits: 15-second provider timeout, 128,000-byte provider response, 4096-byte
streamed requests for new routes, 8–400-character template prompts, 24,000-character
raw model output, eight entries per prose list, 600 characters per review or report statement,
12 vaults per report read,
20 milestones and 1000 characters per evidence note. All three tools share the
in-process wallet budget of 5/minute and 40/day. Horizontal deployments enforce
the budget per instance. New responses, including errors, use no-store; rate
limits return Retry-After.

Prompts and raw model responses are never logged or persisted. Tool state stays in
component memory, outside query caches and browser storage. The explicit HAS-19
exception is ordinary template configuration reviewed and saved by the owner;
prompts, raw responses and analysis are not saved with it. Provider retention is
subject to that provider's policy. There is no migration or contract change.

## Verification and rollback

Unit/service and real Route Handler tests cover schema rejection, owner/member
isolation, association, citations, redaction, limits, unchanged database writes and
provider failure. Existing evidence tests cover the public context boundary.
Playwright tests the real wizard and the production-gated `/visual/ai-tools`
fixture: explicit save/reuse, replacement refusal, source links, stale analysis,
session reset, manual fallback, no wallet writes and EN/ES/zh-CN mobile/desktop
snapshots. HTTP is stubbed; this does not prove live wallet approval.

```bash
pnpm --filter @hashvest/web test
pnpm --filter @hashvest/web visual
pnpm agents:sync
pnpm agents:check
pnpm ci:check
```

Playwright never reuses another server. Select an available port if 3100 belongs
to another worktree; PowerShell example:

```powershell
$env:HASHVEST_VISUAL_PORT = '3101'
pnpm --filter @hashvest/web visual
```

Optional live smoke uses synthetic data only, makes six model requests across the
two schemas and three locales, and is skipped in normal CI:

```powershell
cd apps/web
$env:HASHVEST_LIVE_AI = '1'
node --env-file=.env.local node_modules/vitest/vitest.mjs run lib/cloud/ai/provider-live.test.ts
```

Reverting the sections and routes needs no migration or redeployment. Templates
already explicitly saved remain ordinary valid templates.
