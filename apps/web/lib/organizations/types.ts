export type Organization = {
  id: string;
  name: string;
  createdByWallet: string;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationMember = {
  id: string;
  organizationId: string;
  walletAddress: string;
  displayName: string;
  roleLabel: string | null;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationGrant = {
  organizationId: string;
  chainId: 133;
  vaultAddress: string;
  description: string | null;
  templateKey: string | null;
  createdByWallet: string;
  createdAt: string;
};

export type OrganizationMembership = Pick<
  OrganizationMember,
  "id" | "walletAddress" | "displayName" | "roleLabel" | "isOwner"
>;

export type OrganizationSummary = Organization & {
  memberCount: number;
  grantCount: number;
};

export type OrganizationDetail = {
  organization: OrganizationSummary;
  membership: OrganizationMembership;
};

export type OrganizationGrantContext = {
  organization: Organization;
  membership: OrganizationMembership;
  grant: OrganizationGrant;
};

export type Session = {
  walletAddress: string;
  chainId: 133;
  expiresAt: string;
};

export type SessionResponse =
  { authenticated: false } | { authenticated: true; session: Session };
