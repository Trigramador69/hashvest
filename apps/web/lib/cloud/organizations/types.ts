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

export type AuthNonceRow = {
  nonce: string;
  wallet_address: string;
  domain: string;
  uri: string;
  chain_id: 133;
  message: string;
  issued_at: string;
  expires_at: string;
  used_at: string | null;
};

export type OrganizationRow = {
  id: string;
  name: string;
  created_by_wallet: string;
  created_at: string;
  updated_at: string;
};

export type OrganizationMemberRow = {
  id: string;
  organization_id: string;
  wallet_address: string;
  display_name: string;
  role_label: string | null;
  is_owner: boolean;
  created_at: string;
  updated_at: string;
};

export type OrganizationGrantRow = {
  organization_id: string;
  chain_id: 133;
  vault_address: string;
  description: string | null;
  template_key: string | null;
  created_by_wallet: string;
  created_at: string;
};

type TableDefinition<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      auth_nonces: TableDefinition<
        AuthNonceRow,
        Omit<AuthNonceRow, "used_at"> & { used_at?: string | null },
        Partial<Pick<AuthNonceRow, "used_at">>
      >;
      organizations: TableDefinition<
        OrganizationRow,
        Omit<OrganizationRow, "id" | "created_at" | "updated_at"> &
          Partial<Pick<OrganizationRow, "id" | "created_at" | "updated_at">>,
        Partial<Pick<OrganizationRow, "name" | "updated_at">>
      >;
      organization_members: TableDefinition<
        OrganizationMemberRow,
        Omit<OrganizationMemberRow, "id" | "created_at" | "updated_at"> &
          Partial<
            Pick<OrganizationMemberRow, "id" | "created_at" | "updated_at">
          >,
        Partial<
          Pick<
            OrganizationMemberRow,
            "display_name" | "role_label" | "updated_at"
          >
        >
      >;
      organization_grants: TableDefinition<
        OrganizationGrantRow,
        Omit<OrganizationGrantRow, "created_at"> &
          Partial<Pick<OrganizationGrantRow, "created_at">>,
        Partial<Pick<OrganizationGrantRow, "description" | "template_key">>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
