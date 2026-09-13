"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { cn } from "@/lib/shared/utils";

import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

/**
 * The confirmation surface for a destructive action.
 *
 * It exists because `window.confirm()` does not belong in a product route: it
 * renders in the browser's chrome rather than this design system, and it blocks
 * the main thread while it is open. It is also the only modal shell in the app,
 * so a caller with its own body (a revocation preview, say) passes `children`
 * rather than building a second one.
 *
 * Keyboard behaviour is the point of the component, not decoration: the dialog
 * covers the page, so a keyboard user who cannot leave it is stuck. It takes
 * focus on open, keeps Tab inside itself, closes on Escape, and returns focus
 * to whatever opened it.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  /** The question itself. Omitted when `children` already asks it. */
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Blocks both buttons while the confirmed action is in flight. */
  pending?: boolean;
  /** Blocks only the confirm half, when the caller knows it cannot proceed. */
  confirmDisabled?: boolean;
  /** Styles the confirm button as destructive. Default for this component. */
  tone?: "destructive" | "default";
  children?: ReactNode;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  pending = false,
  confirmDisabled = false,
  tone = "destructive",
  children,
}: ConfirmDialogProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    // Cancel, not confirm: the first thing a destructive dialog offers a
    // keyboard user should never be the destructive half of it.
    const initial = dialog.current?.querySelector<HTMLElement>(
      "[data-confirm-dialog-initial]",
    );
    initial?.focus();
    const restore = opener.current;
    return () => restore?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        if (!pending) onCancel();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      ).filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (
        event.shiftKey &&
        (active === first || !dialog.current?.contains(active))
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, pending, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="w-full max-w-lg"
      >
        <Card className={cn(tone === "destructive" && "border-destructive/40")}>
          <CardHeader>
            <CardTitle
              id={titleId}
              className={cn(
                "text-lg",
                tone === "destructive" && "text-destructive",
              )}
            >
              {title}
            </CardTitle>
            {description && (
              <p
                id={descriptionId}
                className="pt-1 text-sm leading-6 text-muted-foreground"
              >
                {description}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {children}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                data-confirm-dialog-initial
                onClick={onCancel}
              >
                {cancelLabel}
              </Button>
              <Button
                type="button"
                variant="default"
                className={cn(
                  tone === "destructive" &&
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                )}
                disabled={pending || confirmDisabled}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
