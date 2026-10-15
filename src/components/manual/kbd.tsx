import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

/** A tiny keycap: the one place radius-xs belongs, with chips. */
export function Kbd({ className, ...props }: ComponentPropsWithoutRef<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-rule border-b-2 bg-surface px-1 font-mono text-[0.6875rem] text-ink uppercase",
        className,
      )}
      {...props}
    />
  );
}
