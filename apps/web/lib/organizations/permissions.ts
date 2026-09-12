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
  },
): ProtocolRoleResolution {
  const isIssuer = sameAddress(walletAddress, grant.issuer);
  const isBeneficiary = sameAddress(walletAddress, grant.beneficiary);
  const isReviewer = sameAddress(walletAddress, grant.reviewer);
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

export function findMemberByWallet<T extends { walletAddress: string }>(
  members: readonly T[] | undefined,
  walletAddress: string,
) {
  return members?.find(
    (member) =>
      member.walletAddress.toLowerCase() === walletAddress.toLowerCase(),
  );
}
