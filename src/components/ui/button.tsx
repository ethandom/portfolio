import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/cn"

// Panel keys: mono uppercase labels, square, 1px borders, no shadows.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 border font-mono text-label whitespace-nowrap uppercase transition-colors duration-(--dur-fast) ease-out outline-none select-none active:translate-y-px disabled:pointer-events-none disabled:border-hairline disabled:bg-transparent disabled:text-ink-disabled [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default:
          "border-inverse bg-inverse text-ink-inverse hover:border-accent-text hover:bg-accent-text hover:text-on-accent",
        outline:
          "border-strong bg-transparent text-ink hover:bg-sunken aria-expanded:bg-sunken",
        ghost:
          "border-transparent bg-transparent text-ink hover:bg-sunken aria-expanded:bg-sunken",
        link: "h-auto border-transparent px-0 text-accent-text underline decoration-1 underline-offset-4 hover:text-accent-press",
      },
      size: {
        sm: "h-7 px-2.5",
        default: "h-9 px-3.5",
        // 44px: the primary actions on phones
        lg: "h-11 px-5",
        "icon-sm": "size-7",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
