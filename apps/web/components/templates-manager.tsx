"use client";

import { useState, type FormEvent } from "react";

import {
  useArchiveTemplate,
  useCreateTemplate,
  useOrganization,
  useOrganizationMembers,
  useOrganizationTemplates,
  useUpdateTemplate,
} from "@/hooks/use-organizations";
import { useSession } from "@/hooks/use-session";
import type { OrganizationTemplate } from "@/lib/cloud/organizations/types";
import { errorMessage } from "@/lib/protocol/grants";
import { assertValidOrganizationTemplate } from "@/lib/shared/grant-presets/organization-template";
import {
  BLANK_TEMPLATE_FORM,
  templateForm,
  templateFormIssues,
  templateFormToContent,
  type TemplateForm,
} from "@/lib/shared/grant-presets/template-form";
import { strategyKey } from "@/lib/shared/i18n/keys";
import { useTranslations } from "@/lib/shared/i18n/provider";

import { Notice } from "./grant-ui";
import { TemplateEditor } from "./template-editor";
import { AiTemplateBuilder } from "./ai-template-builder";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ConfirmDialog } from "./ui/confirm-dialog";

/** Which template the editor is open for, if any. */
type Editor =
  { mode: "new" } | { mode: "edit"; id: string; version: number } | undefined;

/**
 * Organization template CRUD (HAS-13).
 *
 * Owners create, edit and delete; every other member reads the same list and
 * sees no controls — and could not use them anyway, because the routes refuse
 * a member's mutation before any write. Nothing here signs, funds, or touches
 * a grant: a template is draft configuration for the wizard, and deleting one
 * archives it, so grants created from it keep their provenance.
 *
 * An edit is sent with the version it was based on, so two owners editing the
 * same template get a conflict to resolve rather than one silently winning.
 */
export function TemplatesManager({
  organizationId,
}: {
  organizationId: string;
}) {
  const t = useTranslations();
  const session = useSession();
  const organization = useOrganization(organizationId);
  const templates = useOrganizationTemplates(organizationId);
  const members = useOrganizationMembers(organizationId);
  const createTemplate = useCreateTemplate(organizationId);
  const updateTemplate = useUpdateTemplate(organizationId);
  const archiveTemplate = useArchiveTemplate(organizationId);
  const [editor, setEditor] = useState<Editor>();
  /** The template awaiting confirmation, or undefined when no dialog is open. */
  const [pendingDeletion, setPendingDeletion] =
    useState<OrganizationTemplate>();
  const [form, setForm] = useState<TemplateForm>(BLANK_TEMPLATE_FORM);
  const [showIssues, setShowIssues] = useState(false);
  const [formError, setFormError] = useState("");

  if (!session.walletMatches) return null;
  if (organization.isPending || templates.isPending)
    return (
      <Notice title={t("templates.loading.title")}>
        <p>{t("templates.loading.body")}</p>
      </Notice>
    );
  if (organization.isError || templates.isError)
    return (
      <Notice title={t("templates.error.title")} error>
        <p>{t("templates.error.body")}</p>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => void templates.refetch()}
        >
          {t("templates.retry")}
        </Button>
      </Notice>
    );

  const isOwner = Boolean(organization.data?.membership.isOwner);
  const list = templates.data ?? [];
  const memberList = members.data ?? [];
  const saveMutation =
    editor?.mode === "edit" ? updateTemplate : createTemplate;

  function openNew() {
    setEditor({ mode: "new" });
    setForm(BLANK_TEMPLATE_FORM);
    setShowIssues(false);
    setFormError("");
  }

  function openEdit(template: OrganizationTemplate) {
    setEditor({ mode: "edit", id: template.id, version: template.version });
    setForm(templateForm(template));
    setShowIssues(false);
    setFormError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowIssues(true);
    if (!editor || templateFormIssues(form).length) return;
    let content;
    try {
      content = templateFormToContent(form);
      // The rules the server and the database also apply: a template must
      // never describe a grant the protocol would reject.
      assertValidOrganizationTemplate(content);
    } catch (error) {
      setFormError(
        errorMessage(error, { fallback: t("ui.error.requestFailed") }),
      );
      return;
    }
    setFormError("");
    try {
      if (editor.mode === "new") await createTemplate.mutateAsync(content);
      else
        await updateTemplate.mutateAsync({
          templateId: editor.id,
          template: content,
          expectedVersion: editor.version,
        });
      setEditor(undefined);
    } catch {
      // The server-safe mutation error is rendered by the editor.
    }
  }

  async function remove(template: OrganizationTemplate) {
    try {
      await archiveTemplate.mutateAsync(template.id);
      if (editor?.mode === "edit" && editor.id === template.id)
        setEditor(undefined);
    } catch {
      // The server-safe mutation error is rendered below.
    } finally {
      // The dialog closes either way: the error belongs on the page, not
      // behind a modal.
      setPendingDeletion(undefined);
    }
  }

  return (
    <div className="space-y-7">
      {isOwner && !editor && (
        <Button onClick={openNew}>{t("templates.new")}</Button>
      )}
      {isOwner && editor?.mode === "new" && (
        <AiTemplateBuilder
          key={`${organizationId}:${session.session?.walletAddress}:${session.session?.expiresAt}`}
          organizationId={organizationId}
          dirty={JSON.stringify(form) !== JSON.stringify(BLANK_TEMPLATE_FORM)}
          disabled={saveMutation.isPending}
          onApply={(content) => {
            setForm(templateForm({ ...content, id: "draft", version: 1 }));
            setShowIssues(false);
            setFormError("");
          }}
        />
      )}
      {isOwner && editor && (
        <TemplateEditor
          mode={editor.mode}
          form={form}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
          members={memberList}
          issues={templateFormIssues(form)}
          showIssues={showIssues}
          error={
            formError ||
            (saveMutation.isError
              ? errorMessage(saveMutation.error, {
                  fallback: t("ui.error.requestFailed"),
                })
              : "")
          }
          pending={saveMutation.isPending}
          onSubmit={(event) => void save(event)}
          onCancel={() => setEditor(undefined)}
        />
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("templates.title")}</CardTitle>
          <p className="pt-2 text-sm leading-6 text-muted-foreground">
            {t(isOwner ? "templates.lede.owner" : "templates.lede.member")}
          </p>
        </CardHeader>
        <CardContent>
          {!list.length ? (
            <p className="rounded-card border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              {t("templates.empty")}
            </p>
          ) : (
            <div className="space-y-3">
              {list.map((template) => (
                <div
                  key={template.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-card border border-border bg-surface-1 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{template.name}</p>
                    {template.description && (
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {template.description}
                      </p>
                    )}
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                      {[
                        t(strategyKey(template.strategy, "name")),
                        template.milestones?.length &&
                          t("templates.meta.milestones", {
                            count: template.milestones.length,
                          }),
                        template.defaultReviewerMemberId &&
                          t("templates.meta.reviewer", {
                            member:
                              memberList.find(
                                (member) =>
                                  member.id ===
                                  template.defaultReviewerMemberId,
                              )?.displayName ??
                              t("templates.meta.formerMember"),
                          }),
                        t("templates.meta.version", {
                          version: template.version,
                        }),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {isOwner && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(template)}
                      >
                        {t("templates.edit")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={archiveTemplate.isPending}
                        onClick={() => setPendingDeletion(template)}
                      >
                        {t("templates.delete")}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {archiveTemplate.isError && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {errorMessage(archiveTemplate.error, {
                fallback: t("ui.error.requestFailed"),
              })}
            </p>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={Boolean(pendingDeletion)}
        title={t("templates.deleteTitle")}
        description={
          pendingDeletion
            ? t("templates.deleteConfirm", { name: pendingDeletion.name })
            : ""
        }
        confirmLabel={t("templates.delete")}
        cancelLabel={t("dialog.cancel")}
        pending={archiveTemplate.isPending}
        onCancel={() => setPendingDeletion(undefined)}
        onConfirm={() => {
          if (pendingDeletion) void remove(pendingDeletion);
        }}
      />
    </div>
  );
}
