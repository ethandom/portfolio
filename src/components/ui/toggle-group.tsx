"use client"

import * as React from "react"
import { type VariantProps } from "class-variance-authority"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

import { cn } from "@/lib/cn"
import { ToggleIndicator, toggleVariants } from "@/components/ui/toggle"

type ToggleGroupContextValue = Pick<VariantProps<typeof toggleVariants>, "size"> & {
  indicator: boolean
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({
  size: "default",
  indicator: true,
})

/**
 * Segmented selector: one ink-framed strip, items split by hairlines.
 * With type="single", Radix lets the user clear the value (""); ignore that
 * in onValueChange when a choice is required.
 */
function ToggleGroup({
  className,
  size = "default",
  indicator = true,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  Pick<VariantProps<typeof toggleVariants>, "size"> & {
    /** Show each item's LED. */
    indicator?: boolean
  }) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-size={size}
      className={cn(
        "group/toggle-group inline-flex w-fit max-w-full items-stretch border border-strong bg-surface data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ size, indicator }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  const { size, indicator } = React.useContext(ToggleGroupContext)

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        toggleVariants({ size }),
        "flex-1 border-0 not-first:border-l not-first:border-hairline focus-visible:relative focus-visible:z-10 group-data-[orientation=vertical]/toggle-group:not-first:border-t group-data-[orientation=vertical]/toggle-group:not-first:border-l-0",
        className
      )}
      {...props}
    >
      {indicator && <ToggleIndicator />}
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
