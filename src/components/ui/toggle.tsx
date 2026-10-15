"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Toggle as TogglePrimitive } from "radix-ui"

import { cn } from "@/lib/cn"

// A latching panel switch: the "on" state inverts and lights its LED.
const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-2 font-mono text-label whitespace-nowrap text-ink-muted uppercase transition-colors duration-(--dur-fast) ease-out outline-none select-none hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:text-ink-disabled data-[state=on]:bg-inverse data-[state=on]:text-ink-inverse [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: "border border-transparent",
        outline: "border border-strong",
      },
      size: {
        sm: "h-7 min-w-7 px-2.5",
        default: "h-9 min-w-9 px-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/** Square LED; lights accent when its toggle is on. */
function ToggleIndicator({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      data-slot="toggle-indicator"
      className={cn(
        "size-1.5 shrink-0 bg-rule transition-colors duration-(--dur-fast) group-data-[state=on]/toggle:bg-accent",
        className
      )}
    />
  )
}

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, ToggleIndicator, toggleVariants }
