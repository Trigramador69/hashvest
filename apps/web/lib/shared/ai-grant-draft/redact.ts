/**
 * Prompt and prose redaction (HAS-16).
 *
 * Two jobs, one set of patterns:
 *
 * 1. Nothing sensitive leaves the server. A wallet address, a 32-byte value, a
 *    PEM private key block or a seed phrase is stripped from the prompt before
 *    it is handed to a provider, and each removal is reported so the UI can say
 *    plainly what it refused to pass on.
 * 2. Nothing sensitive comes back. Model prose is redacted on the way in too,
 *    so a title or assumption cannot smuggle an address into the wizard — the
 *    draft schema has no address field, but prose is free text.
 *
 * Redaction is deliberately blunt. A false positive costs the user a word; a
 * false negative costs them a secret.
 */

/** What was removed. The caller maps these to localized, user-facing copy. */
export type RedactionKind =
  "address" | "secret-like" | "hex-value" | "private-key" | "mnemonic";

export type RedactionFinding = {
  kind: RedactionKind;
  /** How many times this kind was removed. The removed value is never kept. */
  count: number;
};

export type RedactionResult = {
  text: string;
  findings: RedactionFinding[];
};

const REDACTED = "[redacted]";

/**
 * BIP39 contains no English function words, so a run of a dozen "wordlike"
 * tokens that includes one of these is prose, not a seed phrase.
 */
const STOPWORDS = new Set([
  "and",
  "are",
  "been",
  "but",
  "for",
  "from",
  "has",
  "have",
  "her",
  "his",
  "its",
  "not",
  "our",
  "out",
  "the",
  "that",
  "them",
  "then",
  "they",
  "this",
  "was",
  "were",
  "will",
  "with",
  "you",
  "your",
]);

/**
 * Ordered longest-first: a 32-byte value must be consumed before the 20-byte
 * pattern can claim its first forty characters.
 */
const PATTERNS: { kind: RedactionKind; pattern: RegExp }[] = [
  {
    kind: "private-key",
    pattern: /-----BEGIN[^-]*PRIVATE KEY-----[\s\S]*?-----END[^-]*-----/gi,
  },
  { kind: "secret-like", pattern: /\b0x[0-9a-fA-F]{64}(?![0-9a-fA-F])/g },
  { kind: "address", pattern: /\b0x[0-9a-fA-F]{40}(?![0-9a-fA-F])/g },
  { kind: "hex-value", pattern: /\b0x[0-9a-fA-F]{12,}(?![0-9a-fA-F])/g },
];

const WORD_RUN = /\b(?:[a-z]{3,8}[ \t]+){11,}[a-z]{3,8}\b/g;

function redactMnemonics(text: string): { text: string; count: number } {
  let count = 0;
  const next = text.replace(WORD_RUN, (run) => {
    const words = run.split(/[ \t]+/);
    if (words.some((word) => STOPWORDS.has(word))) return run;
    count += 1;
    return REDACTED;
  });
  return { text: next, count };
}

/**
 * Strips every sensitive value from `text`.
 *
 * The removed values are discarded, never returned and never logged: only the
 * kind and the number of removals survive.
 */
export function redactText(text: string): RedactionResult {
  let next = text;
  const findings: RedactionFinding[] = [];

  for (const { kind, pattern } of PATTERNS) {
    let count = 0;
    next = next.replace(pattern, () => {
      count += 1;
      return REDACTED;
    });
    if (count) findings.push({ kind, count });
  }

  const mnemonics = redactMnemonics(next);
  next = mnemonics.text;
  if (mnemonics.count)
    findings.push({ kind: "mnemonic", count: mnemonics.count });

  return { text: next, findings };
}

/**
 * Redacts a prompt and collapses its whitespace.
 *
 * Collapsing happens after redaction so a value split across a line break is
 * not reassembled into something the patterns would have caught.
 */
export function redactPrompt(prompt: string): RedactionResult {
  const { text, findings } = redactText(prompt);
  return { text: text.replace(/\s+/g, " ").trim(), findings };
}

/** Whether `text` still holds anything the patterns would remove. */
export function containsSensitiveValue(text: string): boolean {
  return redactText(text).findings.length > 0;
}
