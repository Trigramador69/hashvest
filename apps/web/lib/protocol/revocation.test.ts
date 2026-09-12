import {
  BaseError,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
} from "viem";
import { describe, expect, it } from "vitest";

import {
  deriveRevocationPreview,
  readRevocationState,
  type RevocationStateReader,
} from "./revocation";

const revocationAbi = [
  {
    type: "function",
    name: "revocable",
    inputs: [],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
] as const;

function executionError(cause: BaseError) {
  return new ContractFunctionExecutionError(cause, {
    abi: revocationAbi,
    functionName: "revocable",
  });
}

function reader(overrides: Partial<RevocationStateReader> = {}) {
  return {
    revocable: async () => true,
    revoked: async () => false,
    revokedAt: async () => 0n,
    revocationEarnedAmount: async () => 0n,
    ...overrides,
  } satisfies RevocationStateReader;
}

describe("revocation reads", () => {
  it("maps an old vault's unsupported capability to legacy state", async () => {
    const legacyError = executionError(
      new ContractFunctionRevertedError({
        abi: revocationAbi,
        functionName: "revocable",
      }),
    );
    let followUpReads = 0;
    const state = await readRevocationState(
      reader({
        revocable: async () => {
          throw legacyError;
        },
        revoked: async () => {
          followUpReads += 1;
          return true;
        },
      }),
    );

    expect(state).toEqual({
      revocable: false,
      revoked: false,
      revokedAt: 0n,
      revocationEarnedAmount: 0n,
    });
    expect(followUpReads).toBe(0);
  });

  it("maps a zero-data capability response to legacy state", async () => {
    const legacyError = executionError(
      new ContractFunctionZeroDataError({ functionName: "revocable" }),
    );
    await expect(
      readRevocationState(
        reader({
          revocable: async () => {
            throw legacyError;
          },
        }),
      ),
    ).resolves.toEqual({
      revocable: false,
      revoked: false,
      revokedAt: 0n,
      revocationEarnedAmount: 0n,
    });
  });

  it("does not hide an unavailable RPC", async () => {
    const rpcError = new Error("RPC unavailable");
    await expect(
      readRevocationState(
        reader({
          revocable: async () => {
            throw rpcError;
          },
        }),
      ),
    ).rejects.toBe(rpcError);
  });

  it("does not hide a failed read after capability detection", async () => {
    const rpcError = new Error("RPC unavailable");
    await expect(
      readRevocationState(
        reader({
          revoked: async () => {
            throw rpcError;
          },
        }),
      ),
    ).rejects.toBe(rpcError);
  });

  it("returns the authoritative revocation values for a new vault", async () => {
    await expect(
      readRevocationState(
        reader({
          revocable: async () => true,
          revoked: async () => true,
          revokedAt: async () => 123n,
          revocationEarnedAmount: async () => 40n,
        }),
      ),
    ).resolves.toEqual({
      revocable: true,
      revoked: true,
      revokedAt: 123n,
      revocationEarnedAmount: 40n,
    });
  });
});

describe("revocation preview", () => {
  it("preserves claimed and earned-unclaimed amounts", () => {
    expect(
      deriveRevocationPreview({
        totalAllocation: 100n,
        claimedAmount: 20n,
        earnedAmount: 40n,
      }),
    ).toEqual({
      claimedAmount: 20n,
      earnedAmount: 40n,
      earnedUnclaimedAmount: 20n,
      recoveredAmount: 60n,
    });
  });

  it("clamps malformed values to the contract accounting bounds", () => {
    expect(
      deriveRevocationPreview({
        totalAllocation: 100n,
        claimedAmount: 120n,
        earnedAmount: 80n,
      }),
    ).toEqual({
      claimedAmount: 100n,
      earnedAmount: 100n,
      earnedUnclaimedAmount: 0n,
      recoveredAmount: 0n,
    });
  });
});
