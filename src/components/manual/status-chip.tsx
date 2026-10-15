import type { ReactNode } from "react";
import { tv } from "@/lib/cn";
import { Led, type LedState } from "./led";

const statusChip = tv({
  base: "inline-flex min-h-7 items-center gap-2 border px-2 py-1 font-mono text-label uppercase",
  variants: {
    state: {
      live: "border-hairline bg-surface text-live-text",
      accent: "border-hairline bg-surface text-accent-text",
      on: "border-hairline bg-surface text-ink",
      off: "border-hairline bg-transparent text-ink-muted",
    },
  },
});

/** Project status → lamp. Active work is live; shipped is lit; archived is dark. */
export const projectStatusLed = {
  active: "live",
  shipped: "on",
  archived: "off",
} as const satisfies Record<string, LedState>;

/** Lamp + label, like a status line on a rack unit. */
export function StatusChip({
  state = "on",
  children,
  className,
}: {
  state?: LedState;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={statusChip({ state, className })}>
      <Led state={state} />
      {children}
    </span>
  );
}
