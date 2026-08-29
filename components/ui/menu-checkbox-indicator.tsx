"use client"

import { cva, type VariantProps } from "class-variance-authority"

import { Checkmark2MediumIcon } from "@/components/icons"
import { cn } from "@/lib/utils"

const menuCheckboxIndicatorVariants = cva(
  "flex shrink-0 items-center justify-center rounded-full border bg-neutral-0",
  {
    variants: {
      checked: {
        true: "border-neutral-950 bg-neutral-950",
        false: "border-neutral-300",
      },
      size: {
        sm: "size-4 [&_[data-slot=dropdown-check]]:size-3",
        md: "size-5 [&_[data-slot=dropdown-check]]:size-3.5",
      },
    },
    defaultVariants: {
      checked: false,
      size: "sm",
    },
  }
)

/** Presentational multi-select indicator for menu rows. Not an interactive Checkbox. */
function MenuCheckboxIndicator({
  checked = false,
  size,
  className,
}: {
  checked?: boolean
  size?: VariantProps<typeof menuCheckboxIndicatorVariants>["size"]
  className?: string
}) {
  return (
    <span
      data-slot="menu-checkbox-indicator"
      data-checked={checked ? "" : undefined}
      className={cn(menuCheckboxIndicatorVariants({ checked, size }), className)}
      aria-hidden
    >
      {checked ? (
        <Checkmark2MediumIcon
          data-slot="dropdown-check"
          radius="0"
          className="text-on-inverted"
        />
      ) : null}
    </span>
  )
}

export { MenuCheckboxIndicator }
