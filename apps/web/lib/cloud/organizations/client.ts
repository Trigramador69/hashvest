import type {
  Organization,
  OrganizationDetail,
  OrganizationGrant,
  OrganizationGrantContext,
  OrganizationMember,
  OrganizationMilestoneEvidence,
  OrganizationMilestoneEvidenceInput,
  OrganizationSummary,
  OrganizationTemplate,
  SponsoredClaimPolicy,
  SponsoredClaimRequest,
  SessionResponse,
} from "./types";
import type { OrganizationTemplateContent } from "../../shared/grant-presets/organization-template";

export class OrganizationApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "OrganizationApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : "The request failed. Please try again.";
    throw new OrganizationApiError(response.status, message);
  }
  return body as T;
}

export const organizationApi = {
  getSession: () => request<SessionResponse>("/api/auth/session"),
  requestNonce: (address: string, chainId: number) =>
    request<{ message: string; nonce: string; expiresAt: string }>(
      "/api/auth/nonce",
      {
        method: "POST",
        body: JSON.stringify({ address, chainId }),
      },
    ),
  verifySignature: (message: string, signature: string) =>
    request<{ authenticated: true; walletAddress: string; chainId: 133 }>(
      "/api/auth/verify",
      {
        method: "POST",
        body: JSON.stringify({ message, signature }),
      },
    ),
  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),
  getOrganizations: () =>
    request<{ organizations: OrganizationSummary[] }>("/api/organizations"),
  createOrganization: (input: {
    name: string;
    displayName: string;
    roleLabel: string | null;
  }) =>
    request<{ organization: Organization }>("/api/organizations", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  getOrganization: (organizationId: string) =>
    request<OrganizationDetail>(`/api/organizations/${organizationId}`),
  getMembers: (organizationId: string) =>
    request<{ members: OrganizationMember[] }>(
      `/api/organizations/${organizationId}/members`,
    ),
  addMember: (
    organizationId: string,
    input: {
      walletAddress: string;
      displayName: string;
      roleLabel: string | null;
    },
  ) =>
    request<{ member: OrganizationMember }>(
      `/api/organizations/${organizationId}/members`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  updateMember: (
    organizationId: string,
    memberId: string,
    input: { displayName: string; roleLabel: string | null },
  ) =>
    request<{ member: OrganizationMember }>(
      `/api/organizations/${organizationId}/members/${memberId}`,
      { method: "PATCH", body: JSON.stringify(input) },
    ),
  removeMember: (organizationId: string, memberId: string) =>
    request<{ ok: true }>(
      `/api/organizations/${organizationId}/members/${memberId}`,
      { method: "DELETE" },
    ),
  getGrants: (organizationId: string) =>
    request<{ grants: OrganizationGrant[] }>(
      `/api/organizations/${organizationId}/grants`,
    ),
  linkGrant: (
    organizationId: string,
    input: {
      chainId: 133;
      vaultAddress: string;
      description: string | null;
      templateKey?: string | null;
    },
  ) =>
    request<{ grant: OrganizationGrant }>(
      `/api/organizations/${organizationId}/grants`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  getGrantEvidence: (organizationId: string, vaultAddress: string) =>
    request<{ evidence: OrganizationMilestoneEvidence[] }>(
      `/api/organizations/${organizationId}/grants/${vaultAddress}/evidence`,
    ),
  upsertGrantEvidence: (
    organizationId: string,
    vaultAddress: string,
    milestoneIndex: number,
    input: OrganizationMilestoneEvidenceInput,
  ) =>
    request<{ evidence: OrganizationMilestoneEvidence }>(
      `/api/organizations/${organizationId}/grants/${vaultAddress}/milestones/${milestoneIndex}/evidence`,
      { method: "PUT", body: JSON.stringify(input) },
    ),
  getTemplates: (
    organizationId: string,
    options: { includeArchived?: boolean } = {},
  ) =>
    request<{ templates: OrganizationTemplate[] }>(
      `/api/organizations/${organizationId}/templates${options.includeArchived ? "?include=archived" : ""}`,
    ),
  getTemplate: (organizationId: string, templateId: string) =>
    request<{ template: OrganizationTemplate }>(
      `/api/organizations/${organizationId}/templates/${templateId}`,
    ),
  createTemplate: (
    organizationId: string,
    input: OrganizationTemplateContent,
  ) =>
    request<{ template: OrganizationTemplate }>(
      `/api/organizations/${organizationId}/templates`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  updateTemplate: (
    organizationId: string,
    templateId: string,
    input: { template: OrganizationTemplateContent; expectedVersion: number },
  ) =>
    request<{ template: OrganizationTemplate }>(
      `/api/organizations/${organizationId}/templates/${templateId}`,
      { method: "PATCH", body: JSON.stringify(input) },
    ),
  archiveTemplate: (organizationId: string, templateId: string) =>
    request<{ ok: true }>(
      `/api/organizations/${organizationId}/templates/${templateId}`,
      { method: "DELETE" },
    ),
  getGrantContext: (vaultAddress: string) =>
    request<{ context: OrganizationGrantContext | null }>(
      `/api/grants/${vaultAddress}/context`,
    ),
  getSponsorshipPolicy: (organizationId: string) =>
    request<
      SponsoredClaimPolicy & {
        relayerAddress: string | null;
        relayerConfigured: boolean;
      }
    >(`/api/organizations/${organizationId}/sponsorship`),
  updateSponsorshipPolicy: (
    organizationId: string,
    input: { enabled: boolean; maxClaims: number },
  ) =>
    request<
      SponsoredClaimPolicy & {
        relayerAddress: string | null;
        relayerConfigured: boolean;
      }
    >(`/api/organizations/${organizationId}/sponsorship`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  submitSponsoredClaim: (
    organizationId: string,
    vaultAddress: string,
    input: {
      amount: string;
      nonce: string;
      deadline: string;
      relayerAddress: string;
      signature: string;
    },
  ) =>
    request<{ request: SponsoredClaimRequest }>(
      `/api/organizations/${organizationId}/grants/${vaultAddress}/sponsored-claim`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  getSponsoredClaimStatus: (
    organizationId: string,
    vaultAddress: string,
    requestId: string,
  ) =>
    request<{ request: SponsoredClaimRequest }>(
      `/api/organizations/${organizationId}/grants/${vaultAddress}/sponsored-claim?requestId=${encodeURIComponent(requestId)}`,
    ),
  getSponsoredClaimByNonce: (
    organizationId: string,
    vaultAddress: string,
    nonce: string,
  ) =>
    request<{ request: SponsoredClaimRequest | null }>(
      `/api/organizations/${organizationId}/grants/${vaultAddress}/sponsored-claim?nonce=${encodeURIComponent(nonce)}`,
    ),
};
