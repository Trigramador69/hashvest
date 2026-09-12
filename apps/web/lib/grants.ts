import {
  BaseError,
  formatUnits,
  getAddress,
  isAddress,
  parseUnits,
  zeroAddress,
  type Address,
} from "viem";

export const strategies = [
  "Time vesting",
  "Milestone grant",
  "Hybrid",
] as const;
export const strategyDescriptions = [
  "Unlock linearly over time. A cliff delays access without restarting the schedule.",
  "Unlock fixed allocations as your reviewer approves each milestone.",
  "Unlock the smaller of time vested and approved milestone amounts. Both conditions apply.",
] as const;

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function tokenAmount(value: bigint, decimals: number) {
  const exact = formatUnits(value, decimals);
  const [whole, fraction = ""] = exact.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (!fraction) return grouped;
  const displayed = fraction.slice(0, 6).replace(/0+$/, "");
  if (value !== 0n && whole === "0" && !displayed) return exact;
  return `${grouped}${displayed ? `.${displayed}` : ""}${fraction.length > 6 ? "…" : ""}`;
}

export function percent(value: bigint, total: bigint) {
  return total === 0n
    ? 0
    : Math.min(100, Number((value * 10000n) / total) / 100);
}

export function dateLabel(timestamp: bigint) {
  const milliseconds = Number(timestamp) * 1000;
  if (!Number.isSafeInteger(milliseconds) || milliseconds > 8640000000000000)
    return `Unix ${timestamp}`;
  return new Date(milliseconds).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function errorMessage(error: unknown) {
  if (error instanceof BaseError) return error.shortMessage;
  return error instanceof Error
    ? error.message
    : "The request failed. Please try again.";
}

export function validParty(value: string) {
  const normalized = normalizeAddress(value);
  return Boolean(normalized && normalized.toLowerCase() !== zeroAddress);
}

export function normalizeAddress(value: string): Address | undefined {
  try {
    return isAddress(value) ? getAddress(value) : undefined;
  } catch {
    return undefined;
  }
}

export function parseAllocation(value: string, decimals: number): bigint {
  if (!/^\d+(\.\d+)?$/.test(value))
    throw new Error("Enter a positive decimal token amount.");
  if ((value.split(".")[1]?.length ?? 0) > decimals)
    throw new Error(`This token supports at most ${decimals} decimal places.`);
  const amount = parseUnits(value, decimals);
  if (amount <= 0n || amount > 2n ** 256n - 1n)
    throw new Error("Token amount is outside the supported range.");
  return amount;
}
