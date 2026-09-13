/**
 * Protocol roles are derived from GrantVault state alone. Organization
 * membership and presentation role labels never participate; see
 * docs/architecture.md.
 */
export type ProtocolRole = "Issuer" | "Beneficiary" | "Reviewer";

export type ProtocolRoleResolution = {
  isIssuer: boolean;
  isBeneficiary: boolean;
  isReviewer: boolean;
  roles: ProtocolRole[];
};

function sameAddress(left: string | undefined, right: string | undefined) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

export function resolveProtocolRoles(
  walletAddress: string | undefined,
  grant: {
    issuer: string;
    beneficiary: string;
    reviewer: string;
    reviewers?: readonly string[] | string[];
  },
): ProtocolRoleResolution {
  const isIssuer = sameAddress(walletAddress, grant.issuer);
  const isBeneficiary = sameAddress(walletAddress, grant.beneficiary);
  const isReviewer = Boolean(
    sameAddress(walletAddress, grant.reviewer) ||
    (grant.reviewers &&
      grant.reviewers.some((rev) => sameAddress(walletAddress, rev))),
  );
  return {
    isIssuer,
    isBeneficiary,
    isReviewer,
    roles: [
      isIssuer && "Issuer",
      isBeneficiary && "Beneficiary",
      isReviewer && "Reviewer",
    ].filter((role): role is ProtocolRole => Boolean(role)),
  };
}
