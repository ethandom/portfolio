import type { ComponentPropsWithoutRef } from "react";
import type { VariantProps } from "tailwind-variants";
import { cn, tv } from "@/lib/cn";

/** Stack tags and kinds: a small keycap with a hairline edge. */
export const chip = tv({
  base: "inline-flex h-6 items-center gap-1.5 rounded-xs border px-1.5 font-mono text-label whitespace-nowrap uppercase",
  variants: {
    variant: {
      outline: "border-hairline bg-surface text-ink",
      sunken: "border-transparent bg-sunken text-ink",
      solid: "border-inverse bg-inverse text-ink-inverse",
    },
  },
  defaultVariants: { variant: "outline" },
});

export function Chip({
  variant,
  className,
  ...props
}: VariantProps<typeof chip> & ComponentPropsWithoutRef<"span">) {
  return <span className={chip({ variant, className })} {...props} />;
}

/** A wrapping row of chips, as a list so screen readers count them. */
export function ChipList({
  items,
  variant,
  label,
  className,
}: VariantProps<typeof chip> & {
  items: readonly string[];
  /** Accessible name for the list, e.g. "Stack". */
  label?: string;
  className?: string;
}) {
  return (
    <ul aria-label={label} className={cn("flex flex-wrap gap-1.5", className)}>
      {items.map((item) => (
        <li key={item}>
          <Chip variant={variant}>{item}</Chip>
        </li>
      ))}
    </ul>
  );
}
