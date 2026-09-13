import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/shared/utils";

export function Panel({
  className,
  interactive = false,
  ...props
}: HTMLAttributes<HTMLElement> & { interactive?: boolean }) {
  return (
    <section
      className={cn(
        "rounded-card border border-border bg-surface-1 shadow-none",
        interactive &&
          "transition-[background,border-color,transform] duration-180 hover:-translate-y-px hover:border-border-strong hover:bg-surface-hover",
        className,
      )}
      {...props}
    />
  );
}

export function PanelHeader({
  className,
  eyebrow,
  title,
  description,
  action,
}: {
  className?: string;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-border-soft px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-primary">
            {eyebrow}
          </p>
        )}
        <h2 className="font-mono text-[15px] font-medium leading-tight text-foreground">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}

export function PanelBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}
