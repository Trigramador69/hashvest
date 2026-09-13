/**
 * Data access for organization-owned grant templates (HAS-12).
 *
 * Every function takes an already-authenticated workspace access value, which
 * the server wrappers in ./server.ts build from the verified session. Owner-only
 * mutation is enforced here as well as by those wrappers, so a future caller
 * cannot write a template by forgetting a check at the route. Every query is
 * filtered by organization, so a template id from another organization behaves
 * exactly like one that does not exist.
 *
 * The client is passed in rather than constructed, which keeps this module
 * free of server-only imports and testable. Relative imports for the same
 * reason. See docs/organization-templates.md.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../shared/api-error";
import type { OrganizationTemplateContent } from "../../shared/grant-presets/organization-template";
import type {
  Database,
  OrganizationMembership,
  OrganizationTemplate,
  OrganizationTemplateContentRow,
  OrganizationTemplateRow,
} from "./types";
import { validateUuid } from "./validation";

export type TemplateAccess = {
  supabase: SupabaseClient<Database>;
  organizationId: string;
  membership: Pick<OrganizationMembership, "isOwner">;
  /** The verified session wallet. Authorship is taken from here, never from input. */
  walletAddress: string;
};

const POSTGRES_UNIQUE_VIOLATION = "23505";
const POSTGRES_FOREIGN_KEY_VIOLATION = "23503";
const POSTGRES_CHECK_VIOLATION = "23514";

function databaseUnavailable(): ApiError {
  return new ApiError(503, "Workspace data is temporarily unavailable.");
}

function templateNotFound(): ApiError {
  return new ApiError(404, "Template not found.");
}

function assertOwner(access: TemplateAccess) {
  if (!access.membership.isOwner)
    throw new ApiError(403, "Only the organization owner can do that.");
}

/** Maps a failed write to the response a caller can act on. */
function writeError(error: { code?: string } | null): ApiError {
  switch (error?.code) {
    case POSTGRES_UNIQUE_VIOLATION:
      return new ApiError(409, "An active template already uses that name.");
    case POSTGRES_FOREIGN_KEY_VIOLATION:
      return new ApiError(
        400,
        "The default reviewer must be a member of this organization.",
      );
    case POSTGRES_CHECK_VIOLATION:
      return new ApiError(400, "Template data is invalid.");
    default:
      return databaseUnavailable();
  }
}

function toContentRow(
  content: OrganizationTemplateContent,
): OrganizationTemplateContentRow {
  return {
    name: content.name,
    description: content.description,
    strategy: content.strategy,
    schedule_unit_seconds: content.schedule?.unitSeconds ?? null,
    cliff_units: content.schedule?.cliffUnits ?? null,
    duration_units: content.schedule?.durationUnits ?? null,
    milestones: content.milestones,
    allocation_suggestion: content.allocationSuggestion,
    default_reviewer_member_id: content.defaultReviewerMemberId,
  };
}

function mapTemplate(row: OrganizationTemplateRow): OrganizationTemplate {
  return {
    id: row.id,
    organizationId: row.organization_id,
    version: row.version,
    name: row.name,
    description: row.description,
    strategy: row.strategy,
    schedule:
      row.schedule_unit_seconds === null ||
      row.cliff_units === null ||
      row.duration_units === null
        ? null
        : {
            unitSeconds: row.schedule_unit_seconds,
            cliffUnits: row.cliff_units,
            durationUnits: row.duration_units,
          },
    milestones: row.milestones,
    allocationSuggestion: row.allocation_suggestion,
    defaultReviewerMemberId: row.default_reviewer_member_id,
    createdByWallet: row.created_by_wallet,
    updatedByWallet: row.updated_by_wallet,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Active templates, for any member. Archived templates are never listed. */
export async function listOrganizationTemplates(
  access: TemplateAccess,
): Promise<OrganizationTemplate[]> {
  const { data, error } = await access.supabase
    .from("organization_templates")
    .select("*")
    .eq("organization_id", access.organizationId)
    .is("archived_at", null)
    .order("name", { ascending: true });
  if (error) throw databaseUnavailable();
  return data.map(mapTemplate);
}

/** One active template, for any member, typically to apply it to the wizard. */
export async function getOrganizationTemplate(
  access: TemplateAccess,
  templateId: string,
): Promise<OrganizationTemplate> {
  const id = validateUuid(templateId, "Template ID");
  const { data, error } = await access.supabase
    .from("organization_templates")
    .select("*")
    .eq("organization_id", access.organizationId)
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw databaseUnavailable();
  if (!data) throw templateNotFound();
  return mapTemplate(data);
}

/** Owner only. `content` must already have passed parseOrganizationTemplateInput. */
export async function createOrganizationTemplate(
  access: TemplateAccess,
  content: OrganizationTemplateContent,
): Promise<OrganizationTemplate> {
  assertOwner(access);
  const { data, error } = await access.supabase
    .from("organization_templates")
    .insert({
      ...toContentRow(content),
      organization_id: access.organizationId,
      created_by_wallet: access.walletAddress,
      updated_by_wallet: access.walletAddress,
    })
    .select("*")
    .single();
  if (error || !data) throw writeError(error);
  return mapTemplate(data);
}

/**
 * Owner only, with optimistic concurrency: the update applies only if the
 * template is still at `expectedVersion`, and bumps it. A stale editor gets a
 * conflict instead of silently overwriting a newer revision.
 */
export async function updateOrganizationTemplate(
  access: TemplateAccess,
  templateId: string,
  content: OrganizationTemplateContent,
  expectedVersion: number,
): Promise<OrganizationTemplate> {
  assertOwner(access);
  const id = validateUuid(templateId, "Template ID");
  const { data, error } = await access.supabase
    .from("organization_templates")
    .update({
      ...toContentRow(content),
      version: expectedVersion + 1,
      updated_by_wallet: access.walletAddress,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", access.organizationId)
    .eq("id", id)
    .eq("version", expectedVersion)
    .is("archived_at", null)
    .select("*")
    .maybeSingle();
  if (error) throw writeError(error);
  if (data) return mapTemplate(data);

  // Nothing matched: tell a stale version apart from a missing template.
  const { data: current, error: currentError } = await access.supabase
    .from("organization_templates")
    .select("version")
    .eq("organization_id", access.organizationId)
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();
  if (currentError) throw databaseUnavailable();
  if (!current) throw templateNotFound();
  throw new ApiError(
    409,
    "This template changed since you opened it. Reload it and try again.",
  );
}

/**
 * Owner only. Archives rather than deletes: grants keep the template key, and
 * resolving it to a name needs the row. No grant is touched.
 */
export async function archiveOrganizationTemplate(
  access: TemplateAccess,
  templateId: string,
): Promise<void> {
  assertOwner(access);
  const id = validateUuid(templateId, "Template ID");
  const now = new Date().toISOString();
  const { data, error } = await access.supabase
    .from("organization_templates")
    .update({
      archived_at: now,
      updated_by_wallet: access.walletAddress,
      updated_at: now,
    })
    .eq("organization_id", access.organizationId)
    .eq("id", id)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw databaseUnavailable();
  if (!data) throw templateNotFound();
}
