"use client";

import Link from "next/link";

import { useSession } from "@/hooks/use-session";
import {
  useOrganization,
  useOrganizationTemplates,
  useOrganizations,
} from "@/hooks/use-organizations";
import type { OrganizationTemplate } from "@/lib/cloud/organizations/types";
import { strategyKey } from "@/lib/shared/i18n/keys";
import { appRoutes } from "@/lib/shared/routes";
import { useTranslations } from "@/lib/shared/i18n/provider";

import { PresetOption } from "./preset-option";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const EMPTY_ORGANIZATION_VALUE = "__empty_organization__";

/**
 * Organization templates as starting points in the grant wizard (HAS-13).
 *
 * Two entry points, one component:
 *
 * - The organization-aware wizard passes its own organization, so the list is
 *   that organization's templates.
 * - The direct wizard has no organization, so the reader picks one of theirs
 *   first. Nothing is shown at all without a workspace session whose wallet
 *   matches the connected one — the same guard every workspace read uses.
 *
 * Applying a template only fills editable fields; it never signs, funds, or
 * decides a beneficiary. Templates are read-only here: only an owner can
 * change them, on the workspace's Templates tab.
 */
export function OrganizationTemplatePicker({
  organizationId,
  fixedOrganization,
  onOrganizationChange,
  selectedTemplateId,
  onSelect,
}: {
  /** The organization whose templates are listed, if one is chosen yet. */
  organizationId: string | undefined;
  /** True in the organization-aware wizard, where the organization is fixed. */
  fixedOrganization: boolean;
  onOrganizationChange: (organizationId: string) => void;
  /** The applied template, so a switch shows which one is active. */
  selectedTemplateId: string | null;
  onSelect: (template: OrganizationTemplate) => void;
}) {
  const t = useTranslations();
  const session = useSession();
  const organizations = useOrganizations();
  const organization = useOrganization(organizationId);
  const templates = useOrganizationTemplates(organizationId);
  const isOwner = organization.data?.membership.isOwner ?? false;

  if (!session.walletMatches) return null;
  // Someone with no workspace has no templates to choose from, and the direct
  // wizard should not grow an empty control for them.
  if (!fixedOrganization && !organizations.data?.length) return null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold">{t("wizard.orgTemplates.title")}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {t("wizard.orgTemplates.lede")}
        </p>
      </div>
      {!fixedOrganization && (
        <label className="block space-y-2">
          <span className="text-sm font-medium">
            {t("wizard.orgTemplates.organization")}
          </span>
          <Select
            value={organizationId || EMPTY_ORGANIZATION_VALUE}
            onValueChange={(value) =>
              onOrganizationChange(
                value === EMPTY_ORGANIZATION_VALUE ? "" : value,
              )
            }
          >
            <SelectTrigger
              className={`w-full font-sans text-sm ${organizationId ? "" : "text-muted-foreground"}`}
            >
              <SelectValue
                placeholder={t("wizard.orgTemplates.chooseOrganization")}
              />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem
                value={EMPTY_ORGANIZATION_VALUE}
                className="font-sans text-sm"
              >
                {t("wizard.orgTemplates.chooseOrganization")}
              </SelectItem>
              {organizations.data?.map((entry) => (
                <SelectItem
                  key={entry.id}
                  value={entry.id}
                  className="font-sans text-sm"
                >
                  {entry.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      )}
      {organizationId &&
        (templates.isPending ? (
          <p className="text-sm text-muted-foreground">
            {t("wizard.orgTemplates.loading")}
          </p>
        ) : templates.isError ? (
          <p className="text-sm text-destructive">
            {t("wizard.orgTemplates.error")}
          </p>
        ) : !templates.data?.length ? (
          <p className="text-sm text-muted-foreground">
            {t("wizard.orgTemplates.empty")}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.data.map((template) => (
              <PresetOption
                key={template.id}
                name={template.name}
                tagline={
                  template.description ?? t("wizard.orgTemplates.noDescription")
                }
                meta={[
                  t(strategyKey(template.strategy, "name")),
                  template.defaultReviewerMemberId &&
                    t("wizard.orgTemplates.suggestsReviewer"),
                ]
                  .filter(Boolean)
                  .join(" · ")}
                selected={selectedTemplateId === template.id}
                onSelect={() => onSelect(template)}
              />
            ))}
          </div>
        ))}
      {organizationId && isOwner && (
        <Link
          className="inline-block text-xs font-medium text-primary underline underline-offset-4"
          href={appRoutes.organizationTemplates(organizationId)}
        >
          {t("wizard.orgTemplates.manage")}
        </Link>
      )}
    </div>
  );
}
