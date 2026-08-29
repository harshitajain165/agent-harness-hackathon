"use client"

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-1 text-sm font-medium whitespace-nowrap outline-none transition-[color,background-color,box-shadow] duration-150 hover:text-fg focus-visible:ring-2 focus-visible:ring-brand-border-focus disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "bg-neutral-0 shadow-sm hover:bg-neutral-50 data-[state=on]:bg-neutral-100 data-[state=on]:shadow-none",
        secondary:
          "bg-transparent shadow-none hover:bg-neutral-100 data-[state=on]:bg-neutral-100",
      },
      size: {
        sm: "h-8 min-w-8 rounded-[10px] px-2 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
        md: "h-9 min-w-9 rounded-[10px] px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        lg: "h-10 min-w-10 rounded-[12px] px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

function Toggle({
  className,
  variant = "primary",
  size = "md",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
