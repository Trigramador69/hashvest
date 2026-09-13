export const MILESTONE_EVIDENCE_TYPES = [
  "github_pr",
  "github_commit",
  "deployment",
  "document",
  "hsk_transaction",
  "ipfs",
] as const;

export type MilestoneEvidenceType = (typeof MILESTONE_EVIDENCE_TYPES)[number];

export const MILESTONE_EVIDENCE_URL_MAX_LENGTH = 2048;
export const MILESTONE_EVIDENCE_NOTE_MAX_LENGTH = 1000;

export function isMilestoneEvidenceType(
  value: unknown,
): value is MilestoneEvidenceType {
  return (
    typeof value === "string" &&
    (MILESTONE_EVIDENCE_TYPES as readonly string[]).includes(value)
  );
}

/**
 * Evidence is rendered as an external link, so both server and browser
 * callers accept HTTPS and the IPFS protocol only. IPFS evidence may also
 * use an HTTPS gateway URL.
 */
export function isSafeMilestoneEvidenceUrl(
  value: string,
  evidenceType?: MilestoneEvidenceType,
) {
  if (
    !value ||
    value.length > MILESTONE_EVIDENCE_URL_MAX_LENGTH ||
    value.includes("\n") ||
    value.includes("\r")
  )
    return false;
  try {
    const url = new URL(value);
    if (!url.hostname || url.username || url.password) return false;
    if (!/[a-z0-9]/i.test(url.hostname)) return false;
    if (url.protocol === "https:") return true;
    return url.protocol === "ipfs:" && evidenceType === "ipfs";
  } catch {
    return false;
  }
}

/** Returns a renderable href, or null so the UI never creates an unsafe `<a>`. */
export function safeMilestoneEvidenceHref(
  value: string,
  evidenceType?: MilestoneEvidenceType,
) {
  return isSafeMilestoneEvidenceUrl(value, evidenceType) ? value : null;
}
