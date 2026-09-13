import type { OrganizationTemplateDefinition } from "../../shared/grant-presets/organization-template";
import type { MilestoneEvidenceType } from "../../shared/milestone-evidence";

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

/**
 * An organization-owned grant template: draft configuration metadata, never
 * vault state or permission. See docs/organization-templates.md.
 */
export type OrganizationTemplate = OrganizationTemplateDefinition & {
  organizationId: string;
  createdByWallet: string;
  updatedByWallet: string;
  createdAt: string;
  updatedAt: string;
};

export type SponsoredClaimPolicy = {
  organizationId: string;
  enabled: boolean;
  maxClaims: number;
  usedClaims: number;
  remainingClaims: number;
  updatedByWallet: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SponsoredClaimPolicyRow = {
  organization_id: string;
  enabled: boolean;
  max_claims: number;
  used_claims: number;
  updated_by_wallet: string | null;
  created_at: string;
  updated_at: string;
};

export type SponsoredClaimRequestStatus =
  "requested" | "processing" | "submitted" | "confirmed" | "failed";

export type SponsoredClaimRequestRow = {
  id: string;
  organization_id: string;
  chain_id: 133;
  vault_address: string;
  beneficiary_wallet: string;
  amount: string;
  nonce: string;
  deadline: string;
  relayer_address: string;
  signature: string;
  status: SponsoredClaimRequestStatus;
  attempts: number;
  processing_at: string | null;
  tx_hash: string | null;
  failure_code: string | null;
  failure_message: string | null;
  created_at: string;
  updated_at: string;
};

export type SponsoredClaimRequest = {
  id: string;
  organizationId: string;
  chainId: 133;
  vaultAddress: string;
  beneficiaryWallet: string;
  amount: string;
  nonce: string;
  deadline: string;
  relayerAddress: string;
  status: SponsoredClaimRequestStatus;
  attempts: number;
  processingAt: string | null;
  txHash: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: string;
  updatedAt: string;
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

export type OrganizationMilestoneEvidence = {
  chainId: 133;
  vaultAddress: string;
  milestoneIndex: number;
  evidenceUrl: string;
  evidenceType: MilestoneEvidenceType;
  note: string | null;
  submittedByWallet: string;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationMilestoneEvidenceInput = Pick<
  OrganizationMilestoneEvidence,
  "evidenceUrl" | "evidenceType" | "note"
>;

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

export type OrganizationMilestoneEvidenceRow = {
  chain_id: 133;
  vault_address: string;
  milestone_index: number;
  evidence_url: string;
  evidence_type: MilestoneEvidenceType;
  note: string | null;
  submitted_by_wallet: string;
  created_at: string;
  updated_at: string;
};

/**
 * A milestone in a stored template: a title and a whole-number share of the
 * allocation. Never a token amount (docs/organization-templates.md).
 */
export type OrganizationTemplateMilestoneRow = {
  title: string;
  percentOfAllocation: number;
};

export type OrganizationTemplateRow = {
  id: string;
  organization_id: string;
  version: number;
  name: string;
  description: string | null;
  strategy: 0 | 1 | 2;
  schedule_unit_seconds: 60 | 3600 | 86400 | null;
  cliff_units: number | null;
  duration_units: number | null;
  milestones: OrganizationTemplateMilestoneRow[] | null;
  allocation_suggestion: string | null;
  default_reviewer_member_id: string | null;
  created_by_wallet: string;
  updated_by_wallet: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

/** Every column a template write may set; identity and audit columns are excluded. */
export type OrganizationTemplateContentRow = Pick<
  OrganizationTemplateRow,
  | "name"
  | "description"
  | "strategy"
  | "schedule_unit_seconds"
  | "cliff_units"
  | "duration_units"
  | "milestones"
  | "allocation_suggestion"
  | "default_reviewer_member_id"
>;

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
      organization_grant_milestone_evidence: TableDefinition<
        OrganizationMilestoneEvidenceRow,
        Omit<OrganizationMilestoneEvidenceRow, "created_at" | "updated_at"> &
          Partial<
            Pick<OrganizationMilestoneEvidenceRow, "created_at" | "updated_at">
          >,
        Partial<
          Pick<
            OrganizationMilestoneEvidenceRow,
            | "evidence_url"
            | "evidence_type"
            | "note"
            | "submitted_by_wallet"
            | "updated_at"
          >
        >
      >;
      organization_templates: TableDefinition<
        OrganizationTemplateRow,
        OrganizationTemplateContentRow &
          Pick<
            OrganizationTemplateRow,
            "organization_id" | "created_by_wallet" | "updated_by_wallet"
          > &
          Partial<
            Pick<
              OrganizationTemplateRow,
              "id" | "version" | "created_at" | "updated_at" | "archived_at"
            >
          >,
        Partial<
          OrganizationTemplateContentRow &
            Pick<
              OrganizationTemplateRow,
              "version" | "updated_by_wallet" | "updated_at" | "archived_at"
            >
        >
      >;
      sponsored_claim_policies: TableDefinition<
        SponsoredClaimPolicyRow,
        Omit<SponsoredClaimPolicyRow, "created_at" | "updated_at"> &
          Partial<Pick<SponsoredClaimPolicyRow, "created_at" | "updated_at">>,
        Partial<
          Pick<
            SponsoredClaimPolicyRow,
            "enabled" | "max_claims" | "updated_by_wallet" | "updated_at"
          >
        >
      >;
      sponsored_claim_requests: TableDefinition<
        SponsoredClaimRequestRow,
        Omit<
          SponsoredClaimRequestRow,
          "id" | "created_at" | "updated_at" | "attempts" | "processing_at"
        > &
          Partial<
            Pick<
              SponsoredClaimRequestRow,
              "id" | "created_at" | "updated_at" | "attempts" | "processing_at"
            >
          >,
        Partial<
          Pick<
            SponsoredClaimRequestRow,
            | "status"
            | "attempts"
            | "processing_at"
            | "tx_hash"
            | "failure_code"
            | "failure_message"
            | "updated_at"
          >
        >
      >;
    };
    Views: Record<string, never>;
    Functions: {
      reserve_sponsored_claim: {
        Args: {
          p_organization_id: string;
          p_chain_id: 133;
          p_vault_address: string;
          p_beneficiary_wallet: string;
          p_amount: string;
          p_nonce: string;
          p_deadline: string;
          p_relayer_address: string;
          p_signature: string;
        };
        Returns: SponsoredClaimRequestRow[];
      };
      claim_sponsored_request: {
        Args: { p_request_id: string };
        Returns: SponsoredClaimRequestRow[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
