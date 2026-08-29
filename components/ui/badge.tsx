import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const pillVariants = cva(
  "group/badge inline-flex h-7 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-[color,background-color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-brand-border-focus [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        primary: "bg-neutral-0 text-fg shadow-sm",
        secondary: "bg-neutral-100 text-fg shadow-none",
        tertiary: "border-border-default bg-neutral-0 text-fg",
        transparent: "bg-transparent text-fg hover:bg-neutral-100",
        "link-primary": "text-brand-fg underline-offset-4 hover:underline",
        positive: "bg-positive-subtle text-positive-fg",
        warning: "bg-warning-subtle text-warning-fg",
        danger: "bg-danger-subtle text-danger-fg",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
)

function Pill({
  className,
  variant = "primary",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof pillVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(pillVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

/** @deprecated Use Pill. Kept as a compatibility alias. */
const Badge = Pill;
const badgeVariants = pillVariants;

export { Pill, pillVariants, Badge, badgeVariants };
