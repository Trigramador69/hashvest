"use client";

import {
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ChartColumn, FileSearch, LayoutTemplate, PenLine } from "lucide-react";

import { useTranslations } from "@/lib/shared/i18n/provider";
import { PixelCanvas } from "./ui/pixel-canvas";
import { Button } from "./ui/button";
const subscribeHydration = () => () => {};

/**
 * The four AI tools, told apart at a glance.
 *
 * The cobalt `IA` chip marks the family — this is a model speaking, not a
 * computed figure — while the icon and the pixel field's own palette say which
 * tool it is.
 *
 * These four surfaces are the one deliberate exception to the restrained motion
 * and colour rules in `design.md`. A reader should be able to tell at a glance
 * that a panel was written by a model rather than derived from the chain, and
 * looking different from everything else is the point. The exception stops
 * here: nothing outside an AI tool may use `PixelCanvas`.
 */
export const AI_TOOL_TONES = {
  draft: {
    icon: PenLine,
    active: "#34d399",
    colors: ["#d1fae5", "#6ee7b7", "#10b981"],
  },
  template: {
    icon: LayoutTemplate,
    active: "#fbbf24",
    colors: ["#fef3c7", "#fcd34d", "#f59e0b"],
  },
  review: {
    icon: FileSearch,
    active: "#60a5fa",
    colors: ["#dbeafe", "#93c5fd", "#3b82f6"],
  },
  report: {
    icon: ChartColumn,
    active: "#a78bfa",
    colors: ["#ede9fe", "#c4b5fd", "#8b5cf6"],
  },
} as const;

export type AiToolTone = keyof typeof AI_TOOL_TONES;

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
  tone,
}: {
  title: string;
  description: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
  tone: AiToolTone;
}) {
  const { icon: ToolIcon, active, colors } = AI_TOOL_TONES[tone];
  const t = useTranslations();
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
      style={{ "--ai-active": active } as React.CSSProperties}
      className="group relative min-w-0 scroll-mt-6 overflow-hidden rounded-card border border-border bg-surface-1 p-4 transition-colors duration-200 hover:border-[var(--ai-active)] sm:p-5 print:hidden"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          toggle(false);
          launcher.current?.focus();
        }
      }}
    >
      <PixelCanvas gap={10} speed={25} colors={[...colors]} />
      <Button
        ref={launcher}
        type="button"
        variant="ghost"
        className="relative h-auto w-full justify-between whitespace-normal px-0 text-left"
        // The control that opens the section announces what wrote it, not just
        // what it is about. The marker is part of the accessible name so a
        // screen reader cannot miss what a sighted reader sees in the chip.
        aria-label={`${label ?? title} · ${t("ai.launcher.short")}`}
        aria-expanded={open}
        aria-controls={regionId}
        disabled={disabled || !hydrated}
        onClick={() => toggle(!open)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <ToolIcon
            aria-hidden="true"
            className="size-4 shrink-0 text-[var(--ai-active)] transition-transform duration-300 group-hover:scale-110"
            strokeWidth={1.25}
          />
          <span
            aria-hidden="true"
            className="shrink-0 rounded-control border border-[var(--ai-active)]/60 bg-[var(--ai-active)]/10 px-2 py-1 font-mono text-sm font-semibold uppercase leading-none tracking-widest text-[var(--ai-active)]"
          >
            {t("ai.launcher.short")}
          </span>
          <span id={`${generatedId}-title`} className="font-mono text-sm">
            {title}
          </span>
        </span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </Button>
      <p className="relative mt-2 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
      {open && (
        <div
          id={regionId}
          role="region"
          aria-labelledby={`${generatedId}-title`}
          className="relative mt-4 space-y-4 border-t border-border-soft bg-surface-1 pt-4"
        >
          {children}
        </div>
      )}
    </section>
  );
}

/**
 * Hand the analysis to the reviewer as text they can paste into a decision.
 *
 * The copy is user-initiated and goes to the clipboard, never to storage: an
 * advisory reading that the product filed away would start to look like a
 * record. `navigator.clipboard` is absent over plain HTTP and can be denied,
 * so failure is shown rather than swallowed.
 */
export function AiCopyButton({ text }: { text: () => string }) {
  const t = useTranslations();
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text());
      setState("copied");
    } catch {
      setState("failed");
    }
  }
  return (
    <span className="inline-flex items-center gap-2">
      <Button type="button" variant="outline" onClick={() => void copy()}>
        {t("ai.action.copy")}
      </Button>
      {state !== "idle" && (
        <span
          role="status"
          className={`text-xs ${state === "failed" ? "text-destructive" : "text-muted-foreground"}`}
        >
          {t(state === "copied" ? "ai.action.copied" : "ai.action.copyFailed")}
        </span>
      )}
    </span>
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
