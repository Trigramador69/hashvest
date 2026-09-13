/**
 * The prompt sent to the provider (HAS-16).
 *
 * Kept as pure string builders rather than inlined into the provider call so
 * the instructions are reviewable in a diff and testable without a network.
 * Nothing here is a security control on its own — a model can ignore every
 * sentence below. The controls are `redactPrompt` on the way out and
 * `parseAiGrantDraft` + `assertValidPreset` on the way back; these
 * instructions only make the common case cheap and coherent.
 */

import { localeMeta, type Locale } from "../i18n/locales";
import {
  AI_MAX_ALLOCATION,
  AI_MAX_ASSUMPTIONS,
  AI_MAX_MILESTONES,
  AI_MAX_UNSUPPORTED,
} from "./schema";

/**
 * The product vocabulary the draft must speak, taken from the hand-written
 * catalog's authoring contract in ../grant-presets/README.md.
 */
const STRATEGY_BRIEF = [
  "0 = TIME: linear vesting from the grant start, gated by a cliff. No milestones, no reviewer — the vault writes a zero reviewer address for this strategy, so suggesting one would be a lie in the UI.",
  "1 = MILESTONE: nothing unlocks until a reviewer approves a milestone. No vesting schedule at all.",
  "2 = HYBRID: the claimable amount is the smaller of the time-vested and the milestone-approved amount. Both a schedule and milestones are required.",
].join("\n");

export function buildSystemPrompt(locale: Locale): string {
  const language = localeMeta(locale).label;
  return [
    "You draft HashVest grant templates from a short description. You are a drafting aid inside a form, not an agent.",
    "",
    "Return exactly one JSON object matching the supplied schema. No prose outside the JSON.",
    "",
    "Strategies:",
    STRATEGY_BRIEF,
    "",
    "Hard rules:",
    `- Never name, invent, or echo a wallet address, transaction hash, private key, or seed phrase. You cannot choose a beneficiary, reviewer, token, or eligibility provider; a human picks those in the form afterwards.`,
    "- Never describe signing, approving, funding, transferring, claiming, revoking, or deploying. You cannot perform or schedule any of them.",
    "- Never set a start date. Grants start when the issuer submits them.",
    `- allocation is a decimal string of at most ${AI_MAX_ALLOCATION}. Clamp anything larger and say so in "unsupported".`,
    "- timing.cliff and timing.duration are whole numbers of timing.unit seconds. cliff must never exceed duration, and duration must be greater than zero.",
    `- milestones carry whole-number percentages that add up to exactly 100, at most ${AI_MAX_MILESTONES} of them.`,
    "- Strategy 0 requires timing and null milestones. Strategy 1 requires milestones and null timing. Strategy 2 requires both.",
    "",
    `Write "title", "description", milestone titles, "timing.realWorldNote", "assumptions", and "unsupported" in ${language}. Everything else is technical data and stays as specified.`,
    `List at most ${AI_MAX_ASSUMPTIONS} assumptions: every non-obvious choice you made for the user, so they can check it.`,
    `List at most ${AI_MAX_UNSUPPORTED} unsupported items: anything the request asked for that a grant template cannot express. An empty list is correct when there is nothing to report.`,
    "Do not claim guarantees the protocol does not make: a template cannot revoke, claw back, or change terms after creation.",
  ].join("\n");
}

/**
 * Wraps the user's request.
 *
 * `prompt` must already have been through `redactPrompt`; this builder does
 * not redact, so that the single redaction point stays visible at the call
 * site rather than being implied here.
 */
export function buildUserPrompt(redactedPrompt: string): string {
  return `Draft a grant template for this request:\n\n${redactedPrompt}`;
}
