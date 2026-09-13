import type { TranslationKey } from "./dictionaries/en";

/**
 * Translation keys built from values that arrive untyped from the chain.
 *
 * A vault's `strategy` is read as a plain number, so the compiler cannot prove
 * a template key is valid. These helpers narrow it and fall back to TIME for
 * anything unexpected, which keeps an unknown strategy rendering a real label
 * instead of a raw key.
 */
export function strategyKey(
  strategy: number,
  field: "name" | "description",
): TranslationKey {
  const index = strategy === 1 || strategy === 2 ? strategy : 0;
  return `strategy.${index}.${field}`;
}
