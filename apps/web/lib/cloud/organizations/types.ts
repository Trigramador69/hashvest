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
  /** Null while active. Archived templates are returned only for provenance. */
  archivedAt: string | null;
};

export type SponsoredActionType = "claim" | "review";

export type SponsorshipPolicy = {
  organizationId: string;
  enabled: boolean;
  allowedActions: SponsoredActionType[];
  allowedVaults: string[];
  maxActions: number;
  usedActions: number;
  remainingActions: number;
  maxActionsPerWalletPerDay: number;
  maxGasBudgetWei: string;
  reservedGasWei: string;
  spentGasWei: string;
  remainingGasWei: string;
  updatedByWallet: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SponsorshipPolicyRow = {
  organization_id: string;
  enabled: boolean;
  allowed_actions: SponsoredActionType[];
  allowed_vaults: string[];
  max_actions: number;
  used_actions: number;
  max_actions_per_wallet_per_day: number;
  max_gas_budget_wei: string;
  reserved_gas_wei: string;
  spent_gas_wei: string;
  updated_by_wallet: string | null;
  created_at: string;
  updated_at: string;
};

export type SponsoredActionRequestStatus =
  | "requested"
  | "processing"
  | "submitted"
  | "confirmed"
  | "failed"
  | "abandoned";

export type SponsoredActionRequestRow = {
  id: string;
  organization_id: string;
  chain_id: 133;
  vault_address: string;
  action_type: SponsoredActionType;
  actor_wallet: string;
  claim_amount: string | null;
  milestone_index: number | null;
  nonce: string;
  deadline: string;
  relayer_address: string;
  signature: string;
  gas_limit: string;
  gas_price: string;
  estimated_gas_cost_wei: string;
  actual_gas_cost_wei: string | null;
  gas_used: string | null;
  effective_gas_price: string | null;
  block_number: string | null;
  status: SponsoredActionRequestStatus;
  attempts: number;
  processing_at: string | null;
  tx_hash: string | null;
  failure_code: string | null;
  failure_message: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SponsoredActionRequest = {
  id: string;
  organizationId: string;
  chainId: 133;
  vaultAddress: string;
  actionType: SponsoredActionType;
  actorWallet: string;
  claimAmount: string | null;
  milestoneIndex: number | null;
  nonce: string;
  deadline: string;
  relayerAddress: string;
  gasLimit: string;
  gasPrice: string;
  estimatedGasCostWei: string;
  actualGasCostWei: string | null;
  gasUsed: string | null;
  effectiveGasPrice: string | null;
  blockNumber: string | null;
  status: SponsoredActionRequestStatus;
  attempts: number;
  processingAt: string | null;
  txHash: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  confirmedAt: string | null;
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

/**
 * A member has seen one derived notification. Product context only: the
 * notification itself is derived from live GrantVault state and never stored,
 * so a row here can never contradict the chain.
 */
export type OrganizationNotificationRead = {
  organizationId: string;
  memberWallet: string;
  /** The derived identity of the observed state fact. */
  notificationKey: string;
  chainId: 133;
  vaultAddress: string;
  readAt: string;
};

export type OrganizationNotificationReadInput = Pick<
  OrganizationNotificationRead,
  "notificationKey" | "vaultAddress"
>;

export type OrganizationNotificationReadRow = {
  organization_id: string;
  member_wallet: string;
  notification_key: string;
  chain_id: 133;
  vault_address: string;
  read_at: string;
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
      organization_notification_reads: TableDefinition<
        OrganizationNotificationReadRow,
        Omit<OrganizationNotificationReadRow, "read_at"> &
          Partial<Pick<OrganizationNotificationReadRow, "read_at">>,
        Partial<Pick<OrganizationNotificationReadRow, "read_at">>
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
      organization_sponsorship_policies: TableDefinition<
        SponsorshipPolicyRow,
        Omit<SponsorshipPolicyRow, "created_at" | "updated_at"> &
          Partial<Pick<SponsorshipPolicyRow, "created_at" | "updated_at">>,
        Partial<
          Pick<
            SponsorshipPolicyRow,
            | "enabled"
            | "allowed_actions"
            | "allowed_vaults"
            | "max_actions"
            | "max_actions_per_wallet_per_day"
            | "max_gas_budget_wei"
            | "updated_by_wallet"
            | "updated_at"
          >
        >
      >;
      sponsored_action_requests: TableDefinition<
        SponsoredActionRequestRow,
        Omit<
          SponsoredActionRequestRow,
          "id" | "created_at" | "updated_at" | "attempts" | "processing_at"
        > &
          Partial<
            Pick<
              SponsoredActionRequestRow,
              "id" | "created_at" | "updated_at" | "attempts" | "processing_at"
            >
          >,
        Partial<
          Pick<
            SponsoredActionRequestRow,
            | "status"
            | "attempts"
            | "processing_at"
            | "tx_hash"
            | "actual_gas_cost_wei"
            | "gas_used"
            | "effective_gas_price"
            | "block_number"
            | "failure_code"
            | "failure_message"
            | "confirmed_at"
            | "updated_at"
          >
        >
      >;
    };
    Views: Record<string, never>;
    Functions: {
      reserve_sponsored_action: {
        Args: {
          p_organization_id: string;
          p_chain_id: 133;
          p_vault_address: string;
          p_action_type: SponsoredActionType;
          p_actor_wallet: string;
          p_claim_amount: string | null;
          p_milestone_index: number | null;
          p_nonce: string;
          p_deadline: string;
          p_relayer_address: string;
          p_signature: string;
          p_gas_limit: string;
          p_gas_price: string;
          p_estimated_gas_cost_wei: string;
        };
        Returns: SponsoredActionRequestRow[];
      };
      lease_sponsored_action: {
        Args: { p_request_id: string };
        Returns: SponsoredActionRequestRow[];
      };
      settle_sponsored_action: {
        Args: {
          p_request_id: string;
          p_status: "confirmed" | "failed";
          p_gas_used: string;
          p_effective_gas_price: string;
          p_actual_gas_cost_wei: string;
          p_block_number: string;
          p_failure_code: string | null;
          p_failure_message: string | null;
        };
        Returns: SponsoredActionRequestRow[];
      };
      expire_sponsored_actions: {
        Args: { p_organization_id: string };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
