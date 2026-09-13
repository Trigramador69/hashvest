"use client";

import { useState } from "react";
import { organizationApi } from "@/lib/cloud/organizations/client";
import type { OrganizationTemplate } from "@/lib/cloud/organizations/types";
import {
  reviewStateKey,
  type ReviewSnapshot,
} from "@/lib/shared/ai-tools/review";
import { applyOrganizationTemplateToDraft } from "@/lib/shared/grant-presets/organization-template";
import {
  BLANK_TEMPLATE_FORM,
  templateForm,
  templateFormIssues,
  templateFormToContent,
} from "@/lib/shared/grant-presets/template-form";
import { useI18n } from "@/lib/shared/i18n/provider";
import { AiTemplateBuilder } from "./ai-template-builder";
import { EvidenceReviewTool } from "./ai-evidence-review";
import { TemplateEditor } from "./template-editor";
import { Button } from "./ui/button";

const ORGANIZATION = "aaaaaaaa-0000-4000-8000-000000000001";
const VAULT = "0x0000000000000000000000000000000000000003";
const SNAPSHOT: ReviewSnapshot = {
  blockNumber: "123",
  blockTimestamp: 1789257600,
  title: "Integration",
  strategy: 1,
  totalAllocation: "100",
  claimedAmount: "0",
  unlockedAmount: "0",
  claimableAmount: "0",
  revoked: false,
  milestones: [{ index: 0, title: "Release", amount: "100", approved: false }],
};

/** Gated fixtures share the real tool/editor/application components. HTTP is stubbed in tests. */
export function VisualAiToolsFixture() {
  const { t } = useI18n();
  const [form, setForm] = useState(BLANK_TEMPLATE_FORM);
  const [saved, setSaved] = useState<OrganizationTemplate>();
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [issues, setIssues] = useState(false);
  const [changed, setChanged] = useState(false);
  const [scope, setScope] = useState(0);
  async function save() {
    setIssues(true);
    if (templateFormIssues(form).length) return;
    setPending(true);
    try {
      const result = await organizationApi.createTemplate(
        ORGANIZATION,
        templateFormToContent(form),
      );
      setSaved(result.template);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4">
      <AiTemplateBuilder
        key={scope}
        organizationId={ORGANIZATION}
        dirty={JSON.stringify(form) !== JSON.stringify(BLANK_TEMPLATE_FORM)}
        disabled={pending}
        onApply={(content) =>
          setForm(templateForm({ ...content, id: "draft", version: 1 }))
        }
      />
      <TemplateEditor
        mode="new"
        form={form}
        onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        members={[]}
        issues={templateFormIssues(form)}
        showIssues={issues}
        pending={pending}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        onCancel={() => {
          setForm(BLANK_TEMPLATE_FORM);
          setScope((value) => value + 1);
        }}
      />
      {saved && (
        <Button
          type="button"
          onClick={() =>
            setTitle(applyOrganizationTemplateToDraft(saved).draft.title)
          }
        >
          {t("ai.action.apply")}
        </Button>
      )}
      {title && (
        <label className="block text-xs">
          {t("wizard.field.title.label")}
          <input
            className="field"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
      )}
      <EvidenceReviewTool
        key={`review:${scope}`}
        organizationId={ORGANIZATION}
        vaultAddress={VAULT}
        currentStateKey={reviewStateKey(SNAPSHOT)}
        evidenceKey={changed ? "changed" : "original"}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setChanged(true)}
        >
          Fixture: change evidence
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setScope((value) => value + 1)}
        >
          Fixture: change session
        </Button>
      </div>
    </div>
  );
}
