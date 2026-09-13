/**
 * The HashVest Protocol integration surface.
 *
 * Everything exported here is chain-facing and free of any dependency on the
 * Cloud layer, so it is the set that can become `@hashvest/protocol` when the
 * protocol is extracted (HAS-38). Additions are checked against
 * `protocol-surface.json` by `pnpm boundary:check`.
 *
 * See docs/architecture.md.
 */
export { hskChains, hskMainnet, hskTestnet, type HskChain } from "./chains/hsk";
export {
  hashVestFactoryAbi,
  grantVaultAbi,
  sponsoredGrantVaultAbi,
  demoTokenAbi,
  demoEligibilityProviderAbi,
  eligibilityProviderAbi,
} from "./abis";
export { testnetDeployment } from "./addresses";
export { addressExplorerUrl, transactionExplorerUrl } from "./explorer";
export {
  SPONSORED_ACTION_DOMAIN,
  SPONSORED_CLAIM_DOMAIN,
  SPONSORED_CLAIM_TYPES,
  SPONSORED_REVIEW_TYPES,
  type SponsoredClaimMessage,
  type SponsoredReviewMessage,
} from "./sponsored-claims";
