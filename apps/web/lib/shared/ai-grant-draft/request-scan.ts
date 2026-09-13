/**
 * What the request asked for that a draft cannot do (HAS-16).
 *
 * Runs on the user's own words, before a provider ever sees them, and on both
 * the model and the offline path. It produces adjustment codes rather than
 * sentences so the UI can say it in the active locale.
 *
 * Two things it deliberately does *not* flag: "approve" and "claim". Reviewer
 * approval and beneficiary claims are the product's own vocabulary — a grant
 * description is expected to mention them — so treating them as suspicious
 * would bury a real warning under noise. The guarantee that a draft never
 * performs them is stated unconditionally in the UI instead of being inferred
 * from wording.
 */

import type { AiAdjustmentCode } from "./normalize";
import { redactText } from "./redact";

/**
 * Verbs that only make sense as an instruction to move value now.
 *
 * Bounded with `\p{L}` lookarounds rather than `\b`, because `\b` is ASCII
 * only: it does not close after an accented letter, so a `\b`-terminated
 * pattern would never match "firmá". The Chinese entries are unbounded,
 * because Chinese is not written with spaces.
 */
const ACTION_SOURCES = [
  "sign|signature|signing",
  "transfer|transfers|transferring",
  "send|sends|sending",
  "withdraw|withdrawal",
  "revoke|revocation",
  "claw\\s?back",
  "deploy|deployment",
  "broadcast|execute",
  "firm[aá]r?|firma",
  "transfer[ií]r?",
  "env[ií]ar?|env[ií]a",
  "retirar|revocar|desplegar|ejecutar",
];

const ACTION_PATTERNS = [
  ...ACTION_SOURCES.map(
    (source) =>
      new RegExp(`(?<![\\p{L}\\p{N}])(?:${source})(?![\\p{L}\\p{N}])`, "iu"),
  ),
  /(签名|签署|转账|转帐|发送|提现|撤销|部署|执行)/,
];

/**
 * Classifies a request into the notes the draft owes the user.
 *
 * Returns codes in a stable order so a response is deterministic for a given
 * prompt — the offline path depends on that for its tests.
 */
export function scanRequest(prompt: string): AiAdjustmentCode[] {
  const codes: AiAdjustmentCode[] = [];
  const { findings } = redactText(prompt);

  if (
    findings.some(
      (finding) => finding.kind === "address" || finding.kind === "hex-value",
    )
  )
    codes.push("requestAddressIgnored");
  if (
    findings.some(
      (finding) =>
        finding.kind === "secret-like" ||
        finding.kind === "private-key" ||
        finding.kind === "mnemonic",
    )
  )
    codes.push("requestSecretIgnored");
  if (ACTION_PATTERNS.some((pattern) => pattern.test(prompt)))
    codes.push("requestActionIgnored");

  return codes;
}
