"use client";

import { useEffect, useState } from "react";

import { Button } from "./ui/button";
import { ConfirmDialog } from "./ui/confirm-dialog";

/**
 * The shared confirmation dialog, without a workspace session (HAS-46).
 *
 * Both real call sites — removing a member and deleting a template — need an
 * owner whose signed-in wallet matches the connected one, which a browser test
 * cannot produce. Rendering the same component with local state covers what a
 * browser can check and Vitest cannot: that it takes focus, keeps Tab inside
 * itself, leaves on Escape, returns focus to the control that opened it, and
 * only acts when the destructive half is actually pressed.
 *
 * Nothing here talks to Supabase or a wallet; confirming increments a counter.
 */
export function VisualConfirmDialogFixture() {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(0);
  const [cancelled, setCancelled] = useState(0);
  /**
   * Hydration, made observable. A key pressed before this component is
   * interactive does nothing, and a keyboard test that raced it would fail for
   * a reason that has nothing to do with the dialog.
   */
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  return (
    <div
      className="mx-auto max-w-3xl space-y-4 p-4"
      data-testid="fixture"
      data-ready={ready ? "true" : "false"}
    >
      <Button onClick={() => setOpen(true)}>Remove member</Button>
      <p data-testid="confirmed">confirmed: {confirmed}</p>
      <p data-testid="cancelled">cancelled: {cancelled}</p>
      <ConfirmDialog
        open={open}
        title="Remove member"
        description="Remove this member from the organization?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onCancel={() => {
          setCancelled((count) => count + 1);
          setOpen(false);
        }}
        onConfirm={() => {
          setConfirmed((count) => count + 1);
          setOpen(false);
        }}
      />
    </div>
  );
}
