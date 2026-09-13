import {
  getAbiItem,
  toFunctionSelector,
  type AbiFunction,
  type Hex,
} from "viem";
import { hashVestFactoryAbi } from "@hashvest/web3";

/**
 * Whether a deployed HashVestFactory can create sponsored grants (HAS-48).
 *
 * The checked-in HSK Testnet deployment predates `createSponsoredGrant`, while
 * the generated ABI declares it. Without a check the wizard builds a call the
 * bytecode cannot answer, and the user sees a bare `reverted` from the
 * simulation with no reason attached.
 *
 * A state-changing function cannot be probed with a read, so this inspects the
 * runtime bytecode for the function's selector. A Solidity dispatcher always
 * embeds the selector of every external function it exposes, so its absence is
 * conclusive: the factory cannot serve the call. Its presence is strong but not
 * a proof — four bytes could coincide with unrelated constant data — so
 * "supported" only means the guard steps aside and the simulation decides, as
 * it does today.
 *
 * Nothing here is authority. HSK remains the authority; this only decides what
 * the UI may promise before asking anyone to sign.
 */

const SPONSORED_GRANT_SELECTOR = toFunctionSelector(
  getAbiItem({
    abi: hashVestFactoryAbi,
    name: "createSponsoredGrant",
  }) as AbiFunction,
);

export type FactorySponsorshipSupport =
  /** The selector is present; let the simulation decide the rest. */
  | "supported"
  /** The selector is absent from real bytecode: this call cannot succeed. */
  | "unsupported"
  /** Nothing was read, or the address holds no code. Never guess from this. */
  | "unknown";

/**
 * Classifies a factory's runtime bytecode.
 *
 * An unread or empty result stays `unknown` rather than collapsing into
 * `unsupported`: a failed read must never be presented as a confirmed fact.
 */
export function readFactorySponsorshipSupport(
  bytecode: Hex | null | undefined,
): FactorySponsorshipSupport {
  if (!bytecode || bytecode === "0x") return "unknown";
  return bytecode
    .toLowerCase()
    .includes(SPONSORED_GRANT_SELECTOR.slice(2).toLowerCase())
    ? "supported"
    : "unsupported";
}

/** The selector the check looks for. Exported for tests and diagnostics. */
export const sponsoredGrantSelector = SPONSORED_GRANT_SELECTOR;
