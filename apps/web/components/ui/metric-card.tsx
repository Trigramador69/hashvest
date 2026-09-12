import type { ReactNode } from "react";

import { cn } from "@/lib/shared/utils";
import { DataArt } from "./data-art";
import { Panel } from "./panel";

export function MetricCard({
  label,
  value,
  trend,
  comparison,
  art = "rings",
  trendTone = "positive",
  className,
}: {
  label: string;
  value: ReactNode;
  trend?: ReactNode;
  comparison?: ReactNode;
  art?: "orb" | "mesh" | "rings" | "nodes";
  trendTone?: "positive" | "warning" | "neutral";
  className?: string;
}) {
  return (
    <Panel className={cn("relative min-h-[128px] overflow-hidden p-5", className)}>
      <div className="relative z-10">
        <p className="font-mono text-[28px] font-medium leading-none tracking-[-0.03em] tabular-nums text-foreground">
          {value}
        </p>
        <p className="mt-2 font-mono text-[11px] leading-4 text-muted-foreground">
          {label}
        </p>
        {(trend || comparison) && (
          <p
            className={cn(
              "mt-4 font-mono text-[11px]",
              trendTone === "positive" && "text-primary",
              trendTone === "warning" && "text-[#E9832D]",
              trendTone === "neutral" && "text-muted-foreground",
            )}
          >
            {trend} {comparison && <span className="text-muted-foreground">{comparison}</span>}
          </p>
        )}
      </div>
      <DataArt
        variant={art}
        className="absolute -right-1 bottom-2 h-20 w-24 opacity-80"
      />
    </Panel>
  );
}

