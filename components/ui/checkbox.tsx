"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { cva, type VariantProps } from "class-variance-authority"

import { Checkmark2MediumIcon } from "@/components/icons"
import { cn } from "@/lib/utils"

export const checkboxVariants = cva(
  "relative flex shrink-0 items-center justify-center rounded-full border border-border-default bg-neutral-0 outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-2 focus-visible:ring-brand-border-focus disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger-solid aria-invalid:ring-2 aria-invalid:ring-danger-solid data-checked:border-neutral-950 data-checked:bg-neutral-950",
  {
    variants: {
      size: {
        sm: "size-4 [&_[data-slot=checkbox-indicator]>svg]:size-3",
        md: "size-5 [&_[data-slot=checkbox-indicator]>svg]:size-3.5",
        lg: "size-6 [&_[data-slot=checkbox-indicator]>svg]:size-4",
      },
    },
    defaultVariants: {
      size: "sm",
    },
  }
)

function Checkbox({
  className,
  size,
  children,
  ...props
}: CheckboxPrimitive.Root.Props & VariantProps<typeof checkboxVariants>) {
  const control = (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      data-size={size ?? "sm"}
      className={cn(checkboxVariants({ size }), className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <Checkmark2MediumIcon radius="0" className="text-on-inverted" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )

  if (children == null) return control

  return (
    <label
      data-slot="checkbox-label"
      className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-fg select-none has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:opacity-50"
    >
      {control}
      {children}
    </label>
  )
}

export { Checkbox }
