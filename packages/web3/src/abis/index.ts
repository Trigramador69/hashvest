/**
 * ABI for the scaffold-only DevelopmentRegistry contract.
 *
 * Keep this small and in sync with packages/contracts/src/DevelopmentRegistry.sol.
 */
export const developmentRegistryAbi = [
  {
    type: "function",
    name: "version",
    inputs: [],
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "pure",
  },
] as const;
