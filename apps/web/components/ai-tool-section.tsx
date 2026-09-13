"use client";

import {
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Button } from "./ui/button";
const subscribeHydration = () => () => {};

/** Inline and non-modal: evidence and editable forms remain reachable by keyboard. */
export function AiToolSection({
  title,
  description,
  children,
  open: controlled,
  onOpenChange,
  disabled = false,
  label,
  id,
}: {
  title: string;
  description: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}) {
  const generatedId = useId();
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const [expanded, setExpanded] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const open = controlled ?? expanded;
  const regionId = `${generatedId}-body`;
  function toggle(value: boolean) {
    setExpanded(value);
    onOpenChange?.(value);
  }
  return (
    <section
      id={id}
      className="min-w-0 scroll-mt-6 border border-border bg-surface-1 p-4 sm:p-5 print:hidden"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          toggle(false);
          launcher.current?.focus();
        }
      }}
    >
      <Button
        ref={launcher}
        type="button"
        variant="ghost"
        className="h-auto w-full justify-between whitespace-normal px-0 text-left"
        aria-label={label ?? title}
        aria-expanded={open}
        aria-controls={regionId}
        disabled={disabled || !hydrated}
        onClick={() => toggle(!open)}
      >
        <span id={`${generatedId}-title`} className="font-mono text-sm">
          {title}
        </span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </Button>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
      {open && (
        <div
          id={regionId}
          role="region"
          aria-labelledby={`${generatedId}-title`}
          className="mt-4 space-y-4 border-t border-border-soft bg-surface-1 pt-4"
        >
          {children}
        </div>
      )}
    </section>
  );
}

export function AiResultList({
  title,
  items,
}: {
  title: string;
  items: readonly string[];
}) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="text-xs font-medium">{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-muted-foreground">
        {items.map((item, index) => (
          <li key={index} className="break-words">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
