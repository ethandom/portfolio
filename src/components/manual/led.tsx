import type { VariantProps } from "tailwind-variants";
import { tv } from "@/lib/cn";

/** Panel indicator lamp. Decoration only: pair it with a text label. */
export const led = tv({
  base: "inline-block size-1.5 shrink-0 rounded-full",
  variants: {
    state: {
      live: "bg-live",
      accent: "bg-accent",
      on: "bg-strong",
      off: "border border-rule",
    },
  },
  defaultVariants: { state: "on" },
});

export type LedState = NonNullable<VariantProps<typeof led>["state"]>;

export function Led({
  state,
  className,
}: VariantProps<typeof led> & { className?: string }) {
  return <span aria-hidden data-led={state ?? "on"} className={led({ state, className })} />;
}
