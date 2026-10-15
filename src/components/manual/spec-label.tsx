import type { ComponentPropsWithoutRef, ElementType } from "react";
import type { VariantProps } from "tailwind-variants";
import { tv } from "@/lib/cn";

/** The one label voice: mono, uppercase, tracked. Every small caption on the page is this. */
export const specLabel = tv({
  base: "font-mono text-label uppercase",
  variants: {
    tone: {
      muted: "text-ink-muted",
      ink: "text-ink",
      accent: "text-accent-text",
      // Black spec-label plate, as printed on a panel
      inverse: "bg-inverse px-1.5 py-0.5 text-ink-inverse",
    },
    weight: {
      normal: "font-normal",
      medium: "font-medium",
    },
  },
  defaultVariants: { tone: "muted", weight: "normal" },
});

type SpecLabelProps<T extends ElementType> = {
  as?: T;
} & VariantProps<typeof specLabel> &
  Omit<ComponentPropsWithoutRef<T>, "as">;

export function SpecLabel<T extends ElementType = "span">({
  as,
  tone,
  weight,
  className,
  ...props
}: SpecLabelProps<T>) {
  const Tag: ElementType = as ?? "span";
  return <Tag className={specLabel({ tone, weight, className })} {...props} />;
}
