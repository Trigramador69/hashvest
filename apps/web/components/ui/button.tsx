import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/shared/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-mono text-xs font-medium transition-[background,color,border-color,transform] duration-180 ease-[cubic-bezier(.2,.8,.2,1)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-primary text-primary-foreground hover:bg-[rgba(87,217,139,.85)]",
        outline:
          "border border-border bg-transparent text-foreground hover:border-[rgba(245,245,241,.16)] hover:bg-secondary",
        secondary:
          "border border-border-soft bg-secondary text-secondary-foreground hover:bg-surface-3",
        ghost:
          "border border-transparent bg-transparent text-secondary hover:bg-surface-2 hover:text-foreground",
      },
      size: {
        default: "min-h-11 px-4 py-2",
        sm: "min-h-11 px-3",
        lg: "min-h-11 px-5",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
