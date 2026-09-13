"use client";

import { useState } from "react";

import {
  BLANK_TEMPLATE_FORM,
  templateFormIssues,
  type TemplateForm,
} from "@/lib/shared/grant-presets/template-form";

import { TemplateEditor } from "./template-editor";

/**
 * The template form's states, without a workspace session (HAS-13).
 *
 * The real editor needs an owner whose signed-in wallet matches the connected
 * one, which a browser test cannot produce. Rendering the same component with
 * local state covers what a browser can check and Vitest cannot: that the
 * empty, invalid, milestone and saving states are reachable and legible on a
 * phone. Nothing here talks to Supabase or a wallet — submitting only shows
 * the pending state.
 */
const MEMBERS = [
  { id: "11111111-1111-4111-8111-111111111111", displayName: "Ana Reviewer" },
  { id: "22222222-2222-4222-8222-222222222222", displayName: "Bo Builder" },
];

export function VisualTemplatesFixture() {
  const [form, setForm] = useState<TemplateForm>(BLANK_TEMPLATE_FORM);
  const [showIssues, setShowIssues] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <div className="mx-auto max-w-3xl p-4">
      <TemplateEditor
        mode="new"
        form={form}
        onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        members={MEMBERS}
        issues={templateFormIssues(form)}
        showIssues={showIssues}
        pending={pending}
        onSubmit={(event) => {
          event.preventDefault();
          setShowIssues(true);
          // A valid form would send a request here; the fixture only shows the
          // state the reader would see while one is in flight.
          if (!templateFormIssues(form).length) setPending(true);
        }}
        onCancel={() => {
          setForm(BLANK_TEMPLATE_FORM);
          setShowIssues(false);
          setPending(false);
        }}
      />
    </div>
  );
}
